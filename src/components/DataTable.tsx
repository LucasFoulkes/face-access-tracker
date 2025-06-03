import { Card, CardAction, CardContent, CardHeader, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { useState, type ReactNode } from 'react';
import { Download, Loader2 } from "lucide-react";
import { useExcel } from "@/hooks/useExcel";
import { useSearch } from "@/hooks/useSearch";

interface DataTableProps {
    data: any[] & { _tableName?: string };
    actions?: ReactNode;
    showExportButton?: boolean;
}

function DataTable({ data, actions, showExportButton = true }: DataTableProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState('');
    const { exportWithState } = useExcel();
    const { searchQuery, setSearchQuery, filteredData, hasActiveSearch } = useSearch({ data });
    const columns = data?.length ? Object.keys(data[0]) : [];
    const tableName = (data as any)?._tableName || '';
    const handleExport = () => { setExportError(''); exportWithState(hasActiveSearch ? filteredData : data, columns, tableName, setIsExporting, setExportError); }; if (!data?.length) return <div className="mb-8"><p className="text-gray-500">No hay datos disponibles</p></div>;
    return (
        <Card>
            {exportError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md mb-4">{exportError}</div>}
            <CardHeader>
                <div className="w-full flex justify-between items-center mt-2">
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />
                    <CardAction className="flex items-center gap-2">
                        {actions}
                        {showExportButton && (
                            <Button onClick={handleExport} className="uppercase bg-emerald-500 hover:bg-emerald-600" disabled={isExporting}>
                                {isExporting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />exportando...</> : <><Download className="w-4 h-4 mr-1" />exportar</>}
                            </Button>
                        )}
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent>
                <table className="text-sm">
                    <thead className="sticky top-0 bg-white">
                        <tr className="border-b">
                            {columns.map((column) => <th key={column} className="p-2 text-left font-semibold border-b bg-white sticky top-0">{column.charAt(0).toUpperCase() + column.slice(1)}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((row, index) => (
                            <tr key={row.id || index} className="border-b hover:bg-gray-50">
                                {columns.map((column) => <td key={column} className="p-2">{row[column] instanceof Date ? row[column].toLocaleDateString() : String(row[column] || '')}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}

export default DataTable;