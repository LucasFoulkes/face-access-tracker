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
};

// Schema declaration:
db.version(1).stores({
    usuarios: '++id, codigo, cedula, apellidos, nombres, pin', // primary key "id" (for the runtime!)
    admin: '++id, usuarioId, fechaCreacion', // primary key "id" (for the runtime!)
    registros: '++id, usuarioId, fecha, hora' // primary key "id" (for the runtime!)
});

db.on('populate', async () => {
    const userId = await db.usuarios.add({
        codigo: '001',
        cedula: '11111111111',
        apellidos: 'Foulkes Arroyo',
        nombres: 'Lucas Gabriel',
        pin: '7714'
    });

    // Add Lucas as admin using his user ID
    await db.admin.add({
        usuarioId: userId,
        fechaCreacion: new Date()
    });
});

export type { Usuario, Admin, Registro };
