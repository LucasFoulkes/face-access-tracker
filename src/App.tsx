import { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/* ───────────────── Constants ───────────────── */
const MODEL_URI = '/models';
const LOCAL_KEY = 'face_descriptors_v1';
const THRESHOLD = 0.55;
const COUNTDOWN_SEC = 5;

/* ───────────────── Local-storage helpers ───────────────── */
type RawDescriptor = { label: string; descriptors: number[][] };

const loadDB = (): faceapi.LabeledFaceDescriptors[] =>
  (JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as RawDescriptor[])
    .map(
      r =>
        new faceapi.LabeledFaceDescriptors(
          r.label,
          r.descriptors.map(d => new Float32Array(d))
        )
    );

const saveDescriptor = (label: string, desc: Float32Array) => {
  const db: RawDescriptor[] = JSON.parse(
    localStorage.getItem(LOCAL_KEY) || '[]'
  );
  const hit = db.find(d => d.label === label);
  if (hit) hit.descriptors.push(Array.from(desc));
  else db.push({ label, descriptors: [Array.from(desc)] });
  localStorage.setItem(LOCAL_KEY, JSON.stringify(db));
};

/* ───────────────── Custom hooks ───────────────── */
function useModels() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI)
        ]);
        if (!cancelled) setReady(true);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'model load');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, error };
}

function useCamera(video: React.RefObject<HTMLVideoElement>, enabled: boolean) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });
        if (controller.signal.aborted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        const v = video.current;
        if (!v) return;
        v.srcObject = stream;
        v.onloadedmetadata = () => {
          v.play().catch(() => void 0);
          setReady(true);
        };
      } catch {
        /* silently ignore, error handled in parent */
      }
    })();

    return () => {
      controller.abort();
      const v = video.current;
      v?.srcObject &&
        (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      setReady(false);
    };
  }, [enabled, video]);

  return ready;
}

function useFaceMatcher(modelsReady: boolean) {
  const [matcher, setMatcher] = useState<faceapi.FaceMatcher | null>(null);

  useEffect(() => {
    if (!modelsReady) return;
    const db = loadDB();
    setMatcher(db.length ? new faceapi.FaceMatcher(db, THRESHOLD) : null);
  }, [modelsReady]);

  const add = useCallback((label: string, desc: Float32Array) => {
    saveDescriptor(label, desc);
    setMatcher(new faceapi.FaceMatcher(loadDB(), THRESHOLD));
  }, []);

  return { matcher, add };
}

