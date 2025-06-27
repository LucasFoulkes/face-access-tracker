import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Users, Calendar, Plus, X, Building, FileUp, Search,
    UserCheck, Download, Link as LinkIcon
} from 'lucide-react';
import { userStorage } from '@/services/userStorage';

export default function Actions() {
    const [users, setUsers] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastAction, setLastAction] = useState<string>('');

    // Dialog states
    const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
    const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
    const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
    const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);
    const [isPinLookupDialogOpen, setIsPinLookupDialogOpen] = useState(false);
    const [isMassAssignDialogOpen, setIsMassAssignDialogOpen] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isAssignScheduleDialogOpen, setIsAssignScheduleDialogOpen] = useState(false);

    // Form data states
    const [userFormData, setUserFormData] = useState({
        name: '', cedula: '', pin: '', group_id: ''
    });

    const [scheduleFormData, setScheduleFormData] = useState({
        schedule_id: '', start_hour: '', end_hour: '', total_hours: 0
    });

    const [groupFormData, setGroupFormData] = useState({
        group_name: '', hourly_rate: 0
    });

    const [bulkImportData, setBulkImportData] = useState('');
    const [pinLookupQuery, setPinLookupQuery] = useState('');
    const [pinLookupResult, setPinLookupResult] = useState<any>(null);
    const [selectedUsersForAssign, setSelectedUsersForAssign] = useState<string[]>([]);
    const [targetGroupForAssign, setTargetGroupForAssign] = useState('');
    const [exportGroupFilter, setExportGroupFilter] = useState('');
    const [scheduleToAssign, setScheduleToAssign] = useState('');
    const [groupForSchedule, setGroupForSchedule] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersData, groupsData, schedulesData] = await Promise.all([
                userStorage.getUsers(),
                userStorage.getGroups(),
                userStorage.getSchedules()
            ]);
            setUsers(usersData);
            setGroups(groupsData);
            setSchedules(schedulesData);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const updateScheduleTotalHours = (startHour: string, endHour: string) => {
        if (startHour && endHour) {
            const startTime = new Date(`2000-01-01T${startHour}:00`);
            const endTime = new Date(`2000-01-01T${endHour}:00`);
            const diffMs = endTime.getTime() - startTime.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            return Math.max(0, diffHours);
        }
        return 0;
    };

    // Action 1: Add New User
    const createUser = async () => {
        try {
            const uniquePin = await userStorage.generateUniquePin();
            setUserFormData({ name: '', cedula: '', pin: uniquePin, group_id: '' });
            setIsUserDialogOpen(true);
        } catch (error) {
            console.error('Error generating PIN:', error);
            setUserFormData({ name: '', cedula: '', pin: '1234', group_id: '' });
            setIsUserDialogOpen(true);
        }
    };

    const saveUser = async () => {
        if (!userFormData.name || !userFormData.cedula || !userFormData.pin) {
            alert('Please fill all required fields');
            return;
        }

        try {
            setIsLoading(true);
            const id = await userStorage.generateUniqueId();
            await userStorage.saveUser({
                id,
                name: userFormData.name,
                cedula: userFormData.cedula,
                pin: userFormData.pin,
                group_id: userFormData.group_id
            });

            setLastAction(`Created user: ${userFormData.name}`);
            setIsUserDialogOpen(false);
            setUserFormData({ name: '', cedula: '', pin: '', group_id: '' });
            await loadData();
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Error saving user');
        } finally {
            setIsLoading(false);
        }
    };

    // Action 2: Create Schedule
    const createSchedule = async () => {
        try {
            const uniqueScheduleId = await userStorage.generateUniqueScheduleId();
            setScheduleFormData({
                schedule_id: uniqueScheduleId,
                start_hour: '',
                end_hour: '',
                total_hours: 0
            });
            setIsScheduleDialogOpen(true);
        } catch (error) {
            console.error('Error generating schedule ID:', error);
            setScheduleFormData({
                schedule_id: 'SCH-123',
                start_hour: '',
                end_hour: '',
                total_hours: 0
            });
            setIsScheduleDialogOpen(true);
        }
    };

    const saveSchedule = async () => {
        if (!scheduleFormData.start_hour || !scheduleFormData.end_hour) {
            alert('Please fill all required fields');
            return;
        }

        try {
            setIsLoading(true);
            await userStorage.saveSchedule({
                start_hour: scheduleFormData.start_hour,
                end_hour: scheduleFormData.end_hour,
                total_hours: scheduleFormData.total_hours,
                group_id: '' // Schedule created without group initially
            });

            setLastAction(`Created schedule: ${scheduleFormData.schedule_id}`);
            setIsScheduleDialogOpen(false);
            setScheduleFormData({ schedule_id: '', start_hour: '', end_hour: '', total_hours: 0 });
            await loadData();
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Error saving schedule');
        } finally {
            setIsLoading(false);
        }
    };

    // Action 3: Create Group
    const createGroup = async () => {
        setGroupFormData({ group_name: '', hourly_rate: 0 });
        setIsGroupDialogOpen(true);
    };

    const saveGroup = async () => {
        if (!groupFormData.group_name) {
            alert('Please enter group name');
            return;
        }

        try {
            setIsLoading(true);
            const groupId = await userStorage.generateUniqueGroupId();
            await userStorage.saveGroup({
                group_name: groupFormData.group_name,
                group_id: groupId,
                hourly_rate: groupFormData.hourly_rate
            });

            setLastAction(`Created group: ${groupFormData.group_name}`);
            setIsGroupDialogOpen(false);
            setGroupFormData({ group_name: '', hourly_rate: 0 });
            await loadData();
        } catch (error) {
            console.error('Error creating group:', error);
            alert('Error creating group');
        } finally {
            setIsLoading(false);
        }
    };

    // Action 4: Bulk Import Users
    const openBulkImport = () => {
        setBulkImportData('');
        setIsBulkImportDialogOpen(true);
    };

    const processBulkImport = async () => {
        if (!bulkImportData.trim()) {
            alert('Please paste CSV data');
            return;
        }

        try {
            setIsLoading(true);
            const lines = bulkImportData.trim().split('\n');
            let imported = 0;

            for (const line of lines) {
                const [name, cedula, groupId] = line.split(',').map(s => s.trim());
                if (name && cedula) {
                    const id = await userStorage.generateUniqueId();
                    const pin = await userStorage.generateUniquePin();
                    await userStorage.saveUser({
                        id, name, cedula, pin,
                        group_id: groupId || ''
                    });
                    imported++;
                }
            }

            setLastAction(`Imported ${imported} users from CSV`);
            setIsBulkImportDialogOpen(false);
            setBulkImportData('');
            await loadData();
        } catch (error) {
            console.error('Error importing users:', error);
            alert('Error importing users');
        } finally {
            setIsLoading(false);
        }
    };

    // Action 5: Lookup User PIN
    const openPinLookup = () => {
        setPinLookupQuery('');
        setPinLookupResult(null);
        setIsPinLookupDialogOpen(true);
    };

    const searchUserPin = () => {
        const user = users.find(u =>
            u.name.toLowerCase().includes(pinLookupQuery.toLowerCase()) ||
            u.cedula.includes(pinLookupQuery)
        );
        setPinLookupResult(user);
    };

    // Action 6: Mass User Assignment
    const openMassAssign = () => {
        setSelectedUsersForAssign([]);
        setTargetGroupForAssign('');
        setIsMassAssignDialogOpen(true);
    };

    const toggleUserForAssign = (userId: string) => {
        setSelectedUsersForAssign(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const processMassAssign = async () => {
        if (selectedUsersForAssign.length === 0 || !targetGroupForAssign) {
            alert('Please select users and target group');
            return;
        }

        try {
            setIsLoading(true);
            for (const userId of selectedUsersForAssign) {
                const user = users.find(u => u.id === userId);
                if (user) {
                    await userStorage.updateUser(userId, {
                        ...user,
                        group_id: targetGroupForAssign
                    });
                }
            }

            const targetGroup = groups.find(g => g.group_id === targetGroupForAssign);
            setLastAction(`Assigned ${selectedUsersForAssign.length} users to ${targetGroup?.group_name}`);
            setIsMassAssignDialogOpen(false);
            setSelectedUsersForAssign([]);
            setTargetGroupForAssign('');
            await loadData();
        } catch (error) {
            console.error('Error assigning users:', error);
            alert('Error assigning users');
        } finally {
            setIsLoading(false);
        }
    };

    // Action 7: Export User Directory
    const openExport = () => {
        setExportGroupFilter('');
        setIsExportDialogOpen(true);
    };

    const exportUserDirectory = () => {
        const filteredUsers = exportGroupFilter
            ? users.filter(u => u.group_id === exportGroupFilter)
            : users;

        const csvContent = [
            'Name,Cedula,PIN,Group',
            ...filteredUsers.map(user => {
                const group = groups.find(g => g.group_id === user.group_id);
                return `${user.name},${user.cedula},${user.pin},${group?.group_name || 'No Group'}`;
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-directory-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        const groupName = exportGroupFilter
            ? groups.find(g => g.group_id === exportGroupFilter)?.group_name
            : 'All Groups';
        setLastAction(`Exported user directory for ${groupName}`);
        setIsExportDialogOpen(false);
    };

    // Action 8: Assign Schedule to Group
    const openAssignSchedule = () => {
        setScheduleToAssign('');
        setGroupForSchedule('');
        setIsAssignScheduleDialogOpen(true);
    };

    const processAssignSchedule = async () => {
        if (!scheduleToAssign || !groupForSchedule) {
            alert('Please select both schedule and group');
            return;
        }

        try {
            setIsLoading(true);
            const schedule = schedules.find(s => s.schedule_id === scheduleToAssign);
            if (schedule) {
                await userStorage.updateSchedule(schedule.id, {
                    ...schedule,
                    group_id: groupForSchedule
                });

                const group = groups.find(g => g.group_id === groupForSchedule);
                setLastAction(`Assigned schedule ${scheduleToAssign} to group ${group?.group_name}`);
                setIsAssignScheduleDialogOpen(false);
                setScheduleToAssign('');
                setGroupForSchedule('');
                await loadData();
            }
        } catch (error) {
            console.error('Error assigning schedule:', error);
            alert('Error assigning schedule');
        } finally {
            setIsLoading(false);
        }
    };

    const getUnassignedUsers = () => users.filter(user => !user.group_id);
    const getUnassignedSchedules = () => schedules.filter(schedule => !schedule.group_id);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Quick Actions</h1>
                <p className="text-gray-600 mt-2">Perform administrative tasks efficiently</p>
            </div>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Action 1: Add New User */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4" />
                            Add New User
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-gray-600 mb-3">
                            Create user with auto PIN generation
                        </p>
                        <Button onClick={createUser} disabled={isLoading} size="sm" className="w-full">
                            <Plus className="h-3 w-3 mr-1" />
                            Create User
                        </Button>
                    </CardContent>
                </Card>

                {/* Action 2: Create Schedule */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4" />
                            Create Schedule
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-gray-600 mb-3">
                            Create work schedule template
                        </p>
                        <Button onClick={createSchedule} disabled={isLoading} size="sm" className="w-full">
                            <Plus className="h-3 w-3 mr-1" />
                            Create Schedule
                        </Button>
                    </CardContent>
                </Card>

                {/* Action 3: Create Group */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Building className="h-4 w-4" />
                            Create Group
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-gray-600 mb-3">
                            Create group with hourly rate
                        </p>
                        <Button onClick={createGroup} disabled={isLoading} size="sm" className="w-full">
                            <Plus className="h-3 w-3 mr-1" />
                            Create Group
                        </Button>
                    </CardContent>
                </Card>

                {/* Action 4: Bulk Import Users */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <FileUp className="h-4 w-4" />
                            Bulk Import Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-gray-600 mb-3">
                            Import multiple users from CSV
                        </p>
                        <Button onClick={openBulkImport} disabled={isLoading} size="sm" className="w-full">
                            <FileUp className="h-3 w-3 mr-1" />
                            Import CSV
                        </Button>
                    </CardContent>
                </Card>

                {/* Action 5: Lookup User PIN */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Search className="h-4 w-4" />
                            Lookup User PIN
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-gray-600 mb-3">
                            Find user PIN for support
                        </p>
                        <Button onClick={openPinLookup} disabled={isLoading} size="sm" className="w-full">
                            <Search className="h-3 w-3 mr-1" />
                            Lookup PIN
                        </Button>
                    </CardContent>
                </Card>

                {/* Action 6: Mass User Assignment */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <UserCheck className="h-4 w-4" />
                            Mass User Assignment
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-gray-600 mb-3">
                            Assign multiple users to groups
                        </p>
                        <Button onClick={openMassAssign} disabled={isLoading} size="sm" className="w-full">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Assign Users
                        </Button>
                    </CardContent>
                </Card>

                {/* Action 7: Export User Directory */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Download className="h-4 w-4" />
                            Export User Directory
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-gray-600 mb-3">
                            Export user list with PINs
                        </p>
                        <Button onClick={openExport} disabled={isLoading} size="sm" className="w-full">
                            <Download className="h-3 w-3 mr-1" />
                            Export Directory
                        </Button>
                    </CardContent>
                </Card>

                {/* Action 8: Assign Schedule to Group */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <LinkIcon className="h-4 w-4" />
                            Assign Schedule to Group
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-gray-600 mb-3">
                            Link existing schedule to group
                        </p>
                        <Button onClick={openAssignSchedule} disabled={isLoading} size="sm" className="w-full">
                            <LinkIcon className="h-3 w-3 mr-1" />
                            Assign Schedule
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Last Action Status */}
            {lastAction && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-green-600">
                            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                            <span className="text-sm">{lastAction}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Dialog 1: Add New User */}
            <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                            <Input
                                placeholder="Enter full name"
                                value={userFormData.name}
                                onChange={(e) => setUserFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cedula *</label>
                            <Input
                                placeholder="Enter cedula number"
                                value={userFormData.cedula}
                                onChange={(e) => setUserFormData(prev => ({ ...prev, cedula: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">PIN (Auto-generated)</label>
                            <Input
                                value={userFormData.pin}
                                readOnly
                                className="bg-gray-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Group Assignment</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={userFormData.group_id}
                                onChange={(e) => setUserFormData(prev => ({ ...prev, group_id: e.target.value }))}
                            >
                                <option value="">Select a Group (Optional)</option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.group_id}>
                                        {group.group_name} ({group.group_id})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={saveUser} disabled={isLoading}>
                                Create User
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog 2: Create Schedule */}
            <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Schedule</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule ID</label>
                            <Input
                                value={scheduleFormData.schedule_id}
                                readOnly
                                className="bg-gray-50"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                                <Input
                                    type="time"
                                    value={scheduleFormData.start_hour}
                                    onChange={(e) => {
                                        const total_hours = updateScheduleTotalHours(e.target.value, scheduleFormData.end_hour);
                                        setScheduleFormData(prev => ({
                                            ...prev,
                                            start_hour: e.target.value,
                                            total_hours
                                        }));
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                                <Input
                                    type="time"
                                    value={scheduleFormData.end_hour}
                                    onChange={(e) => {
                                        const total_hours = updateScheduleTotalHours(scheduleFormData.start_hour, e.target.value);
                                        setScheduleFormData(prev => ({
                                            ...prev,
                                            end_hour: e.target.value,
                                            total_hours
                                        }));
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Hours</label>
                            <Input
                                value={`${scheduleFormData.total_hours.toFixed(2)} hours`}
                                readOnly
                                className="bg-gray-50"
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={saveSchedule} disabled={isLoading}>
                                Create Schedule
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog 3: Create Group */}
            <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
                            <Input
                                placeholder="Enter group name"
                                value={groupFormData.group_name}
                                onChange={(e) => setGroupFormData(prev => ({ ...prev, group_name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Enter hourly rate (e.g., 15.50)"
                                value={groupFormData.hourly_rate}
                                onChange={(e) => setGroupFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={saveGroup} disabled={isLoading}>
                                Create Group
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog 4: Bulk Import Users */}
            <Dialog open={isBulkImportDialogOpen} onOpenChange={setIsBulkImportDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Bulk Import Users</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CSV Data</label>
                            <p className="text-xs text-gray-600 mb-2">
                                Format: Name, Cedula, Group ID (optional). One user per line.
                            </p>
                            <textarea
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={8}
                                placeholder="John Doe, 12345678, GRP-001&#10;Jane Smith, 87654321, GRP-002"
                                value={bulkImportData}
                                onChange={(e) => setBulkImportData(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setIsBulkImportDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={processBulkImport} disabled={isLoading}>
                                Import Users
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog 5: Lookup User PIN */}
            <Dialog open={isPinLookupDialogOpen} onOpenChange={setIsPinLookupDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Lookup User PIN</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Search User</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter name or cedula"
                                    value={pinLookupQuery}
                                    onChange={(e) => setPinLookupQuery(e.target.value)}
                                />
                                <Button onClick={searchUserPin}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        {pinLookupResult && (
                            <div className="p-4 bg-gray-50 rounded-md">
                                <h3 className="font-medium">{pinLookupResult.name}</h3>
                                <p className="text-sm text-gray-600">Cedula: {pinLookupResult.cedula}</p>
                                <p className="text-lg font-bold text-blue-600">PIN: {pinLookupResult.pin}</p>
                                {pinLookupResult.group_id && (
                                    <p className="text-sm text-gray-600">
                                        Group: {groups.find(g => g.group_id === pinLookupResult.group_id)?.group_name}
                                    </p>
                                )}
                            </div>
                        )}
                        {pinLookupQuery && !pinLookupResult && (
                            <p className="text-sm text-gray-500">No user found matching your search.</p>
                        )}
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setIsPinLookupDialogOpen(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog 6: Mass User Assignment */}
            <Dialog open={isMassAssignDialogOpen} onOpenChange={setIsMassAssignDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Mass User Assignment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Group</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={targetGroupForAssign}
                                onChange={(e) => setTargetGroupForAssign(e.target.value)}
                            >
                                <option value="">Select target group</option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.group_id}>
                                        {group.group_name} ({group.group_id})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Users to Assign ({selectedUsersForAssign.length} selected)
                            </label>
                            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md">
                                {getUnassignedUsers().map((user) => (
                                    <div
                                        key={user.id}
                                        className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${selectedUsersForAssign.includes(user.id) ? 'bg-blue-50 border-blue-200' : ''
                                            }`}
                                        onClick={() => toggleUserForAssign(user.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-medium">{user.name}</span>
                                                <span className="text-sm text-gray-500 ml-2">({user.cedula})</span>
                                            </div>
                                            {selectedUsersForAssign.includes(user.id) && (
                                                <X className="w-4 h-4 text-blue-600" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setIsMassAssignDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={processMassAssign} disabled={isLoading || selectedUsersForAssign.length === 0 || !targetGroupForAssign}>
                                Assign Users
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog 7: Export User Directory */}
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Export User Directory</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Group</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={exportGroupFilter}
                                onChange={(e) => setExportGroupFilter(e.target.value)}
                            >
                                <option value="">All Groups</option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.group_id}>
                                        {group.group_name} ({group.group_id})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="text-sm text-gray-600">
                            Export will include: Name, Cedula, PIN, and Group information
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={exportUserDirectory}>
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog 8: Assign Schedule to Group */}
            <Dialog open={isAssignScheduleDialogOpen} onOpenChange={setIsAssignScheduleDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Schedule to Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Schedule</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={scheduleToAssign}
                                onChange={(e) => setScheduleToAssign(e.target.value)}
                            >
                                <option value="">Select schedule</option>
                                {getUnassignedSchedules().map((schedule) => (
                                    <option key={schedule.id} value={schedule.schedule_id}>
                                        {schedule.schedule_id} ({schedule.start_hour} - {schedule.end_hour})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Group</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={groupForSchedule}
                                onChange={(e) => setGroupForSchedule(e.target.value)}
                            >
                                <option value="">Select group</option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.group_id}>
                                        {group.group_name} ({group.group_id})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setIsAssignScheduleDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={processAssignSchedule} disabled={isLoading || !scheduleToAssign || !groupForSchedule}>
                                Assign Schedule
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
