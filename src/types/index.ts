export interface FaceDescriptor {
    id: string;
    worker_id: string;
    descriptor: number[];
}

export interface WorkerProfile {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string;
    pin: string;
    departamento: string;
    cargo: string;
    activo: boolean;
    internal_id: number | null;
}

export interface Recognition {
    id: string;
    worker_id: string;
    created_at?: Date;
}
