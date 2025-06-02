import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import DataTable from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Upload, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useExcel } from "@/hooks/useExcel";


function AdminPage() {
    const usuarios = useLiveQuery(() => db.usuarios.toArray());
    const registros = useLiveQuery(() => db.registros.toArray()); const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Array<{ row: number; field: string; value: any; message: string }>>([]);
    const { importFromExcel } = useExcel();    // Create data objects that include table name
    const usuariosData = usuarios ? Object.assign(usuarios, { _tableName: db.usuarios.name }) : [];
    const registrosData = registros ? Object.assign(registros, { _tableName: db.registros.name }) : [];

    const handleImportUsuarios = () => {
        fileInputRef.current?.click();
    }; const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setValidationErrors([]);

        try {
            // Use the importFromExcel hook function with enhanced options
            const jsonData = await importFromExcel(file, {
                headerMapping: {
                    // Map common header variations to our standard fields
                    'código': 'codigo',
                    'code': 'codigo',
                    'cédula': 'cedula',
                    'ci': 'cedula',
                    'documento': 'cedula',
                    'id': 'cedula',
                    'apellido': 'apellidos',
                    'lastname': 'apellidos',
                    'last name': 'apellidos',
                    'surname': 'apellidos',
                    'nombre': 'nombres',
                    'firstname': 'nombres',
                    'first name': 'nombres',
                    'name': 'nombres',
                    'clave': 'pin',
                    'password': 'pin',
                    'contraseña': 'pin'
                },
                skipEmptyRows: true,
                requiredFields: ['cedula', 'nombres', 'apellidos'],
                validators: {
                    cedula: (value) => {
                        // Validate that cedula is a number and has proper length
                        const strValue = String(value).trim();
                        const isValid = /^\d{7,10}$/.test(strValue);
                        return {
                            valid: isValid,
                            message: isValid ? '' : 'Cédula debe tener entre 7 y 10 dígitos'
                        };
                    },
                    pin: (value) => {
                        // If PIN is provided, validate it's a 4-digit number
                        if (value === undefined || value === '') return { valid: true };
                        const strValue = String(value).trim();
                        const isValid = /^\d{4}$/.test(strValue);
                        return {
                            valid: isValid,
                            message: isValid ? '' : 'PIN debe ser un número de 4 dígitos'
                        };
                    }
                },
                onValidationError: (errors) => {
                    setValidationErrors(errors);
                }
            });

            // Helper function to normalize Spanish text and find matching field
            const normalizeText = (text: string) => {
                return text
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // Remove accents
                    .trim();
            }; const findFieldValue = (row: any, fieldVariations: string[]): string => {
                const normalizedVariations = fieldVariations.map(v => normalizeText(v));

                for (const [key, value] of Object.entries(row)) {
                    const normalizedKey = normalizeText(key as string);
                    if (normalizedVariations.includes(normalizedKey)) {
                        return String(value || '');
                    }
                }
                return '';
            };

            // Process and add to database
            for (const row of jsonData as any[]) {
                await db.usuarios.add({
                    codigo: findFieldValue(row, ['codigo', 'código', 'code']),
                    cedula: findFieldValue(row, ['cedula', 'cédula', 'ci', 'documento', 'id']),
                    apellidos: findFieldValue(row, ['apellidos', 'apellido', 'lastname', 'last name', 'surname']),
                    nombres: findFieldValue(row, ['nombres', 'nombre', 'firstname', 'first name', 'name']),
                    pin: findFieldValue(row, ['pin', 'clave', 'password', 'contraseña', 'contraseña']),
                });
            } alert('Datos importados correctamente');
        } catch (error) {
            console.error('Error importing file:', error);

            // Check if it's a validation error
            if (validationErrors.length > 0) {
                // We already set the validation errors via the onValidationError callback
                // Just show a summary message to the user
                alert(`Error: Se encontraron ${validationErrors.length} errores en los datos. Por favor corrija los errores y vuelva a intentar.`);
            } else {
                // Generic error
                alert('Error al importar el archivo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
            }
        } finally {
            setIsImporting(false);
            // Reset file input
            event.target.value = '';
        }
    }; const usuariosActions = (
        <>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
            />
            <Button
                onClick={handleImportUsuarios}
                className="uppercase bg-blue-500 hover:bg-blue-600"
                size='sm'
                disabled={isImporting}
            >
                {isImporting ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        importando...
                    </>
                ) : (
                    <>
                        <Upload className="w-4 h-4 mr-1" />
                        importar
                    </>
                )}
            </Button>
        </>
    );
    return (
        <div className="flex flex-col justify-center uppercase">
            <Button onClick={() => navigate('/')} size={'icon'} >
                <ChevronLeft />
            </Button>
            <Tabs defaultValue="account" className="container" >
                <TabsList>
                    <TabsTrigger className="uppercase" value="account">{db.usuarios.name}</TabsTrigger>
                    <TabsTrigger className="uppercase" value="password">{db.registros.name}</TabsTrigger>
                </TabsList>                <TabsContent value="account">
                    {validationErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
                            <h4 className="text-sm font-semibold mb-2">Errores de validación:</h4>
                            <ul className="text-xs list-disc pl-5">
                                {validationErrors.map((error, index) => (
                                    <li key={index}>
                                        Fila {error.row}: {error.field} - {error.message}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <DataTable data={usuariosData} actions={usuariosActions} />
                </TabsContent>
                <TabsContent value="password">
                    <DataTable data={registrosData} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default AdminPage;