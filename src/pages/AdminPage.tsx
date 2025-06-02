import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import DataTable from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";


function AdminPage() {
    const usuarios = useLiveQuery(() => db.usuarios.toArray());
    const registros = useLiveQuery(() => db.registros.toArray());
    const navigate = useNavigate();

    // Create data objects that include table name
    const usuariosData = usuarios ? Object.assign(usuarios, { _tableName: db.usuarios.name }) : [];
    const registrosData = registros ? Object.assign(registros, { _tableName: db.registros.name }) : [];
    return (
        <div className="flex flex-col justify-center uppercase">
            <Button onClick={() => navigate('/')} size={'icon'} >
                <ChevronLeft />
            </Button>
            <Tabs defaultValue="account" className="container" >
                <TabsList>
                    <TabsTrigger className="uppercase" value="account">{db.usuarios.name}</TabsTrigger>
                    <TabsTrigger className="uppercase" value="password">{db.registros.name}</TabsTrigger>
                </TabsList>
                <TabsContent value="account">
                    <DataTable data={usuariosData} />
                </TabsContent>
                <TabsContent value="password">
                    <DataTable data={registrosData} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default AdminPage;