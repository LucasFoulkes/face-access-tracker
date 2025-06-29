import { createFileRoute } from '@tanstack/react-router'

function Tablas() {
    return (
        <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold">Tablas</h1>
            </div>
            <div className="bg-white p-8 rounded-lg shadow">
                <p className="text-lg text-gray-600">Hello from Tablas page!</p>
            </div>
        </div>
    )
}

export const Route = createFileRoute('/admin/tablas')({
    component: Tablas,
})
