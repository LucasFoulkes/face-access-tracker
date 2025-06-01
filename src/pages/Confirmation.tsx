import { useLocation, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface LocationState {
    userId: number;
    authMethod: 'cedula' | 'pin';
    authValue: string;
}

function Confirmation() {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as LocationState;

    useEffect(() => {
        if (!state?.userId) {
            navigate("/");
        }
    }, [state, navigate]);

    const user = useLiveQuery(
        async () => {
            if (state?.userId) {
                return await db.usuarios.get(state.userId);
            }
            return null;
        },
        [state?.userId]
    );

    const handleConfirmar = async () => {
        // Debug: Check database state
        console.log('=== DEBUG DATABASE STATE ===');
        const allUsers = await db.usuarios.toArray();
        const allAdmins = await db.admin.toArray();
        console.log('All users:', allUsers);
        console.log('All admins:', allAdmins);
        console.log('Current userId:', state.userId);
        console.log('===============================');

        // Add entry to registros table
        if (state?.userId) {
            try {
                await db.registros.add({
                    usuarioId: state.userId,
                    fecha: new Date(),
                    hora: new Date().toLocaleTimeString('es-ES', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    })
                });
            } catch (error) {
                console.error('Error al guardar el registro:', error);
            }

            // Check if user is admin at the moment of confirmation
            try {
                console.log('Checking admin for userId:', state.userId);
                const adminRecord = await db.admin
                    .where('usuarioId')
                    .equals(state.userId)
                    .first();

                console.log('Admin record found:', adminRecord);

                if (adminRecord) {
                    console.log('User is admin, navigating to admin page');
                    navigate("/admin", {
                        state: {
                            userId: state.userId,
                            authMethod: state.authMethod,
                            authValue: state.authValue
                        }
                    });
                } else {
                    console.log('User is not admin, navigating to home');
                    navigate("/");
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
                navigate("/");
            }
        } else {
            navigate("/");
        }
    };

    const handleReintentar = () => {
        // Go back to the specific login method used
        if (state?.authMethod === 'pin') {
            navigate("/pin");
        } else if (state?.authMethod === 'cedula') {
            navigate("/cedula");
        } else {
            navigate("/");
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p>Cargando información del usuario...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md uppercase shadow-none">
                <CardContent>
                    <Table>
                        <TableBody>
                            {Object.entries(user).map(([key, value]) => (
                                <TableRow key={key}>
                                    <TableCell className="font-bold">{key.charAt(0).toUpperCase() + key.slice(1)}</TableCell>
                                    <TableCell>{String(value)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="flex gap-4 mt-4">
                        <Button
                            className="uppercase flex-1 bg-emerald-500 hover:bg-emerald-600"
                            onClick={handleConfirmar}
                        >
                            confirmar
                        </Button>
                        <Button
                            className="uppercase flex-1 bg-amber-500 hover:bg-amber-600"
                            onClick={handleReintentar}
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