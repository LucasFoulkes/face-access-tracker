import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/hooks/useConfirmation";
import { UserInfoTable } from "@/components/UserInfoTable";

function Confirmation() {
    const { state } = useLocation();
    const { user, isProcessing, handleConfirmation, handleRetry, redirectIfInvalid, isLoading } = useConfirmation(state);

    useEffect(() => { redirectIfInvalid(); }, [redirectIfInvalid]);

    if (isLoading) return <p>Cargando información del usuario...</p>;
    if (!user) return null; // Handled by redirectIfInvalid

    return (
        <Card className="uppercase shadow-none">
            <CardContent>
                <UserInfoTable user={user} />
                <div className="flex gap-4 mt-4">
                    <Button
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 uppercase"
                        onClick={handleConfirmation}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Procesando...' : 'confirmar'}
                    </Button>
                    <Button
                        className="flex-1 bg-amber-500 hover:bg-amber-600 uppercase"
                        onClick={handleRetry}
                        disabled={isProcessing}
                    >
                        regresar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default Confirmation;