import { useState, useEffect } from 'react'
import { db } from '@/database'
import { WorkerProfile, Recognition } from '@/types'

interface AttendanceData {
    workerId: string
    workerName: string
    dailyData: {
        [date: string]: {
            firstDetection: string
            lastDetection: string
            totalTime: string
            isSingleDetection: boolean
        }
    }
}

interface DateRange {
    from: Date
    to: Date
}

export const useAttendanceData = (dateRange?: DateRange, refreshKey: number = 0) => {
    const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([])
    const [weekDays, setWeekDays] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadAttendanceData = async () => {
            try {
                setLoading(true)
                setError(null)

                // Get worker profiles and recognitions
                const workers = await db.worker_profiles.toArray() as WorkerProfile[]
                const recognitions = await db.recognitions.toArray() as Recognition[]

                // Generate date range
                const days: string[] = []

                if (dateRange?.from && dateRange?.to) {
                    // Use provided date range - reverse to show most recent first
                    const startDate = new Date(dateRange.from)
                    const endDate = new Date(dateRange.to)

                    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                        const year = d.getFullYear()
                        const month = String(d.getMonth() + 1).padStart(2, '0')
                        const day = String(d.getDate()).padStart(2, '0')
                        days.push(`${year}-${month}-${day}`)
                    }
                    days.reverse() // Most recent first
                } else {
                    // Use all days from first to last recognition record
                    if (recognitions.length > 0) {
                        // Find min and max dates from recognition records
                        const dates = recognitions.map(r => {
                            const timestamp = r.created_at instanceof Date
                                ? r.created_at
                                : new Date(r.created_at || '')
                            // Use local date to avoid timezone issues
                            const year = timestamp.getFullYear()
                            const month = String(timestamp.getMonth() + 1).padStart(2, '0')
                            const day = String(timestamp.getDate()).padStart(2, '0')
                            return `${year}-${month}-${day}`
                        }).filter(date => date !== 'NaN-NaN-NaN') // Filter out invalid dates

                        if (dates.length > 0) {
                            // Sort dates and get min/max
                            const sortedDates = dates.sort()
                            const minDateStr = sortedDates[0]
                            const maxDateStr = sortedDates[sortedDates.length - 1]

                            // Validate date strings before creating Date objects
                            if (minDateStr && maxDateStr && minDateStr !== 'NaN-NaN-NaN' && maxDateStr !== 'NaN-NaN-NaN') {
                                const minDate = new Date(minDateStr + 'T00:00:00.000')
                                const maxDate = new Date(maxDateStr + 'T00:00:00.000')

                                // Generate all days between min and max dates
                                for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
                                    const year = d.getFullYear()
                                    const month = String(d.getMonth() + 1).padStart(2, '0')
                                    const day = String(d.getDate()).padStart(2, '0')
                                    days.push(`${year}-${month}-${day}`)
                                }
                                days.reverse() // Most recent first
                            }
                        }
                    }
                }
                setWeekDays(days)

                // Process attendance data
                const processedData: AttendanceData[] = workers.map(worker => {
                    const workerRecognitions = recognitions.filter(r => r.worker_id === worker.id)
                    const dailyData: { [date: string]: any } = {}

                    days.forEach(day => {
                        const dayRecognitions = workerRecognitions
                            .filter(r => {
                                // Handle both Date objects and string timestamps using local date
                                const timestamp = r.created_at instanceof Date
                                    ? r.created_at
                                    : new Date(r.created_at || '')
                                const year = timestamp.getFullYear()
                                const month = String(timestamp.getMonth() + 1).padStart(2, '0')
                                const dayNum = String(timestamp.getDate()).padStart(2, '0')
                                const dateStr = `${year}-${month}-${dayNum}`
                                return dateStr === day
                            })
                            .sort((a, b) => {
                                const timeA = a.created_at instanceof Date
                                    ? a.created_at.getTime()
                                    : new Date(a.created_at || '').getTime()
                                const timeB = b.created_at instanceof Date
                                    ? b.created_at.getTime()
                                    : new Date(b.created_at || '').getTime()
                                return timeA - timeB
                            })

                        if (dayRecognitions.length > 0) {
                            const firstRec = dayRecognitions[0]
                            const lastRec = dayRecognitions[dayRecognitions.length - 1]

                            const first = firstRec.created_at instanceof Date
                                ? firstRec.created_at
                                : new Date(firstRec.created_at || '')
                            const last = lastRec.created_at instanceof Date
                                ? lastRec.created_at
                                : new Date(lastRec.created_at || '')

                            const isSingleDetection = dayRecognitions.length === 1
                            const diffMs = last.getTime() - first.getTime()
                            const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

                            dailyData[day] = {
                                firstDetection: first.toTimeString().slice(0, 5),
                                lastDetection: isSingleDetection ? '—' : last.toTimeString().slice(0, 5),
                                totalTime: isSingleDetection ? 'Entrada única' : `${diffHours}h ${diffMinutes}m`,
                                isSingleDetection
                            }
                        }
                    })

                    return {
                        workerId: worker.id,
                        workerName: `${worker.nombres} ${worker.apellidos}`.trim(),
                        dailyData
                    }
                })

                // Filter out workers with no attendance records for the attendanceData
                const filteredData = processedData.filter(worker =>
                    Object.keys(worker.dailyData).length > 0
                )

                setAttendanceData(filteredData)
            } catch (error) {
                console.error('Error loading attendance data:', error)
                setError('Error loading attendance data')
            } finally {
                setLoading(false)
            }
        }

        loadAttendanceData()
    }, [dateRange, refreshKey])

    const formatDate = (dateString: string) => {
        // Parse the date string manually to avoid timezone issues
        const [year, month, day] = dateString.split('-').map(Number)
        const date = new Date(year, month - 1, day) // month is 0-indexed in Date constructor
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        return `${days[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`
    }

    return {
        attendanceData,
        weekDays,
        loading,
        error,
        formatDate
    }
}
