import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useMemo, type ReactNode } from 'react';
import { Search, Download, Loader2 } from "lucide-react";
import { useExcel } from "@/hooks/useExcel";

interface DataTableProps {
    data: any[] & { _tableName?: string };
    actions?: ReactNode;
    showExportButton?: boolean;
}

function DataTable({ data, actions, showExportButton = true }: DataTableProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const { exportToExcel } = useExcel();

    // Always define hooks at the top level, before any conditional logic
    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
    const tableName = data && data.length > 0 ? (data as any)._tableName : '';

    // Filter data based on search query - safely handle empty data
    const filteredData = useMemo(() => {
        if (!data || data.length === 0) return [];
        if (!searchQuery.trim()) return data;

        const normalizedQuery = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        return data.filter(row => {
            return columns.some(column => {
                const value = row[column];
                if (value == null) return false;

                const stringValue = String(value);
                const normalizedValue = stringValue.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

                return normalizedValue.includes(normalizedQuery);
            });
        });
    }, [data, columns, searchQuery]);

    // Early return for empty data case
    if (!data || data.length === 0) {
        return (
            <div className="mb-8">
                <p className="text-gray-500">No hay datos disponibles</p>
            </div>
        );
    }    // Handler for exporting the current data to Excel
    const handleExport = () => {
        setIsExporting(true);

        // Use setTimeout to allow the UI to update with loading state
        // before the potentially resource-intensive export operation
        setTimeout(() => {
            try {
                // If tableName is available, use it in the filename
                const exportFilename = tableName
                    ? `${tableName.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`
                    : undefined;

                exportToExcel(
                    // If search is active, export filtered data instead of all data
                    searchQuery.trim() ? filteredData : data,
                    columns,
                    tableName,
                    {
                        // Add styling to headers
                        headerStyle: {
                            bold: true,
                            fill: { fgColor: { rgb: "E6F7FF" } },
                            font: { color: { rgb: "000000" }, bold: true }
                        },
                        // Format dates as YYYY-MM-DD
                        dateFormat: (date) => date.toISOString().split('T')[0],
                        // Use specified filename with date
                        filename: exportFilename
                    }
                );
            } catch (error) {
                console.error('Error exporting to Excel:', error);
                alert('Error al exportar los datos');
            } finally {
                setIsExporting(false);
            }
        }, 100);
    }; return (<Card className="shadow-none">
        <CardHeader>
            <CardTitle className="uppercase">
                {tableName}
            </CardTitle>
            <div className="w-full flex justify-between items-center mt-2">
                {/* Search input */}
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 py-1 px-3 w-full border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <CardAction className="flex items-center gap-2">
                    {/* Custom actions passed as props */}
                    {actions}                    {/* Default export button (can be disabled) */}
                    {showExportButton && (
                        <Button
                            onClick={handleExport}
                            className="uppercase bg-emerald-500 hover:bg-emerald-600"
                            size='sm'
                            disabled={isExporting}
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    exportando...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4 mr-1" />
                                    exportar
                                </>
                            )}
                        </Button>
                    )}
                </CardAction>
            </div>
        </CardHeader><CardContent>
            <div className="border rounded-md">
                {/* Custom table with sticky header */}
                <div
                    className="max-h-[400px] overflow-y-auto"
                    style={{
                        position: "relative",
                        width: "100%"
                    }}
                >                    <table className="w-full text-sm">
                        <thead
                            style={{
                                position: "sticky",
                                top: 0,
                                zIndex: 10,
                                backgroundColor: "white"
                            }}
                        >
                            <tr className="border-b">
                                {columns.map((column) => (
                                    <th
                                        key={column}
                                        className="p-2 text-left font-semibold border-b"
                                        style={{
                                            backgroundColor: "white",
                                            position: "sticky",
                                            top: 0
                                        }}
                                    >
                                        {column.charAt(0).toUpperCase() + column.slice(1)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((row, index) => (
                                <tr key={row.id || index} className="border-b hover:bg-gray-50">
                                    {columns.map((column) => (
                                        <td key={column} className="p-2">
                                            {row[column] instanceof Date
                                                ? row[column].toLocaleDateString()
                                                : String(row[column] || '')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </CardContent>
    </Card >

    );
}

export default DataTable;