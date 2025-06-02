import * as XLSX from 'xlsx';

interface UseExcelOptions {
    dateFormat?: (date: Date) => string;
    sheetName?: string;
    filename?: string;
    capitalize?: boolean;
}

/**
 * Custom hook for exporting and importing Excel data
 */
export function useExcel() {
  /**
   * Export data to Excel file
   * @param data The data to export
   * @param columns Optional array of column names to include (defaults to all)
   * @param tableName Optional name for the table/file
   * @param options Additional export options
   */  const exportToExcel = <T extends Record<string, any>>(
    data: T[],
    columns?: string[],
    tableName?: string,
    options?: UseExcelOptions
) => {
        if (!data || data.length === 0) return;

        // Default options
        const {
            dateFormat = (date: Date) => date.toLocaleDateString(),
            sheetName = tableName || 'Data',
            capitalize = true,
            filename = `${tableName || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`
        } = options || {};

        // If columns not specified, use all keys from first item
        const columnsToExport = columns || Object.keys(data[0]);

        // Create a new workbook
        const workbook = XLSX.utils.book_new();

        // Prepare the data for Excel
        const excelData = data.map(row => {
            const newRow: Record<string, any> = {};
            columnsToExport.forEach(column => {
                const value = row[column];
                const columnName = capitalize
                    ? column.charAt(0).toUpperCase() + column.slice(1)
                    : column;

                newRow[columnName] = value instanceof Date
                    ? dateFormat(value)
                    : value ?? '';
            });
            return newRow;
        });

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Save the file
        XLSX.writeFile(workbook, filename);
    };

    /**
     * Import data from Excel file
     * @param file The Excel file to import
     * @returns Promise that resolves to the imported data
     */
    const importFromExcel = async <T = Record<string, any>>(
        file: File
    ): Promise<T[]> => {
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as T[];
            return jsonData;
        } catch (error) {
            console.error('Error importing Excel file:', error);
            throw error;
        }
    };

    return {
        exportToExcel,
        importFromExcel
    };
}