import { Card, CardAction, CardContent, CardHeader, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo, type ReactNode } from 'react';
import { Upload, Search } from "lucide-react";
import { useExcel } from "@/hooks/useExcel";

interface DataTableProps {
    data: any[] & { _tableName?: string };
    actions?: ReactNode;
    showExportButton?: boolean;
}

function DataTable({ data, actions, showExportButton = true }: DataTableProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const { exportWithState } = useExcel();
    const columns = data?.length ? Object.keys(data[0]) : [];
    const tableName = (data as any)?._tableName || '';

    const filteredData = useMemo(() => {
        if (!data?.length || !searchQuery.trim()) return data || [];
        const normalizedQuery = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return data.filter(row =>
            columns.some(column =>
                String(row[column] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedQuery)
            )
        );
    }, [data, columns, searchQuery]);

    const handleExport = () => { exportWithState(searchQuery.trim() ? filteredData : data, columns, tableName); };
    if (!data?.length) return <p>No hay datos</p >; return (
        <Card className="min-w-5xl flex flex-col h-[calc(100vh-150px)] p-0 gap-0">
            <CardHeader className="p-0 space-y-4 pb-0 px-4 pt-4 gap-0">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                        type="text"
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <CardAction className="flex gap-4">
                    {actions}
                    {showExportButton && (
                        <Button onClick={handleExport} className="uppercase bg-emerald-500 hover:bg-emerald-600" >
                            <Upload className="w-4 h-4" />exportar
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
                        </thead>                        <tbody className="divide-y">
                            {filteredData.map((row, index) => (
                                <tr key={row.id || index} className="hover:bg-muted/50 transition-colors">
                                    {columns.map((column) => (
                                        <td key={column} className="px-4 py-3 text-sm">
                                            {row[column] instanceof Date ? row[column].toLocaleDateString() : String(row[column] || '')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card >
    );
}

export default DataTable;