import { Card, CardAction, CardContent, CardHeader, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, type ReactNode } from 'react';
import { Download, Loader2 } from "lucide-react";
import { useExcel } from "@/hooks/useExcel";

interface DataTableProps {
    data: any[] & { _tableName?: string };
    actions?: ReactNode;
    showExportButton?: boolean;
}

function DataTable({ data, actions, showExportButton = true }: DataTableProps) {
    const [exportError, setExportError] = useState('');
    const { exportWithState } = useExcel();
    const columns = data?.length ? Object.keys(data[0]) : [];
    const tableName = (data as any)?._tableName || '';
    const handleExport = () => { setExportError(''); exportWithState(data, columns, tableName); };
    if (!data?.length) return <p>No hay datos</p >;
    return (
        <Card className="min-w-5xl">
            {exportError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md mb-4">{exportError}</div>}
            <CardHeader className="pb-4">
                <CardAction className="flex items-center gap-2">
                    {actions}
                    {showExportButton && (
                        <Button onClick={handleExport} className="uppercase bg-emerald-500 hover:bg-emerald-600" >
                            <Download className="w-4 h-4 mr-2" />exportar
                        </Button>
                    )}
                </CardAction>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-auto max-h-[600px] border rounded-md ">
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
                            {data.map((row, index) => (
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