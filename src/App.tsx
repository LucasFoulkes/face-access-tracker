import { useRef, useEffect, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'
import { Button } from './components/ui/button'

const MODEL_URI = '/models'

export default function App() {
  /* ---------- Refs ---------- */
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  /* ---------- State ---------- */
  const [err, setErr] = useState('')
  const [modelReady, setMR] = useState(false)
  const [videoReady, setVR] = useState(false)
  const [frozen, setFrozen] = useState(false)   /* ★ */
  const [browserSupported, setBrowserSupported] = useState(true)

  /* ---------- Browser Compatibility Check ---------- */
  useEffect(() => {
    const checkBrowserSupport = () => {
      const userAgent = navigator.userAgent
      const isChrome = /Chrome/.test(userAgent)
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)
      const isFirefox = /Firefox/.test(userAgent)

      // Check Chrome version
      if (isChrome) {
        const chromeVersion = userAgent.match(/Chrome\/(\d+)/)?.[1]
        if (chromeVersion && parseInt(chromeVersion) < 70) {
          setErr(`Chrome ${chromeVersion} is too old. Please update to Chrome 70+`)
          setBrowserSupported(false)
          return
        }
      }

      // Check for required APIs
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErr('Camera access not supported in this browser')
        setBrowserSupported(false)
        return
      }

      if (!window.requestAnimationFrame) {
        setErr('Animation not supported in this browser')
        setBrowserSupported(false)
        return
      }

      console.log('Browser:', isChrome ? `Chrome ${userAgent.match(/Chrome\/(\d+)/)?.[1]}` :
        isSafari ? 'Safari' :
          isFirefox ? 'Firefox' : 'Unknown')
    }

    checkBrowserSupport()
  }, [])

  /* ---------- Restart handler ---------- */
  const restart = useCallback(() => {
    setFrozen(false)          // reopen camera → detection loop resumes
    setVR(false)              // force metadata wait
    // wipe old drawing
    const c = canvasRef.current
    c && c.getContext('2d')?.clearRect(0, 0, c.width, c.height)
  }, [])
  /* ---------- Load models (unchanged) ---------- */
  useEffect(() => {
    if (!browserSupported) return

    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI)
    ])
      .then(() => setMR(true))
      .catch(e => setErr(`model: ${e.message}`))
  }, [browserSupported])
  /* ---------- Open / close camera (keyed on frozen) ---------- */
  useEffect(() => {
    if (frozen || !browserSupported) return            // skip while frozen or unsupported

    navigator.mediaDevices
      .getUserMedia({ audio: false, video: { facingMode: 'user' } })
      .then(stream => {
        const v = videoRef.current
        if (!v) return
        v.srcObject = stream
        v.onloadedmetadata = () => { setVR(true); v.play().catch(() => { }) }
      })
      .catch(e => setErr(`cam: ${e.message}`))

    return () => {
      videoRef.current?.srcObject &&
        (videoRef.current.srcObject as MediaStream)
          .getTracks().forEach(t => t.stop())
    }
  }, [frozen, browserSupported])

  /* ---------- Draw helper (unchanged) ---------- */
  const drawDetection = useCallback((result: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>) => {
    const video = videoRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const resized = faceapi.resizeResults(result, { width: video.videoWidth, height: video.videoHeight })
    faceapi.draw.drawDetections(canvas, resized)
    faceapi.draw.drawFaceLandmarks(canvas, resized)
  }, [])

  /* ---------- Detection loop (unchanged logic) ---------- */
  useEffect(() => {
    if (!modelReady || !videoReady || frozen) return

    let busy = false, raf: number
    const step = async () => {
      const v = videoRef.current, c = canvasRef.current
      if (!v || !c) { raf = requestAnimationFrame(step); return }

      if (c.width !== v.videoWidth) c.width = v.videoWidth
      if (c.height !== v.videoHeight) c.height = v.videoHeight

      if (!busy) {
        busy = true
        try {
          const det = await faceapi
            .detectSingleFace(v, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
          if (det) {
            drawDetection(det)
            v.pause()
              ; (v.srcObject as MediaStream).getTracks().forEach(t => t.stop())
            setFrozen(true)        // stop everything
            return
          }
        } finally { busy = false }
      }
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [modelReady, videoReady, frozen, drawDetection])
  /* ---------- UI ---------- */
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center" style={{ backgroundColor: '#000000' }}>
      <div className="relative w-full max-w-xl">
        <video ref={videoRef} className="w-full" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />
      </div>

      {err && <p className="mt-4 text-red-500">{err}</p>}
      {!modelReady && !err && <p className="mt-4 text-white">Loading face detector…</p>}
      {frozen && (
        <Button
          onClick={restart}
          className="absolute mt-6 rounded-none uppercase text-white"
          style={{ backgroundColor: '#10b981' }}
        >
          detect
        </Button>
      )}
    </div>
  )
}
