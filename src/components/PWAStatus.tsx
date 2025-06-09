import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useState, useEffect } from "react";

export default function PWAStatus() {
    const isOnline = useNetworkStatus();
    const [isInstalled, setIsInstalled] = useState<boolean>(false);

    useEffect(() => {
        // Check if the app is running in standalone mode (installed as PWA)
        const isInStandaloneMode = () =>
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone ||
            document.referrer.includes('android-app://');

        setIsInstalled(isInStandaloneMode());

        const mediaQueryList = window.matchMedia('(display-mode: standalone)');
        const handleChange = (e: MediaQueryListEvent) => {
            setIsInstalled(e.matches);
        };

        mediaQueryList.addEventListener('change', handleChange);
        return () => {
            mediaQueryList.removeEventListener('change', handleChange);
        };
    }, []);

    if (!isInstalled) return null;

    return (
        <div className={`fixed bottom-4 right-4 px-3 py-1 rounded-full text-sm font-medium z-50 
      ${isOnline ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {isOnline ? 'Online' : 'Offline Mode'}
        </div>
    );
}
