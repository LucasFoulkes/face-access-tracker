import * as faceapi from 'face-api.js';
import { useRef, useEffect, useState } from 'react';
import Dexie, { Table } from 'dexie';
import { supabase } from './services/supabase';

interface FaceDescriptor {
  id?: string; // Changed to string for UUID
  worker_id: string; // UUID foreign key
  descriptor: number[];
}

interface WorkerProfile {
  id?: string; // UUID primary key
  nombres: string;
  apellidos: string;
  cedula: string;
  pin: string;
  departamento: string;
  cargo: string;
  activo: boolean;
  internal_id: number; // Changed to number to match Supabase
}

class FaceDatabase extends Dexie {
  face_descriptors!: Table<FaceDescriptor>;
  worker_profiles!: Table<WorkerProfile>;

  constructor() {
    super('FaceDatabase');
    this.version(1).stores({
      face_descriptors: 'id, worker_id, descriptor', // Remove ++ for UUID
      worker_profiles: 'id, nombres, apellidos, cedula, pin, departamento, cargo, activo, internal_id' // Remove ++ for UUID
    });
  }
}

const db = new FaceDatabase();

// Sync functions for offline-first approach
const syncToSupabase = async () => {
  try {
    console.log('Starting sync to Supabase...');

    // Push local face_descriptors that don't exist remotely
    const localDescriptors = await db.face_descriptors.toArray();
    console.log('Total local descriptors:', localDescriptors.length);

    if (localDescriptors.length > 0) {
      const { data: remoteDescriptors, error: fetchError } = await supabase
        .from('face_descriptors')
        .select('id, worker_id');

      if (fetchError) {
        console.error('Error fetching remote descriptors:', fetchError);
        return;
      }

      console.log('Remote descriptors found:', remoteDescriptors?.length || 0);

      // Create a set of existing remote worker_ids that have face descriptors
      // This allows multiple face descriptors per worker
      const remoteWorkerIds = new Set(remoteDescriptors?.map(d => d.worker_id) || []);
      console.log('Remote worker IDs:', Array.from(remoteWorkerIds));

      // For now, push descriptors for workers that don't have any face descriptors yet
      // This prevents duplicates while allowing multiple faces per worker later
      const newDescriptors = localDescriptors.filter(d => !remoteWorkerIds.has(d.worker_id));

      console.log('Local descriptors to sync:', newDescriptors.length);
      if (newDescriptors.length > 0) {
        console.log('Sample local descriptor:', newDescriptors[0]);
      }

      if (newDescriptors.length > 0) {
        // Don't remove the id field since Supabase expects UUID ids
        const cleanDescriptors = newDescriptors.map(desc => ({
          id: desc.id, // Keep the UUID id
          worker_id: desc.worker_id,
          descriptor: Array.isArray(desc.descriptor) ? desc.descriptor : Array.from(desc.descriptor)
        }));

        console.log('Clean descriptors to upload:', cleanDescriptors[0]);

        const { error } = await supabase
          .from('face_descriptors')
          .insert(cleanDescriptors);

        if (error) {
          console.error('Supabase insert error:', error);
        } else {
          console.log('Successfully synced', cleanDescriptors.length, 'face descriptors');
        }
      } else {
        console.log('No new descriptors to sync');
      }
    } else {
      console.log('No local descriptors found');
    }

    // Push local worker_profiles that don't exist remotely
    const localWorkers = await db.worker_profiles.toArray();
    console.log('Total local workers:', localWorkers.length);

    if (localWorkers.length > 0) {
      const { data: remoteWorkers, error: workerFetchError } = await supabase
        .from('worker_profiles')
        .select('id, cedula');

      if (workerFetchError) {
        console.error('Error fetching remote workers:', workerFetchError);
        return;
      }

      console.log('Remote workers found:', remoteWorkers?.length || 0);

      const remoteCedulas = new Set(remoteWorkers?.map(w => w.cedula) || []);
      const newWorkers = localWorkers.filter(w => !remoteCedulas.has(w.cedula));

      console.log('New workers to sync:', newWorkers.length);

      if (newWorkers.length > 0) {
        // Don't remove the id field since Supabase expects UUID ids
        const cleanWorkers = newWorkers.map(worker => ({
          id: worker.id, // Keep the UUID id
          nombres: worker.nombres,
          apellidos: worker.apellidos,
          cedula: worker.cedula,
          pin: worker.pin,
          departamento: worker.departamento,
          cargo: worker.cargo,
          activo: worker.activo,
          internal_id: worker.internal_id
        }));
        console.log('Sample worker to upload:', cleanWorkers[0]);

        const { error: workerInsertError } = await supabase
          .from('worker_profiles')
          .insert(cleanWorkers);

        if (workerInsertError) {
          console.error('Worker insert error:', workerInsertError);
        } else {
          console.log('Successfully synced', cleanWorkers.length, 'workers');
        }
      } else {
        console.log('No new workers to sync');
      }
    } else {
      console.log('No local workers found');
    }
  } catch (error) {
    console.error('Error syncing to Supabase:', error);
  }
};

