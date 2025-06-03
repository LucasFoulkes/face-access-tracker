import { useState } from 'react';
import { useExcel } from './useExcel';
import { db } from '@/lib/db';

interface ImportError { row: number; field: string; value: any; message: string; }

export function useImportExcel() {
    const [isImporting, setIsImporting] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ImportError[]>([]);
    const { importFromExcel } = useExcel();

    const findFieldValue = (row: any, fieldVariations: string[]): string => {
        const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const normalizedVariations = fieldVariations.map(normalize);
        return String(Object.entries(row).find(([key]) => normalizedVariations.includes(normalize(key)))?.[1] || '');
    };
    const importUsuarios = async (file: File): Promise<{ success: boolean; message: string }> => {
        setIsImporting(true);
        setValidationErrors([]);
        try {
            const jsonData = await importFromExcel(file, {
                headerMapping: { 'código': 'codigo', 'code': 'codigo', 'cédula': 'cedula', 'ci': 'cedula', 'documento': 'cedula', 'id': 'cedula', 'apellido': 'apellidos', 'lastname': 'apellidos', 'last name': 'apellidos', 'surname': 'apellidos', 'nombre': 'nombres', 'firstname': 'nombres', 'first name': 'nombres', 'name': 'nombres', 'clave': 'pin', 'password': 'pin', 'contraseña': 'pin' },
                skipEmptyRows: true,
                requiredFields: ['cedula', 'nombres', 'apellidos'],
                validators: {
                    cedula: (value) => ({ valid: /^\d{7,10}$/.test(String(value).trim()), message: 'Cédula debe tener entre 7 y 10 dígitos' }),
                    pin: (value) => !value ? { valid: true } : ({ valid: /^\d{4}$/.test(String(value).trim()), message: 'PIN debe ser un número de 4 dígitos' })
                },
                onValidationError: setValidationErrors
            });
            for (const row of jsonData as any[]) {
                await db.usuarios.add({
                    codigo: findFieldValue(row, ['codigo', 'código', 'code']),
                    cedula: findFieldValue(row, ['cedula', 'cédula', 'ci', 'documento', 'id']),
                    apellidos: findFieldValue(row, ['apellidos', 'apellido', 'lastname', 'last name', 'surname']),
                    nombres: findFieldValue(row, ['nombres', 'nombre', 'firstname', 'first name', 'name']),
                    pin: findFieldValue(row, ['pin', 'clave', 'password', 'contraseña']),
                });
            }
            return { success: true, message: 'Datos importados correctamente' };
        } catch (error) {
            const message = validationErrors.length > 0 ? `Error: Se encontraron ${validationErrors.length} errores en los datos. Por favor corrija los errores y vuelva a intentar.` : 'Error al importar el archivo: ' + (error instanceof Error ? error.message : 'Error desconocido');
            return { success: false, message };
        } finally { setIsImporting(false); }
    };
    return { importUsuarios, isImporting, validationErrors, setValidationErrors };
}
