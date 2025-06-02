import * as XLSX from 'xlsx';

interface UseExcelOptions {
  dateFormat?: (date: Date) => string;
  sheetName?: string;
  filename?: string;
  capitalize?: boolean;
  headerStyle?: {
    bold?: boolean;
    fill?: { fgColor: { rgb: string } };
    font?: { color?: { rgb: string }, bold?: boolean };
  };
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
  /**
   * Export data to Excel file
   * @param data The data to export
   * @param columns Optional array of column names to include (defaults to all)
   * @param tableName Optional name for the table/file
   * @param options Additional export options
   */
  const exportToExcel = <T extends Record<string, any>>(
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
      filename = `${tableName || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`,
      headerStyle
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

    // Apply header styling if provided
    if (headerStyle && worksheet['!ref']) {
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: range.s.r, c: C });
        if (!worksheet[address]) continue;

        worksheet[address].s = {
          font: { bold: headerStyle.bold || true },
          fill: headerStyle.fill || { fgColor: { rgb: "EFEFEF" } }
        };
      }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Save the file
    XLSX.writeFile(workbook, filename);
  };

  /**
   * Import data from Excel file
   * @param file The Excel file to import
   * @param options Import options including sheet selection and field mapping
   * @returns Promise that resolves to the imported data
   */  const importFromExcel = async <T = Record<string, any>>(
    file: File,
    options?: ImportExcelOptions
  ): Promise<T[]> => {
    try {
      const {
        sheetIndex = 0,
        sheetName,
        headerMapping = {},
        requiredFields = [],
        skipEmptyRows = true,
        validators = {},
        onValidationError
      } = options || {};

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      // Determine which sheet to use
      let selectedSheetName = '';
      if (sheetName && workbook.SheetNames.includes(sheetName)) {
        selectedSheetName = sheetName;
      } else {
        selectedSheetName = workbook.SheetNames[sheetIndex] || workbook.SheetNames[0];
      }

      if (!selectedSheetName) {
        throw new Error('No valid sheet found in the Excel file');
      }

      const worksheet = workbook.Sheets[selectedSheetName];
      const rawJsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

      // Validate data if validators are provided
      const validationErrors: Array<{ row: number; field: string; value: any; message: string }> = [];

      rawJsonData.forEach((row, rowIndex) => {
        Object.entries(validators).forEach(([field, validator]) => {
          // Find the field in the row (might be under a different name)
          const originalFieldName = Object.entries(headerMapping)
            .find(([_, target]) => target === field)?.[0] || field;

          const value = row[originalFieldName] || row[field];

          // Skip validation if field is not present
          if (value === undefined) return;

          const result = validator(value);
          if (!result.valid) {
            validationErrors.push({
              row: rowIndex + 2, // +2 because Excel is 1-based and we have a header row
              field,
              value,
              message: result.message || `Invalid value for ${field}`
            });
          }
        });
      });

      // Handle validation errors if any
      if (validationErrors.length > 0) {
        if (onValidationError) {
          onValidationError(validationErrors);
        }

        // If there are validation errors, throw an error with details
        const errorCount = validationErrors.length;
        const errorMessage = `Found ${errorCount} validation error${errorCount > 1 ? 's' : ''} in the imported data.`;
        const error = new Error(errorMessage);
        (error as any).validationErrors = validationErrors;
        throw error;
      }

      // Process the data - map headers and validate required fields
      const processedData = rawJsonData
        .filter((row) => {
          // Skip empty rows if configured
          if (skipEmptyRows && Object.keys(row).length === 0) {
            return false;
          }

          // Check required fields
          if (requiredFields.length > 0) {
            return requiredFields.every(field => {
              // Check original field name and possible mapped names
              const mappedField = Object.entries(headerMapping)
                .find(([_, target]) => target === field)?.[0] || field;

              return row[field] !== undefined || row[mappedField] !== undefined;
            });
          }

          return true;
        })
        .map((row) => {
          const newRow: Record<string, any> = {};

          // Apply header mapping if provided
          Object.entries(row).forEach(([key, value]) => {
            const targetKey = headerMapping[key] || key;
            newRow[targetKey] = value;
          });

          return newRow;
        });

      return processedData as T[];
    } catch (error) {
      console.error('Error importing Excel file:', error);
      throw error;
    }
  }; return {
    exportToExcel,
    importFromExcel
  };
}