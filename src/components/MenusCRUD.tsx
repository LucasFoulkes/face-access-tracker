import { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, Trash2, Save, X, Database } from "lucide-react";
import { db, type Menu } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useExcel } from "@/hooks/useExcel";

interface MenuFormData {
    name: string;
    timeRange: string;
    price: string;
}

function MenusCRUD() {
    const menus = useLiveQuery(() => db.menus.toArray()) || [];

    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
    const [formData, setFormData] = useState<MenuFormData>({
        name: '',
        timeRange: '',
        price: ''
    });
    const [errors, setErrors] = useState<Partial<MenuFormData>>({});
    const { exportWithState } = useExcel();

    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return menus;
        const normalizedQuery = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return menus.filter(menu =>
            Object.values(menu).some(value =>
                String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedQuery)
            )
        );
    }, [menus, searchQuery]);

    const resetForm = () => {
        setFormData({
            name: '',
            timeRange: '',
            price: ''
        });
        setErrors({});
        setEditingMenu(null);
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<MenuFormData> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Nombre es requerido';
        }

        if (!formData.timeRange.trim()) {
            newErrors.timeRange = 'Horario es requerido';
        }

        if (!formData.price.trim()) {
            newErrors.price = 'Precio es requerido';
        } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
            newErrors.price = 'Precio debe ser un número válido mayor a 0';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            const menuData = {
                name: formData.name.trim(),
                timeRange: formData.timeRange.trim(),
                price: Number(formData.price)
            };

            if (editingMenu) {
                await db.menus.update(editingMenu.id, menuData);
            } else {
                await db.menus.add(menuData);
            }

            setIsDialogOpen(false);
            resetForm();
        } catch (error) {
            console.error('Error saving menu:', error);
            alert('Error al guardar el menú');
        }
    };

    const handleEdit = (menu: Menu) => {
        setEditingMenu(menu);
        setFormData({
            name: menu.name || '',
            timeRange: menu.timeRange || '',
            price: menu.price?.toString() || ''
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (menu: Menu) => {
        if (confirm(`¿Está seguro de eliminar el menú ${menu.name}?`)) {
            try {
                await db.menus.delete(menu.id);
            } catch (error) {
                console.error('Error deleting menu:', error);
                alert('Error al eliminar el menú');
            }
        }
    };

    const handleExport = () => {
        const columns = ['id', 'name', 'timeRange', 'price'];
        exportWithState(searchQuery.trim() ? filteredData : menus, columns, 'menus');
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        resetForm();
    }; const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price / 100);
    };

    return (
        <Card className="min-w-5xl flex flex-col h-[calc(100vh-150px)] p-0 gap-0">
            <CardHeader className="p-0 space-y-4 pb-0 px-4 pt-4 gap-0">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                        type="text"
                        placeholder="Buscar menús..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />                </div>
                <CardAction className="flex gap-4">
                    {menus.length === 0 && (
                        <Button
                            onClick={async () => {
                                try {
                                    await db.menus.bulkAdd([
                                        { name: 'Desayuno', timeRange: '06:00 - 09:00', price: 2500 },
                                        { name: 'Desayuno Empresarial', timeRange: '06:00 - 09:00', price: 3500 },
                                        { name: 'Almuerzo', timeRange: '11:30 - 14:30', price: 4500 },
                                        { name: 'Almuerzo Empresarial', timeRange: '11:30 - 14:30', price: 6000 },
                                        { name: 'Cena', timeRange: '18:00 - 21:00', price: 3800 },
                                        { name: 'Cena Empresarial', timeRange: '18:00 - 21:00', price: 5200 }
                                    ]);
                                    alert('Datos de prueba agregados correctamente');
                                } catch (error) {
                                    console.error('Error al agregar datos de prueba:', error);
                                    alert('Error al agregar datos de prueba');
                                }
                            }}
                            className="uppercase bg-purple-500 hover:bg-purple-600"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar Datos de Prueba
                        </Button>
                    )}
                    <Button
                        onClick={handleExport}
                        className="uppercase bg-green-500 hover:bg-green-600"
                        disabled={filteredData.length === 0}
                    >
                        <Save className="w-4 h-4 mr-1" />
                        Exportar
                    </Button>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                onClick={() => setIsDialogOpen(true)}
                                className="uppercase bg-blue-500 hover:bg-blue-600"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Nuevo Menú
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingMenu ? 'Editar Menú' : 'Nuevo Menú'}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="name">Nombre *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej: Desayuno, Almuerzo, etc."
                                        className={errors.name ? 'border-red-500' : ''}
                                    />
                                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="timeRange">Horario *</Label>
                                    <Input
                                        id="timeRange"
                                        value={formData.timeRange}
                                        onChange={(e) => setFormData({ ...formData, timeRange: e.target.value })}
                                        placeholder="Ej: 06:00 - 09:00"
                                        className={errors.timeRange ? 'border-red-500' : ''}
                                    />
                                    {errors.timeRange && <p className="text-red-500 text-sm mt-1">{errors.timeRange}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="price">Precio *</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="Precio en pesos"
                                        className={errors.price ? 'border-red-500' : ''}
                                    />
                                    {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button onClick={handleSave} className="flex-1">
                                        <Save className="w-4 h-4 mr-1" />
                                        Guardar
                                    </Button>
                                    <Button variant="outline" onClick={handleDialogClose} className="flex-1">
                                        <X className="w-4 h-4 mr-1" />
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardAction>
            </CardHeader>

            <CardContent className="flex-1 p-0 min-h-0">
                <div className="overflow-auto h-full">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white border-b">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">ID</th>
                                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                                <th className="px-4 py-3 text-left font-medium">Horario</th>
                                <th className="px-4 py-3 text-left font-medium">Precio</th>
                                <th className="px-4 py-3 text-center font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        {searchQuery ? 'No se encontraron menús que coincidan con la búsqueda' : 'No hay menús registrados'}
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((menu) => (
                                    <tr key={menu.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-gray-600">{menu.id}</td>
                                        <td className="px-4 py-3 font-medium">{menu.name}</td>
                                        <td className="px-4 py-3">{menu.timeRange}</td>
                                        <td className="px-4 py-3 font-medium text-green-600">{formatPrice(menu.price)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2 justify-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEdit(menu)}
                                                    className="uppercase h-8 px-2"
                                                >
                                                    <Edit className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(menu)}
                                                    className="uppercase h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

export default MenusCRUD;
