import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { type Usuario } from "@/lib/db";
import { useViewport } from "@/hooks/useViewport";

interface UserInfoTableProps {
    user: Usuario;
}

export function UserInfoTable({ user }: UserInfoTableProps) {
    const { isMobile } = useViewport();

    // Skip internal ID for display
    const displayFields = Object.entries(user).filter(([key]) => key !== 'id');

    // Format field names for better readability
    const formatFieldName = (key: string) => {
        const formattedNames: Record<string, string> = {
            'codigo': 'Código',
            'cedula': 'Cédula',
            'apellidos': 'Apellidos',
            'nombres': 'Nombres',
            'pin': 'PIN'
        };

        return formattedNames[key] || key.charAt(0).toUpperCase() + key.slice(1);
    };

    return (
        <Table className="w-full">
            <TableBody>
                {displayFields.map(([key, value]) => (
                    <TableRow key={key} className={isMobile ? 'text-sm' : ''}>
                        <TableCell className={`font-bold ${isMobile ? 'py-2 px-2' : 'py-3 px-4'}`}>
                            {formatFieldName(key)}
                        </TableCell>
                        <TableCell className={isMobile ? 'py-2 px-2' : 'py-3 px-4'}>
                            {String(value)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
