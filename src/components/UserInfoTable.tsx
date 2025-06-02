import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { type Usuario } from "@/lib/db";

interface UserInfoTableProps {
    user: Usuario;
}

export function UserInfoTable({ user }: UserInfoTableProps) {
    return (
        <Table>
            <TableBody>
                {Object.entries(user).map(([key, value]) => (
                    <TableRow key={key}>
                        <TableCell className="font-bold">
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                        </TableCell>
                        <TableCell>{String(value)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