const syncFromSupabase = async () => {
  try {
    // Pull worker_profiles from Supabase
    const { data: remoteWorkers } = await supabase
      .from('worker_profiles')
      .select('*');

    if (remoteWorkers) {
      await db.worker_profiles.clear();
      await db.worker_profiles.bulkAdd(remoteWorkers);
    }

    // Pull face_descriptors from Supabase
    const { data: remoteDescriptors } = await supabase
      .from('face_descriptors')
      .select('*');

    if (remoteDescriptors) {
      await db.face_descriptors.clear();
      await db.face_descriptors.bulkAdd(remoteDescriptors);
    }
  } catch (error) {
    console.error('Error syncing from Supabase:', error);
  }
};


export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [result, setResult] = useState<string>('');

  useEffect(() => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models')
    ]).then(async () => {
      setModelsLoaded(true);
      // Perform sync when models are loaded
      await syncToSupabase();
      await syncFromSupabase();
    });
  }, []);

  useEffect(() => {
    if (!modelsLoaded || result) return;

    let stream: MediaStream;

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false
    }).then(mediaStream => {
      stream = mediaStream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = async () => {
          try {
            await video.play();
          } catch (err) {
            console.error('Video play failed:', err);
          }
        };
      }
    }).catch(err => alert(`Camera error: ${err.message}`));

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [modelsLoaded, result]);

  useEffect(() => {
    if (!modelsLoaded || result) return;

    const detect = async () => {
      const video = videoRef.current;
      if (!video?.videoWidth) return requestAnimationFrame(detect);

      try {
        const face = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks().withFaceDescriptor();

        if (!face) return requestAnimationFrame(detect);

        // Load face descriptors from database
        const faceDescriptors = await db.face_descriptors.toArray();
        let matchedWorker = null;

        // Try to match existing faces
        if (faceDescriptors.length) {
          const descriptors = faceDescriptors.map(fd =>
            new faceapi.LabeledFaceDescriptors(fd.worker_id, [new Float32Array(fd.descriptor)]));

          const match = new faceapi.FaceMatcher(descriptors, 0.6).findBestMatch(face.descriptor);

          if (match.label !== 'unknown') {
            const workerId = match.label; // Keep as string, don't parse to int
            matchedWorker = await db.worker_profiles.get(workerId);
          }
        }

        // If no match found, prompt for PIN or cedula to identify existing user
        if (!matchedWorker) {
          const identifier = prompt('Face not recognized. Enter PIN or cedula:');
          if (!identifier) return requestAnimationFrame(detect);

          // Try to find existing worker by PIN or cedula
          const existingWorker = await db.worker_profiles
            .where('pin').equals(identifier)
            .or('cedula').equals(identifier)
            .first();

          if (existingWorker) {
            console.log('Found existing worker:', existingWorker);
            console.log('Saving face descriptor for worker ID:', existingWorker.id);

            try {
              // Generate a UUID for the new face descriptor
              const descriptorId = crypto.randomUUID();

              // Save face descriptor for this existing worker
              await db.face_descriptors.add({
                id: descriptorId,
                worker_id: existingWorker.id!,
                descriptor: Array.from(face.descriptor)
              });

              console.log('Face descriptor saved with ID:', descriptorId);
              console.log('Face descriptor length:', Array.from(face.descriptor).length);

              // Verify it was saved
              const savedDescriptor = await db.face_descriptors.get(descriptorId);
              console.log('Verified saved descriptor:', savedDescriptor);

              // Sync the new face descriptor to Supabase
              console.log('Starting sync after face save...');
              await syncToSupabase();

              matchedWorker = existingWorker;
            } catch (saveError) {
              console.error('Error saving face descriptor:', saveError);
              alert('Error saving face data');
              return requestAnimationFrame(detect);
            }
          } else {
            alert('Worker not found with that PIN or cedula');
            return requestAnimationFrame(detect);
          }
        }

        if (matchedWorker) {
          setResult(`${matchedWorker.nombres} ${matchedWorker.apellidos}`);
        } else {
          requestAnimationFrame(detect);
        }
      } catch {
        requestAnimationFrame(detect);
      }
    };

    detect();
  }, [modelsLoaded, result]);

  if (!modelsLoaded) return <div className="flex h-screen items-center justify-center bg-black text-white text-3xl">Loading...</div>;

  return (
    <div className="flex h-screen items-center justify-center bg-black relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width="1280"
        height="720"
        className="max-w-full max-h-full object-cover"
        style={{ display: 'block', transform: 'scaleX(-1)' }}
      />
      {result && (
        <div className="absolute inset-0 bg-blue-500/90 flex flex-col items-center justify-center text-white cursor-pointer"
          onClick={() => setResult('')}>
          <h2 className="text-4xl font-bold capitalize">Welcome {result}!</h2>
          <p className="mt-4">Tap to detect again</p>
        </div>
      )}
    </div>
  );
}