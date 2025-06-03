import { Card, CardAction, CardContent, CardHeader, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type ReactNode } from 'react';
import { Download } from "lucide-react";
import { useExcel } from "@/hooks/useExcel";

interface DataTableProps {
    data: any[] & { _tableName?: string };
    actions?: ReactNode;
    showExportButton?: boolean;
}

function DataTable({ data, actions, showExportButton = true }: DataTableProps) {
    const { exportWithState } = useExcel();
    const columns = data?.length ? Object.keys(data[0]) : [];
    const tableName = (data as any)?._tableName || '';
    const handleExport = () => { exportWithState(data, columns, tableName); };
    if (!data?.length) return <p>No hay datos</p >; return (
        <Card className="min-w-5xl flex flex-col h-[calc(100vh-150px)] p-4">
            <CardHeader className="p-0">
                <CardAction className="flex gap-4">
                    {actions}
                    {showExportButton && (
                        <Button onClick={handleExport} className="uppercase bg-emerald-500 hover:bg-emerald-600" >
                            <Download className="w-4 h-4" />exportar
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