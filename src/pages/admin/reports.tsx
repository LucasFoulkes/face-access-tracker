import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Users, Building, Download, Target } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import SmartTable from '@/components/SmartTable';
import { userStorage } from '@/services/userStorage';

// Calendar Date Picker Component
function CalendarDatePicker({ date, onDateChange, label }: { date: Date; onDateChange: (date: Date) => void; label: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(date, 'MMM dd, yyyy')}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(selectedDate) => {
                            if (selectedDate) {
                                onDateChange(selectedDate);
                                setIsOpen(false);
                            }
                        }}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}

// Week Picker Component
function WeekPicker({ onWeekSelect }: { onWeekSelect: (startDate: Date, endDate: Date) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const handleWeekSelect = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date);
            const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
            const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
            onWeekSelect(weekStart, weekEnd);
            setIsOpen(false);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                    Pick Week
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3">
                    <div className="text-sm font-medium mb-2">Select a week</div>
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleWeekSelect}
                        initialFocus
                    />
                    <div className="text-xs text-gray-500 mt-2">
                        Week: {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM dd')} - {format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM dd, yyyy')}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

// Month Picker Component
function MonthPicker({ onMonthSelect }: { onMonthSelect: (startDate: Date, endDate: Date) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const handleMonthSelect = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date);
            const monthStart = startOfMonth(date);
            const monthEnd = endOfMonth(date);
            onMonthSelect(monthStart, monthEnd);
            setIsOpen(false);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                    Pick Month
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3">
                    <div className="text-sm font-medium mb-2">Select a month</div>
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleMonthSelect}
                        initialFocus
                    />
                    <div className="text-xs text-gray-500 mt-2">
                        Month: {format(selectedDate, 'MMMM yyyy')}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

