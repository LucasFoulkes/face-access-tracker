import { useState, useMemo } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Download, Calendar, FileSpreadsheet, FileText, File } from "lucide-react";
import { useExport, type ExportFormat } from "@/hooks/useExport";

export default function ReportsSection() {
    const [reportType, setReportType] = useState<'day' | 'month' | 'range'>('day');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const { exportData, isExporting } = useExport();

    const registros = useLiveQuery(() => db.registros.toArray());
    const usuarios = useLiveQuery(() => db.usuarios.toArray());

    const reportData = useMemo(() => {
        if (!registros || !usuarios) return [];

        // Create a map for quick usuario lookup
        const usuarioMap = new Map(usuarios.map(u => [u.id, `${u.nombres} ${u.apellidos}`]));

        let filteredRegistros = registros;

        // Filter based on report type
        switch (reportType) {
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

        // Transform to meal report format
        return filteredRegistros.map(registro => ({
            id: registro.id,
            usuarioId: registro.usuarioId,
            usuario: usuarioMap.get(registro.usuarioId) || `Usuario ${registro.usuarioId}`,
            fecha: registro.fecha instanceof Date ? registro.fecha.toLocaleDateString() : new Date(registro.fecha).toLocaleDateString(),
            hora: registro.hora,
            timestamp: registro.fecha instanceof Date ? registro.fecha : new Date(registro.fecha)
        })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }, [registros, usuarios, reportType, selectedDate, selectedMonth, startDate, endDate]);

    const totalMeals = reportData.length;

    const handleExport = async (format: ExportFormat) => {
        setShowExportMenu(false);
        if (!reportData.length) {
            alert('No hay datos para exportar');
            return;
        }

        const exportColumns = ['id', 'usuario', 'fecha', 'hora'];
        const exportWithSummary = [
            ...reportData.map(r => ({
                id: r.id,
                usuario: r.usuario,
                fecha: r.fecha,
                hora: r.hora
            })),
            {},
            { id: '', usuario: 'TOTAL COMIDAS', fecha: '', hora: totalMeals.toString() }
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
    };

    const getReportTitle = () => {
        switch (reportType) {
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
    ];

    return (
        <div className="flex flex-col h-full gap-4">            <Card>
            <CardHeader>
                <h2 className="text-xl font-bold uppercase">Reporte de Comidas</h2>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Report Type Selection */}
                <div className="flex gap-4">
                    <Button
                        variant={reportType === 'day' ? 'default' : 'outline'}
                        onClick={() => setReportType('day')}
                    >
                        Día
                    </Button>
                    <Button
                        variant={reportType === 'month' ? 'default' : 'outline'}
                        onClick={() => setReportType('month')}
                    >
                        Mes
                    </Button>
                    <Button
                        variant={reportType === 'range' ? 'default' : 'outline'}
                        onClick={() => setReportType('range')}
                    >
                        Rango
                    </Button>
                </div>

                {/* Date Inputs */}
                {reportType === 'day' && (
                    <div className="space-y-2">
                        <Label htmlFor="selectedDate">Fecha</Label>
                        <Input
                            id="selectedDate"
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                )}

                {reportType === 'month' && (
                    <div className="space-y-2">
                        <Label htmlFor="selectedMonth">Mes</Label>
                        <Input
                            id="selectedMonth"
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        />
                    </div>
                )}

                {reportType === 'range' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Fecha Inicio</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">Fecha Fin</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>            {/* Report Table */}
            {reportData.length > 0 && (
                <>
                    <Card className="flex-1 min-h-0">
                        <CardHeader>
                            <h3 className="text-lg font-semibold uppercase">Detalle del Reporte</h3>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 min-h-0">
                            <div className="overflow-auto h-full">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-white border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium">ID</th>
                                            <th className="px-4 py-3 text-left font-medium">Usuario</th>
                                            <th className="px-4 py-3 text-left font-medium">Fecha</th>
                                            <th className="px-4 py-3 text-left font-medium">Hora</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {reportData.map((row) => (
                                            <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-4 py-3">{row.id}</td>
                                                <td className="px-4 py-3">{row.usuario}</td>
                                                <td className="px-4 py-3">{row.fecha}</td>
                                                <td className="px-4 py-3">{row.hora}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>                    {/* Summary Card */}
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-semibold uppercase">Resumen del Reporte</h3>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-emerald-50 p-6 rounded-lg text-center">
                                <h4 className="text-lg font-bold text-emerald-800 uppercase mb-2">Reporte de Comidas</h4>
                                <p className="text-sm text-emerald-700 mb-4">{getReportTitle().replace('Reporte de Comidas - ', '')}</p>
                                <p className="text-3xl font-bold text-emerald-600 mb-2">{totalMeals}</p>
                                <p className="text-lg font-semibold text-emerald-800 uppercase">Total de Comidas</p>
                            </div>

                            {/* Export Button */}
                            <div className="flex justify-center mt-4">
                                <div className="relative">
                                    <Button
                                        onClick={() => setShowExportMenu(!showExportMenu)}
                                        className="uppercase bg-emerald-500 hover:bg-emerald-600 flex items-center gap-2"
                                        disabled={isExporting || !reportData.length}
                                    >
                                        <Download className="w-4 h-4" />
                                        {isExporting ? 'EXPORTANDO' : 'EXPORTAR'}
                                    </Button>

                                    {showExportMenu && (
                                        <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-48">
                                            {exportOptions.map(({ format, label, icon: Icon }) => (
                                                <button
                                                    key={format}
                                                    onClick={() => handleExport(format)}
                                                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 first:rounded-t-md last:rounded-b-md"
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
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
