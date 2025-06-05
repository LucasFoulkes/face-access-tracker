import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import DataTable from "@/components/DataTable";
import UsuariosCRUD from "@/components/UsuariosCRUD";
import RegistrosTable from "@/components/RegistrosTable";
import ReportsSection from "@/components/ReportsSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, Download, Database, FileText } from "lucide-react";
import { useRef, useState } from "react";
import { useImportExcel } from "@/hooks/useImportExcel";

function AdminPage() {
    const [activeSection, setActiveSection] = useState<'database' | 'reports'>('database');
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
    }; const usuariosImportActions = (
        <>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" style={{ display: 'none' }} />
            <Button onClick={() => fileInputRef.current?.click()} className="uppercase bg-blue-500 hover:bg-blue-600" disabled={isImporting}>
                {isImporting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />importando...</> : <><Download className="w-4 h-4 mr-1" />importar</>}
            </Button>
        </>
    ); return (
        <div className="flex h-screen w-screen">
            {/* Side Navigation */}            <div className="flex-shrink-0 w-50 bg-indigo-950 flex flex-col">
                <nav className="p-4 space-y-3 flex-1">
                    <Button
                        variant={activeSection === 'database' ? 'secondary' : 'ghost'}
                        className={`w-full justify-start uppercase ${activeSection === 'database'
                            ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg border-indigo-400'
                            : 'text-indigo-200 hover:text-white hover:bg-indigo-800'
                            }`}
                        onClick={() => setActiveSection('database')}
                    >
                        <Database className="w-4 h-4 mr-2" />
                        Base de Datos
                    </Button>
                    <Button
                        variant={activeSection === 'reports' ? 'secondary' : 'ghost'}
                        className={`w-full justify-start uppercase ${activeSection === 'reports'
                            ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg border-indigo-400'
                            : 'text-indigo-200 hover:text-white hover:bg-indigo-800'
                            }`}
                        onClick={() => setActiveSection('reports')}
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Reportes
                    </Button>
                </nav>

                {/* Regresar button at bottom of sidenav */}
                <div className="p-4 border-t border-indigo-700">
                    <Button
                        onClick={() => navigate('/')}
                        className="uppercase w-full flex items-center justify-center gap-2 bg-yellow-500 text-yellow-900 hover:bg-yellow-400 hover:text-yellow-800 border-yellow-400 shadow-md font-semibold"
                        variant="outline"
                    >
                        <ChevronLeft className="w-4 h-4" /> <span>Regresar</span>
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {activeSection === 'database' && (
                    <div className="flex flex-col h-full">
                        <div className="flex-shrink-0 p-4 pb-0">
                            <Tabs defaultValue="registros" className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger className="uppercase" value="usuarios">{db.usuarios.name}</TabsTrigger>
                                    <TabsTrigger className="uppercase" value="registros">{db.registros.name}</TabsTrigger>
                                    <TabsTrigger className="uppercase" value="admin">{db.admin.name}</TabsTrigger>
                                    <TabsTrigger className="uppercase" value="faceData">{db.faceData.name}</TabsTrigger>
                                </TabsList>

                                <div className="h-[calc(100vh-180px)] mt-4">
                                    <TabsContent value="usuarios" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                                        <UsuariosCRUD importActions={usuariosImportActions} />
                                    </TabsContent>
                                    <TabsContent value="registros" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                                        <RegistrosTable data={registrosData} />
                                    </TabsContent>
                                    <TabsContent value="admin" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                                        <DataTable data={adminData} />
                                    </TabsContent>
                                    <TabsContent value="faceData" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                                        <DataTable data={faceDataData} />
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    </div>
                )}

                {activeSection === 'reports' && (
                    <div className="flex-1 p-4 overflow-hidden">
                        <ReportsSection />
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminPage;