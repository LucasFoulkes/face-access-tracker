import { createFileRoute } from '@tanstack/react-router'
import { useAttendanceData } from '@/hooks/useAttendanceData'
import { syncFromSupabase } from '@/database'
import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, Search, RefreshCw, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface DateRange {
    from: Date
    to: Date
}

function Reportes() {
    const [range, setRange] = useState<DateRange | undefined>(undefined)
    const [workerFilter, setWorkerFilter] = useState('')
    const [refreshKey, setRefreshKey] = useState(0)
    const [isUpdating, setIsUpdating] = useState(false)
    const { attendanceData, weekDays, loading, error, formatDate } = useAttendanceData(range, refreshKey)

    const handleUpdateData = async () => {
        setIsUpdating(true)
        try {
            // Try to sync from Supabase (remote)
            await syncFromSupabase()
            console.log('Data synced from Supabase successfully')
        } catch (error) {
            console.log('Could not sync from remote, using local data:', error)
            // If sync fails, we'll just refresh with local data
        } finally {
            // Force refresh of the attendance data
            setRefreshKey(prev => prev + 1)
            setIsUpdating(false)
        }
    }

    // Auto-run update when component mounts
    useEffect(() => {
        handleUpdateData()
    }, []) // Empty dependency array means it runs only once on mount

    // Function to export filtered data to Excel
    const exportToExcel = () => {
        if (!filteredAttendanceData.length || !weekDays.length) return;

        // Prepare data for Excel export
        const excelData = [];

        // Create header rows - we need 2 rows for merged cells effect
        const mainHeaderRow = ['Trabajador'];
        const subHeaderRow = [''];

        // For each day, add 3 columns: Entrada, Salida, Horas
        weekDays.forEach(day => {
            const formattedDate = formatDate(day);
            mainHeaderRow.push(formattedDate, '', ''); // Date spans 3 columns
            subHeaderRow.push('Entrada', 'Salida', 'Horas'); // Sub-columns
        });

        excelData.push(mainHeaderRow);
        excelData.push(subHeaderRow);

        // Add data rows
        filteredAttendanceData.forEach(worker => {
            const row = [worker.workerName];
            weekDays.forEach(day => {
                const dayData = worker.dailyData[day];
                if (dayData) {
                    row.push(
                        dayData.firstDetection,  // Entrada
                        dayData.lastDetection,   // Salida
                        dayData.totalTime        // Horas
                    );
                } else {
                    row.push('—', '—', '—'); // Empty entry, exit, hours
                }
            });
            excelData.push(row);
        });

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);

        // Set column widths - Worker name + 3 columns per day
        const colWidths = [
            { wch: 25 }, // Worker name column
            ...weekDays.flatMap(() => [
                { wch: 12 }, // Entrada
                { wch: 12 }, // Salida
                { wch: 12 }  // Horas
            ])
        ];
        worksheet['!cols'] = colWidths;

        // Create merged cells for date headers
        const merges = [];
        weekDays.forEach((day, dayIndex) => {
            const startCol = 1 + (dayIndex * 3); // Start after worker name column
            const endCol = startCol + 2; // Span 3 columns

            // Convert column numbers to Excel column letters
            const startColLetter = XLSX.utils.encode_col(startCol);
            const endColLetter = XLSX.utils.encode_col(endCol);

            merges.push({
                s: { r: 0, c: startCol }, // Start: row 0, calculated column
                e: { r: 0, c: endCol }    // End: row 0, calculated column + 2
            });
        });
        worksheet['!merges'] = merges;

        // Style the headers
        const headerStyle = {
            font: { bold: true },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: { fgColor: { rgb: 'E5E7EB' } }
        };

        // Apply styles to header rows
        for (let col = 0; col < mainHeaderRow.length; col++) {
            const cellAddress1 = XLSX.utils.encode_cell({ r: 0, c: col });
            const cellAddress2 = XLSX.utils.encode_cell({ r: 1, c: col });

            if (!worksheet[cellAddress1]) worksheet[cellAddress1] = { v: '' };
            if (!worksheet[cellAddress2]) worksheet[cellAddress2] = { v: '' };

            worksheet[cellAddress1].s = headerStyle;
            worksheet[cellAddress2].s = headerStyle;
        }

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte de Asistencia');

        // Generate filename with current date and filter info
        const currentDate = new Date().toISOString().split('T')[0];
        let filename = `reporte-asistencia-${currentDate}`;

        if (range?.from && range?.to) {
            const fromDate = range.from.toISOString().split('T')[0];
            const toDate = range.to.toISOString().split('T')[0];
            filename += `-${fromDate}-${toDate}`;
        }

        if (workerFilter.trim()) {
            filename += `-filtrado`;
        }

        filename += '.xlsx';

        // Save file
        XLSX.writeFile(workbook, filename);
    };

    // Filter workers based on search text
    const filteredAttendanceData = useMemo(() => {
        if (!workerFilter.trim()) return attendanceData

        return attendanceData.filter(worker =>
            worker.workerName.toLowerCase().includes(workerFilter.toLowerCase())
        )
    }, [attendanceData, workerFilter])

    if (loading) {
        return (
            <div className='flex h-full w-full justify-center items-center'>
                <div className="text-center py-8 text-muted-foreground">
                    Cargando datos de asistencia...
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className='flex h-full w-full justify-center items-center'>
                <div className="text-center py-8 text-red-500">
                    {error}
                </div>
            </div>
        )
    }

    if (!weekDays.length) {
        return (
            <div className='flex h-full w-full justify-center items-center'>
                <div className="text-center py-8 text-muted-foreground">
                    No hay registros de reconocimiento disponibles
                </div>
            </div>
        )
    }

    return (
        <div className='h-full flex flex-col overflow-hidden'>
            {/* Header with Actualizar and Download buttons positioned fixed to viewport top right */}
            <div className="fixed top-2 right-2 z-50 flex gap-2 sm:top-4 sm:right-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToExcel}
                    disabled={!filteredAttendanceData.length || !weekDays.length}
                    className="flex items-center gap-1 text-xs px-2 py-1 sm:gap-2 sm:text-sm sm:px-3 sm:py-2 bg-green-600 text-white hover:bg-green-700 border-green-600"
                >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Excel</span>
                    <span className="sm:hidden">📊</span>
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpdateData}
                    disabled={isUpdating}
                    className="flex items-center gap-1 text-xs px-2 py-1 sm:gap-2 sm:text-sm sm:px-3 sm:py-2"
                >
                    <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isUpdating ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isUpdating ? 'Actualizando...' : 'Actualizar'}</span>
                    <span className="sm:hidden">{isUpdating ? '...' : '↻'}</span>
                </Button>
            </div>

            <div className="flex flex-col gap-4 p-4 border-b border-zinc-200 sm:flex-row sm:justify-between sm:items-center">
                <h2 className="text-lg font-semibold">Reporte de Asistencia</h2>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Filtrar trabajadores..."
                            value={workerFilter}
                            onChange={(e) => setWorkerFilter(e.target.value)}
                            className="pl-8 w-full sm:w-64"
                        />
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full sm:w-64 justify-between font-normal"
                            >
                                <span className="truncate">
                                    {range?.from && range?.to
                                        ? `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`
                                        : "Filtrar fecha"}
                                </span>
                                <CalendarIcon className="h-4 w-4 flex-shrink-0 ml-2" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto overflow-hidden p-0" align="end">
                            <Calendar
                                mode="range"
                                selected={range}
                                captionLayout="dropdown"
                                onSelect={(selectedRange) => {
                                    if (selectedRange?.from && selectedRange?.to) {
                                        setRange({
                                            from: selectedRange.from,
                                            to: selectedRange.to
                                        })
                                    } else {
                                        setRange(undefined)
                                    }
                                }}
                            />
                            <div className="p-3 border-t">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRange(undefined)}
                                    className="w-full"
                                >
                                    Mostrar todos los registros
                                </Button>                        </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className='border border-zinc-100 rounded-lg m-4 flex-1 flex flex-col overflow-hidden'>
                <div className='overflow-auto flex-1 scrollbar-hide'>
                    <div className="min-w-full overflow-x-auto">
                        <table className='w-full border-collapse min-w-max'>
                            <thead className='bg-zinc-100 sticky top-0 z-10'>
                                <tr>
                                    <th className="px-2 py-2 text-left capitalize font-medium min-w-32 sm:px-4">
                                        Trabajador
                                    </th>
                                    {weekDays.length > 0 ? (
                                        weekDays.map(day => (
                                            <th key={day} className="px-2 py-2 text-center capitalize font-medium min-w-24 sm:px-4">
                                                <div className="truncate max-w-20 sm:max-w-none text-xs sm:text-sm" title={formatDate(day)}>
                                                    {formatDate(day)}
                                                </div>
                                            </th>
                                        ))
                                    ) : (
                                        <th className="px-2 py-2 text-center capitalize font-medium text-gray-400 sm:px-4">
                                            Sin fechas
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAttendanceData.length > 0 ? (
                                    filteredAttendanceData.map((worker) => (
                                        <tr key={worker.workerId}>
                                            <td className='border-b border-gray-200 px-2 py-2 text-left font-medium min-w-32 sm:px-4'>
                                                <div className="text-xs sm:text-sm truncate" title={worker.workerName}>
                                                    {worker.workerName}
                                                </div>
                                            </td>
                                            {weekDays.map(day => {
                                                const dayData = worker.dailyData[day]
                                                return (
                                                    <td key={day} className={`border-b border-gray-200 px-2 py-2 text-center min-w-24 sm:px-4 ${dayData?.isSingleDetection ? 'bg-red-200' : ''}`}>
                                                        {dayData ? (
                                                            <div className="text-xs sm:text-sm">
                                                                <div className="text-green-700 font-medium">
                                                                    {dayData.firstDetection}
                                                                </div>
                                                                <div className="text-green-600 text-xs">
                                                                    {dayData.lastDetection}
                                                                </div>
                                                                <div className="text-gray-600 text-xs">
                                                                    {dayData.totalTime}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-gray-400 text-xs sm:text-sm">
                                                                —
                                                            </div>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td className='border-b border-gray-200 px-2 py-2 text-left font-medium text-gray-400 sm:px-4'>
                                            {workerFilter ? 'Sin coincidencias' : 'Sin trabajadores'}
                                        </td>
                                        {weekDays.map(day => (
                                            <td key={day} className='border-b border-gray-200 px-2 py-2 text-center sm:px-4'>
                                                <div className="text-gray-400 text-xs sm:text-sm">
                                                    —
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

export const Route = createFileRoute('/admin/reportes')({
    component: Reportes,
})
