import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, Trash2, Save, X, Upload } from "lucide-react";
import { db, type Usuario } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useExcel } from "@/hooks/useExcel";

interface UsuarioFormData {
    codigo: string;
    cedula: string;
    apellidos: string;
    nombres: string;
    pin: string;
}

interface UsuariosCRUDProps {
    importActions?: React.ReactNode;
}

function UsuariosCRUD({ importActions }: UsuariosCRUDProps) {
    const usuarios = useLiveQuery(() => db.usuarios.toArray()) || []; const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);
    const [formData, setFormData] = useState<UsuarioFormData>({
        codigo: '',
        cedula: '',
        apellidos: '',
        nombres: '',
        pin: ''
    });
    const [errors, setErrors] = useState<Partial<UsuarioFormData>>({});
    const { exportWithState } = useExcel();

    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return usuarios;
        const normalizedQuery = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return usuarios.filter(usuario =>
            Object.values(usuario).some(value =>
                String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedQuery)
            )
        );
    }, [usuarios, searchQuery]); const resetForm = () => {
        setFormData({
            codigo: '',
            cedula: '',
            apellidos: '',
            nombres: '',
            pin: ''
        });
        setErrors({});
        setEditingUser(null);
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<UsuarioFormData> = {};

        if (!formData.cedula.trim()) {
            newErrors.cedula = 'Cédula es requerida';
        } else if (!/^\d{7,10}$/.test(formData.cedula.trim())) {
            newErrors.cedula = 'Cédula debe tener entre 7 y 10 dígitos';
        }

        if (!formData.nombres.trim()) {
            newErrors.nombres = 'Nombres son requeridos';
        }

        if (!formData.apellidos.trim()) {
            newErrors.apellidos = 'Apellidos son requeridos';
        }

        if (formData.pin && !/^\d{4}$/.test(formData.pin.trim())) {
            newErrors.pin = 'PIN debe ser un número de 4 dígitos';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            const userData = {
                codigo: formData.codigo.trim(),
                cedula: formData.cedula.trim(),
                apellidos: formData.apellidos.trim(),
                nombres: formData.nombres.trim(),
                pin: formData.pin.trim()
            };

            if (editingUser) {
                await db.usuarios.update(editingUser.id, userData);
            } else {
                await db.usuarios.add(userData);
            }

            setIsDialogOpen(false);
            resetForm();
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Error al guardar el usuario');
        }
    };

    const handleEdit = (usuario: Usuario) => {
        setEditingUser(usuario);
        setFormData({
            codigo: usuario.codigo || '',
            cedula: usuario.cedula || '',
            apellidos: usuario.apellidos || '',
            nombres: usuario.nombres || '',
            pin: usuario.pin || ''
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (usuario: Usuario) => {
        if (confirm(`¿Está seguro de eliminar al usuario ${usuario.nombres} ${usuario.apellidos}?`)) {
            try {
                await db.usuarios.delete(usuario.id);
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('Error al eliminar el usuario');
            }
        }
    };

    const handleExport = () => {
        const columns = ['id', 'codigo', 'cedula', 'apellidos', 'nombres', 'pin'];
        exportWithState(searchQuery.trim() ? filteredData : usuarios, columns, 'usuarios');
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        resetForm();
    };

    return (
        <Card className="min-w-5xl flex flex-col h-[calc(100vh-150px)] p-0 gap-0">
            <CardHeader className="p-0 space-y-4 pb-0 px-4 pt-4 gap-0">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                        type="text"
                        placeholder="Buscar usuarios..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <CardAction className="flex gap-4">
                    {importActions}

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                onClick={() => setIsDialogOpen(true)}
                                className="uppercase bg-blue-500 hover:bg-blue-600"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Nuevo Usuario
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="codigo">Código</Label>
                                    <Input
                                        id="codigo"
                                        value={formData.codigo}
                                        onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                                        placeholder="Código del usuario (opcional)"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="cedula">Cédula *</Label>
                                    <Input
                                        id="cedula"
                                        value={formData.cedula}
                                        onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                                        placeholder="Número de cédula"
                                        className={errors.cedula ? 'border-red-500' : ''}
                                    />
                                    {errors.cedula && <p className="text-red-500 text-sm mt-1">{errors.cedula}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="nombres">Nombres *</Label>
                                    <Input
                                        id="nombres"
                                        value={formData.nombres}
                                        onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                                        placeholder="Nombres del usuario"
                                        className={errors.nombres ? 'border-red-500' : ''}
                                    />
                                    {errors.nombres && <p className="text-red-500 text-sm mt-1">{errors.nombres}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="apellidos">Apellidos *</Label>
                                    <Input
                                        id="apellidos"
                                        value={formData.apellidos}
                                        onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                                        placeholder="Apellidos del usuario"
                                        className={errors.apellidos ? 'border-red-500' : ''}
                                    />
                                    {errors.apellidos && <p className="text-red-500 text-sm mt-1">{errors.apellidos}</p>}
                                </div>                                <div>
                                    <Label htmlFor="pin">PIN</Label>
                                    <Input
                                        id="pin"
                                        type="text"
                                        value={formData.pin}
                                        onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                                        placeholder="PIN de 4 dígitos (opcional)"
                                        maxLength={4}
                                        className={errors.pin ? 'border-red-500' : ''}
                                    />
                                    {errors.pin && <p className="text-red-500 text-sm mt-1">{errors.pin}</p>}
                                </div>

                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={handleDialogClose}>
                                        <X className="w-4 h-4 mr-1" />
                                        Cancelar
                                    </Button>
                                    <Button onClick={handleSave}>
                                        <Save className="w-4 h-4 mr-1" />
                                        Guardar
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button onClick={handleExport} className="uppercase bg-emerald-500 hover:bg-emerald-600">
                        <Upload className="w-4 h-4" />
                        Exportar
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent className="p-0 flex-1 min-h-0">
                <div className="overflow-auto h-full">
                    {!usuarios.length ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">No hay usuarios registrados</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-white">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Código</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cédula</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombres</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Apellidos</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">PIN</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredData.map((usuario) => (
                                    <tr key={usuario.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 text-sm">{usuario.id}</td>
                                        <td className="px-4 py-3 text-sm">{usuario.codigo || '-'}</td>
                                        <td className="px-4 py-3 text-sm">{usuario.cedula}</td>                                        <td className="px-4 py-3 text-sm">{usuario.nombres}</td>
                                        <td className="px-4 py-3 text-sm">{usuario.apellidos}</td>                                        <td className="px-4 py-3 text-sm">
                                            <span className="font-mono text-xs">
                                                {usuario.pin || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEdit(usuario)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Edit className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDelete(usuario)}
                                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default UsuariosCRUD;
