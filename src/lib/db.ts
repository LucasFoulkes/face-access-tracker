import Dexie, { type EntityTable } from 'dexie';

interface Usuario {
    id: number;
    codigo: string;
    cedula: string;
    apellidos: string;
    nombres: string;
    pin: string;
}

interface Admin {
    id: number;
    usuarioId: number;
    fechaCreacion: Date;
}

interface Registro {
    id: number;
    usuarioId: number;
    fecha: Date;
    hora: string;
}

interface FaceData {
    id: number;
    usuarioId: number;
    descriptor: Float32Array; // 128-dimensional face descriptor from face-api.js
    fechaRegistro: Date;
}

export const db = new Dexie('TimeAttendanceDatabase') as Dexie & {
    usuarios: EntityTable<
        Usuario,
        'id' // primary key "id" (for the typings only)
    >;
    admin: EntityTable<
        Admin,
        'id' // primary key "id" (for the typings only)
    >;
    registros: EntityTable<
        Registro,
        'id' // primary key "id" (for the typings only)
    >;
    faceData: EntityTable<
        FaceData,
        'id' // primary key "id" (for the typings only)
    >;
};

// Schema declaration:
// Version 1: Original tables
db.version(1).stores({
    usuarios: '++id, codigo, cedula, apellidos, nombres, pin',
    admin: '++id, usuarioId, fechaCreacion',
    registros: '++id, usuarioId, fecha, hora'
});

// Version 2: Add faceData table
db.version(2).stores({
    usuarios: '++id, codigo, cedula, apellidos, nombres, pin',
    admin: '++id, usuarioId, fechaCreacion',
    registros: '++id, usuarioId, fecha, hora',
    faceData: '++id, usuarioId, fechaRegistro' // New table added in version 2
}).upgrade(tx => {
    // Upgrade function - this runs when upgrading from version 1 to 2
    console.log('Upgrading database to version 2, adding faceData table');
    // The table is automatically created by Dexie when we define it in stores()
    return Promise.resolve();
});

db.on('populate', async () => {
    const userId = await db.usuarios.add({
        codigo: '00000',
        cedula: '0123456789',
        apellidos: 'admin',
        nombres: 'admin',
        pin: '7714'
    });

    // Add Lucas as admin using his user ID
    await db.admin.add({
        usuarioId: userId,
        fechaCreacion: new Date()
    });
});

export type { Usuario, Admin, Registro, FaceData };
