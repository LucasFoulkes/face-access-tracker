import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Users, Building, TrendingUp, Download, Target, Plus, Minus } from 'lucide-react';
import SmartTable from '@/components/SmartTable';
import { userStorage } from '@/services/userStorage';

export default function Reports() {
    const [users, setUsers] = useState<any[]>([]);
    const [entries, setEntries] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
        endDate: new Date().toISOString().split('T')[0] // today
    });
    const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

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

    // Filter entries by date range
    const getFilteredEntries = () => {
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);

        return entries.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= startDate && entryDate <= endDate;
        });
    };

    // Calculate hours worked for a user
    const calculateUserHours = (userId: string, filteredEntries: any[]) => {
        const userEntries = filteredEntries.filter(entry => entry.userId === userId);

        const dailyEntries: { [key: string]: any[] } = {};
        userEntries.forEach(entry => {
            const date = new Date(entry.timestamp).toDateString();
            if (!dailyEntries[date]) dailyEntries[date] = [];
            dailyEntries[date].push(entry);
        });

        let totalHours = 0;
        Object.values(dailyEntries).forEach(dayEntries => {
            if (dayEntries.length >= 2) {
                dayEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                const firstEntry = dayEntries[0];
                const lastEntry = dayEntries[dayEntries.length - 1];
                const diffMs = new Date(lastEntry.timestamp).getTime() - new Date(firstEntry.timestamp).getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                totalHours += diffHours;
            }
        });

        return totalHours;
    };

    // Individual Payroll Report
    const getIndividualPayrollReport = () => {
        const filteredEntries = getFilteredEntries();

        return users
            .filter(user => selectedGroupId === 'all' || user.group_id === selectedGroupId)
            .map(user => {
                const group = groups.find(g => g.group_id === user.group_id);
                const schedule = schedules.find(s => s.schedule_id === group?.schedule_id);
                const hourlyRate = group?.hourly_rate || 0;
                const scheduledHours = schedule?.hours_per_day || 8;
                const actualHours = calculateUserHours(user.id, filteredEntries);

                const regularHours = Math.min(actualHours, scheduledHours);
                const extraHours = Math.max(0, actualHours - scheduledHours);
                const deficitHours = Math.max(0, scheduledHours - actualHours);

                const regularPay = regularHours * hourlyRate;
                const extraPay = extraHours * hourlyRate * 1.5; // 1.5x for overtime
                const totalPay = regularPay + extraPay;

                return {
                    userId: user.id,
                    userName: user.name,
                    groupName: group?.group_name || 'No Group',
                    hourlyRate: hourlyRate.toFixed(2),
                    scheduledHours: scheduledHours.toFixed(2),
                    actualHours: actualHours.toFixed(2),
                    regularHours: regularHours.toFixed(2),
                    extraHours: extraHours.toFixed(2),
                    deficitHours: deficitHours.toFixed(2),
                    regularPay: regularPay.toFixed(2),
                    extraPay: extraPay.toFixed(2),
                    totalPay: totalPay.toFixed(2)
                };
            })
            .sort((a, b) => parseFloat(b.totalPay) - parseFloat(a.totalPay));
    };

    // Group Payroll Report
    const getGroupPayrollReport = () => {
        const filteredEntries = getFilteredEntries();

        return groups
            .filter(group => selectedGroupId === 'all' || group.group_id === selectedGroupId)
            .map(group => {
                const groupUsers = users.filter(user => user.group_id === group.group_id);
                const schedule = schedules.find(s => s.schedule_id === group.schedule_id);

                let totalRegularHours = 0;
                let totalExtraHours = 0;
                let totalRegularPay = 0;
                let totalExtraPay = 0;

                groupUsers.forEach(user => {
                    const actualHours = calculateUserHours(user.id, filteredEntries);
                    const scheduledHours = schedule?.hours_per_day || 8;
                    const regularHours = Math.min(actualHours, scheduledHours);
                    const extraHours = Math.max(0, actualHours - scheduledHours);

                    totalRegularHours += regularHours;
                    totalExtraHours += extraHours;
                    totalRegularPay += regularHours * (group.hourly_rate || 0);
                    totalExtraPay += extraHours * (group.hourly_rate || 0) * 1.5;
                });

                return {
                    groupId: group.group_id,
                    groupName: group.group_name,
                    hourlyRate: (group.hourly_rate || 0).toFixed(2),
                    userCount: groupUsers.length,
                    totalRegularHours: totalRegularHours.toFixed(2),
                    totalExtraHours: totalExtraHours.toFixed(2),
                    totalRegularPay: totalRegularPay.toFixed(2),
                    totalExtraPay: totalExtraPay.toFixed(2),
                    totalPay: (totalRegularPay + totalExtraPay).toFixed(2)
                };
            })
            .sort((a, b) => parseFloat(b.totalPay) - parseFloat(a.totalPay));
    };

    // Payroll Summary
    const getPayrollSummary = () => {
        const individualReport = getIndividualPayrollReport();
        const groupReport = getGroupPayrollReport();

        const totalUsers = individualReport.length;
        const totalRegularPay = individualReport.reduce((sum, user) => sum + parseFloat(user.regularPay), 0);
        const totalExtraPay = individualReport.reduce((sum, user) => sum + parseFloat(user.extraPay), 0);
        const totalPayroll = totalRegularPay + totalExtraPay;
        const totalHours = individualReport.reduce((sum, user) => sum + parseFloat(user.actualHours), 0);

        return {
            totalUsers,
            totalRegularPay: totalRegularPay.toFixed(2),
            totalExtraPay: totalExtraPay.toFixed(2),
            totalPayroll: totalPayroll.toFixed(2),
            totalHours: totalHours.toFixed(2),
            avgPayPerUser: totalUsers > 0 ? (totalPayroll / totalUsers).toFixed(2) : '0.00',
            activeGroups: groupReport.filter(group => parseFloat(group.totalPay) > 0).length,
            dateRange: `${dateRange.startDate} to ${dateRange.endDate}`
        };
    };

    // Export to CSV
    const exportToCSV = (data: any[], filename: string) => {
        if (data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header =>
                typeof row[header] === 'string' && row[header].includes(',')
                    ? `"${row[header]}"`
                    : row[header]
            ).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Set quick date ranges
    const setQuickRange = (days: number) => {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
        setDateRange({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        });
    };

    const individualPayroll = getIndividualPayrollReport();
    const groupPayroll = getGroupPayrollReport();
    const payrollSummary = getPayrollSummary();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg">Loading payroll data...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Payroll Reports</h1>
                <p className="text-gray-600 mt-2">Calculate compensation based on scheduled vs actual hours worked</p>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters & Date Range</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Quick Range</label>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => setQuickRange(1)}>Today</Button>
                                <Button size="sm" variant="outline" onClick={() => setQuickRange(7)}>Week</Button>
                                <Button size="sm" variant="outline" onClick={() => setQuickRange(30)}>Month</Button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Start Date</label>
                            <input
                                type="date"
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">End Date</label>
                            <input
                                type="date"
                                value={dateRange.endDate}
                                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Group</label>
                            <select
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="all">All Groups</option>
                                {groups.map(group => (
                                    <option key={group.group_id} value={group.group_id}>
                                        {group.group_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button onClick={loadData} className="w-full">
                                Refresh Data
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">${payrollSummary.totalPayroll}</div>
                        <p className="text-xs text-muted-foreground">
                            Regular: ${payrollSummary.totalRegularPay} | Extra: ${payrollSummary.totalExtraPay}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{payrollSummary.totalHours}</div>
                        <p className="text-xs text-muted-foreground">Across all users</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{payrollSummary.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">In selected range</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Pay/User</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${payrollSummary.avgPayPerUser}</div>
                        <p className="text-xs text-muted-foreground">{payrollSummary.dateRange}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Report Cards Grid - Modular Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Individual Payroll Report */}
                <Dialog>
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
                                    View detailed payroll breakdown for each user including regular hours, overtime, and total compensation.
                                </p>
                                <Button className="w-full">View Report</Button>
                            </CardContent>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center justify-between">
                                Individual Payroll Report
                                <Button
                                    onClick={() => exportToCSV(individualPayroll, 'individual-payroll')}
                                    size="sm"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Export CSV
                                </Button>
                            </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                            <SmartTable data={individualPayroll} />
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Group Payroll Report */}
                <Dialog>
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
                                    View payroll totals aggregated by group including user counts and total compensation.
                                </p>
                                <Button className="w-full">View Report</Button>
                            </CardContent>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center justify-between">
                                Group Payroll Report
                                <Button
                                    onClick={() => exportToCSV(groupPayroll, 'group-payroll')}
                                    size="sm"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Export CSV
                                </Button>
                            </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                            <SmartTable data={groupPayroll} />
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Payroll Summary */}
                <Dialog>
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
                                    High-level payroll statistics and totals for the selected time period.
                                </p>
                                <Button className="w-full">View Summary</Button>
                            </CardContent>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center justify-between">
                                Payroll Summary
                                <Button
                                    onClick={() => exportToCSV([payrollSummary], 'payroll-summary')}
                                    size="sm"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Export CSV
                                </Button>
                            </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <h3 className="font-semibold">Totals</h3>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span>Total Users:</span>
                                            <span className="font-medium">{payrollSummary.totalUsers}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Total Hours:</span>
                                            <span className="font-medium">{payrollSummary.totalHours}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Active Groups:</span>
                                            <span className="font-medium">{payrollSummary.activeGroups}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-semibold">Compensation</h3>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span>Regular Pay:</span>
                                            <span className="font-medium text-green-600">${payrollSummary.totalRegularPay}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Extra Pay:</span>
                                            <span className="font-medium text-blue-600">${payrollSummary.totalExtraPay}</span>
                                        </div>
                                        <div className="flex justify-between border-t pt-1">
                                            <span className="font-semibold">Total Payroll:</span>
                                            <span className="font-bold text-green-700">${payrollSummary.totalPayroll}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <div className="flex justify-between text-sm">
                                    <span>Average Pay per User:</span>
                                    <span className="font-medium">${payrollSummary.avgPayPerUser}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span>Date Range:</span>
                                    <span className="font-medium">{payrollSummary.dateRange}</span>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
}
