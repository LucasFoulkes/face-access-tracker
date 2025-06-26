import * as faceapi from 'face-api.js';
import { useRef, useEffect, useState } from 'react';

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [result, setResult] = useState<string>('');

  useEffect(() => {
    // Load models
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models')
    ]).then(() => setLoaded(true));
  }, []);

  useEffect(() => {
    // Setup camera
    navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
    }).then(stream => {
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play().catch(console.error);
      }
    }).catch(err => alert(`Camera error: ${err.message}`));
  }, []);

  useEffect(() => {
    if (!loaded || result) return;

    const detect = async () => {
      const video = videoRef.current;
      if (!video?.videoWidth) return requestAnimationFrame(detect);

      try {
        const face = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks().withFaceDescriptor();

        if (!face) return requestAnimationFrame(detect);

        const faces = JSON.parse(localStorage.getItem('faces') || '[]');
        let name = null;

        // Try to match existing faces
        if (faces.length) {
          const descriptors = faces.map(({ name, descriptor }: any) =>
            new faceapi.LabeledFaceDescriptors(name, [new Float32Array(descriptor)]));

          const match = new faceapi.FaceMatcher(descriptors, 0.6).findBestMatch(face.descriptor);
          if (match.label !== 'unknown') name = match.label;
        }

        // Prompt for new face
        if (!name && (name = prompt('Enter name:'))) {
          localStorage.setItem('faces', JSON.stringify([...faces, { name, descriptor: Array.from(face.descriptor) }]));
        }

        name ? setResult(name) : requestAnimationFrame(detect);
      } catch {
        requestAnimationFrame(detect);
      }
    };

    detect();
  }, [loaded, result]);

  if (!loaded) return <div className="flex h-screen items-center justify-center bg-black text-white text-3xl">Loading...</div>;

  return (
    <div className="flex h-screen items-center justify-center bg-black relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width="1280"
        height="720"
        className="max-w-full max-h-full object-cover"
        style={{ display: 'block' }}
      />
      {result && (
        <div className="absolute inset-0 bg-blue-500/90 flex flex-col items-center justify-center text-white cursor-pointer"
          onClick={() => setResult('')}>
          <h2 className="text-4xl font-bold">Welcome {result}!</h2>
          <p className="mt-4">Tap to detect again</p>
        </div>
      )}
    </div>
  );
}