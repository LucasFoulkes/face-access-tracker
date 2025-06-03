import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import DataTable from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { useRef } from "react";
import { useImportExcel } from "@/hooks/useImportExcel";

function AdminPage() {
    const usuarios = useLiveQuery(() => db.usuarios.toArray());
    const registros = useLiveQuery(() => db.registros.toArray());
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { importUsuarios, isImporting, validationErrors } = useImportExcel();

    const usuariosData = usuarios ? Object.assign(usuarios, { _tableName: db.usuarios.name }) : [];
    const registrosData = registros ? Object.assign(registros, { _tableName: db.registros.name }) : [];

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        alert((await importUsuarios(file)).message);
        event.target.value = '';
    }; const usuariosActions = (
        <>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" style={{ display: 'none' }} />
            <Button onClick={() => fileInputRef.current?.click()} className="uppercase bg-blue-500 hover:bg-blue-600" disabled={isImporting}>
                {isImporting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />importando...</> : <><Upload className="w-4 h-4 mr-1" />importar</>}
            </Button>
        </>
    ); return (
        <div>
            <Button onClick={() => navigate('/')} className="uppercase w-fit">regresar</Button>
            <Tabs defaultValue="account" className="w-fit items-center">
                <TabsList>
                    <TabsTrigger className="uppercase" value="account">{db.usuarios.name}</TabsTrigger>
                    <TabsTrigger className="uppercase" value="password">{db.registros.name}</TabsTrigger>
                </TabsList>
                <TabsContent value="account">
                    {validationErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
                            <h4 className="text-sm font-semibold mb-2">Errores de validación:</h4>
                            <ul className="text-xs list-disc pl-5">
                                {validationErrors.map((error, index) => <li key={index}>Fila {error.row}: {error.field} - {error.message}</li>)}
                            </ul>
                        </div>
                    )}
                    <DataTable data={usuariosData} actions={usuariosActions} />
                </TabsContent>
                <TabsContent value="password"><DataTable data={registrosData} /></TabsContent>
            </Tabs>
        </div>
    );
}

export default AdminPage;