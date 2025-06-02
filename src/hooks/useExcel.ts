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
   */  const exportToExcel = <T extends Record<string, any>>(
  data: T[],
  columns?: string[],
  tableName?: string,
  options?: UseExcelOptions
) => {
    console.log('📤 Starting Excel export process...');
    console.log('📊 Export data:', {
      rowCount: data?.length || 0,
      tableName,
      columns: columns || 'auto-detect',
      hasOptions: !!options
    });

    if (!data || data.length === 0) {
      console.warn('⚠️ No data to export, aborting');
      return;
    }    // Default options
    const {
      dateFormat = (date: Date) => date.toLocaleDateString(),
      sheetName = tableName || 'Data',
      capitalize = true,
      filename = `${tableName || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`,
      headerStyle
    } = options || {};

    console.log('⚙️ Export options:', {
      sheetName,
      capitalize,
      filename,
      hasHeaderStyle: !!headerStyle,
      hasCustomDateFormat: options?.dateFormat !== undefined
    });

    // If columns not specified, use all keys from first item
    const columnsToExport = columns || Object.keys(data[0]);
    console.log('📋 Columns to export:', columnsToExport);

    // Create a new workbook
    console.log('📖 Creating new workbook...');
    const workbook = XLSX.utils.book_new();    // Prepare the data for Excel
    console.log('🔄 Preparing data for Excel format...');
    const excelData = data.map((row, index) => {
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

      if (index === 0) {
        console.log('🔍 Sample processed row (first):', newRow);
      }

      return newRow;
    });

    console.log('✅ Data preparation completed, rows:', excelData.length);

    // Create worksheet
    console.log('📄 Creating worksheet...');
    const worksheet = XLSX.utils.json_to_sheet(excelData);    // Apply header styling if provided
    if (headerStyle && worksheet['!ref']) {
      console.log('🎨 Applying header styling...');
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: range.s.r, c: C });
        if (!worksheet[address]) continue;

        worksheet[address].s = {
          font: { bold: headerStyle.bold || true },
          fill: headerStyle.fill || { fgColor: { rgb: "EFEFEF" } }
        };
      }
      console.log('✅ Header styling applied');
    } else {
      console.log('⏭️ No header styling to apply');
    }

    // Add worksheet to workbook
    console.log('📋 Adding worksheet to workbook...');
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Save the file
    console.log('💾 Saving file:', filename);
    XLSX.writeFile(workbook, filename);
    console.log('✅ Excel export completed successfully!');
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
    console.log('📊 Starting Excel import process...');
    console.log('📁 File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

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

      console.log('⚙️ Import options:', {
        sheetIndex,
        sheetName,
        headerMapping,
        requiredFields,
        skipEmptyRows,
        hasValidators: Object.keys(validators).length > 0,
        hasValidationErrorHandler: !!onValidationError
      });

      console.log('🔄 Reading file buffer...');
      const data = await file.arrayBuffer();
      console.log('✅ File buffer read successfully, size:', data.byteLength, 'bytes');

      console.log('📖 Parsing Excel workbook...');
      const workbook = XLSX.read(data);
      console.log('✅ Workbook parsed successfully');
      console.log('📋 Available sheets:', workbook.SheetNames);      // Determine which sheet to use
      let selectedSheetName = '';
      if (sheetName && workbook.SheetNames.includes(sheetName)) {
        selectedSheetName = sheetName;
        console.log('📄 Using specified sheet:', selectedSheetName);
      } else {
        selectedSheetName = workbook.SheetNames[sheetIndex] || workbook.SheetNames[0];
        console.log('📄 Using sheet by index:', selectedSheetName, '(index:', sheetIndex, ')');
      }

      if (!selectedSheetName) {
        console.error('❌ No valid sheet found in workbook');
        throw new Error('No valid sheet found in the Excel file');
      }

      console.log('🔍 Processing worksheet:', selectedSheetName);
      const worksheet = workbook.Sheets[selectedSheetName];

      console.log('📊 Converting sheet to JSON...');
      const rawJsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
      console.log('✅ Sheet converted to JSON successfully');
      console.log('📈 Raw data rows:', rawJsonData.length); if (rawJsonData.length > 0) {
        console.log('🔍 Sample row (first):', rawJsonData[0]);
        console.log('🗂️ Available columns:', Object.keys(rawJsonData[0]));

        // Show summary of data distribution
        const dataRowCount = rawJsonData.filter(row =>
          Object.values(row).some(value =>
            value !== null && value !== undefined && value !== '' && String(value).trim() !== ''
          )
        ).length;

        console.log(`📊 Data summary: ${dataRowCount} rows with data out of ${rawJsonData.length} total rows`);

        // Show sample of last few rows to identify empty rows at the end
        if (rawJsonData.length > 5) {
          const lastRows = rawJsonData.slice(-5);
          console.log('🔍 Last 5 rows sample:', lastRows.map((row, idx) => ({
            rowNumber: rawJsonData.length - 5 + idx + 2, // +2 for Excel 1-based + header
            hasData: Object.values(row).some(value =>
              value !== null && value !== undefined && value !== '' && String(value).trim() !== ''
            ),
            fields: Object.keys(row).length,
            sampleData: Object.fromEntries(Object.entries(row).slice(0, 2))
          })));
        }
      } else {
        console.warn('⚠️ No data rows found in worksheet');
      }// Validate data if validators are provided
      console.log('🔍 Starting data validation...');
      const validationErrors: Array<{ row: number; field: string; value: any; message: string }> = [];

      if (Object.keys(validators).length > 0) {
        console.log('✅ Validators found for fields:', Object.keys(validators));

        rawJsonData.forEach((row, rowIndex) => {
          Object.entries(validators).forEach(([field, validator]) => {
            // Find the field in the row (might be under a different name)
            const originalFieldName = Object.entries(headerMapping)
              .find(([_, target]) => target === field)?.[0] || field;

            const value = row[originalFieldName] || row[field];

            // Skip validation if field is not present
            if (value === undefined) {
              console.log(`⏭️ Skipping validation for ${field} in row ${rowIndex + 2} (field not present)`);
              return;
            }

            console.log(`🔍 Validating row ${rowIndex + 2}, field ${field}, value:`, value);
            const result = validator(value);
            if (!result.valid) {
              console.warn(`❌ Validation failed for row ${rowIndex + 2}, field ${field}:`, result.message);
              validationErrors.push({
                row: rowIndex + 2, // +2 because Excel is 1-based and we have a header row
                field,
                value,
                message: result.message || `Invalid value for ${field}`
              });
            } else {
              console.log(`✅ Validation passed for row ${rowIndex + 2}, field ${field}`);
            }
          });
        });
      } else {
        console.log('⏭️ No validators provided, skipping validation');
      }      // Handle validation errors if any
      if (validationErrors.length > 0) {
        console.error('❌ Validation errors found:', validationErrors.length);
        console.table(validationErrors);

        if (onValidationError) {
          console.log('📞 Calling validation error handler...');
          onValidationError(validationErrors);
        }

        // If there are validation errors, throw an error with details
        const errorCount = validationErrors.length;
        const errorMessage = `Found ${errorCount} validation error${errorCount > 1 ? 's' : ''} in the imported data.`;
        console.error('🚫 Throwing validation error:', errorMessage);
        const error = new Error(errorMessage);
        (error as any).validationErrors = validationErrors;
        throw error;
      } else {
        console.log('✅ All validation checks passed');
      }      // Process the data - map headers and validate required fields
      console.log('🔄 Processing and filtering data...');
      const processedData = rawJsonData.filter((row, index) => {
        // Skip empty rows if configured
        if (skipEmptyRows && Object.keys(row).length === 0) {
          console.log(`⏭️ Skipping empty row ${index + 2}`);
          return false;
        }

        // Skip rows that have no meaningful data (all values are empty/null/undefined)
        const hasData = Object.values(row).some(value =>
          value !== null && value !== undefined && value !== '' && String(value).trim() !== ''
        );

        if (skipEmptyRows && !hasData) {
          console.log(`⏭️ Skipping row ${index + 2} - no meaningful data:`, Object.keys(row));
          return false;
        }        // Check required fields - but don't filter out rows, just log info
        if (requiredFields.length > 0) {
          console.log(`🔍 Checking required fields for row ${index + 2}:`, requiredFields);

          const hasAllRequired = requiredFields.every(field => {
            // Check original field name and possible mapped names
            const mappedField = Object.entries(headerMapping)
              .find(([_, target]) => target === field)?.[0] || field;

            const directValue = row[field];
            const mappedValue = row[mappedField];
            const hasField = (directValue !== undefined && directValue !== null && String(directValue).trim() !== '') ||
              (mappedValue !== undefined && mappedValue !== null && String(mappedValue).trim() !== '');

            if (!hasField) {
              console.log(`⚠️ Row ${index + 2} missing required field '${field}' - will include row anyway`);
            } else {
              console.log(`✅ Found required field '${field}' in row ${index + 2}:`, directValue || mappedValue);
            }
            return hasField;
          });

          if (!hasAllRequired) {
            console.log(`⚠️ Row ${index + 2} missing some required fields but including anyway`);
            console.log(`📊 Row data summary:`, {
              rowNumber: index + 2,
              totalFields: Object.keys(row).length,
              nonEmptyFields: Object.entries(row).filter(([_, value]) =>
                value !== null && value !== undefined && value !== '' && String(value).trim() !== ''
              ).length,
              availableFields: Object.keys(row),
              requiredFields,
              sampleValues: Object.fromEntries(Object.entries(row).slice(0, 3))
            });
          } else {
            console.log(`✅ Row ${index + 2} has all required fields`);
          }
          // Always return true - let validation handle missing fields later
        }

        console.log(`✅ Including row ${index + 2} (no required field validation)`);
        return true;
      })
        .map((row, index) => {
          console.log(`🔄 Processing row ${index + 1} for header mapping...`);
          const newRow: Record<string, any> = {};

          // Apply header mapping if provided
          Object.entries(row).forEach(([key, value]) => {
            const targetKey = headerMapping[key] || key;
            if (headerMapping[key]) {
              console.log(`🔄 Mapping '${key}' → '${targetKey}':`, value);
            }
            newRow[targetKey] = value;
          });

          return newRow;
        });

      console.log('✅ Data processing completed');
      console.log('📊 Final processed data:', {
        totalRows: processedData.length,
        originalRows: rawJsonData.length,
        filteredOut: rawJsonData.length - processedData.length
      });

      if (processedData.length > 0) {
        console.log('🔍 Sample processed row (first):', processedData[0]);
        console.log('🗂️ Final columns:', Object.keys(processedData[0]));
      }

      return processedData as T[];
    } catch (error) {
      console.error('💥 Error importing Excel file:', error);
      console.error('📋 Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        validationErrors: (error as any).validationErrors || undefined
      });
      throw error;
    }
  }; return {
    exportToExcel,
    importFromExcel
  };
}