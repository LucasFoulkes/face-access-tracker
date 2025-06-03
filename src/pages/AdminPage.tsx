import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import DataTable from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, ChevronLeft } from "lucide-react";
import { useRef } from "react";
import { useImportExcel } from "@/hooks/useImportExcel";

function AdminPage() {
    const usuarios = useLiveQuery(() => db.usuarios.toArray());
    const registros = useLiveQuery(() => db.registros.toArray());
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { importUsuarios, isImporting } = useImportExcel();

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
        <div className="flex flex-col h-screen ">
            <Button onClick={() => navigate('/')} className="uppercase w-fit mb-4 flex items-center gap-2">
                <ChevronLeft /> <span>Regresar</span>
            </Button>
            <Tabs defaultValue="account" className="w-full items-center">
                <TabsList>
                    <TabsTrigger className="uppercase" value="usuarios">{db.usuarios.name}</TabsTrigger>
                    <TabsTrigger className="uppercase" value="registros">{db.registros.name}</TabsTrigger>
                </TabsList>
                <TabsContent value="usuarios">
                    <DataTable data={usuariosData} actions={usuariosActions} />
                </TabsContent>
                <TabsContent value="registros" ><DataTable data={registrosData} /></TabsContent>
            </Tabs>
        </div >
    );
}

export default AdminPage;