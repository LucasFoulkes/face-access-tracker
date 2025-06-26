import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import SmartTable from '@/components/SmartTable';

export default function Admin() {
    const [users, setUsers] = useState<any[]>([]);
    const [entries, setEntries] = useState<any[]>([]);

    // Load data from localStorage
    useEffect(() => {
        setUsers(JSON.parse(localStorage.getItem('faces') || '[]'));
        setEntries(JSON.parse(localStorage.getItem('entries') || '[]'));
    }, []);

    const deleteUser = (user: any, index: number) => {
        if (confirm(`Delete user ${user.name}?`)) {
            const updatedUsers = users.filter((_, i) => i !== index);
            localStorage.setItem('faces', JSON.stringify(updatedUsers));
            setUsers(updatedUsers);

            // Remove their entries too
            const updatedEntries = entries.filter(e => e.userId !== user.id);
            localStorage.setItem('entries', JSON.stringify(updatedEntries));
            setEntries(updatedEntries);
        }
    };

    const exportData = () => {
        const data = { users, entries, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `face-tracker-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Face Access Admin</h1>
                <Button onClick={exportData} className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export Data
                </Button>
            </div>

            {/* Data Tables */}
            <Tabs defaultValue="users" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
                    <TabsTrigger value="entries">Entries ({entries.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>Users Data</CardTitle>
                            <CardDescription>Raw data from localStorage 'faces'</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SmartTable
                                data={users}
                                searchPlaceholder="Search users..."
                                onDelete={deleteUser}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="entries">
                    <Card>
                        <CardHeader>
                            <CardTitle>Entries Data</CardTitle>
                            <CardDescription>Raw data from localStorage 'entries'</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SmartTable
                                data={entries}
                                searchPlaceholder="Search entries..."
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
