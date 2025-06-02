import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export function usePWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false); useEffect(() => {
        // Check if app is already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isInWebAppiOS = (window.navigator as any).standalone === true;
        const installed = isStandalone || isInWebAppiOS;
        setIsInstalled(installed);

        console.log('PWA Status:', {
            isStandalone,
            isInWebAppiOS,
            installed,
            userAgent: navigator.userAgent
        });

        const handleBeforeInstallPrompt = (e: Event) => {
            console.log('beforeinstallprompt event fired');
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const installApp = async () => {
        if (!deferredPrompt) return false;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsInstallable(false);
        }

        return outcome === 'accepted';
    };

    return {
        isInstallable,
        isInstalled,
        installApp
    };
}