// Individual Payroll Report Component
function IndividualPayrollDialog({ users, entries, groups, schedules }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState(new Date());
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [selectedUser, setSelectedUser] = useState('all');
    const [reportData, setReportData] = useState<any[]>([]);

    const setQuickRange = (days: number) => {
        const end = new Date();
        const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
        setStartDate(start);
        setEndDate(end);
    };

    // Get filtered users based on group selection
    const getFilteredUsers = () => {
        return users.filter((user: any) => selectedGroup === 'all' || user.group_id === selectedGroup);
    };

    const generateReport = () => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filteredEntries = entries.filter((entry: any) => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= start && entryDate <= end;
        });

        const filteredUsers = users
            .filter((user: any) => selectedGroup === 'all' || user.group_id === selectedGroup)
            .filter((user: any) => selectedUser === 'all' || user.id === selectedUser);

        const data = filteredUsers.map((user: any) => {
            const group = groups.find((g: any) => g.group_id === user.group_id);
            const schedule = schedules.find((s: any) => s.schedule_id === group?.schedule_id);
            const hourlyRate = group?.hourly_rate || 0;
            const scheduledHoursPerDay = schedule?.hours_per_day || 8;

            // Calculate actual hours worked per day
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

            // Calculate for each day
            Object.values(dailyEntries).forEach((dayEntries: any) => {
                if (dayEntries.length >= 2) {
                    daysWorked++;
                    dayEntries.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                    const diffMs = new Date(dayEntries[dayEntries.length - 1].timestamp).getTime() - new Date(dayEntries[0].timestamp).getTime();
                    const dailyHours = diffMs / (1000 * 60 * 60);

                    totalActualHours += dailyHours;

                    // Calculate regular vs extra hours for this day
                    const dailyRegularHours = Math.min(dailyHours, scheduledHoursPerDay);
                    const dailyExtraHours = Math.max(0, dailyHours - scheduledHoursPerDay);

                    totalRegularHours += dailyRegularHours;
                    totalExtraHours += dailyExtraHours;
                }
            });

            const totalScheduledHours = daysWorked * scheduledHoursPerDay;
            const regularPay = totalRegularHours * hourlyRate;
            const extraPay = totalExtraHours * hourlyRate * 1.5; // 1.5x for overtime
            const totalPay = regularPay + extraPay;

            return {
                userName: user.name,
                groupName: group?.group_name || 'No Group',
                hourlyRate: `$${hourlyRate.toFixed(2)}`,
                daysWorked,
                scheduledHoursPerDay: scheduledHoursPerDay.toFixed(1),
                totalScheduledHours: totalScheduledHours.toFixed(1),
                actualHours: totalActualHours.toFixed(1),
                regularHours: totalRegularHours.toFixed(1),
                extraHours: totalExtraHours.toFixed(1),
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
        a.download = `individual-payroll-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.csv`;
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
                    {/* Date Range Selection */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <CalendarDatePicker
                            date={startDate}
                            onDateChange={setStartDate}
                            label="Start Date"
                        />
                        <CalendarDatePicker
                            date={endDate}
                            onDateChange={setEndDate}
                            label="End Date"
                        />
                        <div>
                            <label className="block text-sm font-medium mb-1">Group</label>
                            <select
                                value={selectedGroup}
                                onChange={(e) => {
                                    setSelectedGroup(e.target.value);
                                    setSelectedUser('all'); // Reset user selection when group changes
                                }}
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
                        <div>
                            <label className="block text-sm font-medium mb-1">User</label>
                            <select
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="all">All Users</option>
                                {getFilteredUsers().map((user: any) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Quick Range Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickRange(1)}
                        >
                            Today
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickRange(7)}
                        >
                            Last 7 Days
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickRange(30)}
                        >
                            Last 30 Days
                        </Button>
                        <WeekPicker 
                            onWeekSelect={(start, end) => {
                                setStartDate(start);
                                setEndDate(end);
                            }}
                        />
                        <MonthPicker 
                            onMonthSelect={(start, end) => {
                                setStartDate(start);
                                setEndDate(end);
                            }}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button onClick={generateReport} className="flex-1">
                            Generate Report
                        </Button>
                        {reportData.length > 0 && (
                            <Button onClick={exportCSV} variant="outline">
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        )}
                    </div>

                    {/* Report Results */}
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
    const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState(new Date());
    const [reportData, setReportData] = useState<any[]>([]);

    const setQuickRange = (days: number) => {
        const end = new Date();
        const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
        setStartDate(start);
        setEndDate(end);
    };

    const generateReport = () => {
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

                // Calculate hours per day, then apply overtime rules per day
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
                        totalRegularPay += dailyRegularHours * (group.hourly_rate || 0);
                        totalExtraPay += dailyExtraHours * (group.hourly_rate || 0) * 1.5;
                    }
                });
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
        a.download = `group-payroll-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.csv`;
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
                    {/* Date Range Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <CalendarDatePicker
                            date={startDate}
                            onDateChange={setStartDate}
                            label="Start Date"
                        />
                        <CalendarDatePicker
                            date={endDate}
                            onDateChange={setEndDate}
                            label="End Date"
                        />
                    </div>

                    {/* Quick Range Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickRange(1)}
                        >
                            Today
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickRange(7)}
                        >
                            Last 7 Days
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickRange(30)}
                        >
                            Last 30 Days
                        </Button>
                        <WeekPicker 
                            onWeekSelect={(start, end) => {
                                setStartDate(start);
                                setEndDate(end);
                            }}
                        />
                        <MonthPicker 
                            onMonthSelect={(start, end) => {
                                setStartDate(start);
                                setEndDate(end);
                            }}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button onClick={generateReport} className="flex-1">
                            Generate Report
                        </Button>
                        {reportData.length > 0 && (
                            <Button onClick={exportCSV} variant="outline">
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        )}
                    </div>

                    {/* Report Results */}
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
    const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState(new Date());
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [summary, setSummary] = useState<any>(null);

    const setQuickRange = (days: number) => {
        const end = new Date();
        const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
        setStartDate(start);
        setEndDate(end);
    };

    const generateSummary = () => {
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

            // Calculate hours per day, then apply overtime rules per day
            Object.values(dailyEntries).forEach((dayEntries: any) => {
                if (dayEntries.length >= 2) {
                    dayEntries.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                    const diffMs = new Date(dayEntries[dayEntries.length - 1].timestamp).getTime() - new Date(dayEntries[0].timestamp).getTime();
                    const dailyHours = diffMs / (1000 * 60 * 60);

                    userTotalHours += dailyHours;

                    const scheduledHoursPerDay = 8; // Default - should get from schedule
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
            period: `${format(startDate, 'MMM dd, yyyy')} to ${format(endDate, 'MMM dd, yyyy')}`,
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
        a.download = `payroll-summary-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.csv`;
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
                    {/* Date Range Selection */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <CalendarDatePicker
                            date={startDate}
                            onDateChange={setStartDate}
                            label="Start Date"
                        />
                        <CalendarDatePicker
                            date={endDate}
                            onDateChange={setEndDate}
                            label="End Date"
                        />
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
                    </div>

                    {/* Quick Range Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickRange(1)}
                        >
                            Today
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickRange(7)}
                        >
                            Last 7 Days
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickRange(30)}
                        >
                            Last 30 Days
                        </Button>
                        <WeekPicker 
                            onWeekSelect={(start, end) => {
                                setStartDate(start);
                                setEndDate(end);
                            }}
                        />
                        <MonthPicker 
                            onMonthSelect={(start, end) => {
                                setStartDate(start);
                                setEndDate(end);
                            }}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button onClick={generateSummary} className="flex-1">
                            Generate Summary
                        </Button>
                        {summary && (
                            <Button onClick={exportSummary} variant="outline">
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        )}
                    </div>

                    {/* Summary Results */}
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
