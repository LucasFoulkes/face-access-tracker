import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Building, Download, Target, Calendar, Filter } from 'lucide-react';
import SmartTable from '@/components/SmartTable';
import { userStorage } from '@/services/userStorage';

// Individual Payroll Report Component
function IndividualPayrollDialog({ users, entries, groups, schedules }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [selectedUser, setSelectedUser] = useState('all');
    const [reportData, setReportData] = useState<any[]>([]);

    // Initialize dates when dialog opens
    useEffect(() => {
        if (isOpen && !startDate) {
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            setStartDate(weekAgo.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
        }
    }, [isOpen]);

    const setQuickRange = (days: number) => {
        const end = new Date();
        const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const generateReport = () => {
        if (!startDate || !endDate) {
            alert('Please select start and end dates');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filteredEntries = entries.filter((entry: any) => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= start && entryDate <= end;
        });

        let filteredUsers = users;
        if (selectedGroup !== 'all') {
            filteredUsers = filteredUsers.filter((user: any) => user.group_id === selectedGroup);
        }
        if (selectedUser !== 'all') {
            filteredUsers = filteredUsers.filter((user: any) => user.id === selectedUser);
        }

        const data = filteredUsers.map((user: any) => {
            const group = groups.find((g: any) => g.group_id === user.group_id);
            const schedule = schedules.find((s: any) => s.schedule_id === group?.schedule_id);
            const hourlyRate = group?.hourly_rate || 0;
            const scheduledHoursPerDay = schedule?.hours_per_day || 8;

            // Calculate hours per day
            const userEntries = filteredEntries.filter((entry: any) => entry.userId === user.id);
            const dailyEntries: { [key: string]: any[] } = {};
            userEntries.forEach((entry: any) => {
                const date = new Date(entry.timestamp).toDateString();
                if (!dailyEntries[date]) dailyEntries[date] = [];
                dailyEntries[date].push(entry);
            });

            let totalActualHours = 0;
            let totalRegularHours = 0;
            let totalExtraHours = 0;
            let daysWorked = 0;

            Object.values(dailyEntries).forEach((dayEntries: any) => {
                if (dayEntries.length >= 2) {
                    daysWorked++;
                    dayEntries.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                    const diffMs = new Date(dayEntries[dayEntries.length - 1].timestamp).getTime() - new Date(dayEntries[0].timestamp).getTime();
                    const dailyHours = diffMs / (1000 * 60 * 60);

                    totalActualHours += dailyHours;
                    const dailyRegularHours = Math.min(dailyHours, scheduledHoursPerDay);
                    const dailyExtraHours = Math.max(0, dailyHours - scheduledHoursPerDay);
                    totalRegularHours += dailyRegularHours;
                    totalExtraHours += dailyExtraHours;
                }
            });

            const regularPay = totalRegularHours * hourlyRate;
            const extraPay = totalExtraHours * hourlyRate * 1.5;
            const totalPay = regularPay + extraPay;

            return {
                User: user.name,
                Group: group?.group_name || 'No Group',
                'Days Worked': daysWorked,
                'Hours/Day': scheduledHoursPerDay.toFixed(1),
                'Total Hours': totalActualHours.toFixed(1),
                'Regular Hours': totalRegularHours.toFixed(1),
                'Overtime Hours': totalExtraHours.toFixed(1),
                'Hourly Rate': `$${hourlyRate.toFixed(2)}`,
                'Regular Pay': `$${regularPay.toFixed(2)}`,
                'Overtime Pay': `$${extraPay.toFixed(2)}`,
                'Total Pay': `$${totalPay.toFixed(2)}`
            };
        }).sort((a: any, b: any) => parseFloat(b['Total Pay'].replace('$', '')) - parseFloat(a['Total Pay'].replace('$', '')));

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
        a.download = `individual-payroll-${startDate}-to-${endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filteredUsersForDropdown = users.filter((user: any) =>
        selectedGroup === 'all' || user.group_id === selectedGroup
    );

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            Individual Payroll
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-4">
                            View detailed payroll for specific users with custom date ranges and filters.
                        </p>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700">
                            <Calendar className="h-4 w-4 mr-2" />
                            Open Report
                        </Button>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">Individual Payroll Report</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Filters Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                Filters & Date Range
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Quick Date Buttons */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Quick Select:</label>
                                <div className="flex gap-2 flex-wrap">
                                    <Button size="sm" variant="outline" onClick={() => setQuickRange(1)}>
                                        Today
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setQuickRange(7)}>
                                        Last 7 Days
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setQuickRange(30)}>
                                        Last 30 Days
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setQuickRange(90)}>
                                        Last 3 Months
                                    </Button>
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Group and User Filters */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Group</label>
                                    <select
                                        value={selectedGroup}
                                        onChange={(e) => {
                                            setSelectedGroup(e.target.value);
                                            setSelectedUser('all'); // Reset user selection when group changes
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All Groups</option>
                                        {groups.map((group: any) => (
                                            <option key={group.group_id} value={group.group_id}>
                                                {group.group_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">User</label>
                                    <select
                                        value={selectedUser}
                                        onChange={(e) => setSelectedUser(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All Users</option>
                                        {filteredUsersForDropdown.map((user: any) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Generate Button */}
                            <div className="flex gap-2">
                                <Button onClick={generateReport} className="bg-green-600 hover:bg-green-700">
                                    Generate Report
                                </Button>
                                {reportData.length > 0 && (
                                    <Button onClick={exportCSV} variant="outline">
                                        <Download className="h-4 w-4 mr-2" />
                                        Export CSV
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Results */}
                    {reportData.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Results ({reportData.length} users)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SmartTable data={reportData} />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Group Payroll Report Component
function GroupPayrollDialog({ users, entries, groups, schedules }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportData, setReportData] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && !startDate) {
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            setStartDate(weekAgo.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
        }
    }, [isOpen]);

    const setQuickRange = (days: number) => {
        const end = new Date();
        const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const generateReport = () => {
        if (!startDate || !endDate) {
            alert('Please select start and end dates');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filteredEntries = entries.filter((entry: any) => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= start && entryDate <= end;
        });

        const data = groups.map((group: any) => {
            const groupUsers = users.filter((user: any) => user.group_id === group.group_id);
            const schedule = schedules.find((s: any) => s.schedule_id === group.schedule_id);

            let totalRegularHours = 0;
            let totalExtraHours = 0;

            groupUsers.forEach((user: any) => {
                const userEntries = filteredEntries.filter((entry: any) => entry.userId === user.id);
                const dailyEntries: { [key: string]: any[] } = {};
                userEntries.forEach((entry: any) => {
                    const date = new Date(entry.timestamp).toDateString();
                    if (!dailyEntries[date]) dailyEntries[date] = [];
                    dailyEntries[date].push(entry);
                });

                Object.values(dailyEntries).forEach((dayEntries: any) => {
                    if (dayEntries.length >= 2) {
                        dayEntries.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                        const diffMs = new Date(dayEntries[dayEntries.length - 1].timestamp).getTime() - new Date(dayEntries[0].timestamp).getTime();
                        const dailyHours = diffMs / (1000 * 60 * 60);

                        const scheduledHoursPerDay = schedule?.hours_per_day || 8;
                        const dailyRegularHours = Math.min(dailyHours, scheduledHoursPerDay);
                        const dailyExtraHours = Math.max(0, dailyHours - scheduledHoursPerDay);

                        totalRegularHours += dailyRegularHours;
                        totalExtraHours += dailyExtraHours;
                    }
                });
            });

            const regularPay = totalRegularHours * (group.hourly_rate || 0);
            const extraPay = totalExtraHours * (group.hourly_rate || 0) * 1.5;
            const totalPay = regularPay + extraPay;

            return {
                'Group': group.group_name,
                'Users': groupUsers.length,
                'Hourly Rate': `$${(group.hourly_rate || 0).toFixed(2)}`,
                'Regular Hours': totalRegularHours.toFixed(1),
                'Overtime Hours': totalExtraHours.toFixed(1),
                'Total Hours': (totalRegularHours + totalExtraHours).toFixed(1),
                'Regular Pay': `$${regularPay.toFixed(2)}`,
                'Overtime Pay': `$${extraPay.toFixed(2)}`,
                'Total Pay': `$${totalPay.toFixed(2)}`
            };
        }).sort((a: any, b: any) => parseFloat(b['Total Pay'].replace('$', '')) - parseFloat(a['Total Pay'].replace('$', '')));

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
        a.download = `group-payroll-${startDate}-to-${endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5 text-green-600" />
                            Group Payroll
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-4">
                            View payroll totals aggregated by group with custom date ranges.
                        </p>
                        <Button className="w-full bg-green-600 hover:bg-green-700">
                            <Calendar className="h-4 w-4 mr-2" />
                            Open Report
                        </Button>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">Group Payroll Report</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Filters Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                Date Range
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Quick Date Buttons */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Quick Select:</label>
                                <div className="flex gap-2 flex-wrap">
                                    <Button size="sm" variant="outline" onClick={() => setQuickRange(1)}>Today</Button>
                                    <Button size="sm" variant="outline" onClick={() => setQuickRange(7)}>Last 7 Days</Button>
                                    <Button size="sm" variant="outline" onClick={() => setQuickRange(30)}>Last 30 Days</Button>
                                    <Button size="sm" variant="outline" onClick={() => setQuickRange(90)}>Last 3 Months</Button>
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            {/* Generate Button */}
                            <div className="flex gap-2">
                                <Button onClick={generateReport} className="bg-green-600 hover:bg-green-700">
                                    Generate Report
                                </Button>
                                {reportData.length > 0 && (
                                    <Button onClick={exportCSV} variant="outline">
                                        <Download className="h-4 w-4 mr-2" />
                                        Export CSV
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Results */}
                    {reportData.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Results ({reportData.length} groups)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SmartTable data={reportData} />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Payroll Summary Component
function PayrollSummaryDialog({ users, entries, groups }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [summary, setSummary] = useState<any>(null);

    useEffect(() => {
        if (isOpen && !startDate) {
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            setStartDate(weekAgo.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
        }
    }, [isOpen]);

    const setQuickRange = (days: number) => {
        const end = new Date();
        const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const generateSummary = () => {
        if (!startDate || !endDate) {
            alert('Please select start and end dates');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filteredEntries = entries.filter((entry: any) => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= start && entryDate <= end;
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

            let userTotalHours = 0;
            let userRegularHours = 0;
            let userExtraHours = 0;

            Object.values(dailyEntries).forEach((dayEntries: any) => {
                if (dayEntries.length >= 2) {
                    dayEntries.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                    const diffMs = new Date(dayEntries[dayEntries.length - 1].timestamp).getTime() - new Date(dayEntries[0].timestamp).getTime();
                    const dailyHours = diffMs / (1000 * 60 * 60);

                    userTotalHours += dailyHours;
                    const scheduledHoursPerDay = 8;
                    const dailyRegularHours = Math.min(dailyHours, scheduledHoursPerDay);
                    const dailyExtraHours = Math.max(0, dailyHours - scheduledHoursPerDay);

                    userRegularHours += dailyRegularHours;
                    userExtraHours += dailyExtraHours;
                }
            });

            if (userTotalHours > 0) usersWithHours++;
            totalHours += userTotalHours;
            totalRegularPay += userRegularHours * hourlyRate;
            totalExtraPay += userExtraHours * hourlyRate * 1.5;
        });

        setSummary({
            dateRange: `${startDate} to ${endDate}`,
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
        a.download = `payroll-summary-${startDate}-to-${endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-purple-600" />
                            Payroll Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-4">
                            High-level payroll statistics and totals with custom filters.
                        </p>
                        <Button className="w-full bg-purple-600 hover:bg-purple-700">
                            <Calendar className="h-4 w-4 mr-2" />
                            Open Summary
                        </Button>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="text-xl">Payroll Summary</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Filters Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                Filters & Date Range
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Quick Date Buttons */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Quick Select:</label>
                                <div className="flex gap-2 flex-wrap">
                                    <Button size="sm" variant="outline" onClick={() => setQuickRange(1)}>Today</Button>
                                    <Button size="sm" variant="outline" onClick={() => setQuickRange(7)}>Last 7 Days</Button>
                                    <Button size="sm" variant="outline" onClick={() => setQuickRange(30)}>Last 30 Days</Button>
                                    <Button size="sm" variant="outline" onClick={() => setQuickRange(90)}>Last 3 Months</Button>
                                </div>
                            </div>

                            {/* Date and Group Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Group</label>
                                    <select
                                        value={selectedGroup}
                                        onChange={(e) => setSelectedGroup(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="all">All Groups</option>
                                        {groups.map((group: any) => (
                                            <option key={group.group_id} value={group.group_id}>
                                                {group.group_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Generate Button */}
                            <div className="flex gap-2">
                                <Button onClick={generateSummary} className="bg-purple-600 hover:bg-purple-700">
                                    Generate Summary
                                </Button>
                                {summary && (
                                    <Button onClick={exportSummary} variant="outline">
                                        <Download className="h-4 w-4 mr-2" />
                                        Export CSV
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary Results */}
                    {summary && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Summary Results</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg border-b pb-2">Overview</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between py-1">
                                                <span className="text-gray-600">Date Range:</span>
                                                <span className="font-medium">{summary.dateRange}</span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span className="text-gray-600">Group:</span>
                                                <span className="font-medium">{summary.selectedGroup}</span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span className="text-gray-600">Total Users:</span>
                                                <span className="font-medium">{summary.totalUsers}</span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span className="text-gray-600">Users with Hours:</span>
                                                <span className="font-medium">{summary.usersWithHours}</span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span className="text-gray-600">Total Hours:</span>
                                                <span className="font-medium">{summary.totalHours}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg border-b pb-2">Payroll</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between py-1">
                                                <span className="text-gray-600">Regular Pay:</span>
                                                <span className="font-medium text-green-600">${summary.totalRegularPay}</span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span className="text-gray-600">Overtime Pay:</span>
                                                <span className="font-medium text-blue-600">${summary.totalExtraPay}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-t font-semibold">
                                                <span>Total Payroll:</span>
                                                <span className="text-green-700 text-lg">${summary.totalPayroll}</span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span className="text-gray-600">Avg Hours/User:</span>
                                                <span className="font-medium">{summary.avgHoursPerUser}</span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span className="text-gray-600">Avg Pay/User:</span>
                                                <span className="font-medium">${summary.avgPayPerUser}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
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
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900">Payroll Reports</h1>
                <p className="text-xl text-gray-600 mt-2">
                    Generate detailed payroll reports with custom date ranges and filters
                </p>
            </div>

            {/* Report Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
