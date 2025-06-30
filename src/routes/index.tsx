import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as faceapi from 'face-api.js';
import { useRef, useEffect, useState } from 'react';
import { db, initDatabase, syncToSupabase, syncFromSupabase, logRecognition } from '../database';
import { WorkerProfile } from '../types';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

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
                    scoreThreshold: isIPhone ? 0.1 : 0.3  // Much lower threshold for iPhone
                });

                // Only log occasionally to avoid performance issues
                if (detectionCount === 1) {
                    addDebug(`Using inputSize: ${options.inputSize}, threshold: ${options.scoreThreshold}`);
                }

                const face = await faceapi.detectSingleFace(video, options)
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (face) {
                    const now = Date.now();
                    if (now - lastFaceTime > 2000) { // Less frequent face detection messages
                        addDebug(`Face detected! Score: ${face.detection.score.toFixed(3)}, Descriptor: ${face.descriptor.length}`);
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
                    // Reduce logging frequency dramatically to improve performance
                    if (detectionCount % 200 === 0) {
                        addDebug('No face detected in frame');
                    }
                }
            } catch (error) {
                // Reduce error logging frequency to improve performance
                if (detectionCount % 100 === 0) {
                    addDebug(`Detection error: ${error instanceof Error ? error.message : 'Unknown'}`);
                }
            }

            // Add longer delay for iPhone to prevent overwhelming the device
            const delay = isIPhone ? 200 : 50; // Increased delay for iPhone
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
                        <div className="mt-2 space-x-2">
                            <button
                                className="bg-red-600 text-white px-2 py-1 rounded text-xs"
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
                            <button
                                className="bg-green-600 text-white px-2 py-1 rounded text-xs"
                                onClick={async () => {
                                    addDebug('Testing model file accessibility...');
                                    const modelFiles = [
                                        'tiny_face_detector_model-weights_manifest.json',
                                        'face_landmark_68_model-weights_manifest.json',
                                        'face_recognition_model-weights_manifest.json'
                                    ];

                                    for (const file of modelFiles.slice(0, 1)) { // Test just one file to avoid spam
                                        try {
                                            const response = await fetch(`/models/${file}`, { cache: 'no-cache' });
                                            addDebug(`${file}: ${response.status} (${response.headers.get('content-length')} bytes)`);
                                        } catch (err) {
                                            addDebug(`${file}: FAILED - ${err instanceof Error ? err.message : 'Unknown'}`);
                                        }
                                    }
                                }}
                            >
                                Test Models
                            </button>
                            <button
                                className="bg-purple-600 text-white px-2 py-1 rounded text-xs"
                                onClick={async () => {
                                    const video = videoRef.current;
                                    if (video) {
                                        addDebug('Manual face detection attempt...');
                                        try {
                                            const face = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
                                                inputSize: 320,
                                                scoreThreshold: 0.1
                                            }))
                                                .withFaceLandmarks()
                                                .withFaceDescriptor();

                                            if (face) {
                                                addDebug(`Manual: Face found! Score: ${face.detection.score.toFixed(3)}`);
                                                const worker = await findWorkerByFace(face.descriptor);
                                                if (worker) {
                                                    addDebug(`Manual: Worker found: ${worker.nombres}`);
                                                    setRecognizedWorker(worker);
                                                    setResult(`${worker.nombres} ${worker.apellidos}`);
                                                    setCountdown(3);
                                                } else {
                                                    addDebug('Manual: Face not in database - showing dialog');
                                                    setCurrentFace(face.descriptor);
                                                    setShowNewFaceDialog(true);
                                                }
                                            } else {
                                                addDebug('Manual: No face detected');
                                            }
                                        } catch (err) {
                                            addDebug(`Manual error: ${err instanceof Error ? err.message : 'Unknown'}`);
                                        }
                                    }
                                }}
                            >
                                Manual Detect
                            </button>
                        </div>
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