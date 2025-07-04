// working alpha version with iPhone support and model loading diagnostics
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as faceapi from 'face-api.js';
import { useRef, useEffect, useState } from 'react';
import { db, initDatabase, syncToSupabase, syncFromSupabase, logRecognition } from '../database';
import { WorkerProfile } from '../types';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const loadModels = async () => {
    try {
        const isIPhone = /iPhone/i.test(navigator.userAgent);
        const modelPath = '/models';

        // Test if models directory is accessible with detailed diagnostics
        const modelFiles = [
            'tiny_face_detector_model-weights_manifest.json',
            'tiny_face_detector_model-shard1',
            'face_landmark_68_model-weights_manifest.json',
            'face_landmark_68_model-shard1',
            'face_recognition_model-weights_manifest.json',
            'face_recognition_model-shard1',
            'face_recognition_model-shard2'
        ];

        console.log('Testing model file accessibility...');
        const accessResults = [];

        for (const file of modelFiles) {
            try {
                const url = `${modelPath}/${file}`;
                console.log(`Testing: ${url}`);
                const testResponse = await fetch(url, {
                    method: 'HEAD', // Use HEAD to avoid downloading large files
                    cache: 'no-cache'
                });

                const result = `${file}: ${testResponse.status} ${testResponse.statusText} (${testResponse.headers.get('content-type') || 'no content-type'})`;
                console.log(result);
                accessResults.push(result);

                if (!testResponse.ok) {
                    throw new Error(`File ${file} returned ${testResponse.status}: ${testResponse.statusText}`);
                }
            } catch (fetchError) {
                const errorMsg = `${file}: FAILED - ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`;
                console.error(errorMsg);
                accessResults.push(errorMsg);
                throw new Error(`Model file check failed for ${file}: ${fetchError instanceof Error ? fetchError.message : 'Unknown'}`);
            }
        }

        console.log('All model files are accessible:', accessResults);
        console.log('Current URL:', window.location.href);
        console.log('Base URL for models:', window.location.origin + modelPath);

        // iPhone-specific model loading with retries and smaller timeouts
        const loadWithRetry = async (loadFunction: () => Promise<any>, modelName: string, retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try {
                    console.log(`Loading ${modelName}, attempt ${i + 1}/${retries}`);
                    await loadFunction();
                    console.log(`${modelName} loaded successfully`);
                    return;
                } catch (error) {
                    const errorMsg = `${modelName} loading attempt ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    console.error(errorMsg);

                    // Log specific error details for debugging
                    if (error instanceof Error) {
                        console.error(`Error name: ${error.name}`);
                        console.error(`Error stack: ${error.stack}`);
                    }

                    if (i === retries - 1) {
                        throw new Error(`${modelName} failed after ${retries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Progressive delay
                }
            }
        };

        if (isIPhone) {
            // Load models sequentially on iPhone to avoid overwhelming
            console.log('Loading models sequentially for iPhone...');
            await loadWithRetry(() => faceapi.nets.tinyFaceDetector.loadFromUri(modelPath), 'TinyFaceDetector');
            await loadWithRetry(() => faceapi.nets.faceLandmark68Net.loadFromUri(modelPath), 'FaceLandmark68Net');
            await loadWithRetry(() => faceapi.nets.faceRecognitionNet.loadFromUri(modelPath), 'FaceRecognitionNet');
        } else {
            // Load models in parallel for other devices
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
                faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
                faceapi.nets.faceRecognitionNet.loadFromUri(modelPath)
            ]);
        }

        console.log('All models loaded successfully');
        return true;
    } catch (error) {
        console.error('Model loading failed:', error);
        throw new Error(`Model loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

const findWorkerByFace = async (faceDescriptor: Float32Array): Promise<WorkerProfile | null> => {
    const faceDescriptors = await db.face_descriptors.toArray();
    if (!faceDescriptors.length) return null;

    const labeledDescriptors = faceDescriptors.map(fd =>
        new faceapi.LabeledFaceDescriptors(fd.worker_id, [new Float32Array(fd.descriptor)])
    );

    const match = new faceapi.FaceMatcher(labeledDescriptors, 0.5).findBestMatch(faceDescriptor);
    return match.label !== 'unknown' ? await db.worker_profiles.get(match.label) || null : null;
};

function App() {
    const navigate = useNavigate()
    const videoRef = useRef<HTMLVideoElement>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [videoReady, setVideoReady] = useState(false); // Add video ready state
    const [result, setResult] = useState('');
    const [showDialog, setShowDialog] = useState(false);
    const [showPinDialog, setShowPinDialog] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [currentFace, setCurrentFace] = useState<Float32Array | null>(null);
    const [recognizedWorker, setRecognizedWorker] = useState<WorkerProfile | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);

    // Add debug state for mobile debugging
    const [debugInfo, setDebugInfo] = useState<string[]>([]);

    const addDebug = (message: string) => {
        setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    // Detect device type for iPhone-specific handling
    useEffect(() => {
        const userAgent = navigator.userAgent;
        const isIPhone = /iPhone/i.test(userAgent);
        const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
        const info = `${isIPhone ? 'iPhone' : 'Other'} - ${isSafari ? 'Safari' : 'Other Browser'}`;
        addDebug(`Device: ${info}`);
    }, []);

    useEffect(() => {
        const initialize = async () => {
            addDebug('Starting initialization...');
            try {
                await initDatabase();
                addDebug('Database initialized');

                addDebug('Loading face detection models...');
                await loadModels();
                addDebug('Models loaded successfully');

                addDebug('Syncing to Supabase...');
                await syncToSupabase();
                addDebug('Synced to Supabase');

                addDebug('Syncing from Supabase...');
                await syncFromSupabase();
                addDebug('Synced from Supabase');

                setModelsLoaded(true);
                addDebug('Ready for face detection');
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                addDebug(`Init error: ${errorMessage}`);

                // For iPhone model loading issues, provide specific guidance
                if (/iPhone/i.test(navigator.userAgent) && errorMessage.includes('Model loading failed')) {
                    addDebug('iPhone model loading issue detected');
                    addDebug('Try refreshing the page or check internet connection');
                }
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
                            .then(() => {
                                addDebug('Video playing successfully');
                                setVideoReady(true); // Set video ready after it starts playing
                            })
                            .catch(err => addDebug(`Play error: ${err.message}`));
                    };
                    video.onerror = (err) => addDebug(`Video error: ${err}`);
                }
            })
            .catch(err => addDebug(`Camera error: ${err.message}`));

        return () => {
            setVideoReady(false); // Reset video ready state
            stream?.getTracks().forEach(track => track.stop());
        };
    }, [modelsLoaded]);

    useEffect(() => {
        if (!modelsLoaded || !videoReady || result || showPinDialog) return;

        addDebug('Auto detection starting - models and video ready');
        let isDetecting = false;
        let detectionAttempts = 0;
        let consecutiveDetections: (WorkerProfile | null)[] = []; // Store last 3 detections
        let lastFaceDescriptor: Float32Array | null = null;
        const isIPhone = /iPhone/i.test(navigator.userAgent);

        const detect = async () => {
            const video = videoRef.current;

            // Video should be ready now, but double check
            if (!video || !video.videoWidth || !video.videoHeight) {
                addDebug(`Video check failed: ${video ? `${video.videoWidth}x${video.videoHeight}` : 'no video'}`);
                setTimeout(() => requestAnimationFrame(detect), 500);
                return;
            }

            if (isDetecting) {
                setTimeout(() => requestAnimationFrame(detect), isIPhone ? 300 : 100);
                return;
            }

            isDetecting = true;
            detectionAttempts++;

            // Log every 10 attempts instead of being completely silent
            if (detectionAttempts === 1 || detectionAttempts % 10 === 0) {
                addDebug(`Auto detection attempt #${detectionAttempts}`);
            }

            try {
                const face = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({}))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (face) {
                    addDebug(`AUTO: Face detected! Score: ${face.detection.score.toFixed(3)}`);

                    const worker = await findWorkerByFace(face.descriptor);

                    // Add this detection to our consecutive detections array
                    consecutiveDetections.push(worker);
                    lastFaceDescriptor = face.descriptor;

                    // Keep only the last 3 detections
                    if (consecutiveDetections.length > 3) {
                        consecutiveDetections.shift();
                    }

                    addDebug(`Consecutive detections: ${consecutiveDetections.length}/3`);

                    // Check if we have 3 detections
                    if (consecutiveDetections.length === 3) {
                        // Count occurrences of each worker (including null for unknown faces)
                        const workerCounts = new Map<string, { worker: WorkerProfile | null, count: number }>();

                        consecutiveDetections.forEach(w => {
                            const key = w?.id || 'unknown';
                            const existing = workerCounts.get(key);
                            if (existing) {
                                existing.count++;
                            } else {
                                workerCounts.set(key, { worker: w, count: 1 });
                            }
                        });

                        // Find the most frequent detection
                        let mostFrequent: { worker: WorkerProfile | null, count: number } | null = null;
                        for (const entry of workerCounts.values()) {
                            if (!mostFrequent || entry.count > mostFrequent.count) {
                                mostFrequent = entry;
                            }
                        }

                        if (mostFrequent && mostFrequent.count >= 2) {
                            // 2 or more detections of the same person/unknown
                            if (mostFrequent.worker) {
                                addDebug(`AUTO: Confirmed worker: ${mostFrequent.worker.nombres} (${mostFrequent.count}/3 detections)`);
                                setRecognizedWorker(mostFrequent.worker);
                                setResult(`${mostFrequent.worker.nombres} ${mostFrequent.worker.apellidos}`);
                                setCountdown(3);
                                return; // Stop detection
                            } else {
                                addDebug(`AUTO: Confirmed unknown face (${mostFrequent.count}/3 detections) - showing PIN dialog`);
                                setCurrentFace(lastFaceDescriptor);
                                setShowPinDialog(true);
                                return; // Stop detection
                            }
                        } else {
                            // All 3 detections were different people - treat as unknown
                            addDebug('AUTO: 3 different detections - treating as unknown face');
                            setCurrentFace(lastFaceDescriptor);
                            setShowPinDialog(true);
                            return; // Stop detection
                        }
                    }
                } else {
                    // No face detected - reset consecutive detections
                    if (consecutiveDetections.length > 0) {
                        addDebug('AUTO: No face - resetting consecutive detections');
                        consecutiveDetections = [];
                    }

                    // Only log no face every 50 attempts to reduce spam
                    if (detectionAttempts % 50 === 0) {
                        addDebug(`AUTO: No face detected (attempt ${detectionAttempts})`);
                    }
                }
            } catch (error) {
                addDebug(`AUTO ERROR: ${error instanceof Error ? error.message : 'Unknown'}`);
                // Reset on error
                consecutiveDetections = [];
            }

            isDetecting = false;

            // Continue detection loop
            const delay = isIPhone ? 300 : 100;
            setTimeout(() => requestAnimationFrame(detect), delay);
        };

        addDebug('Starting auto detection loop');
        detect();

        // Cleanup function
        return () => {
            addDebug('Auto detection cleanup');
        };
    }, [modelsLoaded, videoReady, result, showPinDialog]);

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
        setShowDialog(false);
        setShowPinDialog(true);
    };

    const handlePinSubmit = async () => {
        const identifier = pinInput.trim();
        if (!identifier) {
            setShowPinDialog(false);
            setPinInput('');
            return;
        }

        const existingWorker = await db.worker_profiles
            .where('pin').equals(identifier)
            .or('cedula').equals(identifier)
            .first();

        if (existingWorker) {
            // If we have a face descriptor, register it for future recognition
            if (currentFace) {
                await db.face_descriptors.add({
                    id: crypto.randomUUID(),
                    worker_id: existingWorker.id,
                    descriptor: Array.from(currentFace)
                });
                await syncToSupabase();
            }

            // Log the recognition and show welcome screen
            await logRecognition(existingWorker.id);
            setResult(`${existingWorker.nombres} ${existingWorker.apellidos}`);
            setRecognizedWorker(existingWorker);
            setCountdown(3);
            setShowPinDialog(false);
            setPinInput('');
            setCurrentFace(null);
        } else {
            alert('Trabajador no encontrado con ese PIN o cédula');
            setShowPinDialog(false);
            setPinInput('');
            setCurrentFace(null);
        }
    };

    if (!modelsLoaded) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white text-center p-4">
                <div>
                    <div className="text-3xl mb-4">Loading...</div>
                    <div className="text-sm space-y-1 mb-4">
                        {debugInfo.map((info, i) => (
                            <div key={i}>{info}</div>
                        ))}
                    </div>

                    {/* Show retry button if model loading failed on iPhone */}
                    {debugInfo.some(info => info.includes('Init error')) && /iPhone/i.test(navigator.userAgent) && (
                        <div className="space-y-2">
                            <div className="text-red-400 text-sm font-semibold">iPhone Model Loading Failed</div>
                            <div className="text-xs text-gray-300 text-left space-y-1">
                                <div>Common iPhone issues:</div>
                                <div>• Poor internet connection</div>
                                <div>• Safari restrictions on large files</div>
                                <div>• Server not serving model files correctly</div>
                                <div>• CORS or file permission issues</div>
                            </div>
                            <div className="space-x-2">
                                <button
                                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
                                    onClick={() => window.location.reload()}
                                >
                                    Retry Loading
                                </button>
                                <button
                                    className="bg-gray-600 text-white px-4 py-2 rounded text-sm"
                                    onClick={() => {
                                        // Test basic fetch to see if it's a network issue
                                        fetch('/models/tiny_face_detector_model-weights_manifest.json')
                                            .then(response => {
                                                alert(`Network test: ${response.status} ${response.statusText}\nURL: ${response.url}\nType: ${response.headers.get('content-type')}`);
                                            })
                                            .catch(err => {
                                                alert(`Network test failed: ${err.message}`);
                                            });
                                    }}
                                >
                                    Test Network
                                </button>
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                                Current URL: {window.location.href}
                            </div>
                        </div>
                    )}
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
                className="w-full h-full object-cover cursor-pointer"
                style={{ display: 'block', transform: 'scaleX(-1)' }}
                onClick={() => {
                    // Allow manual login if no result is showing and no dialog is open
                    if (!result && !showPinDialog && !showDialog) {
                        setShowPinDialog(true);
                    }
                }}
            />

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
                <DialogContent className="sm:max-w-md bg-white">
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

            <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
                <DialogContent className="sm:max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle>Iniciar Sesión</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="pin-input">PIN o Cédula</Label>
                            <Input
                                id="pin-input"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="Ingrese su PIN o cédula"
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value)}
                                className="h-16 text-xl text-center"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handlePinSubmit();
                                    }
                                }}
                            />
                        </div>
                        <Button
                            className="h-16 text-xl"
                            onClick={handlePinSubmit}
                            disabled={!pinInput.trim()}
                        >
                            Confirmar
                        </Button>
                        <Button
                            variant="outline"
                            className="h-16 text-xl"
                            onClick={() => {
                                setShowPinDialog(false);
                                setPinInput('');
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