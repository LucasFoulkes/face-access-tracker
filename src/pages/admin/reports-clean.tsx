import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Users, Building, Download, Target, DollarSign } from 'lucide-react';
import SmartTable from '@/components/SmartTable';
import { userStorage } from '@/services/userStorage';

// Individual Payroll Report Component
function IndividualPayrollDialog({ users, entries, groups, schedules }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [period, setPeriod] = useState('week'); // day, week, month
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [reportData, setReportData] = useState<any[]>([]);

    const generateReport = () => {
        const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const endDate = new Date();

        const filteredEntries = entries.filter((entry: any) => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= startDate && entryDate <= endDate;
        });

        const data = users
            .filter((user: any) => selectedGroup === 'all' || user.group_id === selectedGroup)
            .map((user: any) => {
                const group = groups.find((g: any) => g.group_id === user.group_id);
                const schedule = schedules.find((s: any) => s.schedule_id === group?.schedule_id);
                const hourlyRate = group?.hourly_rate || 0;
                const scheduledHours = schedule?.hours_per_day || 8;

                // Calculate actual hours
                const userEntries = filteredEntries.filter((entry: any) => entry.userId === user.id);
                const dailyEntries: { [key: string]: any[] } = {};
                userEntries.forEach((entry: any) => {
                    const date = new Date(entry.timestamp).toDateString();
                    if (!dailyEntries[date]) dailyEntries[date] = [];
                    dailyEntries[date].push(entry);
                });

                let totalHours = 0;
                Object.values(dailyEntries).forEach((dayEntries: any) => {
                    if (dayEntries.length >= 2) {
                        dayEntries.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                        const diffMs = new Date(dayEntries[dayEntries.length - 1].timestamp).getTime() - new Date(dayEntries[0].timestamp).getTime();
                        totalHours += diffMs / (1000 * 60 * 60);
                    }
                });

                const regularHours = Math.min(totalHours, scheduledHours);
                const extraHours = Math.max(0, totalHours - scheduledHours);
                const regularPay = regularHours * hourlyRate;
                const extraPay = extraHours * hourlyRate * 1.5;
                const totalPay = regularPay + extraPay;

                return {
                    userName: user.name,
                    groupName: group?.group_name || 'No Group',
                    hourlyRate: `$${hourlyRate.toFixed(2)}`,
                    scheduledHours: scheduledHours.toFixed(1),
                    actualHours: totalHours.toFixed(1),
                    regularHours: regularHours.toFixed(1),
                    extraHours: extraHours.toFixed(1),
                    regularPay: `$${regularPay.toFixed(2)}`,
                    extraPay: `$${extraPay.toFixed(2)}`,
                    totalPay: `$${totalPay.toFixed(2)}`
                };
            })
            .sort((a: any, b: any) => parseFloat(b.totalPay.replace('$', '')) - parseFloat(a.totalPay.replace('$', '')));

        setReportData(data);
    };

    const exportCSV = () => {
        if (reportData.length === 0) return;
        const headers = Object.keys(reportData[0]);
        const csv = [headers.join(','), ...reportData.map((row: any) => headers.map(h => row[h]).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `individual-payroll-${period}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Individual Payroll
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-3">
                            Detailed payroll breakdown for each user with regular/overtime hours and compensation.
                        </p>
                        <Button className="w-full">Generate Report</Button>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Individual Payroll Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Period</label>
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="day">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Group</label>
                            <select
                                value={selectedGroup}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="all">All Groups</option>
                                {groups.map((group: any) => (
                                    <option key={group.group_id} value={group.group_id}>
                                        {group.group_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end gap-2">
                            <Button onClick={generateReport} className="flex-1">Generate</Button>
                            {reportData.length > 0 && (
                                <Button onClick={exportCSV} variant="outline">
                                    <Download className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                    {reportData.length > 0 && (
                        <div className="mt-4">
                            <SmartTable data={reportData} />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Group Payroll Report Component
function GroupPayrollDialog({ users, entries, groups, schedules }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [period, setPeriod] = useState('week');
    const [reportData, setReportData] = useState<any[]>([]);

    const generateReport = () => {
        const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const endDate = new Date();

        const filteredEntries = entries.filter((entry: any) => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= startDate && entryDate <= endDate;
        });

        const data = groups.map((group: any) => {
            const groupUsers = users.filter((user: any) => user.group_id === group.group_id);
            const schedule = schedules.find((s: any) => s.schedule_id === group.schedule_id);

            let totalRegularHours = 0;
            let totalExtraHours = 0;
            let totalRegularPay = 0;
            let totalExtraPay = 0;

            groupUsers.forEach((user: any) => {
                const userEntries = filteredEntries.filter((entry: any) => entry.userId === user.id);
                const dailyEntries: { [key: string]: any[] } = {};
                userEntries.forEach((entry: any) => {
                    const date = new Date(entry.timestamp).toDateString();
                    if (!dailyEntries[date]) dailyEntries[date] = [];
                    dailyEntries[date].push(entry);
                });

                let userHours = 0;
                Object.values(dailyEntries).forEach((dayEntries: any) => {
                    if (dayEntries.length >= 2) {
                        dayEntries.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                        const diffMs = new Date(dayEntries[dayEntries.length - 1].timestamp).getTime() - new Date(dayEntries[0].timestamp).getTime();
                        userHours += diffMs / (1000 * 60 * 60);
                    }
                });

                const scheduledHours = schedule?.hours_per_day || 8;
                const regularHours = Math.min(userHours, scheduledHours);
                const extraHours = Math.max(0, userHours - scheduledHours);

                totalRegularHours += regularHours;
                totalExtraHours += extraHours;
                totalRegularPay += regularHours * (group.hourly_rate || 0);
                totalExtraPay += extraHours * (group.hourly_rate || 0) * 1.5;
            });

            return {
                groupName: group.group_name,
                hourlyRate: `$${(group.hourly_rate || 0).toFixed(2)}`,
                userCount: groupUsers.length,
                totalRegularHours: totalRegularHours.toFixed(1),
                totalExtraHours: totalExtraHours.toFixed(1),
                totalRegularPay: `$${totalRegularPay.toFixed(2)}`,
                totalExtraPay: `$${totalExtraPay.toFixed(2)}`,
                totalPay: `$${(totalRegularPay + totalExtraPay).toFixed(2)}`
            };
        }).sort((a: any, b: any) => parseFloat(b.totalPay.replace('$', '')) - parseFloat(a.totalPay.replace('$', '')));

        setReportData(data);
    };

    const exportCSV = () => {
        if (reportData.length === 0) return;
        const headers = Object.keys(reportData[0]);
        const csv = [headers.join(','), ...reportData.map((row: any) => headers.map(h => row[h]).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `group-payroll-${period}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            Group Payroll
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-3">
                            Payroll totals aggregated by group with user counts and total compensation.
                        </p>
                        <Button className="w-full">Generate Report</Button>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Group Payroll Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Period</label>
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="day">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>
                        </div>
                        <div className="flex items-end gap-2">
                            <Button onClick={generateReport} className="flex-1">Generate</Button>
                            {reportData.length > 0 && (
                                <Button onClick={exportCSV} variant="outline">
                                    <Download className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                    {reportData.length > 0 && (
                        <div className="mt-4">
                            <SmartTable data={reportData} />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Payroll Summary Report Component
function PayrollSummaryDialog({ users, entries, groups }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [period, setPeriod] = useState('week');
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [summary, setSummary] = useState<any>(null);

    const generateSummary = () => {
        const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const endDate = new Date();

        const filteredEntries = entries.filter((entry: any) => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= startDate && entryDate <= endDate;
        });

        const filteredUsers = users.filter((user: any) =>
            selectedGroup === 'all' || user.group_id === selectedGroup
        );

        let totalRegularPay = 0;
        let totalExtraPay = 0;
        let totalHours = 0;
        let usersWithHours = 0;

        filteredUsers.forEach((user: any) => {
            const group = groups.find((g: any) => g.group_id === user.group_id);
            const hourlyRate = group?.hourly_rate || 0;

            const userEntries = filteredEntries.filter((entry: any) => entry.userId === user.id);
            const dailyEntries: { [key: string]: any[] } = {};
            userEntries.forEach((entry: any) => {
                const date = new Date(entry.timestamp).toDateString();
                if (!dailyEntries[date]) dailyEntries[date] = [];
                dailyEntries[date].push(entry);
            });

            let userHours = 0;
            Object.values(dailyEntries).forEach((dayEntries: any) => {
                if (dayEntries.length >= 2) {
                    dayEntries.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                    const diffMs = new Date(dayEntries[dayEntries.length - 1].timestamp).getTime() - new Date(dayEntries[0].timestamp).getTime();
                    userHours += diffMs / (1000 * 60 * 60);
                }
            });

            if (userHours > 0) usersWithHours++;
            totalHours += userHours;

            const scheduledHours = 8; // Default
            const regularHours = Math.min(userHours, scheduledHours);
            const extraHours = Math.max(0, userHours - scheduledHours);

            totalRegularPay += regularHours * hourlyRate;
            totalExtraPay += extraHours * hourlyRate * 1.5;
        });

        setSummary({
            period,
            selectedGroup: selectedGroup === 'all' ? 'All Groups' : groups.find((g: any) => g.group_id === selectedGroup)?.group_name,
            totalUsers: filteredUsers.length,
            usersWithHours,
            totalHours: totalHours.toFixed(1),
            totalRegularPay: totalRegularPay.toFixed(2),
            totalExtraPay: totalExtraPay.toFixed(2),
            totalPayroll: (totalRegularPay + totalExtraPay).toFixed(2),
            avgHoursPerUser: usersWithHours > 0 ? (totalHours / usersWithHours).toFixed(1) : '0.0',
            avgPayPerUser: usersWithHours > 0 ? ((totalRegularPay + totalExtraPay) / usersWithHours).toFixed(2) : '0.00'
        });
    };

    const exportSummary = () => {
        if (!summary) return;
        const csv = Object.entries(summary).map(([key, value]) => `${key},${value}`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll-summary-${period}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Payroll Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-3">
                            High-level payroll statistics and totals for any time period and group.
                        </p>
                        <Button className="w-full">Generate Summary</Button>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Payroll Summary</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Period</label>
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="day">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Group</label>
                            <select
                                value={selectedGroup}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="all">All Groups</option>
                                {groups.map((group: any) => (
                                    <option key={group.group_id} value={group.group_id}>
                                        {group.group_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end gap-2">
                            <Button onClick={generateSummary} className="flex-1">Generate</Button>
                            {summary && (
                                <Button onClick={exportSummary} variant="outline">
                                    <Download className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                    {summary && (
                        <div className="grid grid-cols-2 gap-6 mt-6">
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg">Overview</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Period:</span>
                                        <span className="font-medium">{summary.period}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Group:</span>
                                        <span className="font-medium">{summary.selectedGroup}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Total Users:</span>
                                        <span className="font-medium">{summary.totalUsers}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Users with Hours:</span>
                                        <span className="font-medium">{summary.usersWithHours}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Total Hours:</span>
                                        <span className="font-medium">{summary.totalHours}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg">Payroll</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Regular Pay:</span>
                                        <span className="font-medium text-green-600">${summary.totalRegularPay}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Overtime Pay:</span>
                                        <span className="font-medium text-blue-600">${summary.totalExtraPay}</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-2">
                                        <span className="font-semibold">Total Payroll:</span>
                                        <span className="font-bold text-green-700">${summary.totalPayroll}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Avg Hours/User:</span>
                                        <span className="font-medium">{summary.avgHoursPerUser}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Avg Pay/User:</span>
                                        <span className="font-medium">${summary.avgPayPerUser}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function Reports() {
    const [users, setUsers] = useState<any[]>([]);
    const [entries, setEntries] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

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

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg">Loading data...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Payroll Reports</h1>
                <p className="text-gray-600 mt-2">Generate custom payroll reports with flexible parameters</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{groups.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{entries.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Hourly Rate</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${groups.length > 0 ?
                                (groups.reduce((sum, g) => sum + (g.hourly_rate || 0), 0) / groups.length).toFixed(2) :
                                '0.00'
                            }
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Modular Report Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <IndividualPayrollDialog
                    users={users}
                    entries={entries}
                    groups={groups}
                    schedules={schedules}
                />
                <GroupPayrollDialog
                    users={users}
                    entries={entries}
                    groups={groups}
                    schedules={schedules}
                />
                <PayrollSummaryDialog
                    users={users}
                    entries={entries}
                    groups={groups}
                />
            </div>
        </div>
    );
}
