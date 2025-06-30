import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as faceapi from 'face-api.js';
import { useRef, useEffect, useState } from 'react';
import { db, initDatabase, syncToSupabase, syncFromSupabase, logRecognition } from '../database';
import { WorkerProfile } from '../types';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const loadModels = () => Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
]);

const findWorkerByFace = async (faceDescriptor: Float32Array): Promise<WorkerProfile | null> => {
    const faceDescriptors = await db.face_descriptors.toArray();
    if (!faceDescriptors.length) return null;

    const labeledDescriptors = faceDescriptors.map(fd =>
        new faceapi.LabeledFaceDescriptors(fd.worker_id, [new Float32Array(fd.descriptor)])
    );

    const match = new faceapi.FaceMatcher(labeledDescriptors, 0.6).findBestMatch(faceDescriptor);
    return match.label !== 'unknown' ? await db.worker_profiles.get(match.label) || null : null;
};

function App() {
    const navigate = useNavigate()
    const videoRef = useRef<HTMLVideoElement>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [result, setResult] = useState('');
    const [showDialog, setShowDialog] = useState(false);
    const [showNewFaceDialog, setShowNewFaceDialog] = useState(false);
    const [currentFace, setCurrentFace] = useState<Float32Array | null>(null);
    const [recognizedWorker, setRecognizedWorker] = useState<WorkerProfile | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);

    // Add debug state for mobile debugging
    const [debugInfo, setDebugInfo] = useState<string[]>([]);
    const [deviceInfo, setDeviceInfo] = useState('');

    const addDebug = (message: string) => {
        setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    // Detect device type for iPhone-specific handling
    useEffect(() => {
        const userAgent = navigator.userAgent;
        const isIPhone = /iPhone/i.test(userAgent);
        const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
        const info = `${isIPhone ? 'iPhone' : 'Other'} - ${isSafari ? 'Safari' : 'Other Browser'}`;
        setDeviceInfo(info);
        addDebug(`Device: ${info}`);
    }, []);

    useEffect(() => {
        const initialize = async () => {
            addDebug('Starting initialization...');
            try {
                await initDatabase();
                addDebug('Database initialized');
                await loadModels();
                addDebug('Models loaded');
                await syncToSupabase();
                addDebug('Synced to Supabase');
                await syncFromSupabase();
                addDebug('Synced from Supabase');
                setModelsLoaded(true);
                addDebug('Ready for face detection');
            } catch (error) {
                addDebug(`Init error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        };
        initialize();
    }, []);

    useEffect(() => {
        if (!modelsLoaded) return;

        let stream: MediaStream;
        addDebug('Setting up camera...');

        // iPhone-specific camera constraints
        const isIPhone = /iPhone/i.test(navigator.userAgent);
        const constraints = {
            video: {
                facingMode: 'user',
                width: isIPhone ? { ideal: 480, max: 640 } : { ideal: 640 },
                height: isIPhone ? { ideal: 360, max: 480 } : { ideal: 480 },
                frameRate: isIPhone ? { ideal: 15, max: 30 } : { ideal: 30 }
            },
            audio: false
        };

        addDebug(`Camera constraints: ${JSON.stringify(constraints.video)}`);

        navigator.mediaDevices.getUserMedia(constraints)
            .then(mediaStream => {
                stream = mediaStream;
                const video = videoRef.current;
                if (video) {
                    video.srcObject = stream;
                    video.onloadedmetadata = () => {
                        addDebug(`Video ready: ${video.videoWidth}x${video.videoHeight}`);
                        // iPhone requires explicit play() call
                        video.play()
                            .then(() => addDebug('Video playing successfully'))
                            .catch(err => addDebug(`Play error: ${err.message}`));
                    };
                    video.onerror = (err) => addDebug(`Video error: ${err}`);
                }
            })
            .catch(err => addDebug(`Camera error: ${err.message}`));

        return () => stream?.getTracks().forEach(track => track.stop());
    }, [modelsLoaded]);

    useEffect(() => {
        if (!modelsLoaded || result || showNewFaceDialog) return;

        let detectionCount = 0;
        let lastFaceTime = 0;
        const isIPhone = /iPhone/i.test(navigator.userAgent);

        const detect = async () => {
            const video = videoRef.current;
            if (!video?.videoWidth || !video?.videoHeight) {
                return requestAnimationFrame(detect);
            }

            detectionCount++;
            if (detectionCount === 1) {
                addDebug('Starting face detection loop');
            }
            if (detectionCount % 30 === 0) { // Show every 30th detection for more frequent updates
                addDebug(`Detection attempt #${detectionCount}`);
            }

            try {
                // iPhone-optimized detection options
                const options = new faceapi.TinyFaceDetectorOptions({
                    inputSize: isIPhone ? 320 : 416,  // Smaller input for iPhone
                    scoreThreshold: isIPhone ? 0.2 : 0.3  // Lower threshold for iPhone
                });

                addDebug(`Using inputSize: ${options.inputSize}, threshold: ${options.scoreThreshold}`);

                const face = await faceapi.detectSingleFace(video, options)
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (face) {
                    const now = Date.now();
                    if (now - lastFaceTime > 1000) { // More frequent face detection messages
                        addDebug(`Face detected! Score: ${face.detection.score.toFixed(3)}, Descriptor length: ${face.descriptor.length}`);
                        lastFaceTime = now;
                    }

                    const worker = await findWorkerByFace(face.descriptor);
                    if (worker) {
                        addDebug(`Worker found: ${worker.nombres}`);
                        setRecognizedWorker(worker);
                        setResult(`${worker.nombres} ${worker.apellidos}`);
                        setCountdown(3);
                        // Detection stops here - result is set
                        return;
                    } else {
                        addDebug('Face not in database - showing dialog');
                        // Face not recognized - show dialog and stop detection
                        setCurrentFace(face.descriptor);
                        setShowNewFaceDialog(true);
                        // Detection stops here - dialog is shown
                        return;
                    }
                } else {
                    if (detectionCount % 100 === 0) {
                        addDebug('No face detected in frame');
                    }
                }
            } catch (error) {
                if (detectionCount % 50 === 0) { // Show errors more frequently
                    addDebug(`Detection error: ${error instanceof Error ? error.message : 'Unknown'}`);
                }
            }

            // Add longer delay for iPhone to prevent overwhelming the device
            const delay = isIPhone ? 100 : 50;
            setTimeout(() => requestAnimationFrame(detect), delay);
        };

        detect();
    }, [modelsLoaded, result, showNewFaceDialog]);

    useEffect(() => {
        if (!countdown || countdown <= 0) return;

        const timer = setTimeout(() => {
            if (countdown === 1) {
                if (recognizedWorker) {
                    logRecognition(recognizedWorker.id);

                    // Check if worker has admin role and redirect
                    if (recognizedWorker.cargo === 'admin') {
                        navigate({ to: '/admin' });
                        return;
                    }
                }
                setResult('');
                setRecognizedWorker(null);
                setCountdown(null);
            } else {
                setCountdown(countdown - 1);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdown, recognizedWorker, navigate]);

    const handleWelcomeClick = async () => {
        if (recognizedWorker) {
            await logRecognition(recognizedWorker.id);

            // Check if worker has admin role and redirect
            if (recognizedWorker.cargo === 'admin') {
                navigate({ to: '/admin' });
                return;
            }
        }
        setResult('');
        setRecognizedWorker(null);
        setCountdown(null);
    };

    const handleRegisterFace = async () => {
        if (!currentFace) return;

        const identifier = prompt('Rostro no reconocido. Ingrese PIN o cédula:');
        if (!identifier) {
            setShowDialog(false);
            return;
        }

        const existingWorker = await db.worker_profiles
            .where('pin').equals(identifier)
            .or('cedula').equals(identifier)
            .first();

        if (existingWorker) {
            await db.face_descriptors.add({
                id: crypto.randomUUID(),
                worker_id: existingWorker.id,
                descriptor: Array.from(currentFace)
            });

            await syncToSupabase();
            await logRecognition(existingWorker.id);
            setResult(`${existingWorker.nombres} ${existingWorker.apellidos}`);
            setShowDialog(false);
        } else {
            alert('Trabajador no encontrado con ese PIN o cédula');
            setShowDialog(false);
        }
    };

    const handleRegisterNewFace = async () => {
        if (!currentFace) return;

        const identifier = prompt('Rostro no reconocido. Ingrese PIN o cédula para registrar:');
        if (!identifier) {
            setShowNewFaceDialog(false);
            setCurrentFace(null);
            return;
        }

        const existingWorker = await db.worker_profiles
            .where('pin').equals(identifier)
            .or('cedula').equals(identifier)
            .first();

        if (existingWorker) {
            await db.face_descriptors.add({
                id: crypto.randomUUID(),
                worker_id: existingWorker.id,
                descriptor: Array.from(currentFace)
            });

            await syncToSupabase();
            await logRecognition(existingWorker.id);
            setResult(`${existingWorker.nombres} ${existingWorker.apellidos}`);
            setShowNewFaceDialog(false);
            setCurrentFace(null);
        } else {
            alert('Trabajador no encontrado con ese PIN o cédula');
            setShowNewFaceDialog(false);
            setCurrentFace(null);
        }
    };

    if (!modelsLoaded) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white text-center p-4">
                <div>
                    <div className="text-3xl mb-4">Loading...</div>
                    <div className="text-sm space-y-1">
                        {debugInfo.map((info, i) => (
                            <div key={i}>{info}</div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen items-center justify-center bg-black relative">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                // width="1280"
                // height="720"
                className="max-w-full max-h-full object-cover"
                style={{ display: 'block', transform: 'scaleX(-1)' }}
            />

            {/* Debug overlay - only show when no result */}
            {!result && !showNewFaceDialog && (
                <div className="absolute top-2 left-2 right-2 bg-black/70 text-white text-xs p-2 rounded max-h-40 overflow-y-auto z-10">
                    <div className="font-bold mb-1">Debug Info ({deviceInfo}):</div>
                    {debugInfo.slice(-6).map((info, i) => (
                        <div key={i}>{info}</div>
                    ))}

                    {/* iPhone test button */}
                    {/iPhone/i.test(navigator.userAgent) && (
                        <button
                            className="mt-2 bg-red-600 text-white px-2 py-1 rounded text-xs"
                            onClick={async () => {
                                const video = videoRef.current;
                                if (video) {
                                    addDebug(`Test: Video ${video.videoWidth}x${video.videoHeight}, ready: ${video.readyState}`);
                                    try {
                                        const face = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
                                            inputSize: 320,
                                            scoreThreshold: 0.1
                                        }));
                                        addDebug(`Test result: ${face ? `Face found, score: ${face.score.toFixed(3)}` : 'No face'}`);
                                    } catch (err) {
                                        addDebug(`Test error: ${err instanceof Error ? err.message : 'Unknown'}`);
                                    }
                                }
                            }}
                        >
                            Test Detection
                        </button>
                    )}
                </div>
            )}

            {result && (
                <div
                    className="absolute inset-0 bg-blue-500/90 flex flex-col items-center justify-center text-white cursor-pointer p-4"
                    onClick={handleWelcomeClick}
                >
                    <h2 className="text-4xl capitalize w-full text-center justify-center">
                        <span className='text-2xl font-light'>Bienvenido</span> <br /> {result}
                    </h2>
                    {countdown && (
                        <div className="text-xl mt-4 opacity-75">
                            Cerrando en {countdown}s
                        </div>
                    )}
                    <Button
                        className="text-white h-16 w-full m-4 text-xl absolute bottom-0 left-0 right-0 m-0 rounded-none"
                        onClick={(e) => {
                            e.stopPropagation();
                            setCountdown(null);
                            setShowDialog(true);
                        }}
                    >
                        ¿Incorrecto?
                    </Button>
                </div>
            )}

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>¿Qué deseas hacer?</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                        <Button
                            className="h-16 text-xl"
                            onClick={() => {
                                setShowDialog(false);
                                setResult('');
                                setRecognizedWorker(null);
                                setCountdown(null);
                            }}
                        >
                            Reintentar
                        </Button>
                        <Button className="h-16 text-xl" onClick={handleRegisterFace}>
                            Cédula
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showNewFaceDialog} onOpenChange={setShowNewFaceDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Rostro no reconocido</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-gray-600">
                            Hemos detectado un rostro que no está registrado en el sistema.
                        </p>
                        <Button
                            className="h-16 text-xl"
                            onClick={handleRegisterNewFace}
                        >
                            Registrar con PIN/Cédula
                        </Button>
                        <Button
                            variant="outline"
                            className="h-16 text-xl"
                            onClick={() => {
                                setShowNewFaceDialog(false);
                                setCurrentFace(null);
                            }}
                        >
                            Cancelar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export const Route = createFileRoute('/')({
    component: App,
})