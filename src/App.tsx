import { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Button } from './components/ui/button';

const MODEL_URI = '/models';
const LOCAL_KEY = 'face_descriptors_v1';

export default function App() {
  // ---------- Refs ----------
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ---------- State ----------
  const [err, setErr] = useState('');
  const [modelReady, setMR] = useState(false);
  const [videoReady, setVR] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [matcher, setMatcher] = useState<faceapi.FaceMatcher | null>(null);

  /* ---------- Storage helpers ---------- */
  const loadDB = () =>
    (JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as {
      label: string;
      descriptors: number[][];
    }[]).map(
      (r) =>
        new faceapi.LabeledFaceDescriptors(
          r.label,
          r.descriptors.map((d) => new Float32Array(d))
        )
    );

  const saveDescriptor = (label: string, desc: Float32Array) => {
    const db = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    const hit = db.find((e: any) => e.label === label);
    if (hit) hit.descriptors.push(Array.from(desc));
    else db.push({ label, descriptors: [Array.from(desc)] });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(db));
  };

  /* ---------- Restart handler ---------- */
  const restart = useCallback(() => {
    setFrozen(false);
    setVR(false);
    setCountdown(0);
    const c = canvasRef.current;
    c && c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
  }, []);

  /* ---------- Load models ---------- */
  useEffect(() => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI),
    ])
      .then(() => setMR(true))
      .catch((e) => setErr(`model: ${e.message}`));
  }, []);

  /* ---------- Build matcher once models are ready ---------- */
  useEffect(() => {
    if (!modelReady) return;
    const db = loadDB();
    if (db.length) setMatcher(new faceapi.FaceMatcher(db, 0.55));
  }, [modelReady]);

  /* ---------- Open / close camera ---------- */
  useEffect(() => {
    if (frozen) return;

    navigator.mediaDevices
      .getUserMedia({ audio: false, video: { facingMode: 'user' } })
      .then((stream) => {
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        v.onloadedmetadata = () => {
          setVR(true);
          v.play().catch(() => { });
        };
      })
      .catch((e) => setErr(`cam: ${e.message}`));

    return () => {
      videoRef.current?.srcObject &&
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
    };
  }, [frozen]);

  /* ---------- Draw helper ---------- */
  const drawDetection = useCallback(
    (
      result: faceapi.WithFaceDescriptor<
        faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>
      >
    ) => {
      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const resized = faceapi.resizeResults(result, {
        width: video.videoWidth,
        height: video.videoHeight,
      });
      faceapi.draw.drawDetections(canvas, resized);
      faceapi.draw.drawFaceLandmarks(canvas, resized);
    },
    []
  );

  /* ---------- Detection loop ---------- */
  useEffect(() => {
    if (!modelReady || !videoReady || frozen) return;

    let busy = false,
      raf: number;
    const step = async () => {
      const v = videoRef.current,
        c = canvasRef.current;
      if (!v || !c) {
        raf = requestAnimationFrame(step);
        return;
      }
      if (c.width !== v.videoWidth) c.width = v.videoWidth;
      if (c.height !== v.videoHeight) c.height = v.videoHeight;

      if (!busy) {
        busy = true;
        try {
          const det = await faceapi
            .detectSingleFace(v, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
          if (det) {
            const desc = det.descriptor as Float32Array;
            let label = 'unknown';

            if (matcher) {
              const best = matcher.findBestMatch(desc);
              if (best.distance <= 0.55 && best.label !== 'unknown')
                label = best.label;
            }

            if (label === 'unknown') {
              label = `person_${Date.now()}`;
              saveDescriptor(label, desc);
              setMatcher(new faceapi.FaceMatcher(loadDB(), 0.55));
            }

            console.log(`⟹ ${label}`);
            drawDetection(det);

            v.pause();
            (v.srcObject as MediaStream)
              .getTracks()
              .forEach((t) => t.stop());
            setFrozen(true);
            setCountdown(5);
            return;
          }
        } finally {
          busy = false;
        }
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [modelReady, videoReady, frozen, matcher, drawDetection]);

  /* ---------- Countdown timer ---------- */
  useEffect(() => {
    if (!frozen || countdown <= 0) return;

    const timer = setTimeout(() => {
      if (countdown === 1) {
        restart();
      } else {
        setCountdown((c) => c - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [frozen, countdown, restart]);

  /* ---------- UI ---------- */
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-black">
      <div className="relative w-full max-w-xl">
        <video
          ref={videoRef}
          className="w-full"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full pointer-events-none"
        />
      </div>

      {err && <p className="mt-4 text-red-500">{err}</p>}
      {!modelReady && !err && (
        <p className="mt-4 text-white">Loading face detector…</p>
      )}
      {frozen && (
        <Button
          onClick={restart}
          className="absolute mt-6 rounded-none uppercase text-white bg-emerald-500"
        >
          {countdown > 0 ? `detect (${countdown})` : 'detect'}
        </Button>
      )}
    </div>
  );
}
