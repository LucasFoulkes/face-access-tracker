// App.tsx
import { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/* ───────────────── Constants ───────────────── */
const MODEL_URI = '/models';
const LOCAL_KEY = 'face_descriptors_v1';
const THRESHOLD = 0.55;
const DIALOG_MS = 5_000;               // auto-close delay

const DETECTOR_OPTS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 160,       // much faster, good enough for webcam
  scoreThreshold: 0.4   // slightly more tolerant
});

/* ──────────────── Local-storage helpers ──────────────── */
type Raw = { label: string; descriptors: number[][] };

const loadDB = (): faceapi.LabeledFaceDescriptors[] =>
  (JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as Raw[]).map(r =>
    new faceapi.LabeledFaceDescriptors(
      r.label,
      r.descriptors.map(d => new Float32Array(d))
    )
  );

const saveDescriptor = (label: string, desc: Float32Array) => {
  const db: Raw[] = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  const record = db.find(r => r.label === label);
  (record ? record.descriptors : (db.push({ label, descriptors: [] }), db.at(-1)!.descriptors)).push(
    Array.from(desc)
  );
  localStorage.setItem(LOCAL_KEY, JSON.stringify(db));
};

/* ──────────────── Hooks ──────────────── */
function useModels() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI)
      ]);
      setReady(true);
    })();
  }, []);

  return ready;
}

function useCamera(video: React.RefObject<HTMLVideoElement>, active: boolean) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream;

    (async () => {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      if (!video.current) return;

      video.current.srcObject = stream;
      video.current.onloadedmetadata = async () => {
        await video.current!.play();
        setReady(true);            // <── important, we expose that
      };
    })();

    return () => {
      stream?.getTracks().forEach(t => t.stop());
      setReady(false);
    };
  }, [active, video]);

  return ready;                     //  <── expose readiness flag
}

function useFaceMatcher(ready: boolean) {
  const [matcher, setMatcher] = useState<faceapi.FaceMatcher | null>(null);

  useEffect(() => {
    if (ready) setMatcher(loadDB().length ? new faceapi.FaceMatcher(loadDB(), THRESHOLD) : null);
  }, [ready]);

  const add = useCallback((label: string, desc: Float32Array) => {
    saveDescriptor(label, desc);
    setMatcher(new faceapi.FaceMatcher(loadDB(), THRESHOLD));
  }, []);

  return { matcher, add };
}

/* ──────────────── App ──────────────── */
export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const modelsReady = useModels();
  const { matcher, add } = useFaceMatcher(modelsReady);
  const [dialog, setDialog] = useState<'ask' | 'greet' | null>(null);
  const [pendingDesc, setDesc] = useState<Float32Array | null>(null);
  const [name, setName] = useState('');
  const [input, setInput] = useState('');
  /* camera runs whenever no dialog is open */
  const camReady = useCamera(videoRef, modelsReady && dialog === null);

  /* auto-close greet dialog after DIALOG_MS */
  useEffect(() => {
    if (dialog !== 'greet') return;
    const id = setTimeout(() => closeDialog(), DIALOG_MS);
    return () => clearTimeout(id);
  }, [dialog]);
  /* draw & detect loop */
  useEffect(() => {
    if (!modelsReady || !camReady || dialog) return;

    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;

    let raf = 0;
    const ctx = c.getContext('2d')!;

    const tick = async () => {
      // bail out quietly until video really has dimensions
      if (!v.videoWidth || !v.videoHeight) {
        raf = requestAnimationFrame(tick);
        return;
      }

      // keep canvas in sync with the video element
      if (c.width !== v.videoWidth) c.width = v.videoWidth;
      if (c.height !== v.videoHeight) c.height = v.videoHeight;

      const res = await faceapi
        .detectSingleFace(v, DETECTOR_OPTS)
        .withFaceLandmarks()
        .withFaceDescriptor();

      ctx.clearRect(0, 0, c.width, c.height);

      if (res) {
        const sized = faceapi.resizeResults(res, { width: v.videoWidth, height: v.videoHeight });
        faceapi.draw.drawDetections(c, sized);
        faceapi.draw.drawFaceLandmarks(c, sized);

        v.pause(); // freeze frame while interacting with user

        const desc = res.descriptor as Float32Array;
        const best = matcher?.findBestMatch(desc);

        if (!best || best.label === 'unknown' || best.distance > THRESHOLD) {
          setDesc(desc);
          setDialog('ask');
        } else {
          setName(best.label);
          setDialog('greet');
        }
        return;        // stop loop until dialog closes
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [modelsReady, camReady, matcher, dialog]);

  /* helpers */
  const resumeCamera = () => {
    const v = videoRef.current;
    v?.play().catch(() => void 0);
  };

  const closeDialog = () => {
    setDialog(null);
    setName('');
    setInput('');
    setDesc(null);
    resumeCamera();
  };

  const saveName = () => {
    if (!pendingDesc) return;
    const label = (input || `person_${Date.now()}`).trim();
    add(label, pendingDesc);
    setName(label);
    setDialog('greet');          // switch to greet → auto-close 5 s
  };

  /* ──────────────── UI ──────────────── */
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-black">
      <div className="relative w-full max-w-xl">
        <video ref={videoRef} className="w-full" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>

      {/* ─── Dialog ─── */}
      <Dialog open={dialog !== null} onOpenChange={val => !val && closeDialog()}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>
              {dialog === 'ask' ? 'Name this face' : `Hello, ${name}!`}
            </DialogTitle>
          </DialogHeader>

          {dialog === 'ask' && (
            <>
              <Input
                autoFocus
                placeholder="Type a name…"
                value={input}
                onChange={e => setInput(e.currentTarget.value)}
                className="mt-4"
              />
              <Button onClick={saveName} className="w-full mt-4">
                Save
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}