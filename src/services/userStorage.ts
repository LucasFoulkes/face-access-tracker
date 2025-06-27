// Simplified storage solution - using localStorage with better structure
// This ensures we have a working system while PouchDB issues are resolved

// TypeScript interfaces for our data models
interface User {
    id: string;
    name: string;
    cedula: string;
    pin: string;
    createdAt: string;
}

interface FaceDescriptor {
    id: string;
    userId: string;
    descriptor: number[];
    createdAt: string;
}

interface Entry {
    id: string;
    userId: string;
    timestamp: string;
    method: 'face' | 'pin' | 'cedula' | 'register';
}

// User data management with localStorage - reliable and simple
export const userStorage = {
    // Get all users
    getUsers: async (): Promise<User[]> => {
        try {
            const users = localStorage.getItem('users');
            return users ? JSON.parse(users) : [];
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    },

    // Get all entries
    getEntries: async (): Promise<Entry[]> => {
        try {
            const entries = localStorage.getItem('entries');
            return entries ? JSON.parse(entries) : [];
        } catch (error) {
            console.error('Error getting entries:', error);
            return [];
        }
    },

    // Get face descriptors for a user
    getUserDescriptors: async (userId: string): Promise<FaceDescriptor[]> => {
        try {
            const descriptors = localStorage.getItem('face_descriptors');
            const allDescriptors = descriptors ? JSON.parse(descriptors) : [];
            return allDescriptors.filter((desc: FaceDescriptor) => desc.userId === userId);
        } catch (error) {
            console.error('Error getting user descriptors:', error);
            return [];
        }
    },

    // Get all face descriptors
    getAllDescriptors: async (): Promise<FaceDescriptor[]> => {
        try {
            const descriptors = localStorage.getItem('face_descriptors');
            return descriptors ? JSON.parse(descriptors) : [];
        } catch (error) {
            console.error('Error getting all descriptors:', error);
            return [];
        }
    },

    generateUniqueId: async (): Promise<string> => {
        const users = await userStorage.getUsers();
        const usedIds = new Set(users.map(u => u.id));

        let id;
        do {
            id = Math.floor(10000 + Math.random() * 90000).toString(); // 5-digit ID
        } while (usedIds.has(id));

        return id;
    },

    // Create or update user
    saveUser: async (userData: Omit<User, 'createdAt'>): Promise<string> => {
        try {
            const users = await userStorage.getUsers();
            const user: User = {
                ...userData,
                createdAt: new Date().toISOString()
            };

            // Check if user already exists
            const existingIndex = users.findIndex(u => u.id === user.id);
            if (existingIndex >= 0) {
                users[existingIndex] = user;
            } else {
                users.push(user);
            }

            localStorage.setItem('users', JSON.stringify(users));
            console.log('User saved:', user);
            return user.id;
        } catch (error) {
            console.error('Error saving user:', error);
            throw error;
        }
    },

    // Update existing user
    updateUser: async (userId: string, updates: Partial<Omit<User, 'id'>>): Promise<void> => {
        try {
            const users = await userStorage.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);

            if (userIndex >= 0) {
                users[userIndex] = { ...users[userIndex], ...updates };
                localStorage.setItem('users', JSON.stringify(users));
                console.log('User updated:', users[userIndex]);
            } else {
                throw new Error('User not found');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    },

    // Delete user and their descriptors
    deleteUser: async (userId: string): Promise<void> => {
        try {
            // Delete user
            const users = await userStorage.getUsers();
            const updatedUsers = users.filter(u => u.id !== userId);
            localStorage.setItem('users', JSON.stringify(updatedUsers));

            // Delete all face descriptors for this user
            const descriptors = await userStorage.getAllDescriptors();
            const updatedDescriptors = descriptors.filter(desc => desc.userId !== userId);
            localStorage.setItem('face_descriptors', JSON.stringify(updatedDescriptors));

            console.log('User deleted:', userId);
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    // Add face descriptor to user
    addDescriptor: async (userId: string, descriptor: Float32Array): Promise<string> => {
        try {
            const descriptors = await userStorage.getAllDescriptors();
            const descriptorId = `desc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const faceDescriptor: FaceDescriptor = {
                id: descriptorId,
                userId,
                descriptor: Array.from(descriptor),
                createdAt: new Date().toISOString()
            };

            descriptors.push(faceDescriptor);
            localStorage.setItem('face_descriptors', JSON.stringify(descriptors));
            console.log('Descriptor added:', faceDescriptor);
            return descriptorId;
        } catch (error) {
            console.error('Error adding descriptor:', error);
            throw error;
        }
    },

    // Add user with face descriptor (for registration)
    add: async (name: string, cedula: string, pin: string, descriptor: Float32Array): Promise<string> => {
        try {
            console.log('Adding user:', { name, cedula, pin });
            const existingUser = await userStorage.findByName(name);

            if (existingUser) {
                // Add descriptor to existing user
                console.log('Adding descriptor to existing user:', existingUser.name);
                await userStorage.addDescriptor(existingUser.id, descriptor);
                return existingUser.id;
            } else {
                // Create new user
                const id = await userStorage.generateUniqueId();
                console.log('Creating new user with ID:', id);
                await userStorage.saveUser({ id, name, cedula, pin });
                await userStorage.addDescriptor(id, descriptor);
                return id;
            }
        } catch (error) {
            console.error('Error adding user with descriptor:', error);
            throw error;
        }
    },

    findByPin: async (pin: string): Promise<User | undefined> => {
        try {
            const users = await userStorage.getUsers();
            return users.find(u => u.pin === pin);
        } catch (error) {
            console.error('Error finding user by PIN:', error);
            return undefined;
        }
    },

    findByCedula: async (cedula: string): Promise<User | undefined> => {
        try {
            const users = await userStorage.getUsers();
            return users.find(u => u.cedula === cedula);
        } catch (error) {
            console.error('Error finding user by cedula:', error);
            return undefined;
        }
    },

    findByName: async (name: string): Promise<User | undefined> => {
        try {
            const users = await userStorage.getUsers();
            return users.find(u => u.name === name);
        } catch (error) {
            console.error('Error finding user by name:', error);
            return undefined;
        }
    },

    logEntry: async (userId: string, method: 'face' | 'pin' | 'cedula' | 'register'): Promise<string> => {
        try {
            const entries = await userStorage.getEntries();
            const entryId = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const entry: Entry = {
                id: entryId,
                userId,
                timestamp: new Date().toISOString(),
                method
            };

            entries.push(entry);
            localStorage.setItem('entries', JSON.stringify(entries));
            console.log('Entry logged:', entry);
            return entryId;
        } catch (error) {
            console.error('Error logging entry:', error);
            throw error;
        }
    },

    generateUniquePin: async (): Promise<string> => {
        try {
            const users = await userStorage.getUsers();
            const usedPins = new Set(users.map(u => u.pin));

            let pin;
            do {
                pin = Math.floor(1000 + Math.random() * 9000).toString();
            } while (usedPins.has(pin));

            return pin;
        } catch (error) {
            console.error('Error generating unique PIN:', error);
            throw error;
        }
    },

    // Legacy compatibility methods for existing code
    get: async () => {
        const users = await userStorage.getUsers();
        const allDescriptors = await userStorage.getAllDescriptors();

        // Transform to legacy format for compatibility
        return users.map(user => ({
            ...user,
            descriptors: allDescriptors
                .filter(desc => desc.userId === user.id)
                .map(desc => desc.descriptor)
        }));
    },

    // Utility method to clear all data (for testing)
    clearAll: async (): Promise<void> => {
        try {
            localStorage.removeItem('users');
            localStorage.removeItem('face_descriptors');
            localStorage.removeItem('entries');
            console.log('All data cleared');
        } catch (error) {
            console.error('Error clearing all data:', error);
            throw error;
        }
    }
};
