// User data management and persistence - single responsibility
export const userStorage = {
    get: () => JSON.parse(localStorage.getItem('faces') || '[]'),
    getEntries: () => JSON.parse(localStorage.getItem('entries') || '[]'),

    generateUniqueId: () => {
        const faces = userStorage.get();
        const usedIds = new Set(faces.map((f: any) => f.id));

        let id;
        do {
            id = Math.floor(10000 + Math.random() * 90000).toString(); // 5-digit ID
        } while (usedIds.has(id));

        return id;
    },

    add: (name: string, cedula: string, pin: string, descriptor: Float32Array) => {
        const faces = userStorage.get();
        const existingUser = faces.find((f: any) => f.name === name);

        if (existingUser) {
            // Add descriptor to existing user
            existingUser.descriptors.push(Array.from(descriptor));
            localStorage.setItem('faces', JSON.stringify(faces));
            return existingUser.id;
        } else {
            // Create new user with unique ID and first descriptor
            const id = userStorage.generateUniqueId();
            faces.push({
                id,
                name,
                cedula,
                pin,
                descriptors: [Array.from(descriptor)]
            });
            localStorage.setItem('faces', JSON.stringify(faces));
            return id;
        }
    },

    findByPin: (pin: string) => userStorage.get().find((f: any) => f.pin === pin),
    findByCedula: (cedula: string) => userStorage.get().find((f: any) => f.cedula === cedula),
    findByName: (name: string) => userStorage.get().find((f: any) => f.name === name),

    logEntry: (userId: string, method: 'face' | 'pin' | 'cedula' | 'register') => {
        const entries = userStorage.getEntries();
        const entry = {
            userId,
            timestamp: new Date().toISOString(),
            method
        };

        entries.push(entry);
        localStorage.setItem('entries', JSON.stringify(entries));
    },

    generateUniquePin: () => {
        const usedPins = new Set(userStorage.get().map((f: any) => f.pin));
        let pin;
        do {
            pin = Math.floor(1000 + Math.random() * 9000).toString();
        } while (usedPins.has(pin));
        return pin;
    }
};
