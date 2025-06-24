import { useRef, useEffect, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'
export default function App() {
  // DOM refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // UI state
  const [loadErr, setLoadErr] = useState('')
  const [modelReady, setModelReady] = useState(false)
  /* ---------------- Model Loader ---------------- */
  useEffect(() => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models')
    ])
      .then(() => setModelReady(true))
      .catch(err => setLoadErr(`Model: ${err.message}`))
  }, [])

  /* ---------------- Camera Stream ---------------- */
  useEffect(() => {
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: { facingMode: 'user' } // allow fallback; "exact" is brittle
    }

    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream })
      .catch(err => setLoadErr(`Camera: ${err.message}`))

    return () => {
      // Close camera when component unmounts
      videoRef.current?.srcObject &&
        (videoRef.current.srcObject as MediaStream)
          .getTracks().forEach(t => t.stop())
    }
  }, [])
  /* ---------------- Draw helper ---------------- */
  const drawDetection = useCallback((result: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>) => {
    const video = videoRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, canvas.width, canvas.height) // remove stale box

    const displaySize = { width: video.videoWidth, height: video.videoHeight }
    const resizedResults = faceapi.resizeResults(result, displaySize)

    // Draw face detection box
    faceapi.draw.drawDetections(canvas, resizedResults)
    // Draw face landmarks
    faceapi.draw.drawFaceLandmarks(canvas, resizedResults)
  }, [])

  /* ---------------- Detection Loop ---------------- */
  useEffect(() => {
    if (!modelReady) return

    let busy = false      // prevents overlapping async calls
    let rafId: number

    const step = async () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) { rafId = requestAnimationFrame(step); return }      // keep canvas dims synced to video frame (cheap)
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight

      if (!busy) {
        busy = true

        const result = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
        if (result) drawDetection(result) // clear+draw only when a face is found
        // else: leave old box visible

        busy = false
      }
      rafId = requestAnimationFrame(step)
    }

    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [modelReady, drawDetection])

  /* ---------------- UI ---------------- */
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      <div className="relative w-full max-w-xl">
        <video ref={videoRef} className="w-full" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>

      {loadErr && <p className="mt-4 text-red-500">{loadErr}</p>}
      {!modelReady && !loadErr && <p className="mt-4 text-white">Loading face detector…</p>}
    </div>
  )
}
