import { useState, useEffect, useRef } from "react";

export interface KeyboardShortcut {
    key: string;
    action: () => void;
    condition?: () => boolean; // Optional condition for conditional actions
}

export interface KeyboardShortcutsOptions {
    shortcuts: KeyboardShortcut[];
    autoFocus?: boolean;
    focusDelay?: number;
    focusSelectors?: string[]; // For custom focus targeting (like OTP inputs)
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
    const { shortcuts, autoFocus = true, focusDelay = 100, focusSelectors } = options;
    const [pressedKey, setPressedKey] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null); useEffect(() => {
        let focusTimer: ReturnType<typeof setTimeout> | undefined;

        // Auto-focus logic
        if (autoFocus) {
            focusTimer = setTimeout(() => {
                if (focusSelectors && containerRef.current) {
                    // Try custom selectors first (for OTP inputs)
                    const element = focusSelectors
                        .map(s => containerRef.current?.querySelector(s) as HTMLElement)
                        .find(el => el) || containerRef.current;
                    element?.focus();
                } else {
                    // Default: focus container
                    containerRef.current?.focus();
                }
            }, focusDelay);
        }

        // Keyboard event handler
        const handleKeyDown = (e: KeyboardEvent) => {
            const matchingShortcut = shortcuts.find(shortcut => {
                // Handle special keys
                const key = shortcut.key === 'Enter' ? 'Enter' : shortcut.key;
                return e.key === key;
            });

            if (matchingShortcut) {
                // Check condition if provided
                if (matchingShortcut.condition && !matchingShortcut.condition()) {
                    return;
                }

                e.preventDefault();

                // Visual feedback
                setPressedKey(matchingShortcut.key);
                setTimeout(() => setPressedKey(null), 150);

                // Execute action
                matchingShortcut.action();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            if (focusTimer) clearTimeout(focusTimer);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [shortcuts, autoFocus, focusDelay, focusSelectors]);

    return {
        containerRef,
        pressedKey,
        isPressed: (key: string) => pressedKey === key,
    };
}
