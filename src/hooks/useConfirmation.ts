import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useState } from "react";

interface LocationState {
    userId: number;
    authValue: string;
    authMethod?: 'pin' | 'cedula' | 'facial' | string;
    faceDescriptor?: number[]; // Face descriptor for registration
    isRegistration?: boolean; // Flag to indicate face registration
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
    );    // Handle confirmation process
    const handleConfirmation = async () => {
        if (!state?.userId || isProcessing) return;

        setIsProcessing(true);

        try {
            // Handle face registration if needed
            if (state.isRegistration && state.faceDescriptor) {
                try {
                    // Convert array back to Float32Array and save to faceData table
                    const descriptorArray = new Float32Array(state.faceDescriptor);
                    await db.faceData.add({
                        usuarioId: state.userId,
                        descriptor: descriptorArray,
                        fechaRegistro: new Date()
                    });
                    console.log(`Face data registered for user ${state.userId}`);
                } catch (e) {
                    console.error('Error saving face data:', e);
                    // Continue despite face registration failure
                }
            }

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
    }; return {
        user,
        isProcessing,
        handleConfirmation,
        handleRetry: () => {
            if (state?.isRegistration) {
                // Go back to the appropriate auth method with face registration data
                navigate(`/${state.authMethod}`, {
                    state: {
                        faceDescriptor: state.faceDescriptor,
                        isRegistration: true
                    }
                });
            } else {
                // Normal flow - go back to auth method or home
                navigate(state?.authMethod ? `/${state.authMethod}` : "/");
            }
        },
        redirectIfInvalid: () => { if (!state?.userId) navigate("/"); },
        isLoading: !user && !!state?.userId
    };
}
