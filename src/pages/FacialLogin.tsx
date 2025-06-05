import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyIndicator } from "@/components/KeyIndicator";
import Webcam from "react-webcam";
import { useRef, useEffect, useCallback, useState } from "react";
import * as faceapi from "face-api.js";
import { db } from "@/lib/db";

// Constants
const MODELS_PATH = '/models';
const DETECTION_DELAY = 1000;
const FACE_COLOR = 'rgba(0, 0, 255, 0.3)';
const LANDMARK_COLOR = 'blue';
const LANDMARK_RADIUS = 2;
const FACE_MATCH_THRESHOLD = 0.6;

// Face recognition utility
const findMatchingUser = async (detectedDescriptor: Float32Array): Promise<{ userId: number | null, distance: number, confidence: string }> => {
    try {
        // Get all face data from database
        const allFaceData = await db.faceData.toArray();

        if (allFaceData.length === 0) {
            return { userId: null, distance: 1, confidence: "No registered faces" };
        }

        // Convert stored descriptors and create labeled descriptors
        const labeledDescriptors = allFaceData.map(faceRecord => {
            const descriptor = new Float32Array(faceRecord.descriptor);
            return new faceapi.LabeledFaceDescriptors(
                faceRecord.usuarioId.toString(), // Use userId as label
                [descriptor]
            );
        });

        // Create FaceMatcher - optimized for multiple comparisons
        const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, FACE_MATCH_THRESHOLD);

        // Find best match
        const bestMatch = faceMatcher.findBestMatch(detectedDescriptor);

        // Parse results
        const isMatch = bestMatch.label !== 'unknown';
        const userId = isMatch ? parseInt(bestMatch.label) : null;
        const distance = bestMatch.distance;

        let confidence: string;
        if (distance < 0.4) confidence = "Very High";
        else if (distance < 0.5) confidence = "High";
        else if (distance < 0.6) confidence = "Medium";
        else confidence = "Low/No Match";

        console.log(`Face matching result: ${isMatch ? `User ${userId}` : 'Unknown'}, Distance: ${distance.toFixed(3)}, Confidence: ${confidence}`);

        return { userId, distance, confidence };

    } catch (error) {
        console.error('Error during face matching:', error);
        return { userId: null, distance: 1, confidence: "Error occurred" };
    }
};

// Custom hook for face API model loading
const useFaceModels = () => {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const loadModels = async () => {
            try {
                console.log('Loading face-api models...');
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_PATH),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_PATH)
                ]);
                setIsLoaded(true);
                console.log('Face-api models loaded successfully');
            } catch (error) {
                console.error('Error loading face-api models:', error);
            }
        };
        loadModels();
    }, []);

    return isLoaded;
};

// Face detection drawing utility
const drawFaceDetection = (ctx: CanvasRenderingContext2D, detection: any, displaySize: any) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (!detection) return;

    const resized = faceapi.resizeResults(detection, displaySize);
    const { box } = resized.detection;

    // Draw face box
    ctx.fillStyle = FACE_COLOR;
    ctx.fillRect(box.x, box.y, box.width, box.height);

    // Draw landmarks
    ctx.fillStyle = LANDMARK_COLOR;
    resized.landmarks.positions.forEach(({ x, y }: { x: number; y: number }) => {
        ctx.beginPath();
        ctx.arc(x, y, LANDMARK_RADIUS, 0, 2 * Math.PI);
        ctx.fill();
    });

    console.log('Face detected!', detection.detection.score);
};

// Custom hook for face detection with recognition
const useFaceDetection = (webcamRef: React.RefObject<Webcam | null>, canvasRef: React.RefObject<HTMLCanvasElement | null>, navigate: any) => {
    const modelsLoaded = useFaceModels();
    const animationRef = useRef<number>(0); const [recognitionStatus, setRecognitionStatus] = useState<string>("");

    const detect = useCallback(async () => {
        if (!modelsLoaded || !webcamRef.current?.video || !canvasRef.current) {
            animationRef.current = requestAnimationFrame(detect);
            return;
        }

        const { video } = webcamRef.current;
        const canvas = canvasRef.current;

        if (video.readyState !== 4) {
            animationRef.current = requestAnimationFrame(detect);
            return;
        }

        const displaySize = { width: video.videoWidth, height: video.videoHeight };

        if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
            faceapi.matchDimensions(canvas, displaySize);
        }

        try {
            const detection = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            const ctx = canvas.getContext('2d');
            if (ctx) drawFaceDetection(ctx, detection, displaySize);            // If a face is detected, perform recognition
            if (detection) {
                const descriptor = detection.descriptor as Float32Array;
                const { userId, distance, confidence } = await findMatchingUser(descriptor);

                if (userId && distance < 0.6) {
                    // Face recognized - navigate to confirmation
                    console.log(`User recognized: ${userId}, Confidence: ${confidence}`);
                    setRecognitionStatus(`User ${userId} recognized (${confidence})`);

                    // Navigate to confirmation page with face login data
                    navigate("/confirmation", {
                        state: {
                            userId: userId,
                            authMethod: 'facial',
                            authValue: 'face_recognition'
                        }
                    });
                    return; // Stop detection loop
                } else {
                    // Face not recognized or confidence too low
                    console.log(`Face not recognized, Distance: ${distance}, Confidence: ${confidence}`);
                    setRecognitionStatus("Face not recognized");

                    // After 3 seconds of no recognition, go to face registration
                    setTimeout(() => {
                        navigate("/face-registration", {
                            state: {
                                faceDescriptor: Array.from(descriptor) // Convert to regular array for state
                            }
                        });
                    }, 3000);
                }
            } else {
                setRecognitionStatus("Looking for face...");
            }
        } catch (error) {
            console.error('Error during face detection:', error);
            setRecognitionStatus("Detection error");
        }

        animationRef.current = requestAnimationFrame(detect);
    }, [modelsLoaded, webcamRef, canvasRef, navigate]); useEffect(() => {
        const timer = setTimeout(() => {
            animationRef.current = requestAnimationFrame(detect);
        }, DETECTION_DELAY);

        return () => {
            clearTimeout(timer);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [detect]);

    return recognitionStatus;
};

function FacialLogin() {
    const navigate = useNavigate();
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const recognitionStatus = useFaceDetection(webcamRef, canvasRef, navigate); const keyboard = useKeyboardShortcuts({
        shortcuts: [{ key: 'Enter', action: () => navigate("/") }]
    });

    const mirrorStyle = { transform: "scaleX(-1)" };

    return (
        <div
            ref={keyboard.containerRef}
            className="flex flex-col gap-4 items-center justify-center min-h-screen"
            tabIndex={0}
            style={{ outline: 'none' }}>            <div className="relative">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="rounded-lg"
                    style={mirrorStyle}
                />
                <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 rounded-lg"
                    style={mirrorStyle}
                />

                {/* Recognition status display */}
                {recognitionStatus && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded">
                        {recognitionStatus}
                    </div>
                )}
            </div>

            <KeyIndicator
                keyLabel="⏎"
                isPressed={keyboard.isPressed('Enter')}
                color='black'
                position="top-right">
                <Button
                    className="uppercase text-2xl !p-4 !px-12 !h-auto bg-amber-500 hover:bg-amber-600"
                    onClick={() => navigate("/")}>
                    regresar
                </Button>
            </KeyIndicator>
        </div>
    );
}
export default FacialLogin;