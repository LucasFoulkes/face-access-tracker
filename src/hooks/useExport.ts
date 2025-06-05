import { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF with autoTable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: typeof autoTable;
    }
}

export type ExportFormat = 'excel' | 'pdf-single' | 'pdf-multi';

interface ExportOptions {
    format: ExportFormat;
    filename?: string;
    title?: string;
    dateFormat?: (date: Date) => string;
}

export function useExport() {
    const [isExporting, setIsExporting] = useState(false);

    const exportData = async <T extends Record<string, any>>(
        data: T[],
        columns: string[],
        tableName: string,
        options: ExportOptions
    ) => {
        if (!data?.length) return;

        setIsExporting(true);

        try {
            const { format, filename, title, dateFormat = (date: Date) => date.toLocaleDateString() } = options;
            const exportFilename = filename || `${tableName}_${new Date().toISOString().split('T')[0]}`;

            // Prepare data for export
            const exportData = data.map(row =>
                columns.reduce((newRow, column) => {
                    const value = row[column];
                    newRow[column.charAt(0).toUpperCase() + column.slice(1)] =
                        value instanceof Date ? dateFormat(value) : String(value || '');
                    return newRow;
                }, {} as Record<string, any>)
            );

            switch (format) {
                case 'excel':
                    await exportToExcel(exportData, exportFilename);
                    break;
                case 'pdf-single':
                    await exportToPDFSingle(exportData, columns.map(col => col.charAt(0).toUpperCase() + col.slice(1)), exportFilename, title || tableName);
                    break;
                case 'pdf-multi':
                    await exportToPDFMulti(exportData, columns.map(col => col.charAt(0).toUpperCase() + col.slice(1)), exportFilename, title || tableName);
                    break;
            }
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        } finally {
            setIsExporting(false);
        }
    };

    const exportToExcel = async (data: Record<string, any>[], filename: string) => {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Style headers
        if (worksheet['!ref']) {
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_cell({ r: range.s.r, c: C });
                if (worksheet[address]) {
                    worksheet[address].s = {
                        font: { bold: true },
                        fill: { fgColor: { rgb: "E6F7FF" } }
                    };
                }
            }
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
        XLSX.writeFile(workbook, `${filename}.xlsx`);
    };

    const exportToPDFSingle = async (data: Record<string, any>[], columns: string[], filename: string, title: string) => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for better table fit

        // Add title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, 20);

        // Add date
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 28);

        // Calculate if data fits on single page, if not, use smaller font
        const rowsPerPage = Math.floor((doc.internal.pageSize.height - 50) / 6); // Rough calculation
        const fontSize = data.length > rowsPerPage ? 6 : 8;

        autoTable(doc, {
            head: [columns],
            body: data.map(row => columns.map(col => row[col] || '')),
            startY: 35,
            styles: {
                fontSize: fontSize,
                cellPadding: 2,
            },
            headStyles: {
                fillColor: [230, 247, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold'
            },
            tableWidth: 'auto',
            margin: { left: 14, right: 14 },
        });

        doc.save(`${filename}.pdf`);
    };

    const exportToPDFMulti = async (data: Record<string, any>[], columns: string[], filename: string, title: string) => {
        const doc = new jsPDF('l', 'mm', 'a4');

        // Add title to first page
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, 20);

        // Add date
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 28);

        autoTable(doc, {
            head: [columns],
            body: data.map(row => columns.map(col => row[col] || '')),
            startY: 35,
            styles: {
                fontSize: 8,
                cellPadding: 3,
            },
            headStyles: {
                fillColor: [230, 247, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold'
            },
            tableWidth: 'auto',
            margin: { left: 14, right: 14 },
            showHead: 'everyPage', didDrawPage: (data) => {
                // Add page numbers
                const pageNumber = data.pageNumber;
                doc.setFontSize(10);
                doc.text(
                    `Página ${pageNumber}`,
                    doc.internal.pageSize.width - 30,
                    doc.internal.pageSize.height - 10
                );

                // Add title to each page (except first)
                if (data.pageNumber > 1) {
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text(title, 14, 15);
                }
            }
        });

        doc.save(`${filename}.pdf`);
    };

    return {
        exportData,
        isExporting
    };
}
