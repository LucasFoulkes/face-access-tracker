import { createFileRoute } from '@tanstack/react-router'

function Reportes() {
    return (
        <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold">Reportes</h1>
            </div>
            <div className="bg-white p-8 rounded-lg shadow">
                <p className="text-lg text-gray-600">Hello from Reportes page!</p>
            </div>
        </div>
    )
}

export const Route = createFileRoute('/admin/reportes')({
    component: Reportes,
})
