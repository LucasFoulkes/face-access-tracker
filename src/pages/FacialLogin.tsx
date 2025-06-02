import { useState, useRef, useEffect } from 'react';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertCircle, UserPlus, Check } from 'lucide-react';
import { db } from '@/lib/db';
import { CameraFeed } from '@/components/CameraFeed';

function FacialLogin() {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const {
        isModelLoaded,
        isLoading,
        detectFace,
        registerFace,
        loadModels
    } = useFaceRecognition();

    const [isDetecting, setIsDetecting] = useState(false);
    const [detectionStatus, setDetectionStatus] = useState<string>('');
    const [showRegistration, setShowRegistration] = useState(false);
    const [registrationStep, setRegistrationStep] = useState<'input' | 'processing' | 'success'>('input'); const [cedulaInput, setCedulaInput] = useState('');

    // Handle camera stream ready
    const handleStreamReady = (mediaStream: MediaStream) => {
        console.log('Camera stream ready in FacialLogin');
        setStream(mediaStream);
        setError(null);        // Assign to video ref for face detection
        if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.onloadedmetadata = () => {
                if (videoRef.current) {
                    videoRef.current.play().catch(err => {
                        console.error('Error playing hidden video:', err);
                    });
                }
            };
        } else {
            console.error('videoRef is null in handleStreamReady');
        }
    };    // Handle camera error
    const handleCameraError = (errorMessage: string) => {
        setError(errorMessage);
        setStream(null);
    };

    // Auto-start detection when camera stream is ready and models are loaded
    useEffect(() => {
        const autoStartDetection = async () => {
            // Only start if not already detecting, models are loaded, stream is available, 
            // video is ready, and not showing registration
            if (!isDetecting &&
                isModelLoaded &&
                stream &&
                videoRef.current &&
                videoRef.current.readyState >= 2 &&
                !showRegistration &&
                !isLoading) {

                console.log('Auto-starting face detection...');
                await startDetection();
            }
        };

        // Small delay to ensure video element is ready
        const timeoutId = setTimeout(autoStartDetection, 1000);

        return () => clearTimeout(timeoutId);
    }, [isModelLoaded, stream, showRegistration, isDetecting, isLoading]);

    // Start face detection loop
    const startDetection = async () => {
        if (!isModelLoaded || !videoRef.current) {
            setDetectionStatus('Models not loaded or camera not ready');
            return;
        }

        setIsDetecting(true);
        setDetectionStatus('Looking for faces...');

        console.log('Starting face detection with video element:', videoRef.current);
        console.log('Video ready state:', videoRef.current.readyState);
        console.log('Video playing:', !videoRef.current.paused);

        // Make sure the video is ready before starting detection
        if (videoRef.current.readyState < 2) {
            setDetectionStatus('Waiting for camera to initialize...');
            await new Promise<void>((resolve) => {
                const readyHandler = () => {
                    if (videoRef.current) {
                        videoRef.current.removeEventListener('canplay', readyHandler);
                        resolve();
                    }
                };
                if (videoRef.current) {
                    videoRef.current.addEventListener('canplay', readyHandler);
                }
            });
        }

        const detectionInterval = setInterval(async () => {
            try {
                // Check if video is still valid
                if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
                    console.log('Video element is no longer valid for detection');
                    clearInterval(detectionInterval);
                    setIsDetecting(false);
                    setDetectionStatus('Video feed interrupted');
                    return;
                }

                // Use the videoRef for face detection
                const result = await detectFace(videoRef.current);

                if (result) {
                    console.log('Face detected with result:', result);
                    if (result.matchedUser) {
                        // Found a recognized face
                        setDetectionStatus(`Recognized: ${result.matchedUser.nombres} ${result.matchedUser.apellidos}`);
                        clearInterval(detectionInterval);
                        setIsDetecting(false);

                        // Navigate to confirmation with user data
                        navigate("/confirmation", {
                            state: {
                                userId: result.matchedUser.id,
                                authMethod: 'facial',
                                authValue: 'face_recognition'
                            }
                        });
                    } else {
                        // Face detected but not recognized - show registration
                        setDetectionStatus('Unknown face detected. Please register.');
                        clearInterval(detectionInterval);
                        setIsDetecting(false);
                        setShowRegistration(true);
                    }
                } else {
                    setDetectionStatus('No face detected. Please look directly at the camera.');
                }
            } catch (err) {
                console.error('Detection error:', err);
                setDetectionStatus('Detection error');
            }
        }, 1000);

        // Auto-stop after 30 seconds
        setTimeout(() => {
            clearInterval(detectionInterval);
            setIsDetecting(false);
            setDetectionStatus('Detection timeout');
        }, 30000);
    };

    const stopDetection = () => {
        setIsDetecting(false);
        setDetectionStatus('Detection stopped');
    };

    // Handle face registration for unknown faces
    const handleFaceRegistration = async () => {
        if (!cedulaInput.trim() || !videoRef.current) {
            setDetectionStatus('Please enter a valid cedula');
            return;
        }

        setRegistrationStep('processing');
        setDetectionStatus('Processing registration...');

        try {
            // Find user by cedula
            const user = await db.usuarios.where('cedula').equals(cedulaInput.trim()).first();

            if (!user) {
                setDetectionStatus('User not found. Please check the cedula.');
                setRegistrationStep('input');
                return;
            }

            // Register the face using videoRef directly
            const success = await registerFace(user.id, videoRef.current);

            if (success) {
                setRegistrationStep('success');
                setDetectionStatus(`Face registered successfully for ${user.nombres} ${user.apellidos}`);

                // Auto-navigate to confirmation after 2 seconds
                setTimeout(() => {
                    navigate("/confirmation", {
                        state: {
                            userId: user.id,
                            authMethod: 'facial',
                            authValue: 'face_registration'
                        }
                    });
                }, 2000);
            } else {
                setDetectionStatus('Failed to register face. Please try again.');
                setRegistrationStep('input');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setDetectionStatus('Registration error. Please try again.');
            setRegistrationStep('input');
        }
    };

    // Reset registration flow
    const resetRegistration = () => {
        setShowRegistration(false);
        setRegistrationStep('input');
        setCedulaInput('');
        setDetectionStatus('');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-md">
                    <CardContent className="p-6 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p>Loading face detection models...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error && !stream) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-md">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button onClick={() => {
                            setDetectionStatus('Retrying...');
                            loadModels().then(() => {
                                setError(null);
                            });
                        }}>
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Button
                onClick={() => navigate('/')}
                className="absolute top-4 left-4"
                size={'icon'}
            >
                <ChevronLeft />
            </Button>

            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-center uppercase">
                        Facial Recognition Login
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Hidden video element for face-api.js to use */}
                    <video
                        ref={videoRef}
                        width="640"
                        height="480"
                        autoPlay
                        muted
                        playsInline
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            opacity: 0.01,
                            pointerEvents: 'none',
                            zIndex: -1 // Ensure it doesn't interfere with UI
                        }}
                    />

                    {/* Camera feed component */}
                    <CameraFeed
                        onStreamReady={handleStreamReady}
                        onError={handleCameraError}
                    />                    {/* Status */}
                    {detectionStatus && (
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <p className="text-blue-800">{detectionStatus}</p>
                        </div>
                    )}

                    {/* Auto-detection info */}
                    {!isDetecting && !showRegistration && isModelLoaded && stream && (
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-green-800">Face detection will start automatically...</p>
                        </div>
                    )}

                    {/* Face Registration UI */}
                    {showRegistration && (
                        <Card className="border-2 border-orange-200 bg-orange-50">
                            <CardHeader>
                                <CardTitle className="text-center text-orange-800 flex items-center justify-center gap-2">
                                    <UserPlus className="h-5 w-5" />
                                    Register New Face
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {registrationStep === 'input' && (
                                    <>
                                        <p className="text-center text-orange-700">
                                            Unknown face detected. Please enter your cedula to register:
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Enter cedula..."
                                                value={cedulaInput}
                                                onChange={(e) => setCedulaInput(e.target.value)}
                                                className="flex-1 px-3 py-2 border rounded-md"
                                                maxLength={11}
                                            />
                                            <Button onClick={handleFaceRegistration}>
                                                Register
                                            </Button>
                                        </div>
                                        <div className="flex gap-2 justify-center">
                                            <Button variant="outline" onClick={resetRegistration}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </>
                                )}

                                {registrationStep === 'processing' && (
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
                                        <p className="text-orange-700">Registering face...</p>
                                    </div>
                                )}

                                {registrationStep === 'success' && (
                                    <div className="text-center text-green-700">
                                        <Check className="h-12 w-12 mx-auto mb-2 text-green-600" />
                                        <p className="font-semibold">Face registered successfully!</p>
                                        <p className="text-sm">Redirecting to confirmation...</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}                    {/* Controls - Only show stop button when detecting */}
                    {!showRegistration && isDetecting && (
                        <div className="flex gap-4 justify-center">
                            <Button
                                onClick={stopDetection}
                                variant="destructive"
                                className="uppercase"
                            >
                                Stop Detection
                            </Button>
                        </div>
                    )}{/* Debug Info */}
                    <div className="text-xs text-gray-500 text-center space-y-1 border-t pt-2 mt-2">
                        <p>Models Loaded: {isModelLoaded ? '✓' : '✗'}</p>
                        <p>Camera: {stream ? '✓' : '✗'}</p>
                        <p>Video Element: {videoRef.current ? '✓' : '✗'}</p>
                        {videoRef.current && (
                            <>
                                <p>Video Ready State: {videoRef.current.readyState}</p>
                                <p>Video Size: {videoRef.current.videoWidth}x{videoRef.current.videoHeight}</p>
                                <p>Video Playing: {!videoRef.current.paused ? '✓' : '✗'}</p>
                            </>
                        )}
                        <Button
                            variant="link"
                            className="text-xs text-blue-500 p-0"
                            onClick={() => {
                                console.log('Video element:', videoRef.current);
                                console.log('Is model loaded:', isModelLoaded);
                                console.log('Stream:', stream);

                                // Enhanced debugging
                                if (videoRef.current) {
                                    console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
                                    console.log('Video ready state:', videoRef.current.readyState);
                                    console.log('Video time:', videoRef.current.currentTime);
                                    console.log('Video is playing:', !videoRef.current.paused);

                                    // Try a test detection
                                    detectFace(videoRef.current).then(result => {
                                        console.log('Test detection result:', result);
                                    }).catch(err => {
                                        console.error('Test detection error:', err);
                                    });
                                }

                                alert('Enhanced debug info logged to console');
                            }}
                        >
                            Log Debug Info
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default FacialLogin;
