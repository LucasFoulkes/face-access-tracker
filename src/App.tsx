import './App.css'
import { useRef, useEffect, useState } from 'react'

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');

  const cameraConstraints = {
    audio: false,
    video: { facingMode: { exact: "user" }, }
  };

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError(`Camera access failed: ${(err as Error).message}`);
    }
  };

  useEffect(() => {
    initializeCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center flex-1 justify-center items-center h-screen bg-black">
      <video
        ref={videoRef}
        className="w-full"
        autoPlay
        playsInline
        muted
      />

      {error && (
        <div className="mt-4 text-red-500 text-center">{error}</div>
      )}
    </div>
  )
}

export default App