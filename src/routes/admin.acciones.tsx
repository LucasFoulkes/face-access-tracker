import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileSpreadsheet, Upload, UserPlus, Trash2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { db, syncToSupabase } from '@/database'
import { WorkerProfile } from '@/types'

interface ExcelData {
    [key: string]: any
}

interface ColumnMapping {
    [databaseField: string]: string // database field -> excel column
}

function Acciones() {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [singleWorkerDialogOpen, setSingleWorkerDialogOpen] = useState(false)
    const [deleteDbDialogOpen, setDeleteDbDialogOpen] = useState(false)
    const [excelData, setExcelData] = useState<ExcelData[]>([])
    const [excelColumns, setExcelColumns] = useState<string[]>([])
    const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
    const [isProcessing, setIsProcessing] = useState(false)
    const [fileName, setFileName] = useState('')

    // Single worker form state
    const [singleWorkerForm, setSingleWorkerForm] = useState({
        internal_id: '',
        nombres: '',
        apellidos: '',
        cedula: '',
        pin: '',
        departamento: '',
        cargo: ''
    })

    const workerProfileFields: Array<{ key: keyof WorkerProfile, label: string }> = [
        { key: 'internal_id', label: 'ID Interno' },
        { key: 'nombres', label: 'Nombres' },
        { key: 'apellidos', label: 'Apellidos' },
        { key: 'cedula', label: 'Cédula' },
        { key: 'pin', label: 'PIN' },
        { key: 'departamento', label: 'Departamento' },
        { key: 'cargo', label: 'Cargo' }
    ]

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setFileName(file.name)
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]

                // Read as strings to prevent Excel from converting large numbers to scientific notation
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    raw: false,  // This ensures numbers are read as strings
                    defval: ''   // Default value for empty cells
                }) as ExcelData[]

                console.log('Excel data read:', jsonData.slice(0, 3)) // Debug: show first 3 rows
                console.log('Excel columns:', Object.keys(jsonData[0] || {})) // Debug: show column names

                if (jsonData.length > 0) {
                    const columns = Object.keys(jsonData[0])
                    setExcelColumns(columns)
                    setExcelData(jsonData)

                    // Initialize column mapping - each database field maps to 'ignore' initially
                    const initialMapping: ColumnMapping = {}
                    workerProfileFields.forEach(field => {
                        initialMapping[field.key] = 'ignore'
                    })
                    setColumnMapping(initialMapping)
                }
            } catch (error) {
                console.error('Error reading Excel file:', error)
                alert('Error al leer el archivo Excel')
            }
        }

        reader.readAsArrayBuffer(file)
    }

    const generateUniquePin = async (existingPins: Set<string>): Promise<string> => {
        let pin: string
        let attempts = 0
        const maxAttempts = 1000 // Prevent infinite loop

        do {
            // Generate 5-digit PIN (10000-99999)
            pin = Math.floor(Math.random() * 90000 + 10000).toString()
            attempts++
        } while (existingPins.has(pin) && attempts < maxAttempts)

        if (attempts >= maxAttempts) {
            throw new Error('No se pudo generar un PIN único después de múltiples intentos')
        }

        existingPins.add(pin) // Add to set to avoid duplicates in current batch
        return pin
    }

    const handleImport = async () => {
        if (excelData.length === 0) return

        setIsProcessing(true)
        try {
            // Get existing PINs from database to avoid duplicates
            const existingWorkers = await db.worker_profiles.toArray()
            const existingPins = new Set(existingWorkers.map(w => w.pin).filter(Boolean))

            const workersToAdd: WorkerProfile[] = []
            const errors: string[] = []

            for (let index = 0; index < excelData.length; index++) {
                const row = excelData[index]
                const worker: any = {
                    id: crypto.randomUUID(),
                    activo: true // Default to active
                }

                // Map database fields to Excel columns
                workerProfileFields.forEach(field => {
                    const excelColumn = columnMapping[field.key]
                    if (excelColumn && excelColumn !== 'ignore' && row[excelColumn] !== undefined) {
                        const rawValue = row[excelColumn]
                        const value = String(rawValue).trim()

                        // Debug: log ALL mapped fields
                        console.log(`Row ${index + 1}, DB Field "${field.key}" <- Excel Column "${excelColumn}":`, {
                            rawValue,
                            stringValue: value,
                            type: typeof rawValue
                        })

                        if (field.key === 'internal_id') {
                            // Convert to integer and validate only if value exists
                            // Handle scientific notation and large numbers
                            let intValue: number

                            if (typeof rawValue === 'number') {
                                intValue = Math.floor(rawValue)
                            } else {
                                // Clean the string and parse
                                const cleanedValue = value.replace(/[^\d-]/g, '') // Remove non-digits except minus
                                intValue = parseInt(cleanedValue, 10)
                            }

                            console.log(`Parsing internal_id for row ${index + 1}:`, {
                                original: rawValue,
                                cleaned: value,
                                parsed: intValue
                            })

                            if (isNaN(intValue)) {
                                errors.push(`Fila ${index + 2}: ID Interno "${value}" no es un número válido`)
                                return
                            }

                            // Validate int4 range (-2,147,483,648 to 2,147,483,647)
                            if (intValue < -2147483648 || intValue > 2147483647) {
                                errors.push(`Fila ${index + 2}: ID Interno "${value}" (${intValue}) está fuera del rango permitido. Debe ser entre -2,147,483,648 y 2,147,483,647`)
                                return
                            }

                            if (intValue <= 0) {
                                errors.push(`Fila ${index + 2}: ID Interno "${value}" debe ser un número positivo`)
                                return
                            }

                            worker[field.key] = intValue
                        } else {
                            worker[field.key] = value
                        }
                    }
                })                // Validate required fields (internal_id is now optional)
                if (worker.nombres && worker.apellidos && worker.cedula) {
                    // Generate unique PIN if not provided from Excel
                    const pin = worker.pin || await generateUniquePin(existingPins)

                    const finalWorker = {
                        id: worker.id,
                        internal_id: worker.internal_id || null, // Allow null for optional internal_id
                        nombres: worker.nombres,
                        apellidos: worker.apellidos,
                        cedula: worker.cedula,
                        pin: pin,
                        departamento: worker.departamento || '',
                        cargo: worker.cargo || '',
                        activo: true
                    }

                    console.log(`=== FINAL WORKER ${index + 1} ===`, finalWorker)
                    workersToAdd.push(finalWorker)
                } else {
                    const missingFields = []
                    if (!worker.nombres) missingFields.push('Nombres')
                    if (!worker.apellidos) missingFields.push('Apellidos')
                    if (!worker.cedula) missingFields.push('Cédula')
                    errors.push(`Fila ${index + 2}: Faltan campos requeridos: ${missingFields.join(', ')}`)
                }
            }

            // Show errors if any
            if (errors.length > 0) {
                alert(`Se encontraron errores:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n... y más errores' : ''}`)
                setIsProcessing(false)
                return
            }

            // Check for duplicate internal_ids (only for workers that have internal_id)
            const workersWithInternalId = workersToAdd.filter(w => w.internal_id !== null)
            const internalIds = workersWithInternalId.map(w => w.internal_id)
            const duplicateIds = internalIds.filter((id, index) => internalIds.indexOf(id) !== index)
            if (duplicateIds.length > 0) {
                alert(`Se encontraron IDs internos duplicados: ${[...new Set(duplicateIds)].join(', ')}`)
                setIsProcessing(false)
                return
            }

            // Check for duplicate cedulas in the current batch
            const cedulas = workersToAdd.map(w => w.cedula)
            const duplicateCedulas = cedulas.filter((cedula, index) => cedulas.indexOf(cedula) !== index)
            if (duplicateCedulas.length > 0) {
                alert(`Se encontraron cédulas duplicadas en el archivo: ${[...new Set(duplicateCedulas)].join(', ')}`)
                setIsProcessing(false)
                return
            }

            // Check for existing cedulas in database
            const allExistingWorkers = await db.worker_profiles.toArray()
            const existingCedulas = new Set(allExistingWorkers.map(w => w.cedula))
            const conflictingCedulas = workersToAdd.filter(w => existingCedulas.has(w.cedula))
            if (conflictingCedulas.length > 0) {
                alert(`Las siguientes cédulas ya existen en la base de datos: ${conflictingCedulas.map(w => w.cedula).join(', ')}`)
                setIsProcessing(false)
                return
            }

            // Add workers to database
            console.log('=== WORKERS TO ADD ===')
            workersToAdd.forEach((worker, index) => {
                console.log(`Worker ${index + 1}:`, worker)
            })
            console.log('=== END WORKERS TO ADD ===')

            for (const worker of workersToAdd) {
                await db.worker_profiles.add(worker)
            }

            // Sync to Supabase (remote database)
            let syncMessage = ''
            try {
                await syncToSupabase()
                syncMessage = ' y sincronizados con el servidor'
            } catch (syncError) {
                console.error('Failed to sync to Supabase:', syncError)
                syncMessage = ' (guardados localmente, sincronización pendiente)'
                // Workers are still saved locally, just show a warning
            }

            alert(`Se importaron ${workersToAdd.length} trabajadores exitosamente${syncMessage}`)
            setDialogOpen(false)
            resetForm()

        } catch (error) {
            console.error('Error importing workers:', error)
            alert('Error al importar trabajadores')
        } finally {
            setIsProcessing(false)
        }
    }

    const resetForm = () => {
        setExcelData([])
        setExcelColumns([])
        setColumnMapping({})
        setFileName('')
    }

    const resetSingleWorkerForm = () => {
        setSingleWorkerForm({
            internal_id: '',
            nombres: '',
            apellidos: '',
            cedula: '',
            pin: '',
            departamento: '',
            cargo: ''
        })
    }

    const handleSingleWorkerSubmit = async () => {
        const form = singleWorkerForm

        // Validate required fields (internal_id is now optional)
        if (!form.nombres || !form.apellidos || !form.cedula) {
            alert('Los campos Nombres, Apellidos y Cédula son requeridos')
            return
        }

        // Validate internal_id if provided
        let internalIdNum: number | null = null
        if (form.internal_id.trim()) {
            internalIdNum = parseInt(form.internal_id, 10)
            if (isNaN(internalIdNum) || internalIdNum <= 0) {
                alert('ID Interno debe ser un número entero positivo')
                return
            }

            // Validate int4 range
            if (internalIdNum < 1 || internalIdNum > 2147483647) {
                alert('ID Interno debe estar entre 1 y 2,147,483,647')
                return
            }
        }

        setIsProcessing(true)
        try {
            // Check for existing internal_id and cedula
            const existingWorkers = await db.worker_profiles.toArray()

            // Check internal_id uniqueness if provided
            if (internalIdNum !== null) {
                const existingWithId = existingWorkers.find(w => w.internal_id === internalIdNum)
                if (existingWithId) {
                    alert(`Ya existe un trabajador con ID Interno ${internalIdNum}`)
                    setIsProcessing(false)
                    return
                }
            }

            const existingWithCedula = existingWorkers.find(w => w.cedula === form.cedula)
            if (existingWithCedula) {
                alert(`Ya existe un trabajador con cédula ${form.cedula}`)
                setIsProcessing(false)
                return
            }

            // Generate unique PIN if not provided
            let pin = form.pin
            if (!pin) {
                const existingPins = new Set(existingWorkers.map(w => w.pin).filter(Boolean))
                pin = await generateUniquePin(existingPins)
            } else {
                // Validate PIN format (5 digits)
                if (!/^\d{5}$/.test(pin)) {
                    alert('PIN debe ser exactamente 5 dígitos')
                    setIsProcessing(false)
                    return
                }

                // Check PIN uniqueness
                const existingWithPin = existingWorkers.find(w => w.pin === pin)
                if (existingWithPin) {
                    alert(`Ya existe un trabajador con PIN ${pin}`)
                    setIsProcessing(false)
                    return
                }
            }

            const newWorker: WorkerProfile = {
                id: crypto.randomUUID(),
                internal_id: internalIdNum,
                nombres: form.nombres.trim(),
                apellidos: form.apellidos.trim(),
                cedula: form.cedula.trim(),
                pin: pin,
                departamento: form.departamento.trim() || '',
                cargo: form.cargo.trim() || '',
                activo: true
            }

            // Add to local database
            await db.worker_profiles.add(newWorker)

            // Sync to Supabase
            let syncMessage = ''
            try {
                await syncToSupabase()
                syncMessage = ' y sincronizado con el servidor'
            } catch (syncError) {
                console.error('Failed to sync to Supabase:', syncError)
                syncMessage = ' (guardado localmente, sincronización pendiente)'
            }

            alert(`Trabajador agregado exitosamente${syncMessage}`)
            setSingleWorkerDialogOpen(false)
            resetSingleWorkerForm()

        } catch (error) {
            console.error('Error adding worker:', error)
            alert('Error al agregar trabajador')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleDeleteDatabase = async () => {
        if (!window.confirm('⚠️ ADVERTENCIA: Esta acción eliminará TODOS los registros de reconocimiento.\n\nLos trabajadores y descriptores faciales se mantendrán intactos.\n\n¿Estás seguro de que quieres continuar?')) {
            return
        }

        setIsProcessing(true)
        try {
            // Only delete recognitions table, keep workers and face descriptors
            await db.recognitions.clear()

            alert('Registros de reconocimiento eliminados exitosamente.')

        } catch (error) {
            console.error('Error deleting recognitions:', error)
            alert('Error al eliminar los registros de reconocimiento')
        } finally {
            setIsProcessing(false)
            setDeleteDbDialogOpen(false)
        }
    }

    return (
        <div className="h-full flex flex-col items-center justify-center p-6">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-4">Acciones</h1>
                <p className="text-gray-600">Gestiona las acciones administrativas del sistema</p>
            </div>

            <div className="flex gap-8 flex-wrap justify-center">
                {/* Excel Import Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            size="lg"
                            className="w-64 h-64 flex flex-col items-center justify-center text-lg font-semibold gap-4"
                        >
                            <FileSpreadsheet className="h-16 w-16" />
                            Añadir Trabajadores
                            <span className="text-sm font-normal">Importar desde Excel</span>
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Importar Trabajadores desde Excel</DialogTitle>
                            <DialogDescription>
                                Selecciona un archivo Excel y mapea las columnas con los campos del sistema
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* File Upload */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Archivo Excel</label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleFileUpload}
                                        className="flex-1"
                                    />
                                    <Upload className="h-4 w-4" />
                                </div>
                                {fileName && <p className="text-sm text-green-600">Archivo cargado: {fileName}</p>}
                            </div>

                            {/* Column Mapping */}
                            {excelColumns.length > 0 && (
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-lg font-semibold">Mapeo de Campos</h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            <span className="text-red-600">*</span> Selecciona qué columna de Excel corresponde a cada campo de la base de datos
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {workerProfileFields.map((field) => {
                                            const mappedColumn = columnMapping[field.key]
                                            const isRequired = ['nombres', 'apellidos', 'cedula'].includes(field.key)
                                            return (
                                                <div key={field.key} className="space-y-2">
                                                    <label className="text-sm font-medium">
                                                        Campo: <span className="font-mono bg-blue-100 px-2 py-1 rounded">{field.label}</span>
                                                        {isRequired && <span className="text-red-600 ml-1">*</span>}
                                                    </label>
                                                    <Select
                                                        value={mappedColumn || 'ignore'}
                                                        onValueChange={(value) =>
                                                            setColumnMapping(prev => ({ ...prev, [field.key]: value }))
                                                        }
                                                    >
                                                        <SelectTrigger className={isRequired && mappedColumn === 'ignore' ? 'border-red-300' : ''}>
                                                            <SelectValue placeholder="Seleccionar columna Excel" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="ignore">Ignorar</SelectItem>
                                                            {excelColumns.map((column) => (
                                                                <SelectItem key={column} value={column}>
                                                                    {column}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Preview */}
                                    {excelData.length > 0 && (
                                        <div className="mt-6">
                                            <h4 className="text-md font-semibold mb-2">Vista Previa (primeras 3 filas)</h4>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full border border-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            {excelColumns.map(col => (
                                                                <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                    {col}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {excelData.slice(0, 3).map((row, idx) => (
                                                            <tr key={idx} className="border-t">
                                                                {excelColumns.map(col => (
                                                                    <td key={col} className="px-3 py-2 text-sm text-gray-900">
                                                                        {row[col]}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-2">
                                                Total de registros en el archivo: {excelData.length}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={excelData.length === 0 || isProcessing}
                            >
                                {isProcessing ? 'Importando...' : `Importar ${excelData.length} trabajadores`}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Single Worker Dialog */}
                <Dialog open={singleWorkerDialogOpen} onOpenChange={setSingleWorkerDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            size="lg"
                            className="w-64 h-64 flex flex-col items-center justify-center text-lg font-semibold gap-4"
                            variant="outline"
                        >
                            <UserPlus className="h-16 w-16" />
                            Añadir Trabajador
                            <span className="text-sm font-normal">Formulario manual</span>
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Añadir Trabajador</DialogTitle>
                            <DialogDescription>
                                Completa los datos del nuevo trabajador
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        ID Interno <span className="text-sm text-gray-500">(opcional)</span>
                                    </label>
                                    <Input
                                        type="number"
                                        placeholder="Ej: 12345"
                                        value={singleWorkerForm.internal_id}
                                        onChange={(e) => setSingleWorkerForm(prev => ({ ...prev, internal_id: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Cédula <span className="text-red-600">*</span>
                                    </label>
                                    <Input
                                        placeholder="Ej: 1234567890"
                                        value={singleWorkerForm.cedula}
                                        onChange={(e) => setSingleWorkerForm(prev => ({ ...prev, cedula: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Nombres <span className="text-red-600">*</span>
                                    </label>
                                    <Input
                                        placeholder="Ej: Juan Carlos"
                                        value={singleWorkerForm.nombres}
                                        onChange={(e) => setSingleWorkerForm(prev => ({ ...prev, nombres: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Apellidos <span className="text-red-600">*</span>
                                    </label>
                                    <Input
                                        placeholder="Ej: Pérez García"
                                        value={singleWorkerForm.apellidos}
                                        onChange={(e) => setSingleWorkerForm(prev => ({ ...prev, apellidos: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        PIN <span className="text-sm text-gray-500">(opcional, se genera automáticamente)</span>
                                    </label>
                                    <Input
                                        placeholder="12345"
                                        maxLength={5}
                                        value={singleWorkerForm.pin}
                                        onChange={(e) => setSingleWorkerForm(prev => ({ ...prev, pin: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Departamento</label>
                                    <Input
                                        placeholder="Ej: Recursos Humanos"
                                        value={singleWorkerForm.departamento}
                                        onChange={(e) => setSingleWorkerForm(prev => ({ ...prev, departamento: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Cargo</label>
                                <Input
                                    placeholder="Ej: Analista"
                                    value={singleWorkerForm.cargo}
                                    onChange={(e) => setSingleWorkerForm(prev => ({ ...prev, cargo: e.target.value }))}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSingleWorkerDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSingleWorkerSubmit}
                                disabled={isProcessing || !singleWorkerForm.nombres || !singleWorkerForm.apellidos || !singleWorkerForm.cedula}
                            >
                                {isProcessing ? 'Agregando...' : 'Agregar Trabajador'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Database Dialog */}
                <Dialog open={deleteDbDialogOpen} onOpenChange={setDeleteDbDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            size="lg"
                            className="w-64 h-64 flex flex-col items-center justify-center text-lg font-semibold gap-4"
                            variant="destructive"
                        >
                            <Trash2 className="h-16 w-16" />
                            Limpiar Registros
                            <span className="text-sm font-normal">Borrar reconocimientos</span>
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-red-600">Limpiar Registros de Reconocimiento</DialogTitle>
                            <DialogDescription>
                                Esta acción eliminará permanentemente todos los registros de reconocimiento facial, pero mantendrá intactos los trabajadores y sus descriptores faciales.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h4 className="font-semibold text-red-800 mb-2">⚠️ Advertencia</h4>
                                <ul className="text-sm text-red-700 space-y-1">
                                    <li>• Se eliminarán todos los registros de reconocimiento</li>
                                    <li>• Se perderá el historial de asistencia</li>
                                    <li>• Los trabajadores y rostros registrados se mantendrán</li>
                                    <li>• Esta acción NO se puede deshacer</li>
                                </ul>
                            </div>
                            <p className="text-sm text-gray-600">
                                Útil para limpiar datos de prueba o reiniciar el historial de asistencia.
                            </p>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteDbDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteDatabase}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Limpiando...' : 'Limpiar Registros'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}

export const Route = createFileRoute('/admin/acciones')({
    component: Acciones,
})
