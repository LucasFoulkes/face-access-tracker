import Dexie, { Table } from 'dexie';
import { supabase } from '../services/supabase';
import { FaceDescriptor, WorkerProfile, Recognition } from '../types';

class FaceDatabase extends Dexie {
    face_descriptors!: Table<FaceDescriptor>;
    worker_profiles!: Table<WorkerProfile>;
    recognitions!: Table<Recognition>;

    constructor() {
        super('FaceDatabase');
        this.version(3).stores({
            face_descriptors: 'id, worker_id, descriptor',
            worker_profiles: 'id, nombres, apellidos, cedula, pin, departamento, cargo, activo, internal_id',
            recognitions: 'id, worker_id, created_at'
        });
    }
}

export const db = new FaceDatabase();

export const initDatabase = async () => {
    try {
        await db.open();
    } catch (error: any) {
        if (error.name === 'VersionError' || error.name === 'DataError') {
            await db.delete();
            window.location.reload();
        }
    }
};

const syncTableToSupabase = async <T extends Record<string, any>>(
    tableName: string,
    localData: T[],
    remoteKey: string,
    localKey: string = remoteKey
) => {
    if (!localData.length) return;

    const { data: remoteData } = await supabase.from(tableName).select(remoteKey);
    const remoteValues = new Set(remoteData?.map((item: any) => item[remoteKey]) || []);
    const newData = localData.filter((item: T) => !remoteValues.has(item[localKey]));

    if (newData.length > 0) {
        const cleanData = tableName === 'recognitions'
            ? newData.map(({ id, worker_id }) => ({ id, worker_id }))
            : newData;

        const { error } = await supabase.from(tableName).insert(cleanData);
        if (error) console.error(`${tableName} sync error:`, error);
    }
};

export const syncToSupabase = async () => {
    try {
        const [workers, descriptors, recognitions] = await Promise.all([
            db.worker_profiles.toArray(),
            db.face_descriptors.toArray(),
            db.recognitions.toArray()
        ]);

        await Promise.all([
            syncTableToSupabase('worker_profiles', workers, 'cedula'),
            syncTableToSupabase('face_descriptors', descriptors, 'worker_id'),
            syncTableToSupabase('recognitions', recognitions, 'id')
        ]);
    } catch (error) {
        console.error('Sync to Supabase failed:', error);
    }
};

export const syncFromSupabase = async () => {
    try {
        // Worker profiles
        const { data: workersData } = await supabase.from('worker_profiles').select('*');
        if (workersData) {
            await db.worker_profiles.clear();
            await db.worker_profiles.bulkAdd(workersData);
        }

        // Face descriptors
        const { data: descriptorsData } = await supabase.from('face_descriptors').select('*');
        if (descriptorsData) {
            await db.face_descriptors.clear();
            await db.face_descriptors.bulkAdd(descriptorsData);
        }

        // Recognitions
        const { data: recognitionsData } = await supabase.from('recognitions').select('*');
        if (recognitionsData) {
            await db.recognitions.clear();
            const processedRecognitions = recognitionsData.map(r => ({
                ...r,
                created_at: new Date(r.created_at)
            }));
            await db.recognitions.bulkAdd(processedRecognitions);
        }
    } catch (error) {
        console.error('Sync from Supabase failed:', error);
    }
};

export const logRecognition = async (workerId: string) => {
    await db.recognitions.add({
        id: crypto.randomUUID(),
        worker_id: workerId
    });
    await syncToSupabase();
};
