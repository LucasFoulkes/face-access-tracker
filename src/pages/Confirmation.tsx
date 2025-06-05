import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/hooks/useConfirmation";
import { UserInfoTable } from "@/components/UserInfoTable";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyIndicator } from "@/components/KeyIndicator";

function Confirmation() {
    const { state } = useLocation();
    const { user, isProcessing, handleConfirmation, handleRetry, redirectIfInvalid, isLoading } = useConfirmation(state);

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

    if (isLoading) return <p>Cargando información del usuario...</p>;
    if (!user) return null; // Handled by redirectIfInvalid    
    return (
        <div
            ref={keyboard.containerRef}
            className="flex items-center justify-center min-h-screen"
            tabIndex={0}
            style={{ outline: 'none' }}
        >
            <Card className="uppercase shadow-none">
                <CardContent>
                    <UserInfoTable user={user} />                    <div className="flex gap-4 mt-4">
                        <div className="flex-1">
                            <KeyIndicator
                                keyLabel="⏎"
                                isPressed={keyboard.isPressed('Enter')}
                                position="top-right"
                            >                                <Button
                                className="w-full text-2xl !p-4 !h-auto bg-emerald-500 hover:bg-emerald-600 uppercase"
                                onClick={handleConfirmation}
                                disabled={isProcessing}
                            >
                                    {isProcessing ? 'Procesando...' : 'confirmar'}
                                </Button>
                            </KeyIndicator>
                        </div>
                        <div className="flex-1">
                            <KeyIndicator
                                keyLabel="⌫"
                                isPressed={keyboard.isPressed('Backspace')}
                                position="top-right"
                            >                                <Button
                                className="w-full text-2xl !p-4 !h-auto bg-amber-500 hover:bg-amber-600 uppercase"
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
    );
}

export default Confirmation;