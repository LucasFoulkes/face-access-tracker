import { createFileRoute } from '@tanstack/react-router'
import { useAttendanceData } from '@/hooks/useAttendanceData'
import { syncFromSupabase } from '@/database'
import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, Search, RefreshCw } from 'lucide-react'

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
            {/* Actualizar button positioned fixed to viewport top right */}
            <Button
                variant="outline"
                size="sm"
                onClick={handleUpdateData}
                disabled={isUpdating}
                className="fixed top-4 right-4 z-50 flex items-center gap-2"
            >
                <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
                {isUpdating ? 'Actualizando...' : 'Actualizar'}
            </Button>

            <div className="flex justify-between items-center p-4 border-b border-zinc-200">
                <h2 className="text-lg font-semibold">Reporte de Asistencia</h2>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Filtrar trabajadores..."
                            value={workerFilter}
                            onChange={(e) => setWorkerFilter(e.target.value)}
                            className="pl-8 w-64"
                        />
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-64 justify-between font-normal"
                            >
                                {range?.from && range?.to
                                    ? `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`
                                    : "Todos los registros"}
                                <CalendarIcon className="h-4 w-4" />
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
                    <table className='w-full border-collapse'>
                        <thead className='bg-zinc-100 sticky top-0 z-10'>
                            <tr>
                                <th className="px-4 py-2 text-left capitalize font-medium">
                                    Fecha
                                </th>
                                {filteredAttendanceData.length > 0 ? (
                                    filteredAttendanceData.map(worker => (
                                        <th key={worker.workerId} className="px-4 py-2 text-center capitalize font-medium">
                                            {worker.workerName}
                                        </th>
                                    ))
                                ) : (
                                    <th className="px-4 py-2 text-center capitalize font-medium text-gray-400">
                                        {workerFilter ? 'Sin coincidencias' : 'Sin asistencias'}
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {weekDays.map((day) => (
                                <tr key={day}>
                                    <td className='border-b border-gray-200 px-4 py-2 text-left font-medium'>
                                        {formatDate(day)}
                                    </td>
                                    {filteredAttendanceData.length > 0 ? (
                                        filteredAttendanceData.map(worker => {
                                            const dayData = worker.dailyData[day]
                                            return (
                                                <td key={worker.workerId} className={`border-b border-gray-200 px-4 py-2 text-center ${dayData?.isSingleDetection ? 'bg-red-200' : ''}`}>
                                                    {dayData ? (
                                                        <div className="text-sm">
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
                                                        <div className="text-gray-400 text-sm">
                                                            —
                                                        </div>
                                                    )}
                                                </td>
                                            )
                                        })
                                    ) : (
                                        <td className='border-b border-gray-200 px-4 py-2 text-center'>
                                            <div className="text-gray-400 text-sm">
                                                —
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export const Route = createFileRoute('/admin/reportes')({
    component: Reportes,
})
