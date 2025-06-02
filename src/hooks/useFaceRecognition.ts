import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { db } from '@/lib/db';

interface FaceDetectionResult {
    detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<faceapi.WithFaceDetection<{}>>>;
    matchedUser?: {
        id: number;
        cedula: string;
        nombres: string;
        apellidos: string;
    };
    confidence: number;
}

export function useFaceRecognition() {
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Load face-api models
    const loadModels = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Ensure database is open
            console.log('Ensuring database is open...');
            try {
                await db.open();
                console.log('Database opened successfully');
            } catch (dbErr) {
                console.log('Database might already be open:', dbErr);
            }            // Load the required models from the public/models directory
            // Try both potential model locations (root and /models subdirectory)
            const MODEL_URL = `${window.location.origin}/models`;
            const FALLBACK_URL = window.location.origin;

            console.log('Attempting to load models from:', MODEL_URL);

            // Try to fetch one of the manifest files to verify the path is correct
            let modelBasePath = MODEL_URL;
            try {
                const response = await fetch(`${MODEL_URL}/tiny_face_detector_model-weights_manifest.json`);
                if (!response.ok) {
                    console.log('Models not found in /models directory, trying root path...');
                    const fallbackResponse = await fetch(`${FALLBACK_URL}/tiny_face_detector_model-weights_manifest.json`);
                    if (!fallbackResponse.ok) {
                        throw new Error(`Failed to fetch model manifest from either location`);
                    }
                    modelBasePath = FALLBACK_URL;
                }
                console.log('Model manifest accessible at', modelBasePath, '✓');
            } catch (fetchErr: any) {
                console.error('Error fetching model manifest:', fetchErr);
                throw new Error(`Cannot access model files: ${fetchErr.message || 'Unknown error'}`);
            } await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(modelBasePath),
                faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelBasePath),
                faceapi.nets.faceRecognitionNet.loadFromUri(modelBasePath)
            ]);

            console.log('All models loaded successfully ✓');
            setIsModelLoaded(true);
            setError(null);
        } catch (err) {
            console.error('Error loading face-api models:', err);
            setError(`Error loading face detection models: ${err instanceof Error ? err.message : 'Unknown error'}. Check console for details.`);
        } finally {
            setIsLoading(false);
        }
    };    // Start video stream
    const startVideo = async () => {
        try {
            if (stream) {
                console.log('Stream already exists, using existing stream');
                return; // Already have a stream
            }

            console.log('Requesting camera access...');
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            setStream(mediaStream);

            if (videoRef.current) {
                console.log('Setting video source and playing...');
                videoRef.current.srcObject = mediaStream;                // Use event listener to ensure video plays properly
                const playPromise = new Promise<void>((resolve, reject) => {
                    if (!videoRef.current) return reject('Video element not available');

                    const onCanPlay = () => {
                        videoRef.current?.removeEventListener('canplay', onCanPlay);
                        videoRef.current?.play()
                            .then(() => {
                                console.log('Video playback started successfully');
                                resolve();
                            })
                            .catch(playErr => {
                                console.error('Error playing video:', playErr);
                                reject(playErr);
                            });
                    };

                    videoRef.current.addEventListener('canplay', onCanPlay);

                    // If video is already ready, play it immediately
                    if (videoRef.current.readyState >= 2) {
                        videoRef.current.removeEventListener('canplay', onCanPlay);
                        videoRef.current.play()
                            .then(() => {
                                console.log('Video playback started successfully (already ready)');
                                resolve();
                            })
                            .catch(playErr => {
                                console.error('Error playing video:', playErr);
                                reject(playErr);
                            });
                    }
                });

                await playPromise;
                console.log('Video playback started successfully');
            } else {
                console.error('Video ref is null, cannot attach stream');
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Error accessing camera. Please allow camera permissions.');
            throw err;
        }
    };

    // Check camera permissions
    const checkCameraPermissions = async (): Promise<boolean> => {
        try {
            // Check if we have permission
            const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });

            if (permissionStatus.state === 'granted') {
                return true;
            } else if (permissionStatus.state === 'prompt') {
                // Permission will be requested when startVideo is called
                return true;
            } else {
                // Permission denied
                setError('Camera access denied. Please enable camera permissions in your browser settings.');
                return false;
            }
        } catch (err) {
            console.log('Permission API not supported, will try direct access');
            return true; // Permission API not supported, try direct access
        }
    };// Stop video stream
    const stopVideo = () => {
        console.log('Stopping video stream...');
        if (stream) {
            console.log('Stopping media tracks...');
            stream.getTracks().forEach(track => {
                console.log(`Stopping track: ${track.kind}`, track.readyState);
                track.stop();
            });
            setStream(null);
        }
        if (videoRef.current) {
            console.log('Clearing video source...');
            videoRef.current.srcObject = null;
        }
    };    // Detect and analyze face
    const detectFace = async (videoElement?: HTMLVideoElement): Promise<FaceDetectionResult | null> => {
        // Use the provided video element or fall back to the ref
        const videoToUse = videoElement || videoRef.current;

        if (!isModelLoaded) {
            console.error('Cannot detect face: models not loaded');
            return null;
        }

        if (!videoToUse) {
            console.error('Cannot detect face: no video element available');
            return null;
        }

        // Verify the video is ready for processing
        if (videoToUse.readyState < 2) {
            console.log('Video not ready for detection, waiting...');
            // Wait for video to be ready
            await new Promise<void>((resolve) => {
                const readyHandler = () => {
                    videoToUse.removeEventListener('canplay', readyHandler);
                    resolve();
                };
                videoToUse.addEventListener('canplay', readyHandler);
                // If it becomes ready while we're setting up, resolve immediately
                if (videoToUse.readyState >= 2) {
                    videoToUse.removeEventListener('canplay', readyHandler);
                    resolve();
                }
            });
        }

        try {
            console.log('Attempting to detect face...');
            console.log('Video dimensions:', videoToUse.videoWidth, 'x', videoToUse.videoHeight);
            console.log('Video ready state:', videoToUse.readyState);

            // Add a small delay to ensure the video is ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if video has dimensions
            if (videoToUse.videoWidth === 0 || videoToUse.videoHeight === 0) {
                console.error('Video has no dimensions, cannot detect face');
                return null;
            }

            // Use a lower threshold for initial testing
            const options = new faceapi.TinyFaceDetectorOptions({
                scoreThreshold: 0.2  // Lower threshold (default is 0.5)
            });

            // Detect single face with descriptors
            const detection = await faceapi
                .detectSingleFace(videoToUse, options)
                .withFaceLandmarks(true)
                .withFaceDescriptor();

            if (!detection) {
                console.log('No face detected in the video');
                return null;
            } console.log('Face detected!', detection);

            // Get all registered face data from database
            try {
                console.log('Accessing database...');
                console.log('db object:', db);
                console.log('db.faceData:', db.faceData);

                const allFaceData = await db.faceData.toArray();
                console.log('Retrieved face data:', allFaceData);

                let bestMatch: { userId: number; distance: number } | null = null;
                const FACE_MATCH_THRESHOLD = 0.6; // Adjust as needed

                // Compare with all registered faces
                for (const faceData of allFaceData) {
                    const distance = faceapi.euclideanDistance(
                        detection.descriptor,
                        faceData.descriptor
                    );

                    if (distance < FACE_MATCH_THRESHOLD) {
                        if (!bestMatch || distance < bestMatch.distance) {
                            bestMatch = { userId: faceData.usuarioId, distance };
                        }
                    }
                }

                // If we found a match, get user details
                let matchedUser;
                if (bestMatch) {
                    matchedUser = await db.usuarios.get(bestMatch.userId);
                }

                return {
                    detection,
                    matchedUser,
                    confidence: bestMatch ? (1 - bestMatch.distance) : 0
                };
            } catch (dbError) {
                console.error('Database error:', dbError);
                // Return the detection result even if database access fails
                // This allows face registration for unknown faces
                return {
                    detection,
                    matchedUser: undefined,
                    confidence: 0
                };
            }

        } catch (err) {
            console.error('Error detecting face:', err);
            return null;
        }
    };    // Register a new face for a user
    const registerFace = async (userId: number, videoElement?: HTMLVideoElement): Promise<boolean> => {
        // Use the provided video element or fall back to the ref
        const videoToUse = videoElement || videoRef.current;

        if (!isModelLoaded) {
            console.error('Cannot register face: models not loaded');
            return false;
        }

        if (!videoToUse) {
            console.error('Cannot register face: no video element available');
            return false;
        }

        // Verify the video is ready for processing
        if (videoToUse.readyState < 2) {
            console.log('Video not ready for registration, waiting...');
            // Wait for video to be ready
            await new Promise<void>((resolve) => {
                const readyHandler = () => {
                    videoToUse.removeEventListener('canplay', readyHandler);
                    resolve();
                };
                videoToUse.addEventListener('canplay', readyHandler);
                // If it becomes ready while we're setting up, resolve immediately
                if (videoToUse.readyState >= 2) {
                    videoToUse.removeEventListener('canplay', readyHandler);
                    resolve();
                }
            });
        }

        try {
            console.log('Attempting to register face for user:', userId);
            console.log('Video dimensions:', videoToUse.videoWidth, 'x', videoToUse.videoHeight);

            // Add a small delay to ensure the video is ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if video has dimensions
            if (videoToUse.videoWidth === 0 || videoToUse.videoHeight === 0) {
                console.error('Video has no dimensions, cannot register face');
                return false;
            }

            // Use a lower threshold for initial testing
            const options = new faceapi.TinyFaceDetectorOptions({
                scoreThreshold: 0.2  // Lower threshold (default is 0.5)
            });

            const detection = await faceapi
                .detectSingleFace(videoToUse, options)
                .withFaceLandmarks(true)
                .withFaceDescriptor();

            if (!detection) {
                console.error('No face detected during registration');
                throw new Error('No face detected');
            } console.log('Face detected for registration!');

            // Save face descriptor to database
            try {
                console.log('Saving face descriptor to database for user:', userId);
                console.log('db object:', db);
                console.log('db.faceData:', db.faceData);

                await db.faceData.add({
                    usuarioId: userId,
                    descriptor: detection.descriptor,
                    fechaRegistro: new Date()
                });

                console.log('Face descriptor saved to database');
                return true;
            } catch (dbError) {
                console.error('Database error during face registration:', dbError);
                return false;
            }
        } catch (err) {
            console.error('Error registering face:', err);
            return false;
        }
    };    // Initialize on mount
    useEffect(() => {
        loadModels();

        // Initialize database
        const initDatabase = async () => {
            try {
                await db.open();
                console.log('Database opened successfully');
            } catch (error) {
                console.error('Error opening database:', error);
            }
        };

        initDatabase();

        // Check camera permissions when component mounts
        checkCameraPermissions().then(hasPermission => {
            if (hasPermission) {
                console.log('Camera permissions available or can be requested');
            }
        });

        return () => {
            stopVideo();
        };
    }, []); return {
        // State
        isModelLoaded,
        isLoading,
        error,
        videoRef,
        stream,

        // Actions
        startVideo,
        stopVideo,
        detectFace,
        registerFace,
        loadModels,
        checkCameraPermissions
    };
}
