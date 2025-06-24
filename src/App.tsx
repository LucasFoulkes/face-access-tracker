// App.tsx — React + face-api.js
// Updated to wait for video metadata before starting detection.

import { useRef, useEffect, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'

const MODEL_URI = '/models'

export default function App() {
  /* ---------- Refs ---------- */
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  /* ---------- State ---------- */
  const [err, setErr] = useState('')
  const [modelReady, setModelReady] = useState(false)
  const [videoReady, setVideoReady] = useState(false) // <- new flag
  /* ---------- Load model ---------- */
  useEffect(() => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI)
    ])
      .then(() => setModelReady(true))
      .catch(e => setErr(`model: ${e.message}`))
  }, [])

  /* ---------- Open camera ---------- */
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user' } })
      .then(stream => {
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          v.onloadedmetadata = () => {
            setVideoReady(true)        // we now know videoWidth/Height > 0
            v.play().catch(() => {/* autoplay rejection ignored; muted flag helps */ })
          }
        }
      })
      .catch(e => setErr(`cam: ${e.message}`))

    return () => {
      videoRef.current?.srcObject &&
        (videoRef.current.srcObject as MediaStream)
          .getTracks().forEach(t => t.stop())
    }
  }, [])
  /* ---------- Draw helper ---------- */
  const drawDetection = useCallback((result: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>) => {
    const video = videoRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const resizedResults = faceapi.resizeResults(result, { width: video.videoWidth, height: video.videoHeight })
    faceapi.draw.drawDetections(canvas, resizedResults)
    faceapi.draw.drawFaceLandmarks(canvas, resizedResults)
  }, [])

  /* ---------- Detection loop ---------- */
  useEffect(() => {
    if (!modelReady || !videoReady) return  // wait for both resources

    let busy = false, raf: number

    const step = async () => {
      const v = videoRef.current
      const c = canvasRef.current
      if (!v || !c) { raf = requestAnimationFrame(step); return }

      // sync canvas dims with video frame size
      if (c.width !== v.videoWidth) c.width = v.videoWidth
      if (c.height !== v.videoHeight) c.height = v.videoHeight

      if (!busy) {
        busy = true
        const det = await faceapi.detectSingleFace(v, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks() // <- detect with landmarks
        if (det) drawDetection(det) // clear+draw only when we have a face
        busy = false
      }
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [modelReady, videoReady, drawDetection])

  /* ---------- UI ---------- */
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      <div className="relative w-full max-w-xl">
        <video ref={videoRef} className="w-full" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>

      {err && <p className="mt-4 text-red-500">{err}</p>}
      {!modelReady && !err && <p className="mt-4 text-white">Loading face detector…</p>}
    </div>
  )
}
