/**
 * Utility for handling screen orientation
 */

/**
 * Locks the screen orientation to the specified type
 * @param orientationType The orientation to lock to (e.g., 'landscape', 'portrait')
 * @returns Promise that resolves when orientation is locked (or fails)
 */
export async function lockOrientation(orientationType: OrientationLockType): Promise<boolean> {
    try {
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock(orientationType);
            return true;
        } else {
            console.warn('Screen orientation API not supported');
            return false;
        }
    } catch (error) {
        console.error('Failed to lock orientation:', error);
        return false;
    }
}

/**
 * Unlocks the screen orientation
 */
export function unlockOrientation(): void {
    try {
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
    } catch (error) {
        console.error('Failed to unlock orientation:', error);
    }
}

/**
 * Gets the current screen orientation type
 * @returns The current orientation type
 */
export function getCurrentOrientation(): string {
    if (screen.orientation) {
        return screen.orientation.type;
    }

    // Fallback for browsers without orientation API
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}

/**
 * Adds an orientation change listener
 * @param callback The function to call when orientation changes
 * @returns A function to remove the listener
 */
export function addOrientationChangeListener(
    callback: (orientation: string) => void
): () => void {
    const handleChange = () => {
        callback(getCurrentOrientation());
    };

    if (screen.orientation) {
        screen.orientation.addEventListener('change', handleChange);
        return () => screen.orientation.removeEventListener('change', handleChange);
    } else {
        window.addEventListener('resize', handleChange);
        return () => window.removeEventListener('resize', handleChange);
    }
}
