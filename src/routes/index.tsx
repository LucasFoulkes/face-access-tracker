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
    const addDebug = (message: string) => {
        setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
    };

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

        navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        })
            .then(mediaStream => {
                stream = mediaStream;
                const video = videoRef.current;
                if (video) {
                    video.srcObject = stream;
                    video.onloadedmetadata = () => {
                        addDebug(`Video ready: ${video.videoWidth}x${video.videoHeight}`);
                        video.play().catch(err => addDebug(`Play error: ${err.message}`));
                    };
                }
            })
            .catch(err => addDebug(`Camera error: ${err.message}`));

        return () => stream?.getTracks().forEach(track => track.stop());
    }, [modelsLoaded]);

    useEffect(() => {
        if (!modelsLoaded || result || showNewFaceDialog) return;

        let detectionCount = 0;
        let lastFaceTime = 0;

        const detect = async () => {
            const video = videoRef.current;
            if (!video?.videoWidth) return requestAnimationFrame(detect);

            detectionCount++;
            if (detectionCount === 1) {
                addDebug('Starting face detection loop');
            }
            if (detectionCount % 50 === 0) { // Show every 50th detection
                addDebug(`Detection attempt #${detectionCount}`);
            }

            try {
                const face = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
                    inputSize: 416,
                    scoreThreshold: 0.3
                })).withFaceLandmarks().withFaceDescriptor();

                if (face) {
                    const now = Date.now();
                    if (now - lastFaceTime > 2000) { // Don't spam face detection messages
                        addDebug(`Face detected! Score: ${face.detection.score.toFixed(2)}`);
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
                }
            } catch (error) {
                if (detectionCount % 100 === 0) { // Only show errors occasionally
                    addDebug(`Detection error: ${error instanceof Error ? error.message : 'Unknown'}`);
                }
            }
            requestAnimationFrame(detect);
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
                <div className="absolute top-2 left-2 right-2 bg-black/70 text-white text-xs p-2 rounded max-h-32 overflow-y-auto z-10">
                    <div className="font-bold mb-1">Debug Info:</div>
                    {debugInfo.slice(-5).map((info, i) => (
                        <div key={i}>{info}</div>
                    ))}
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