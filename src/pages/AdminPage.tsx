import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import DataTable from "@/components/DataTable";
import UsuariosCRUD from "@/components/UsuariosCRUD";
import MenusCRUD from "@/components/MenusCRUD";
import RegistrosTable from "@/components/RegistrosTable";
import ReportsSection from "@/components/ReportsSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, Download, Database, FileText, Menu as MenuIcon, X } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useImportExcel } from "@/hooks/useImportExcel";
import { useViewport } from "@/hooks/useViewport";

function AdminPage() {
    const [activeSection, setActiveSection] = useState<'database' | 'reports'>('database');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const registros = useLiveQuery(() => db.registros.toArray());
    const admin = useLiveQuery(() => db.admin.toArray());
    const faceData = useLiveQuery(() => db.faceData.toArray());
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { importUsuarios, isImporting } = useImportExcel();
    const { isMobile, isLandscape } = useViewport();

    // Auto-collapse sidebar on mobile devices
    useEffect(() => {
        setSidebarOpen(!isMobile);
    }, [isMobile]);

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
    );

    return (
        <div className="flex h-screen w-screen overflow-hidden relative">
            {/* Mobile sidebar toggle button */}
            {isMobile && (
                <button
                    className="fixed top-4 left-4 z-50 p-2 bg-indigo-600 text-white rounded-full shadow-lg"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    {sidebarOpen ? <X size={24} /> : <MenuIcon size={24} />}
                </button>
            )}

            {/* Side Navigation - with responsive behavior */}
            <div
                className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                transition-transform duration-300 ease-in-out
                fixed md:relative z-40 h-full
                md:translate-x-0 md:flex-shrink-0 md:w-60
                w-3/4 sm:w-1/2 bg-indigo-950 flex flex-col`}
            >
                <nav className="p-4 space-y-3 flex-1 mt-16 md:mt-0">
                    <Button
                        variant={activeSection === 'database' ? 'secondary' : 'ghost'}
                        className={`w-full justify-start uppercase ${activeSection === 'database'
                            ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg border-indigo-400'
                            : 'text-indigo-200 hover:text-white hover:bg-indigo-800'
                            }`}
                        onClick={() => {
                            setActiveSection('database');
                            if (isMobile) setSidebarOpen(false);
                        }}
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
                        onClick={() => {
                            setActiveSection('reports');
                            if (isMobile) setSidebarOpen(false);
                        }}
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

            {/* Overlay for mobile when sidebar is open */}
            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-30"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {activeSection === 'database' && (
                    <div className="flex flex-col h-full">
                        <div className="flex-shrink-0 p-2 sm:p-4 pb-0">
                            <Tabs defaultValue="registros" className="w-full">
                                <TabsList className={`grid w-full ${isLandscape ? 'grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'}`}>
                                    <TabsTrigger className="uppercase text-xs sm:text-sm" value="usuarios">{db.usuarios.name}</TabsTrigger>
                                    <TabsTrigger className="uppercase text-xs sm:text-sm" value="menus">{db.menus.name}</TabsTrigger>
                                    <TabsTrigger className="uppercase text-xs sm:text-sm" value="registros">{db.registros.name}</TabsTrigger>
                                    <TabsTrigger className="uppercase text-xs sm:text-sm" value="admin">{db.admin.name}</TabsTrigger>
                                    <TabsTrigger className="uppercase text-xs sm:text-sm" value="faceData">{db.faceData.name}</TabsTrigger>
                                </TabsList>
                                <div className="h-[calc(100vh-180px)] mt-4 overflow-auto">
                                    <TabsContent value="usuarios" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                                        <UsuariosCRUD importActions={usuariosImportActions} />
                                    </TabsContent>
                                    <TabsContent value="menus" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                                        <MenusCRUD />
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
                    <div className="flex-1 p-2 sm:p-4 overflow-auto">
                        <ReportsSection />
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminPage;