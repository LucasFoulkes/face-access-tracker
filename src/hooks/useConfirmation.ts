import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useState } from "react";

interface LocationState {
    userId: number;
    authMethod: 'cedula' | 'pin';
    authValue: string;
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

    // Create attendance record
    const createAttendanceRecord = async (userId: number): Promise<boolean> => {
        try {
            await db.registros.add({
                usuarioId: userId,
                fecha: new Date(),
                hora: new Date().toLocaleTimeString('es-ES', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                })
            });
            return true;
        } catch (error) {
            console.error('Error al guardar el registro:', error);
            return false;
        }
    };

    // Check if user is admin
    const checkAdminStatus = async (userId: number): Promise<boolean> => {
        try {
            const adminRecord = await db.admin
                .where('usuarioId')
                .equals(userId)
                .first();
            return !!adminRecord;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    };

    // Handle confirmation process
    const handleConfirmation = async () => {
        if (!state?.userId || isProcessing) return;

        setIsProcessing(true);

        try {
            // Create attendance record
            const recordCreated = await createAttendanceRecord(state.userId);

            if (!recordCreated) {
                console.error('Failed to create attendance record');
                // Still continue with navigation even if record creation fails
            }

            // Check admin status and navigate accordingly
            const isAdmin = await checkAdminStatus(state.userId);

            if (isAdmin) {
                navigate("/admin", {
                    state: {
                        userId: state.userId,
                        authMethod: state.authMethod,
                        authValue: state.authValue
                    }
                });
            } else {
                navigate("/");
            }
        } catch (error) {
            console.error('Error during confirmation process:', error);
            navigate("/");
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle retry - go back to specific login method
    const handleRetry = () => {
        if (state?.authMethod === 'pin') {
            navigate("/pin");
        } else if (state?.authMethod === 'cedula') {
            navigate("/cedula");
        } else {
            navigate("/");
        }
    };

    // Redirect if no valid state
    const redirectIfInvalid = () => {
        if (!state?.userId) {
            navigate("/");
        }
    };

    return {
        user,
        isProcessing,
        handleConfirmation,
        handleRetry,
        redirectIfInvalid,
        isLoading: !user && !!state?.userId
    };
}
