import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/usePWA";

export function PWAInstallPrompt() {
    const { isInstallable, isInstalled, installApp } = usePWA();

    console.log('PWA Prompt State:', { isInstallable, isInstalled });

    // Always show in development mode for testing
    const isDev = import.meta.env.DEV;
    const shouldShow = (isInstallable && !isInstalled) || isDev;

    if (!shouldShow) {
        return null;
    }

    const handleInstall = () => {
        if (isInstallable) {
            installApp();
        } else {
            // Show manual install instructions
            alert('To install this app:\n1. Open browser menu\n2. Look for "Install app" or "Add to Home Screen"\n3. Follow the prompts');
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50">
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
                <div className="flex items-center gap-3">
                    <Download className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm">
                            {isInstallable ? 'Install App' : 'Add to Home Screen'}
                        </h3>
                        <p className="text-xs text-gray-600">
                            {isInstallable
                                ? 'Add to home screen for quick access'
                                : 'Use browser menu to install'
                            }
                        </p>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleInstall}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isInstallable ? 'Install' : 'Help'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
