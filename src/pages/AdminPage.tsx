import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import DataTable from "@/components/DataTable";
import UsuariosCRUD from "@/components/UsuariosCRUD";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, Download } from "lucide-react";
import { useRef } from "react";
import { useImportExcel } from "@/hooks/useImportExcel";

function AdminPage() {
    const registros = useLiveQuery(() => db.registros.toArray());
    const admin = useLiveQuery(() => db.admin.toArray());
    const faceData = useLiveQuery(() => db.faceData.toArray());
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { importUsuarios, isImporting } = useImportExcel();

    const registrosData = registros ? Object.assign(registros, { _tableName: db.registros.name }) : [];
    const adminData = admin ? Object.assign(admin, { _tableName: db.admin.name }) : [];

    // Transform faceData to exclude the 128-dimensional descriptor array
    const faceDataData = faceData ? Object.assign(
        faceData.map(face => ({
            id: face.id,
            usuarioId: face.usuarioId,
            descriptorSize: face.descriptor?.length || 0,
            descriptorType: face.descriptor?.constructor.name || 'N/A',
            fechaRegistro: face.fechaRegistro,
            hasDescriptor: face.descriptor ? 'Sí' : 'No'
        })),
        { _tableName: 'faceData (processed)' }
    ) : [];

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        alert((await importUsuarios(file)).message);
        event.target.value = '';
    };

    const usuariosImportActions = (
        <>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" style={{ display: 'none' }} />
            <Button onClick={() => fileInputRef.current?.click()} className="uppercase bg-blue-500 hover:bg-blue-600" disabled={isImporting}>
                {isImporting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />importando...</> : <><Download className="w-4 h-4 mr-1" />importar</>}
            </Button>
        </>
    ); return (
        <div className="flex flex-col h-screen p-4">
            <Button onClick={() => navigate('/')} className="uppercase w-fit flex items-center gap-2">
                <ChevronLeft /> <span>Regresar</span>
            </Button>            <Tabs defaultValue="registros" className="w-full items-center">
                <TabsList>
                    <TabsTrigger className="uppercase" value="usuarios">{db.usuarios.name}</TabsTrigger>
                    <TabsTrigger className="uppercase" value="registros">{db.registros.name}</TabsTrigger>
                    <TabsTrigger className="uppercase" value="admin">{db.admin.name}</TabsTrigger>
                    <TabsTrigger className="uppercase" value="faceData">{db.faceData.name}</TabsTrigger>
                </TabsList>                <TabsContent value="usuarios">
                    <UsuariosCRUD importActions={usuariosImportActions} />
                </TabsContent>
                <TabsContent value="registros">
                    <DataTable data={registrosData} />
                </TabsContent>
                <TabsContent value="admin">
                    <DataTable data={adminData} />
                </TabsContent>
                <TabsContent value="faceData">
                    <DataTable data={faceDataData} />
                </TabsContent>
            </Tabs>
        </div >
    );
}

export default AdminPage;