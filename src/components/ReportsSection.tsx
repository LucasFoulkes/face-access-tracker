import { useState, useMemo } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Calendar, FileSpreadsheet, FileText, File } from "lucide-react";
import { useExport, type ExportFormat } from "@/hooks/useExport";

export default function ReportsSection() {
    const [activeTab, setActiveTab] = useState<'day' | 'month' | 'range'>('day');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [showExportMenu, setShowExportMenu] = useState(false); const { exportData, isExporting } = useExport();

    // Format price function to convert from cents to currency format
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price / 100);
    };

    const registros = useLiveQuery(() => db.registros.toArray());
    const usuarios = useLiveQuery(() => db.usuarios.toArray());
    const menus = useLiveQuery(() => db.menus.toArray()); const reportData = useMemo(() => {
        if (!registros || !usuarios || !menus) return [];

        // Create a map for quick usuario lookup
        const usuarioMap = new Map(usuarios.map(u => [u.id, `${u.nombres} ${u.apellidos}`]));

        // Function to match meal time with menu
        const matchMenuByTime = (hora: string) => {
            // Convert time string to minutes for comparison
            const [hours, minutes] = hora.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes;

            // Find matching menu based on time range
            for (const menu of menus) {
                const [startTime, endTime] = menu.timeRange.split(' - ');
                const [startHours, startMinutes] = startTime.split(':').map(Number);
                const [endHours, endMinutes] = endTime.split(':').map(Number);

                const startTotalMinutes = startHours * 60 + startMinutes;
                const endTotalMinutes = endHours * 60 + endMinutes;

                if (totalMinutes >= startTotalMinutes && totalMinutes <= endTotalMinutes) {
                    return menu;
                }
            }
            return null;
        };

        let filteredRegistros = registros;

        // Filter based on report type
        switch (activeTab) {
            case 'day':
                filteredRegistros = registros.filter(r => {
                    const recordDate = r.fecha instanceof Date ? r.fecha : new Date(r.fecha);
                    return recordDate.toISOString().split('T')[0] === selectedDate;
                });
                break;
            case 'month':
                filteredRegistros = registros.filter(r => {
                    const recordDate = r.fecha instanceof Date ? r.fecha : new Date(r.fecha);
                    return recordDate.toISOString().slice(0, 7) === selectedMonth;
                });
                break;
            case 'range':
                filteredRegistros = registros.filter(r => {
                    const recordDate = r.fecha instanceof Date ? r.fecha : new Date(r.fecha);
                    const dateStr = recordDate.toISOString().split('T')[0];
                    return dateStr >= startDate && dateStr <= endDate;
                });
                break;
        }

        // Transform to meal report format with menu correlation
        return filteredRegistros.map(registro => {
            const menu = matchMenuByTime(registro.hora);
            return {
                id: registro.id,
                usuarioId: registro.usuarioId,
                usuario: usuarioMap.get(registro.usuarioId) || `Usuario ${registro.usuarioId}`,
                fecha: registro.fecha instanceof Date ? registro.fecha.toLocaleDateString() : new Date(registro.fecha).toLocaleDateString(),
                hora: registro.hora,
                menu: menu?.name || 'Sin menú',
                precio: menu?.price || 0,
                timestamp: registro.fecha instanceof Date ? registro.fecha : new Date(registro.fecha)
            };
        }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }, [registros, usuarios, menus, activeTab, selectedDate, selectedMonth, startDate, endDate]);

    const totalMeals = reportData.length;
    const totalCost = reportData.reduce((sum, record) => sum + record.precio, 0);

    // Calculate menu statistics
    const menuStats = useMemo(() => {
        const stats = new Map();
        reportData.forEach(record => {
            const menuName = record.menu;
            if (!stats.has(menuName)) {
                stats.set(menuName, { count: 0, totalCost: 0, price: record.precio });
            }
            const current = stats.get(menuName);
            current.count += 1;
            current.totalCost += record.precio;
        });
        return Array.from(stats.entries()).map(([name, data]) => ({
            name,
            count: data.count,
            totalCost: data.totalCost,
            unitPrice: data.price
        }));
    }, [reportData]);

    const handleExport = async (format: ExportFormat) => {
        setShowExportMenu(false);
        if (!reportData.length) {
            alert('No hay datos para exportar');
            return;
        } const exportColumns = ['id', 'usuario', 'fecha', 'hora', 'menu', 'precio'];
        const exportWithSummary = [
            ...reportData.map(r => ({
                id: r.id,
                usuario: r.usuario,
                fecha: r.fecha,
                hora: r.hora,
                menu: r.menu,
                precio: r.precio
            })),
            {}, { id: '', usuario: 'TOTAL COMIDAS', fecha: '', hora: totalMeals.toString(), menu: '', precio: '' },
            { id: '', usuario: 'COSTO TOTAL', fecha: '', hora: '', menu: '', precio: formatPrice(totalCost) },
            {},
            ...menuStats.map(stat => ({
                id: '',
                usuario: `${stat.name}`,
                fecha: `${stat.count} comidas`,
                hora: `${formatPrice(stat.unitPrice)} c/u`,
                menu: `Total: ${formatPrice(stat.totalCost)}`,
                precio: ''
            }))
        ];

        const reportTitle = getReportTitle();

        try {
            await exportData(exportWithSummary, exportColumns, `reporte_comidas_${Date.now()}`, {
                format,
                title: reportTitle
            });
        } catch (error) {
            alert('Error al exportar el reporte');
        }
    }; const getReportTitle = () => {
        switch (activeTab) {
            case 'day':
                return `Reporte de Comidas - ${new Date(selectedDate).toLocaleDateString()}`;
            case 'month':
                return `Reporte de Comidas - ${new Date(selectedMonth + '-01').toLocaleDateString('es', { year: 'numeric', month: 'long' })}`;
            case 'range':
                return `Reporte de Comidas - ${new Date(startDate).toLocaleDateString()} al ${new Date(endDate).toLocaleDateString()}`;
            default:
                return 'Reporte de Comidas';
        }
    };

    const exportOptions = [
        { format: 'excel' as ExportFormat, label: 'Excel (.xlsx)', icon: FileSpreadsheet },
        { format: 'pdf-multi' as ExportFormat, label: 'PDF Multi-página', icon: FileText },
        { format: 'pdf-single' as ExportFormat, label: 'PDF Página única', icon: File },
    ]; return (
        <div className="flex flex-col h-full gap-4">
            {/* Top Row: Configuration Card and Summary Card */}
            <div className="flex gap-4">                {/* Configuration Card */}
                <Card className="flex-1">
                    <CardHeader>
                        <h2 className="text-xl font-bold uppercase">Configuración</h2>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'day' | 'month' | 'range')} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-4">
                                <TabsTrigger value="day" className="uppercase">Día</TabsTrigger>
                                <TabsTrigger value="month" className="uppercase">Mes</TabsTrigger>
                                <TabsTrigger value="range" className="uppercase">Rango</TabsTrigger>
                            </TabsList>

                            <TabsContent value="day" className="space-y-4 mt-0">
                                <div className="space-y-2">
                                    <Label htmlFor="selectedDate" className="text-sm font-medium">Seleccionar Fecha</Label>
                                    <Input
                                        id="selectedDate"
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="month" className="space-y-4 mt-0">
                                <div className="space-y-2">
                                    <Label htmlFor="selectedMonth" className="text-sm font-medium">Seleccionar Mes</Label>
                                    <Input
                                        id="selectedMonth"
                                        type="month"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="range" className="space-y-4 mt-0">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="startDate" className="text-sm font-medium">Fecha Inicio</Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endDate" className="text-sm font-medium">Fecha Fin</Label>
                                        <Input
                                            id="endDate"
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>                {/* Summary Card - Simple */}
                {reportData.length > 0 && (
                    <Card className="w-96 relative bg-emerald-50">
                        {/* Export Button */}
                        <div className="absolute top-4 right-4 z-20">
                            <Button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="uppercase bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 px-3 py-2 text-sm font-bold"
                                disabled={isExporting || !reportData.length}
                            >
                                <Download className="w-4 h-4" />
                                {isExporting ? 'EXPORTANDO' : 'EXPORTAR'}
                            </Button>

                            {showExportMenu && (
                                <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-48">
                                    {exportOptions.map(({ format, label, icon: Icon }) => (
                                        <button
                                            key={format}
                                            onClick={() => handleExport(format)}
                                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg"
                                        >
                                            <Icon className="w-4 h-4" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <CardHeader>
                            <h3 className="text-xl font-bold uppercase">Resumen</h3>
                        </CardHeader>                        <CardContent className="space-y-6">
                            {/* Date Range */}
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">Período</p>
                                <p className="text-base font-semibold">
                                    {getReportTitle().replace('Reporte de Comidas - ', '')}
                                </p>
                            </div>                            {/* Main Totals */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-emerald-600 mb-1">{totalMeals}</p>
                                        <p className="text-sm font-semibold text-emerald-800">Total de Comidas</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-emerald-700 mb-1">{formatPrice(totalCost)}</p>
                                        <p className="text-sm font-semibold text-emerald-800">Costo Total</p>
                                    </div>
                                </div>
                            </div>

                            {/* Per-Menu Statistics */}
                            {menuStats.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-gray-600">Detalle por Menú</p>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">                                        {menuStats.map((stat) => (
                                        <div key={stat.name} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">                                                <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{stat.name}</p>
                                                <p className="text-xs text-gray-500">{formatPrice(stat.unitPrice)} c/u</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-sm">{stat.count}</p>
                                                <p className="text-xs font-semibold text-emerald-600">{formatPrice(stat.totalCost)}</p>
                                            </div>
                                        </div>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>            {/* Report Table */}
            {reportData.length > 0 && (<Card className="flex-1 min-h-0">
                <CardHeader>
                    <h3 className="text-lg font-semibold uppercase">Detalle</h3>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0">
                    <div className="overflow-auto h-full">                        <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white border-b">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">ID</th>
                                <th className="px-4 py-3 text-left font-medium">Usuario</th>
                                <th className="px-4 py-3 text-left font-medium">Fecha</th>
                                <th className="px-4 py-3 text-left font-medium">Hora</th>
                                <th className="px-4 py-3 text-left font-medium">Menú</th>
                                <th className="px-4 py-3 text-left font-medium">Precio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {reportData.map((row) => (
                                <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-3">{row.id}</td>
                                    <td className="px-4 py-3">{row.usuario}</td>
                                    <td className="px-4 py-3">{row.fecha}</td>
                                    <td className="px-4 py-3">{row.hora}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.menu === 'Sin menú'
                                            ? 'bg-gray-100 text-gray-700'
                                            : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {row.menu}
                                        </span>
                                    </td>                                    <td className="px-4 py-3 font-medium">
                                        {row.precio > 0 ? formatPrice(row.precio) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </CardContent>
            </Card>
            )}

            {reportData.length === 0 && (
                <Card>
                    <CardContent className="p-8 text-center">
                        <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500">No se encontraron registros para el período seleccionado</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