function useCountdown(start: number, onDone: () => void) {
  const [seconds, setSeconds] = useState(start);

  useEffect(() => {
    if (start === 0) return;
    setSeconds(start);
  }, [start]);

  useEffect(() => {
    if (seconds === 0) return;
    const id = setTimeout(() => {
      if (seconds === 1) onDone();
      else setSeconds(s => s - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [seconds, onDone]);

  return seconds;
}

/* ───────────────── App ───────────────── */
enum Phase {
  LoadingModels,
  Camera,
  Detecting,
  Frozen
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { ready: modelsReady, error: modelErr } = useModels();
  const [appErr, setAppErr] = useState<string | null>(modelErr);
  const [phase, setPhase] = useState<Phase>(Phase.LoadingModels);

  /* name & descriptor we’re working with right now */
  const [pendingDesc, setPendingDesc] = useState<Float32Array | null>(null);
  const [recognizedName, setRecognizedName] = useState<string | null>(null);
  /* dialog */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'name' | 'info' | null>(null);
  const [inputName, setInputName] = useState('');

  /* matcher */
  const { matcher, add: addDescriptor } = useFaceMatcher(modelsReady);
  /* camera */
  const cameraReady = useCamera(
    videoRef,
    phase === Phase.Camera || phase === Phase.Detecting
  );
  /* countdown */
  const countdown = useCountdown(
    phase === Phase.Frozen && !dialogOpen ? COUNTDOWN_SEC : 0,
    () => restart()
  );

  /* ─── Side effects ─── */
  /* once models are ready switch to Camera phase */
  useEffect(() => {
    if (modelsReady) setPhase(Phase.Camera);
  }, [modelsReady]);

  /* switch from camera → detecting once video plays */
  useEffect(() => {
    if (cameraReady) setPhase(Phase.Detecting);
  }, [cameraReady]);

  /* detection loop */
  useEffect(() => {
    if (phase !== Phase.Detecting) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d')!;
    let rafId = 0;
    let busy = false;

    const step = async () => {
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

      if (!busy) {
        busy = true;
        try {
          const det = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (det) {
            /* draw immediately */
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const resized = faceapi.resizeResults(det, {
              width: video.videoWidth,
              height: video.videoHeight
            });
            faceapi.draw.drawDetections(canvas, resized);
            faceapi.draw.drawFaceLandmarks(canvas, resized);

            const desc = det.descriptor as Float32Array;
            let label = 'unknown';

            if (matcher) {
              const best = matcher.findBestMatch(desc);
              if (best.distance <= THRESHOLD && best.label !== 'unknown')
                label = best.label;
            } if (label === 'unknown') {
              setPendingDesc(desc);
              setDialogMode('name');   // ⇒ "Give this face a name"
              setDialogOpen(true);
            } else {
              setRecognizedName(label);
              setDialogMode('info');   // ⇒ "Hi Alice, we know you!"
              setDialogOpen(true);
            }

            /* freeze */
            video.pause();
            (video.srcObject as MediaStream)
              .getTracks()
              .forEach(t => t.stop());
            setPhase(Phase.Frozen);
            return;
          }
        } catch (e: any) {
          setAppErr(e.message);
        } finally {
          busy = false;
        }
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [phase, matcher]);

  /* ─── handlers ─── */  const restart = useCallback(() => {
    const c = canvasRef.current;
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    setRecognizedName(null);
    setDialogOpen(false);
    setDialogMode(null);
    setPhase(Phase.Camera); // this will re-open camera through hook
  }, []);
  const handleSaveName = () => {
    if (!pendingDesc) return;
    const clean = (inputName || `person_${Date.now()}`).trim();
    addDescriptor(clean, pendingDesc);

    setRecognizedName(clean);
    setInputName('');
    setPendingDesc(null);
    setDialogOpen(false);   // closing the dialog lets the countdown start
    setDialogMode(null);
  };

  /* ─── UI ─── */
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-black">
      <div className="relative w-full max-w-xl">
        <video ref={videoRef} className="w-full" autoPlay playsInline muted />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full pointer-events-none"
        />
      </div>

      {appErr && <p className="mt-4 text-red-500">{appErr}</p>}
      {phase === Phase.LoadingModels && (
        <p className="mt-4 text-white">Loading face detector…</p>
      )}      {phase === Phase.Frozen && !dialogOpen && (
        <Button
          onClick={restart}
          className="absolute mt-6 rounded-none uppercase text-white bg-emerald-500"
        >
          {recognizedName
            ? `${recognizedName} · detect`
            : `detect (${countdown})`}
        </Button>
      )}      {/* ─── Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'info'
                ? `Hello, ${recognizedName}!`
                : 'Name this face'}
            </DialogTitle>
          </DialogHeader>
          {dialogMode === 'name' && (
            <>
              <Input
                autoFocus
                placeholder="Type a name…"
                value={inputName}
                onChange={e => setInputName(e.currentTarget.value)}
                className="mt-4"
              />
              <DialogFooter className="mt-4">
                <Button onClick={handleSaveName} className="w-full">
                  Save
                </Button>
              </DialogFooter>
            </>
          )}
          {dialogMode === 'info' && (
            <DialogFooter className="mt-4">
              <Button
                onClick={() => {
                  setDialogOpen(false);
                  setDialogMode(null);
                }}
                className="w-full"
              >
                OK
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}