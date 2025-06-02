import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/hooks/useConfirmation";
import { UserInfoTable } from "@/components/UserInfoTable";

interface LocationState {
    userId: number;
    authMethod: 'cedula' | 'pin';
    authValue: string;
}

function Confirmation() {
    const location = useLocation();
    const state = location.state as LocationState;

    const {
        user,
        isProcessing,
        handleConfirmation,
        handleRetry,
        redirectIfInvalid,
        isLoading
    } = useConfirmation(state);

    useEffect(() => {
        redirectIfInvalid();
    }, [redirectIfInvalid]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p>Cargando información del usuario...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // This will be handled by the redirect
    } return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md uppercase shadow-none">
                <CardContent>
                    <UserInfoTable user={user} />
                    <div className="flex gap-4 mt-4">
                        <Button
                            className="uppercase flex-1 bg-emerald-500 hover:bg-emerald-600"
                            onClick={handleConfirmation}
                            disabled={isProcessing}
                        >
                            {isProcessing ? 'Procesando...' : 'confirmar'}
                        </Button>
                        <Button
                            className="uppercase flex-1 bg-amber-500 hover:bg-amber-600"
                            onClick={handleRetry}
                            disabled={isProcessing}
                        >
                            reintentar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default Confirmation;