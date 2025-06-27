import * as faceapi from 'face-api.js';
import { userStorage } from './userStorage';

// Face recognition utilities - pure functions
export const detectFace = async (video: HTMLVideoElement) => {
    try {
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks().withFaceDescriptor();

        if (detection) {
            console.log('Face detected successfully');
        }

        return detection;
    } catch (error) {
        console.error('Face detection error:', error);
        return null;
    }
};

export const findFaceMatch = async (descriptor: Float32Array) => {
    try {
        const faces = await userStorage.get();
        if (!faces.length) return null;

        const labeledDescriptors = faces.map(({ name, descriptors }: any) =>
            new faceapi.LabeledFaceDescriptors(
                name,
                descriptors.map((desc: number[]) => new Float32Array(desc))
            )
        );

        const match = new faceapi.FaceMatcher(labeledDescriptors, 0.6).findBestMatch(descriptor);
        console.log('Face match result:', match.label, 'distance:', match.distance);
        return match.label !== 'unknown' ? match.label : null;
    } catch (error) {
        console.error('Face matching error:', error);
        return null;
    }
};

export const loadFaceModels = async () => {
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
    ]);
};
