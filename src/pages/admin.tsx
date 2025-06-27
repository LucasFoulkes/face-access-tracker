import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Plus } from 'lucide-react';
import SmartTable from '@/components/SmartTable';
import { userStorage } from '@/services/userStorage';

export default function Admin() {
    const [users, setUsers] = useState<any[]>([]);
    const [entries, setEntries] = useState<any[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', cedula: '', pin: '' });
    const [loading, setLoading] = useState(true);

    // Load data from PouchDB
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [usersData, entriesData] = await Promise.all([
                    userStorage.getUsers(),
                    userStorage.getEntries()
                ]);
                setUsers(usersData);
                setEntries(entriesData);
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Create enriched entries with user names instead of IDs
    const enrichedEntries = entries.map(entry => {
        const user = users.find(u => u.id === entry.userId);
        return {
            userName: user?.name || `Unknown (${entry.userId})`,
            timestamp: entry.timestamp,
            method: entry.method
        };
    });

    const deleteUser = async (user: any) => {
        if (confirm(`Delete user ${user.name}?`)) {
            try {
                await userStorage.deleteUser(user.id);

                // Reload data
                const [updatedUsers, updatedEntries] = await Promise.all([
                    userStorage.getUsers(),
                    userStorage.getEntries()
                ]);
                setUsers(updatedUsers);
                setEntries(updatedEntries);
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('Error deleting user');
            }
        }
    };

    const editUser = (user: any) => {
        setEditingUser({ ...user });
        setFormData({ name: user.name, cedula: user.cedula, pin: user.pin });
        setIsDialogOpen(true);
    };

    const createUser = async () => {
        try {
            const uniquePin = await userStorage.generateUniquePin();
            setEditingUser(null);
            setFormData({ name: '', cedula: '', pin: uniquePin });
            setIsDialogOpen(true);
        } catch (error) {
            console.error('Error generating PIN:', error);
            setFormData({ name: '', cedula: '', pin: '1234' }); // Fallback
            setIsDialogOpen(true);
        }
    };

    const saveUser = async () => {
        if (!formData.name || !formData.cedula || !formData.pin) {
            alert('Please fill all fields');
            return;
        }

        try {
            if (editingUser) {
                // Edit existing user
                await userStorage.updateUser(editingUser.id, {
                    name: formData.name,
                    cedula: formData.cedula,
                    pin: formData.pin
                });
            } else {
                // Create new user
                const id = await userStorage.generateUniqueId();
                await userStorage.saveUser({
                    id,
                    name: formData.name,
                    cedula: formData.cedula,
                    pin: formData.pin
                });
            }

            // Reload data
            const updatedUsers = await userStorage.getUsers();
            setUsers(updatedUsers);
            setIsDialogOpen(false);
            setEditingUser(null);
            setFormData({ name: '', cedula: '', pin: '' });
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Error saving user');
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
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="text-lg">Loading...</div>
                </div>
            ) : (
                <>
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
                            <TabsTrigger value="entries">Entries ({enrichedEntries.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="users">
                            <Card>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-end">
                                            <Button onClick={createUser} className="flex items-center gap-2">
                                                <Plus className="w-4 h-4" />
                                                Add User
                                            </Button>
                                        </div>
                                        <SmartTable
                                            data={users}
                                            onDelete={(user) => deleteUser(user)}
                                            onEdit={(user) => editUser(user)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="entries">
                            <Card>
                                <CardContent>
                                    <SmartTable
                                        data={enrichedEntries}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    {/* User Create/Edit Dialog */}
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingUser ? 'Edit User' : 'Create User'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <Input
                                    placeholder="Full Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                />
                                <Input
                                    placeholder="Cedula"
                                    value={formData.cedula}
                                    onChange={(e) => setFormData(prev => ({ ...prev, cedula: e.target.value }))}
                                />
                                <Input
                                    placeholder="PIN (4 digits)"
                                    value={formData.pin}
                                    onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                                />
                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={saveUser}>
                                        {editingUser ? 'Update' : 'Create'}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    );
}
