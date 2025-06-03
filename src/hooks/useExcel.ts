import * as XLSX from 'xlsx';

interface UseExcelOptions {
  dateFormat?: (date: Date) => string;
  sheetName?: string;
  filename?: string;
  capitalize?: boolean;
  headerStyle?: { bold?: boolean; fill?: { fgColor: { rgb: string } }; font?: { color?: { rgb: string }, bold?: boolean } };
}

interface ImportExcelOptions {
  sheetIndex?: number;
  sheetName?: string;
  headerMapping?: Record<string, string>;
  requiredFields?: string[];
  skipEmptyRows?: boolean;
  validators?: Record<string, (value: any) => { valid: boolean; message?: string }>;
  onValidationError?: (errors: Array<{ row: number; field: string; value: any; message: string }>) => void;
}

/**
 * Custom hook for exporting and importing Excel data
 */
export function useExcel() {
  const exportWithState = <T extends Record<string, any>>(data: T[], columns?: string[], tableName?: string, onStateChange?: (isExporting: boolean) => void, onError?: (error: string) => void) => {
    onStateChange?.(true);
    setTimeout(() => {
      try {
        exportToExcel(data, columns, tableName, {
          headerStyle: { bold: true, fill: { fgColor: { rgb: "E6F7FF" } } },
          dateFormat: (date) => date.toISOString().split('T')[0],
          filename: tableName ? `${tableName.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx` : undefined
        });
      } catch { onError?.('Error al exportar los datos'); }
      finally { onStateChange?.(false); }
    }, 100);
  };
  const exportToExcel = <T extends Record<string, any>>(data: T[], columns?: string[], tableName?: string, options?: UseExcelOptions) => {
    if (!data?.length) return;
    const { dateFormat = (date: Date) => date.toLocaleDateString(), sheetName = tableName || 'Data', capitalize = true, filename = `${tableName || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`, headerStyle } = options || {};
    const columnsToExport = columns || Object.keys(data[0]);
    const workbook = XLSX.utils.book_new();
    const excelData = data.map(row => columnsToExport.reduce((newRow, column) => {
      const value = row[column];
      newRow[capitalize ? column.charAt(0).toUpperCase() + column.slice(1) : column] = value instanceof Date ? dateFormat(value) : value ?? '';
      return newRow;
    }, {} as Record<string, any>));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    if (headerStyle?.fill && worksheet['!ref']) {
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: range.s.r, c: C });
        worksheet[address] && (worksheet[address].s = { font: { bold: headerStyle.bold || true }, fill: headerStyle.fill || { fgColor: { rgb: "EFEFEF" } } });
      }
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
  };
  /**
   * Import data from Excel file
   */
  const importFromExcel = async <T = Record<string, any>>(file: File, options?: ImportExcelOptions): Promise<T[]> => {
    const { sheetIndex = 0, sheetName, headerMapping = {}, skipEmptyRows = true, validators = {}, onValidationError } = options || {};
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const selectedSheetName = (sheetName && workbook.SheetNames.includes(sheetName)) ? sheetName : workbook.SheetNames[sheetIndex || 0];
    if (!selectedSheetName) throw new Error('No valid sheet found in the Excel file');
    const rawJsonData = XLSX.utils.sheet_to_json(workbook.Sheets[selectedSheetName]) as Record<string, any>[];
    const validationErrors: Array<{ row: number; field: string; value: any; message: string }> = [];
    Object.keys(validators).length && rawJsonData.forEach((row, rowIndex) =>
      Object.entries(validators).forEach(([field, validator]) => {
        const originalFieldName = Object.entries(headerMapping).find(([_, target]) => target === field)?.[0] || field;
        const value = row[originalFieldName] || row[field];
        if (value !== undefined) {
          const result = validator(value);
          !result.valid && validationErrors.push({ row: rowIndex + 2, field, value, message: result.message || `Invalid value for ${field}` });
        }
      })
    );
    if (validationErrors.length) {
      onValidationError?.(validationErrors);
      const error = new Error(`Found ${validationErrors.length} validation error${validationErrors.length > 1 ? 's' : ''} in the imported data.`);
      (error as any).validationErrors = validationErrors;
      throw error;
    }
    return rawJsonData
      .filter(row => !skipEmptyRows || Object.values(row).some(value => value !== null && value !== undefined && value !== '' && String(value).trim() !== ''))
      .map(row => Object.entries(row).reduce((newRow, [key, value]) => { newRow[headerMapping[key] || key] = value; return newRow; }, {} as Record<string, any>)) as T[];
  }; return {
    exportToExcel,
    exportWithState,
    importFromExcel
  };
}