import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/hooks/useConfirmation";
import { UserInfoTable } from "@/components/UserInfoTable";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyIndicator } from "@/components/KeyIndicator";
import { useViewport } from "@/hooks/useViewport";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";

function Confirmation() {
    const { state } = useLocation();
    const { user, isProcessing, handleConfirmation, handleRetry, redirectIfInvalid, isLoading } = useConfirmation(state);
    const { isLandscape, isMobile } = useViewport();

    // Keyboard shortcuts
    const keyboard = useKeyboardShortcuts({
        shortcuts: [
            {
                key: 'Enter',
                action: () => !isProcessing && handleConfirmation()
            },
            {
                key: 'Backspace',
                action: () => !isProcessing && handleRetry()
            }
        ]
    });

    useEffect(() => { redirectIfInvalid(); }, [redirectIfInvalid]);

    if (isLoading) {
        return (
            <ResponsiveContainer>
                <div className="flex items-center justify-center min-h-[50vh]">
                    <p className="text-xl text-white animate-pulse">Cargando información del usuario...</p>
                </div>
            </ResponsiveContainer>
        );
    }

    if (!user) return null; // Handled by redirectIfInvalid  

    return (
        <ResponsiveContainer>
            <div
                ref={keyboard.containerRef}
                className="flex items-center justify-center full-height-mobile min-h-[80vh]"
                tabIndex={0}
                style={{ outline: 'none' }}
            >
                <Card className={`uppercase shadow-none w-full max-w-md ${isMobile ? 'p-2' : 'p-4'}`}>
                    <CardContent className={isMobile ? 'p-3' : 'p-6'}>
                        {/* Show face registration indicator */}
                        {state?.isRegistration && (
                            <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                                <p className="text-blue-800 font-semibold text-center">
                                    🔒 Registrando Rostro
                                </p>
                                <p className="text-blue-600 text-sm text-center mt-1">
                                    Tu rostro será asociado a tu cuenta
                                </p>
                            </div>
                        )}

                        <UserInfoTable user={user} />

                        <div className={`flex ${isLandscape || !isMobile ? 'flex-row' : 'flex-col'} gap-4 mt-4`}>
                            <div className={`${isLandscape || !isMobile ? 'flex-1' : 'w-full'}`}>
                                <KeyIndicator
                                    keyLabel="⏎"
                                    isPressed={keyboard.isPressed('Enter')}
                                    position="top-right"
                                >
                                    <Button
                                        className={`w-full ${isMobile ? 'text-lg !p-3' : 'text-2xl !p-4'} !h-auto bg-emerald-500 hover:bg-emerald-600 uppercase`}
                                        onClick={handleConfirmation}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? 'Procesando...' : 'confirmar'}
                                    </Button>
                                </KeyIndicator>
                            </div>
                            <div className={`${isLandscape || !isMobile ? 'flex-1' : 'w-full'}`}>
                                <KeyIndicator
                                    keyLabel="⌫"
                                    isPressed={keyboard.isPressed('Backspace')}
                                    position="top-right"
                                >
                                    <Button
                                        className={`w-full ${isMobile ? 'text-lg !p-3' : 'text-2xl !p-4'} !h-auto bg-amber-500 hover:bg-amber-600 uppercase`}
                                        onClick={handleRetry}
                                        disabled={isProcessing}
                                    >
                                        regresar
                                    </Button>
                                </KeyIndicator>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ResponsiveContainer>
    );
}

export default Confirmation;