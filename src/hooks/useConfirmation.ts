import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useState } from "react";

interface LocationState {
    userId: number;
    authValue: string;
    authMethod?: 'pin' | 'cedula' | string;
}

export function useConfirmation(state: LocationState | null) {
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);

    // Get user data
    const user = useLiveQuery(
        async () => {
            if (state?.userId) {
                return await db.usuarios.get(state.userId);
            }
            return null;
        },
        [state?.userId]
    );

    // Handle confirmation process
    const handleConfirmation = async () => {
        if (!state?.userId || isProcessing) return;

        setIsProcessing(true);

        try {
            // Create attendance record
            try {
                await db.registros.add({
                    usuarioId: state.userId,
                    fecha: new Date(),
                    hora: new Date().toLocaleTimeString('es-ES', {
                        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })
                });
            } catch (e) {
                console.error('Error al guardar el registro:', e);
                // Continue despite record creation failure
            }

            // Check admin status and navigate
            const isAdmin = !!(await db.admin.where('usuarioId').equals(state.userId).first());
            navigate(isAdmin ? "/admin" : "/", isAdmin ? {
                state: { userId: state.userId, authValue: state.authValue }
            } : undefined);

        } catch (error) {
            console.error('Error during confirmation process:', error);
            navigate("/");
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        user,
        isProcessing,
        handleConfirmation,
        handleRetry: () => navigate(state?.authMethod ? `/${state.authMethod}` : "/"),
        redirectIfInvalid: () => { if (!state?.userId) navigate("/"); },
        isLoading: !user && !!state?.userId
    };
}
