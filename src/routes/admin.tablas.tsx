import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { db } from '@/database'

interface TableData {
    [key: string]: any
}

interface DiscoveredTable {
    name: string
    data: TableData[]
    count: number
}

function Tablas() {
    const [tables, setTables] = useState<DiscoveredTable[]>([])

    useEffect(() => {
        const discoverTables = async () => {
            const discoveredTables: DiscoveredTable[] = []

            try {
                // Get all table names dynamically from the database schema
                const tableNames = db.tables.map(table => table.name)

                for (const tableName of tableNames) {
                    const table = (db as any)[tableName]
                    if (table) {
                        const data = await table.toArray()
                        discoveredTables.push({
                            name: tableName,
                            data: data,
                            count: data.length
                        })
                    }
                }

                setTables(discoveredTables)
            } catch (error) {
                console.error('Error discovering tables:', error)
            }
        }

        discoverTables()
    }, [])

    const renderTableContent = (tableData: TableData[], tableName: string) => {
        if (!tableData.length) {
            return (
                <div className="text-center py-8 text-muted-foreground">
                    No hay datos disponibles
                </div>
            )
        }

        // Get worker profiles for name lookup
        const workerProfiles = tables.find(t => t.name === 'worker_profiles')?.data || []

        // Process data to replace worker_id with names and filter out id column
        const processedData = tableData.map(row => {
            const newRow = { ...row }

            // Remove id column
            delete newRow.id

            // Replace worker_id with worker names if this is recognitions table
            if (tableName === 'recognitions' && row.worker_id) {
                const worker = workerProfiles.find(w => w.id === row.worker_id)
                if (worker) {
                    newRow.worker_name = `${worker.nombres || ''} ${worker.apellidos || ''}`.trim()
                    delete newRow.worker_id
                }
            }

            return newRow
        })

        const columns = Array.from(
            new Set(processedData.flatMap(item => Object.keys(item)))
        )

        return (
            <div className='h-full flex flex-col overflow-hidden border-1 rounded-lg border-zinc-100'>
                <div className='overflow-auto flex-1 scrollbar-hide'>
                    <table className='w-full '>
                        <thead className='bg-zinc-100 sticky top-0 z-10'>
                            <tr>
                                {columns.map(column => (
                                    <th key={column} className=" px-4 py-2 text-left capitalize font-medium">
                                        {column.replace(/_/g, ' ')}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.map((row, index) => (
                                <tr key={index}>
                                    {columns.map(column => (
                                        <td key={column} className='border-b border-gray-200 px-4 py-2 text-left'>
                                            {formatCellValue(row[column])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    const formatCellValue = (value: any): string => {
        if (value === null || value === undefined) return ''
        if (value instanceof Date) {
            return value.toLocaleString()
        }
        if (typeof value === 'string' && isValidDate(value)) {
            return new Date(value).toLocaleString()
        }
        if (Array.isArray(value)) {
            return `[Array of ${value.length} items]`
        }
        if (typeof value === 'object') {
            return JSON.stringify(value)
        }
        return String(value)
    }

    const isValidDate = (dateString: string): boolean => {
        const date = new Date(dateString)
        return !isNaN(date.getTime()) && dateString.includes('T')
    }

    if (!tables.length) {
        return (
            <div className="p-6">
                <h1 className="text-3xl font-bold mb-6">Tablas</h1>
                <div className="text-center py-8 text-muted-foreground">
                    No se encontraron tablas en la base de datos
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            <Tabs defaultValue={tables[0]?.name} className='w-full h-full flex flex-col'>
                <TabsList className='w-full flex-shrink-0'>
                    {tables.map(table => (
                        <TabsTrigger key={table.name} value={table.name} className='capitalize'>
                            {table.name.replace(/_/g, ' ')}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {tables.map(table => (
                    <TabsContent key={table.name} value={table.name} className='flex-1 overflow-hidden'>
                        {renderTableContent(table.data, table.name)}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}

export const Route = createFileRoute('/admin/tablas')({
    component: Tablas,
})
