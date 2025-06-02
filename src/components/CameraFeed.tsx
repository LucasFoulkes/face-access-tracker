import { useState, useEffect, useRef } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraFeedProps {
    onStreamReady?: (stream: MediaStream) => void;
    onError?: (error: string) => void;
}

export function CameraFeed({ onStreamReady, onError }: CameraFeedProps) {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const startCamera = async () => {
        try {
            setLoading(true);
            setError(null);

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
                videoRef.current.srcObject = mediaStream;

                // Use event listener for more reliable playback
                await new Promise<void>((resolve, reject) => {
                    if (!videoRef.current) return reject();

                    const onCanPlay = () => {
                        videoRef.current?.removeEventListener('canplay', onCanPlay);
                        resolve();
                    };

                    videoRef.current.addEventListener('canplay', onCanPlay);

                    // If already ready to play
                    if (videoRef.current.readyState >= 2) {
                        videoRef.current.removeEventListener('canplay', onCanPlay);
                        resolve();
                    }
                });

                await videoRef.current.play();
                console.log('Camera started successfully');

                // Notify parent component
                if (onStreamReady) {
                    onStreamReady(mediaStream);
                }
            }
        } catch (err) {
            console.error('Error starting camera:', err);
            const errorMessage = err instanceof Error
                ? err.message
                : 'Could not access camera';

            setError(errorMessage);
            if (onError) {
                onError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    useEffect(() => {
        // Auto-start the camera when component mounts
        startCamera();

        // Clean up on unmount
        return () => {
            stopCamera();
        };
    }, []);

    return (
        <div className="relative rounded-lg overflow-hidden">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                width="640"
                height="480"
                style={{
                    width: '100%',
                    height: 'auto',
                    background: '#f0f0f0',
                    display: stream ? 'block' : 'none'
                }}
                className="border rounded-lg"
            />

            {!stream && !loading && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 rounded-lg">
                    <Camera className="h-16 w-16 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">Camera not active</p>
                    <Button onClick={startCamera}>
                        Start Camera
                    </Button>
                </div>
            )}

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 rounded-lg p-4">
                    <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
                    <p className="text-red-600 text-center mb-4">{error}</p>
                    <Button onClick={startCamera}>
                        Retry
                    </Button>
                </div>
            )}

            {/* Debug info */}
            <div className="absolute bottom-2 left-2 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                Stream: {stream ? 'Active' : 'Inactive'} |
                Video ready: {videoRef.current?.readyState ? 'Yes' : 'No'}
            </div>
        </div>
    );
}
