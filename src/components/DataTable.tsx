import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';

function DataTable({ data }: { data: any[] & { _tableName?: string } }) {
    if (!data || data.length === 0) {
        return (
            <div className="mb-8">
                <p className="text-gray-500">No hay datos disponibles</p>
            </div>
        );
    } const columns = Object.keys(data[0]);
    const tableName = (data as any)._tableName;

    const exportToExcel = () => {
        // Create a new workbook
        const workbook = XLSX.utils.book_new();

        // Prepare the data for Excel
        const excelData = data.map(row => {
            const newRow: any = {};
            columns.forEach(column => {
                newRow[column.charAt(0).toUpperCase() + column.slice(1)] =
                    row[column] instanceof Date
                        ? row[column].toLocaleDateString()
                        : row[column] || '';
            });
            return newRow;
        });

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, tableName || 'Data');

        // Generate filename with current date
        const date = new Date().toISOString().split('T')[0];
        const filename = `${tableName || 'export'}_${date}.xlsx`;

        // Save the file
        XLSX.writeFile(workbook, filename);
    };

    return (<Card className="shadow-none">
        <CardHeader>
            <CardTitle className="uppercase">
                {tableName}
            </CardTitle>            <CardAction>
                <Button
                    onClick={exportToExcel}
                    className="uppercase bg-emerald-500 hover:bg-emerald-600"
                    size='sm'
                >
                    exportar
                </Button>
            </CardAction>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((column) => (
                            <TableHead key={column}>
                                {column.charAt(0).toUpperCase() + column.slice(1)}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={row.id || index}>
                            {columns.map((column) => (
                                <TableCell key={column}>
                                    {row[column] instanceof Date
                                        ? row[column].toLocaleDateString()
                                        : String(row[column] || '')}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card >

    );
}

export default DataTable;