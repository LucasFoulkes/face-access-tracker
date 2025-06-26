import * as faceapi from 'face-api.js';
import { useRef, useEffect, useState } from 'react';

// Face storage utilities
const faceStorage = {
  get: () => JSON.parse(localStorage.getItem('faces') || '[]'),
  add: (name: string, descriptor: Float32Array) => {
    const faces = faceStorage.get();
    localStorage.setItem('faces', JSON.stringify([...faces, { name, descriptor: Array.from(descriptor) }]));
  }
};

const findMatch = (descriptor: Float32Array) => {
  const faces = faceStorage.get();
  if (!faces.length) return null;

  const descriptors = faces.map(({ name, descriptor }: any) =>
    new faceapi.LabeledFaceDescriptors(name, [new Float32Array(descriptor)]));

  const match = new faceapi.FaceMatcher(descriptors, 0.9).findBestMatch(descriptor);
  return match.label !== 'unknown' ? match.label : null;
};

// Face detection logic
const detectFace = async (video: HTMLVideoElement) => {
  return await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks().withFaceDescriptor();
};

const handleFaceResult = (face: any, setResult: (name: string) => void) => {
  const knownName = findMatch(face.descriptor);

  if (knownName) return setResult(knownName);

  const newName = prompt('Enter name:');
  if (newName) {
    faceStorage.add(newName, face.descriptor);
    setResult(newName);
  }
};

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [result, setResult] = useState<string>('');

  // Load models
  useEffect(() => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models')
    ]).then(() => setLoaded(true));
  }, []);

  // Camera stream
  useEffect(() => {
    if (!loaded || result) return;

    let stream: MediaStream;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(mediaStream => {
        stream = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => console.error('Video play failed:', err));
        }
      })
      .catch(err => alert(`Camera error: ${err.message}`));

    return () => stream?.getTracks().forEach(track => track.stop());
  }, [loaded, result]);

  // Face detection loop
  useEffect(() => {
    if (!loaded || result) return;

    const detect = async () => {
      const video = videoRef.current;
      if (!video?.videoWidth) return requestAnimationFrame(detect);

      try {
        const face = await detectFace(video);
        if (face) {
          handleFaceResult(face, setResult);
        } else {
          requestAnimationFrame(detect);
        }
      } catch {
        requestAnimationFrame(detect);
      }
    };

    detect();
  }, [loaded, result]);

  if (!loaded) return <div className="flex h-screen items-center justify-center bg-black text-white text-3xl">Loading...</div>;

  return (
    <div className="flex h-screen items-center justify-center bg-black relative">
      <video ref={videoRef} autoPlay playsInline muted className="max-w-full max-h-full object-cover" />
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