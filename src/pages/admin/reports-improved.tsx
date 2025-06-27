import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Building, Download, Target, Calendar, Filter, Clock, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import SmartTable from '@/components/SmartTable';
import { userStorage } from '@/services/userStorage';

// Enhanced Date Picker Component
function DateRangePicker({ startDate, endDate, onStartDateChange, onEndDateChange, onQuickRange }: any) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Start Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => onStartDateChange(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">End Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => onEndDateChange(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Quick Ranges</label>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onQuickRange(0)}
                        className="text-xs"
                    >
                        Today
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onQuickRange(7)}
                        className="text-xs"
                    >
                        Last 7 Days
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onQuickRange(30)}
                        className="text-xs"
                    >
                        Last 30 Days
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const now = new Date();
                            const start = new Date(now.getFullYear(), now.getMonth(), 1);
                            onStartDateChange(start.toISOString().split('T')[0]);
                            onEndDateChange(now.toISOString().split('T')[0]);
                        }}
                        className="text-xs"
                    >
                        This Month
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const now = new Date();
                            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                            const end = new Date(now.getFullYear(), now.getMonth(), 0);
                            onStartDateChange(start.toISOString().split('T')[0]);
                            onEndDateChange(end.toISOString().split('T')[0]);
                        }}
                        className="text-xs"
                    >
                        Last Month
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Individual Payroll Report Component
function IndividualPayrollDialog({ users, entries, groups, schedules }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [selectedUser, setSelectedUser] = useState('all');
    const [reportData, setReportData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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
        const start = days === 0 ? new Date() : new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const generateReport = async () => {
        if (!startDate || !endDate) {
            alert('Please select start and end dates');
            return;
        }

        setIsLoading(true);

        try {
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
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Error generating report. Please try again.');
        } finally {
            setIsLoading(false);
        }
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

    // Calculate summary stats
    const totalPay = reportData.reduce((sum, row) => sum + parseFloat(row['Total Pay'].replace('$', '')), 0);
    const totalHours = reportData.reduce((sum, row) => sum + parseFloat(row['Total Hours']), 0);
    const avgHourlyRate = reportData.length > 0 ? totalPay / totalHours : 0;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 border-transparent hover:border-blue-200">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="text-lg">Individual Payroll</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                            Detailed payroll breakdown for individual employees with overtime calculations and compensation analysis.
                        </p>
                        <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Generate Report
                        </Button>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Users className="h-6 w-6 text-blue-600" />
                        Individual Payroll Report
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Date Range and Filters */}
                    <Card className="p-4">
                        <div className="space-y-4">
                            <DateRangePicker
                                startDate={startDate}
                                endDate={endDate}
                                onStartDateChange={setStartDate}
                                onEndDateChange={setEndDate}
                                onQuickRange={setQuickRange}
                            />

                            {/* Filters */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Group</label>
                                    <div className="relative">
                                        <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <select
                                            value={selectedGroup}
                                            onChange={(e) => {
                                                setSelectedGroup(e.target.value);
                                                setSelectedUser('all');
                                            }}
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">User</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <select
                                            value={selectedUser}
                                            onChange={(e) => setSelectedUser(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                            </div>
                        </div>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button
                            onClick={generateReport}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                            ) : (
                                <TrendingUp className="h-4 w-4 mr-2" />
                            )}
                            {isLoading ? 'Generating...' : 'Generate Report'}
                        </Button>
                        {reportData.length > 0 && (
                            <Button onClick={exportCSV} variant="outline" className="min-w-fit">
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        )}
                    </div>

                    {/* Summary Stats */}
                    {reportData.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card className="p-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">{reportData.length}</div>
                                    <div className="text-sm text-gray-600">Employees</div>
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">${totalPay.toFixed(2)}</div>
                                    <div className="text-sm text-gray-600">Total Payroll</div>
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-600">{totalHours.toFixed(1)}</div>
                                    <div className="text-sm text-gray-600">Total Hours</div>
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-orange-600">${avgHourlyRate.toFixed(2)}</div>
                                    <div className="text-sm text-gray-600">Avg Rate</div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Report Results */}
                    {reportData.length > 0 && (
                        <Card className="p-4">
                            <SmartTable data={reportData} />
                        </Card>
                    )}

                    {reportData.length === 0 && startDate && endDate && (
                        <Card className="p-8">
                            <div className="text-center text-gray-500">
                                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-lg">No data found for the selected criteria</p>
                                <p className="text-sm">Try adjusting your date range or filters</p>
                            </div>
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
    const [isLoading, setIsLoading] = useState(false);

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
        const start = days === 0 ? new Date() : new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const generateReport = async () => {
        if (!startDate || !endDate) {
            alert('Please select start and end dates');
            return;
        }

        setIsLoading(true);

        try {
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
                let activeEmployees = 0;

                groupUsers.forEach((user: any) => {
                    const userEntries = filteredEntries.filter((entry: any) => entry.userId === user.id);
                    const dailyEntries: { [key: string]: any[] } = {};
                    userEntries.forEach((entry: any) => {
                        const date = new Date(entry.timestamp).toDateString();
                        if (!dailyEntries[date]) dailyEntries[date] = [];
                        dailyEntries[date].push(entry);
                    });

                    let userWorked = false;
                    Object.values(dailyEntries).forEach((dayEntries: any) => {
                        if (dayEntries.length >= 2) {
                            userWorked = true;
                            dayEntries.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                            const diffMs = new Date(dayEntries[dayEntries.length - 1].timestamp).getTime() - new Date(dayEntries[0].timestamp).getTime();
                            const dailyHours = diffMs / (1000 * 60 * 60);
                            const scheduledHoursPerDay = schedule?.hours_per_day || 8;

                            const dailyRegularHours = Math.min(dailyHours, scheduledHoursPerDay);
                            const dailyExtraHours = Math.max(0, dailyHours - scheduledHoursPerDay);

                            totalRegularHours += dailyRegularHours;
                            totalExtraHours += dailyExtraHours;
                            totalRegularPay += dailyRegularHours * group.hourly_rate;
                            totalExtraPay += dailyExtraHours * group.hourly_rate * 1.5;
                        }
                    });

                    if (userWorked) activeEmployees++;
                });

                const totalPay = totalRegularPay + totalExtraPay;

                return {
                    Group: group.group_name,
                    'Active Employees': activeEmployees,
                    'Total Employees': groupUsers.length,
                    'Hourly Rate': `$${group.hourly_rate.toFixed(2)}`,
                    'Regular Hours': totalRegularHours.toFixed(1),
                    'Overtime Hours': totalExtraHours.toFixed(1),
                    'Total Hours': (totalRegularHours + totalExtraHours).toFixed(1),
                    'Regular Pay': `$${totalRegularPay.toFixed(2)}`,
                    'Overtime Pay': `$${totalExtraPay.toFixed(2)}`,
                    'Total Pay': `$${totalPay.toFixed(2)}`
                };
            }).sort((a: any, b: any) => parseFloat(b['Total Pay'].replace('$', '')) - parseFloat(a['Total Pay'].replace('$', '')));

            setReportData(data);
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Error generating report. Please try again.');
        } finally {
            setIsLoading(false);
        }
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

    const totalPay = reportData.reduce((sum, row) => sum + parseFloat(row['Total Pay'].replace('$', '')), 0);
    const totalEmployees = reportData.reduce((sum, row) => sum + row['Active Employees'], 0);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 border-transparent hover:border-green-200">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100">
                                <Building className="h-5 w-5 text-green-600" />
                            </div>
                            <span className="text-lg">Group Payroll</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                            Payroll summary by group with team performance metrics and cost analysis.
                        </p>
                        <Button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg">
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Generate Report
                        </Button>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Building className="h-6 w-6 text-green-600" />
                        Group Payroll Report
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <Card className="p-4">
                        <DateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            onStartDateChange={setStartDate}
                            onEndDateChange={setEndDate}
                            onQuickRange={setQuickRange}
                        />
                    </Card>

                    <div className="flex gap-3">
                        <Button
                            onClick={generateReport}
                            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                            ) : (
                                <TrendingUp className="h-4 w-4 mr-2" />
                            )}
                            {isLoading ? 'Generating...' : 'Generate Report'}
                        </Button>
                        {reportData.length > 0 && (
                            <Button onClick={exportCSV} variant="outline">
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        )}
                    </div>

                    {reportData.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="p-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">${totalPay.toFixed(2)}</div>
                                    <div className="text-sm text-gray-600">Total Payroll</div>
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">{totalEmployees}</div>
                                    <div className="text-sm text-gray-600">Active Employees</div>
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-600">{reportData.length}</div>
                                    <div className="text-sm text-gray-600">Groups</div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {reportData.length > 0 && (
                        <Card className="p-4">
                            <SmartTable data={reportData} />
                        </Card>
                    )}

                    {reportData.length === 0 && startDate && endDate && (
                        <Card className="p-8">
                            <div className="text-center text-gray-500">
                                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-lg">No data found for the selected period</p>
                                <p className="text-sm">Try adjusting your date range</p>
                            </div>
                        </Card>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Payroll Summary Report Component
function PayrollSummaryDialog({ users, entries, groups, schedules }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportData, setReportData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

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
        const start = days === 0 ? new Date() : new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const generateReport = async () => {
        if (!startDate || !endDate) {
            alert('Please select start and end dates');
            return;
        }

        setIsLoading(true);

        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const filteredEntries = entries.filter((entry: any) => {
                const entryDate = new Date(entry.timestamp);
                return entryDate >= start && entryDate <= end;
            });

            let totalRegularHours = 0;
            let totalOvertimeHours = 0;
            let totalRegularPay = 0;
            let totalOvertimePay = 0;
            let activeEmployees = 0;
            const groupStats: any = {};

            users.forEach((user: any) => {
                const group = groups.find((g: any) => g.group_id === user.group_id);
                const schedule = schedules.find((s: any) => s.schedule_id === group?.schedule_id);
                const userEntries = filteredEntries.filter((entry: any) => entry.userId === user.id);

                if (userEntries.length === 0) return;

                const dailyEntries: { [key: string]: any[] } = {};
                userEntries.forEach((entry: any) => {
                    const date = new Date(entry.timestamp).toDateString();
                    if (!dailyEntries[date]) dailyEntries[date] = [];
                    dailyEntries[date].push(entry);
                });

                let userWorked = false;
                Object.values(dailyEntries).forEach((dayEntries: any) => {
                    if (dayEntries.length >= 2) {
                        userWorked = true;
                        dayEntries.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                        const diffMs = new Date(dayEntries[dayEntries.length - 1].timestamp).getTime() - new Date(dayEntries[0].timestamp).getTime();
                        const dailyHours = diffMs / (1000 * 60 * 60);
                        const scheduledHoursPerDay = schedule?.hours_per_day || 8;

                        const dailyRegularHours = Math.min(dailyHours, scheduledHoursPerDay);
                        const dailyOvertimeHours = Math.max(0, dailyHours - scheduledHoursPerDay);

                        totalRegularHours += dailyRegularHours;
                        totalOvertimeHours += dailyOvertimeHours;
                        totalRegularPay += dailyRegularHours * (group?.hourly_rate || 0);
                        totalOvertimePay += dailyOvertimeHours * (group?.hourly_rate || 0) * 1.5;
                    }
                });

                if (userWorked) {
                    activeEmployees++;
                    const groupName = group?.group_name || 'No Group';
                    if (!groupStats[groupName]) {
                        groupStats[groupName] = { employees: 0, totalPay: 0 };
                    }
                    groupStats[groupName].employees++;
                }
            });

            // Calculate group payrolls
            Object.keys(groupStats).forEach(groupName => {
                const group = groups.find((g: any) => g.group_name === groupName);
                if (group) {
                    const groupUsers = users.filter((u: any) => u.group_id === group.group_id);
                    let groupTotalPay = 0;

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
                                const schedule = schedules.find((s: any) => s.schedule_id === group.schedule_id);
                                const scheduledHoursPerDay = schedule?.hours_per_day || 8;

                                const dailyRegularHours = Math.min(dailyHours, scheduledHoursPerDay);
                                const dailyOvertimeHours = Math.max(0, dailyHours - scheduledHoursPerDay);

                                groupTotalPay += dailyRegularHours * group.hourly_rate;
                                groupTotalPay += dailyOvertimeHours * group.hourly_rate * 1.5;
                            }
                        });
                    });

                    groupStats[groupName].totalPay = groupTotalPay;
                }
            });

            const totalPayroll = totalRegularPay + totalOvertimePay;
            const avgHourlyRate = (totalRegularHours + totalOvertimeHours) > 0 ? totalPayroll / (totalRegularHours + totalOvertimeHours) : 0;

            setReportData({
                period: `${startDate} to ${endDate}`,
                totalEmployees: users.length,
                activeEmployees,
                totalRegularHours: totalRegularHours.toFixed(1),
                totalOvertimeHours: totalOvertimeHours.toFixed(1),
                totalHours: (totalRegularHours + totalOvertimeHours).toFixed(1),
                totalRegularPay: totalRegularPay.toFixed(2),
                totalOvertimePay: totalOvertimePay.toFixed(2),
                totalPayroll: totalPayroll.toFixed(2),
                avgHourlyRate: avgHourlyRate.toFixed(2),
                groupStats: Object.entries(groupStats).map(([name, stats]: [string, any]) => ({
                    name,
                    employees: stats.employees,
                    totalPay: stats.totalPay.toFixed(2)
                })).sort((a, b) => parseFloat(b.totalPay) - parseFloat(a.totalPay))
            });
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Error generating report. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 border-transparent hover:border-purple-200">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100">
                                <Target className="h-5 w-5 text-purple-600" />
                            </div>
                            <span className="text-lg">Payroll Summary</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                            Comprehensive payroll overview with company-wide metrics and performance insights.
                        </p>
                        <Button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg">
                            <DollarSign className="h-4 w-4 mr-2" />
                            Generate Summary
                        </Button>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Target className="h-6 w-6 text-purple-600" />
                        Payroll Summary Report
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <Card className="p-4">
                        <DateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            onStartDateChange={setStartDate}
                            onEndDateChange={setEndDate}
                            onQuickRange={setQuickRange}
                        />
                    </Card>

                    <Button
                        onClick={generateReport}
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        ) : (
                            <TrendingUp className="h-4 w-4 mr-2" />
                        )}
                        {isLoading ? 'Generating Summary...' : 'Generate Summary'}
                    </Button>

                    {reportData && (
                        <div className="space-y-6">
                            {/* Overview Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">{reportData.activeEmployees}</div>
                                        <div className="text-sm text-blue-800">Active Employees</div>
                                        <div className="text-xs text-blue-600">of {reportData.totalEmployees} total</div>
                                    </div>
                                </Card>
                                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">${reportData.totalPayroll}</div>
                                        <div className="text-sm text-green-800">Total Payroll</div>
                                        <div className="text-xs text-green-600">{reportData.period}</div>
                                    </div>
                                </Card>
                                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-600">{reportData.totalHours}</div>
                                        <div className="text-sm text-purple-800">Total Hours</div>
                                        <div className="text-xs text-purple-600">{reportData.totalOvertimeHours}h overtime</div>
                                    </div>
                                </Card>
                                <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-orange-600">${reportData.avgHourlyRate}</div>
                                        <div className="text-sm text-orange-800">Avg Rate</div>
                                        <div className="text-xs text-orange-600">per hour</div>
                                    </div>
                                </Card>
                            </div>

                            {/* Detailed Breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Hours Breakdown */}
                                <Card className="p-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Clock className="h-5 w-5" />
                                        Hours Breakdown
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Regular Hours:</span>
                                            <Badge variant="outline" className="text-blue-600">{reportData.totalRegularHours}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Overtime Hours:</span>
                                            <Badge variant="outline" className="text-orange-600">{reportData.totalOvertimeHours}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center font-semibold border-t pt-3">
                                            <span>Total Hours:</span>
                                            <Badge className="bg-green-600">{reportData.totalHours}</Badge>
                                        </div>
                                    </div>
                                </Card>

                                {/* Pay Breakdown */}
                                <Card className="p-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <DollarSign className="h-5 w-5" />
                                        Pay Breakdown
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Regular Pay:</span>
                                            <Badge variant="outline" className="text-blue-600">${reportData.totalRegularPay}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Overtime Pay:</span>
                                            <Badge variant="outline" className="text-orange-600">${reportData.totalOvertimePay}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center font-semibold border-t pt-3">
                                            <span>Total Payroll:</span>
                                            <Badge className="bg-green-600">${reportData.totalPayroll}</Badge>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Group Breakdown */}
                            {reportData.groupStats.length > 0 && (
                                <Card className="p-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Building className="h-5 w-5" />
                                        Group Breakdown
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {reportData.groupStats.map((group: any, index: number) => (
                                            <Card key={index} className="p-4 bg-gray-50">
                                                <div className="text-center">
                                                    <div className="font-semibold text-gray-800">{group.name}</div>
                                                    <div className="text-2xl font-bold text-green-600 mt-2">${group.totalPay}</div>
                                                    <div className="text-sm text-gray-600">{group.employees} employees</div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Main Reports Component
export default function Reports() {
    const [users, setUsers] = useState<any[]>([]);
    const [entries, setEntries] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-gray-300 rounded w-1/4"></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-64 bg-gray-300 rounded-lg"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold text-gray-800">
                        Payroll Analytics
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Comprehensive payroll reporting with detailed analytics, overtime tracking, and compensation insights.
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
                        schedules={schedules}
                    />
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-6 text-center bg-white shadow-lg">
                        <div className="text-3xl font-bold text-blue-600">{users.length}</div>
                        <div className="text-sm text-gray-600">Total Users</div>
                    </Card>
                    <Card className="p-6 text-center bg-white shadow-lg">
                        <div className="text-3xl font-bold text-green-600">{groups.length}</div>
                        <div className="text-sm text-gray-600">Groups</div>
                    </Card>
                    <Card className="p-6 text-center bg-white shadow-lg">
                        <div className="text-3xl font-bold text-purple-600">{entries.length}</div>
                        <div className="text-sm text-gray-600">Total Entries</div>
                    </Card>
                    <Card className="p-6 text-center bg-white shadow-lg">
                        <div className="text-3xl font-bold text-orange-600">{schedules.length}</div>
                        <div className="text-sm text-gray-600">Schedules</div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
