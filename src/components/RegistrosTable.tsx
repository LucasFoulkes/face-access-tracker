import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useMemo, type ReactNode } from 'react';
import { Download, Search, Filter, X } from "lucide-react";
import { useExcel } from "@/hooks/useExcel";

interface RegistrosTableProps {
    data: any[] & { _tableName?: string };
    actions?: ReactNode;
    showExportButton?: boolean;
}

interface FilterState {
    searchQuery: string;
    fecha: string;
    fechaDesde: string;
    fechaHasta: string;
    horaDesde: string;
    horaHasta: string;
    usuarioId: string;
}

function RegistrosTable({ data, actions, showExportButton = true }: RegistrosTableProps) {
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: '',
        fecha: '',
        fechaDesde: '',
        fechaHasta: '',
        horaDesde: '',
        horaHasta: '',
        usuarioId: ''
    });

    const { exportWithState } = useExcel();
    const columns = data?.length ? Object.keys(data[0]) : [];
    const tableName = (data as any)?._tableName || '';

    const filteredData = useMemo(() => {
        if (!data?.length) return [];

        return data.filter(row => {
            // Search query filter
            if (filters.searchQuery.trim()) {
                const normalizedQuery = filters.searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const matches = columns.some(column =>
                    String(row[column] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedQuery)
                );
                if (!matches) return false;
            }

            // Specific date filter
            if (filters.fecha) {
                const rowDate = new Date(row.fecha);
                const filterDate = new Date(filters.fecha);
                if (rowDate.toDateString() !== filterDate.toDateString()) return false;
            }

            // Date range filter
            if (filters.fechaDesde) {
                const rowDate = new Date(row.fecha);
                const fromDate = new Date(filters.fechaDesde);
                if (rowDate < fromDate) return false;
            }

            if (filters.fechaHasta) {
                const rowDate = new Date(row.fecha);
                const toDate = new Date(filters.fechaHasta);
                if (rowDate > toDate) return false;
            }

            // Time range filter
            if (filters.horaDesde) {
                const rowTime = row.hora;
                if (rowTime < filters.horaDesde) return false;
            }

            if (filters.horaHasta) {
                const rowTime = row.hora;
                if (rowTime > filters.horaHasta) return false;
            }

            // Usuario ID filter
            if (filters.usuarioId.trim()) {
                const userId = String(row.usuarioId || '');
                if (!userId.includes(filters.usuarioId.trim())) return false;
            }

            return true;
        });
    }, [data, columns, filters]);

    const handleFilterChange = (key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            searchQuery: '',
            fecha: '',
            fechaDesde: '',
            fechaHasta: '',
            horaDesde: '',
            horaHasta: '',
            usuarioId: ''
        });
    };

    const hasActiveFilters = Object.values(filters).some(value => value.trim() !== '');

    const handleExport = () => {
        exportWithState(filteredData, columns, tableName);
    };

    if (!data?.length) return <p>No hay datos</p>;

    return (
        <Card className="min-w-5xl flex flex-col h-[calc(100vh-150px)] p-0 gap-0">
            <CardHeader className="p-0 space-y-4 pb-0 px-4 pt-4 gap-0">
                {/* Search and Filter Toggle */}
                <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                            type="text"
                            placeholder="Buscar..."
                            value={filters.searchQuery}
                            onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button
                        onClick={() => setShowFilters(!showFilters)}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <Filter className="w-4 h-4" />
                        Filtros
                        {hasActiveFilters && <span className="bg-blue-500 text-white rounded-full w-2 h-2"></span>}
                    </Button>
                    {hasActiveFilters && (
                        <Button onClick={clearFilters} variant="outline" size="sm">
                            <X className="w-4 h-4" />
                            Limpiar
                        </Button>
                    )}
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                    <div className="bg-gray-50 p-4 rounded-md space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Specific Date */}
                            <div className="space-y-2">
                                <Label htmlFor="fecha">Fecha específica</Label>
                                <Input
                                    id="fecha"
                                    type="date"
                                    value={filters.fecha}
                                    onChange={(e) => handleFilterChange('fecha', e.target.value)}
                                />
                            </div>

                            {/* Date Range */}
                            <div className="space-y-2">
                                <Label htmlFor="fechaDesde">Fecha desde</Label>
                                <Input
                                    id="fechaDesde"
                                    type="date"
                                    value={filters.fechaDesde}
                                    onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fechaHasta">Fecha hasta</Label>
                                <Input
                                    id="fechaHasta"
                                    type="date"
                                    value={filters.fechaHasta}
                                    onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
                                />
                            </div>

                            {/* Time Range */}
                            <div className="space-y-2">
                                <Label htmlFor="horaDesde">Hora desde</Label>
                                <Input
                                    id="horaDesde"
                                    type="time"
                                    value={filters.horaDesde}
                                    onChange={(e) => handleFilterChange('horaDesde', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="horaHasta">Hora hasta</Label>
                                <Input
                                    id="horaHasta"
                                    type="time"
                                    value={filters.horaHasta}
                                    onChange={(e) => handleFilterChange('horaHasta', e.target.value)}
                                />
                            </div>

                            {/* Usuario ID */}
                            <div className="space-y-2">
                                <Label htmlFor="usuarioId">Usuario ID</Label>
                                <Input
                                    id="usuarioId"
                                    type="text"
                                    placeholder="ID del usuario"
                                    value={filters.usuarioId}
                                    onChange={(e) => handleFilterChange('usuarioId', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <CardAction className="flex gap-4">
                    {actions}
                    {showExportButton && (
                        <Button onClick={handleExport} className="uppercase bg-emerald-500 hover:bg-emerald-600">
                            <Download className="w-4 h-4" />
                            exportar
                        </Button>
                    )}
                </CardAction>

            </CardHeader>

            <CardContent className="p-0 flex-1 min-h-0">
                <div className="overflow-auto h-full">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white">
                            <tr>
                                {columns.map((column) => (
                                    <th key={column} className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        {column.charAt(0).toUpperCase() + column.slice(1)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredData.map((row, index) => (
                                <tr key={row.id || index} className="hover:bg-muted/50 transition-colors">
                                    {columns.map((column) => (
                                        <td key={column} className="px-4 py-3 text-sm">
                                            {row[column] instanceof Date
                                                ? row[column].toLocaleDateString()
                                                : String(row[column] || '')
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

export default RegistrosTable;
