import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Plus } from 'lucide-react';
import SmartTable from '@/components/SmartTable';
import { userStorage } from '@/services/userStorage';

export default function Tables() {
    const [users, setUsers] = useState<any[]>([]);
    const [entries, setEntries] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
    const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [editingSchedule, setEditingSchedule] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', cedula: '', pin: '', group_id: '' });
    const [groupFormData, setGroupFormData] = useState({ group_name: '', group_id: '', hourly_rate: 0 });
    const [scheduleFormData, setScheduleFormData] = useState({ schedule_id: '', group_id: '', start_hour: '', end_hour: '', total_hours: 0 });
    const [loading, setLoading] = useState(true);

    // Load data from localStorage
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [usersData, entriesData, groupsData, schedulesData] = await Promise.all([
                    userStorage.getUsers(),
                    userStorage.getEntries(),
                    userStorage.getGroups(),
                    userStorage.getSchedules()
                ]);
                setUsers(usersData);
                setEntries(entriesData);
                setGroups(groupsData);
                setSchedules(schedulesData);
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

    // Calculate hours worked per user per day
    const calculateHoursWorked = () => {
        const hoursData: Array<{
            userName: string;
            date: string;
            firstEntry: string;
            lastEntry: string;
            hoursWorked: string;
            totalEntries: number;
        }> = [];

        // Group entries by user and date
        const groupedEntries: { [key: string]: any[] } = {};

        entries.forEach(entry => {
            const user = users.find(u => u.id === entry.userId);
            if (!user) return;

            const date = new Date(entry.timestamp).toDateString();
            const key = `${user.name}_${date}`;

            if (!groupedEntries[key]) {
                groupedEntries[key] = [];
            }
            groupedEntries[key].push({ ...entry, userName: user.name });
        });

        // Calculate hours for each user-date combination
        Object.entries(groupedEntries).forEach(([, dayEntries]) => {
            if (dayEntries.length === 0) return;

            // Sort entries by timestamp
            dayEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            const firstEntry = dayEntries[0];
            const lastEntry = dayEntries[dayEntries.length - 1];

            const firstTime = new Date(firstEntry.timestamp);
            const lastTime = new Date(lastEntry.timestamp);

            // Calculate hours worked (only if there are multiple entries)
            let hoursWorked = '0.00';
            if (dayEntries.length > 1) {
                const diffMs = lastTime.getTime() - firstTime.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                hoursWorked = diffHours.toFixed(2);
            }

            hoursData.push({
                userName: firstEntry.userName,
                date: firstTime.toDateString(),
                firstEntry: firstTime.toLocaleTimeString(),
                lastEntry: lastTime.toLocaleTimeString(),
                hoursWorked: hoursWorked,
                totalEntries: dayEntries.length
            });
        });

        // Sort by date (newest first) then by user name
        return hoursData.sort((a, b) => {
            const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
            return dateCompare !== 0 ? dateCompare : a.userName.localeCompare(b.userName);
        });
    };

    const hoursWorkedData = calculateHoursWorked();

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
        setFormData({ name: user.name, cedula: user.cedula, pin: user.pin, group_id: user.group_id || '' });
        setIsDialogOpen(true);
    };

    const createUser = async () => {
        try {
            const uniquePin = await userStorage.generateUniquePin();
            setEditingUser(null);
            setFormData({ name: '', cedula: '', pin: uniquePin, group_id: '' });
            setIsDialogOpen(true);
        } catch (error) {
            console.error('Error generating PIN:', error);
            setFormData({ name: '', cedula: '', pin: '1234', group_id: '' }); // Fallback
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
                    pin: formData.pin,
                    group_id: formData.group_id
                });
            } else {
                // Create new user
                const id = await userStorage.generateUniqueId();
                await userStorage.saveUser({
                    id,
                    name: formData.name,
                    cedula: formData.cedula,
                    pin: formData.pin,
                    group_id: formData.group_id
                });
            }

            // Reload data
            const updatedUsers = await userStorage.getUsers();
            setUsers(updatedUsers);
            setIsDialogOpen(false);
            setEditingUser(null);
            setFormData({ name: '', cedula: '', pin: '', group_id: '' });
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Error saving user');
        }
    };

    // Group management functions
    const deleteGroup = async (group: any) => {
        if (confirm(`Delete group ${group.group_name}?`)) {
            try {
                await userStorage.deleteGroup(group.id);
                const updatedGroups = await userStorage.getGroups();
                setGroups(updatedGroups);
            } catch (error) {
                console.error('Error deleting group:', error);
                alert('Error deleting group');
            }
        }
    };

    const editGroup = (group: any) => {
        setEditingGroup({ ...group });
        setGroupFormData({ group_name: group.group_name, group_id: group.group_id, hourly_rate: group.hourly_rate || 0 });
        setIsGroupDialogOpen(true);
    };

    const createGroup = async () => {
        try {
            const uniqueGroupId = await userStorage.generateUniqueGroupId();
            setEditingGroup(null);
            setGroupFormData({ group_name: '', group_id: uniqueGroupId, hourly_rate: 0 });
            setIsGroupDialogOpen(true);
        } catch (error) {
            console.error('Error generating group ID:', error);
            setGroupFormData({ group_name: '', group_id: 'GRP-1234', hourly_rate: 0 }); // Fallback
            setIsGroupDialogOpen(true);
        }
    };

    const saveGroup = async () => {
        if (!groupFormData.group_name || !groupFormData.group_id) {
            alert('Please fill all fields');
            return;
        }

        try {
            if (editingGroup) {
                // Edit existing group
                await userStorage.updateGroup(editingGroup.id, {
                    group_name: groupFormData.group_name,
                    group_id: groupFormData.group_id,
                    hourly_rate: groupFormData.hourly_rate
                });
            } else {
                // Create new group
                await userStorage.saveGroup({
                    group_name: groupFormData.group_name,
                    group_id: groupFormData.group_id,
                    hourly_rate: groupFormData.hourly_rate
                });
            }

            // Reload data
            const updatedGroups = await userStorage.getGroups();
            setGroups(updatedGroups);
            setIsGroupDialogOpen(false);
            setEditingGroup(null);
            setGroupFormData({ group_name: '', group_id: '', hourly_rate: 0 });
        } catch (error) {
            console.error('Error saving group:', error);
            alert('Error saving group');
        }
    };

    // Schedule management functions
    const deleteSchedule = async (schedule: any) => {
        if (confirm(`Delete schedule ${schedule.schedule_id}?`)) {
            try {
                await userStorage.deleteSchedule(schedule.id);
                const updatedSchedules = await userStorage.getSchedules();
                setSchedules(updatedSchedules);
            } catch (error) {
                console.error('Error deleting schedule:', error);
                alert('Error deleting schedule');
            }
        }
    };

    const editSchedule = (schedule: any) => {
        setEditingSchedule({ ...schedule });
        setScheduleFormData({
            schedule_id: schedule.schedule_id,
            group_id: schedule.group_id,
            start_hour: schedule.start_hour,
            end_hour: schedule.end_hour,
            total_hours: schedule.total_hours
        });
        setIsScheduleDialogOpen(true);
    };

    const createSchedule = async () => {
        try {
            const uniqueScheduleId = await userStorage.generateUniqueScheduleId();
            setEditingSchedule(null);
            setScheduleFormData({ schedule_id: uniqueScheduleId, group_id: '', start_hour: '', end_hour: '', total_hours: 0 });
            setIsScheduleDialogOpen(true);
        } catch (error) {
            console.error('Error generating schedule ID:', error);
            setScheduleFormData({ schedule_id: 'SCH-123', group_id: '', start_hour: '', end_hour: '', total_hours: 0 }); // Fallback
            setIsScheduleDialogOpen(true);
        }
    };

    const saveSchedule = async () => {
        if (!scheduleFormData.start_hour || !scheduleFormData.end_hour || !scheduleFormData.group_id) {
            alert('Please fill all fields');
            return;
        }

        try {
            if (editingSchedule) {
                // Edit existing schedule
                await userStorage.updateSchedule(editingSchedule.id, {
                    start_hour: scheduleFormData.start_hour,
                    end_hour: scheduleFormData.end_hour,
                    total_hours: scheduleFormData.total_hours,
                    group_id: scheduleFormData.group_id
                });
            } else {
                // Create new schedule
                await userStorage.saveSchedule({
                    group_id: scheduleFormData.group_id,
                    start_hour: scheduleFormData.start_hour,
                    end_hour: scheduleFormData.end_hour,
                    total_hours: scheduleFormData.total_hours
                });
            }

            // Reload data
            const updatedSchedules = await userStorage.getSchedules();
            setSchedules(updatedSchedules);
            setIsScheduleDialogOpen(false);
            setEditingSchedule(null);
            setScheduleFormData({ schedule_id: '', group_id: '', start_hour: '', end_hour: '', total_hours: 0 });
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Error saving schedule');
        }
    };

    const exportData = () => {
        const data = { users, entries, groups, schedules, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `face-tracker-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    return (
        <>
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="text-lg">Loading...</div>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold">Data Tables</h1>
                        <Button onClick={exportData} className="flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Export Data
                        </Button>
                    </div>

                    {/* Data Tables */}
                    <Tabs defaultValue="users" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
                            <TabsTrigger value="entries">Entries ({enrichedEntries.length})</TabsTrigger>
                            <TabsTrigger value="hours">Hours Worked ({hoursWorkedData.length})</TabsTrigger>
                            <TabsTrigger value="groups">Groups ({groups.length})</TabsTrigger>
                            <TabsTrigger value="schedules">Schedules ({schedules.length})</TabsTrigger>
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

                        <TabsContent value="hours">
                            <Card>
                                <CardContent>
                                    <SmartTable
                                        data={hoursWorkedData}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="groups">
                            <Card>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-end">
                                            <Button onClick={createGroup} className="flex items-center gap-2">
                                                <Plus className="w-4 h-4" />
                                                Add Group
                                            </Button>
                                        </div>
                                        <SmartTable
                                            data={groups}
                                            onDelete={(group) => deleteGroup(group)}
                                            onEdit={(group) => editGroup(group)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="schedules">
                            <Card>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-end">
                                            <Button onClick={createSchedule} className="flex items-center gap-2">
                                                <Plus className="w-4 h-4" />
                                                Add Schedule
                                            </Button>
                                        </div>
                                        <SmartTable
                                            data={schedules}
                                            onDelete={(schedule) => deleteSchedule(schedule)}
                                            onEdit={(schedule) => editSchedule(schedule)}
                                        />
                                    </div>
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
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.group_id}
                                    onChange={(e) => setFormData(prev => ({ ...prev, group_id: e.target.value }))}
                                >
                                    <option value="">Select a Group (Optional)</option>
                                    {groups.map((group) => (
                                        <option key={group.id} value={group.group_id}>
                                            {group.group_name} ({group.group_id})
                                        </option>
                                    ))}
                                </select>
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

                    {/* Group Create/Edit Dialog */}
                    <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingGroup ? 'Edit Group' : 'Create Group'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <Input
                                    placeholder="Group Name"
                                    value={groupFormData.group_name}
                                    onChange={(e) => setGroupFormData(prev => ({ ...prev, group_name: e.target.value }))}
                                />
                                <Input
                                    placeholder="Group ID (auto-generated)"
                                    value={groupFormData.group_id}
                                    readOnly
                                    className="bg-gray-50 cursor-not-allowed"
                                />
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Hourly Rate"
                                    value={groupFormData.hourly_rate}
                                    onChange={(e) => setGroupFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                                />
                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={saveGroup}>
                                        {editingGroup ? 'Update' : 'Create'}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Schedule Create/Edit Dialog */}
                    <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <Input
                                    placeholder="Schedule ID (auto-generated)"
                                    value={scheduleFormData.schedule_id}
                                    readOnly
                                    className="bg-gray-50 cursor-not-allowed"
                                />
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={scheduleFormData.group_id}
                                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, group_id: e.target.value }))}
                                >
                                    <option value="">Select a Group</option>
                                    {groups.map((group) => (
                                        <option key={group.id} value={group.group_id}>
                                            {group.group_name} ({group.group_id})
                                        </option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <Input
                                        type="time"
                                        placeholder="Start Hour"
                                        value={scheduleFormData.start_hour}
                                        onChange={(e) => {
                                            const newFormData = { ...scheduleFormData, start_hour: e.target.value };
                                            if (newFormData.start_hour && newFormData.end_hour) {
                                                const startTime = new Date(`2000-01-01T${newFormData.start_hour}:00`);
                                                const endTime = new Date(`2000-01-01T${newFormData.end_hour}:00`);
                                                const diffMs = endTime.getTime() - startTime.getTime();
                                                const diffHours = diffMs / (1000 * 60 * 60);
                                                newFormData.total_hours = Math.max(0, diffHours);
                                            }
                                            setScheduleFormData(newFormData);
                                        }}
                                    />
                                    <Input
                                        type="time"
                                        placeholder="End Hour"
                                        value={scheduleFormData.end_hour}
                                        onChange={(e) => {
                                            const newFormData = { ...scheduleFormData, end_hour: e.target.value };
                                            if (newFormData.start_hour && newFormData.end_hour) {
                                                const startTime = new Date(`2000-01-01T${newFormData.start_hour}:00`);
                                                const endTime = new Date(`2000-01-01T${newFormData.end_hour}:00`);
                                                const diffMs = endTime.getTime() - startTime.getTime();
                                                const diffHours = diffMs / (1000 * 60 * 60);
                                                newFormData.total_hours = Math.max(0, diffHours);
                                            }
                                            setScheduleFormData(newFormData);
                                        }}
                                    />
                                </div>
                                <Input
                                    placeholder="Total Hours (auto-calculated)"
                                    value={scheduleFormData.total_hours.toFixed(2)}
                                    readOnly
                                    className="bg-gray-50 cursor-not-allowed"
                                />
                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={saveSchedule}>
                                        {editingSchedule ? 'Update' : 'Create'}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </>
    );
}
