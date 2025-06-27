import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';

interface SmartTableProps {
    data: any[];
    onDelete?: (item: any, index: number) => void;
    onEdit?: (item: any, index: number) => void;
}

export default function SmartTable({ data, onDelete, onEdit }: SmartTableProps) {
    if (!data.length) return <div className="p-8 text-center text-muted-foreground">No data found</div>;

    // Get all possible keys from the data
    const allKeys = Array.from(new Set(data.flatMap(item => Object.keys(item))));
    const hasActions = onDelete || onEdit;

    // Smart value renderer
    const renderValue = (value: any) => {
        if (Array.isArray(value)) {
            return <Badge variant="outline">{value.length} items</Badge>;
        }
        if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
            return <span className="font-mono text-xs">{new Date(value).toLocaleString()}</span>;
        }
        if (typeof value === 'string' && value.length > 50) {
            return <span className="text-xs text-muted-foreground">{value.substring(0, 50)}...</span>;
        }
        return <span className="font-mono">{String(value)}</span>;
    };

    return (
        <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    {/* Header */}
                    <thead className="bg-muted/50 border-b">
                        <tr>
                            {allKeys.map(key => (
                                <th key={key} className="p-3 text-left font-medium text-sm text-muted-foreground border-r last:border-r-0">
                                    {key}
                                </th>
                            ))}
                            {hasActions && (
                                <th className="p-3 text-left font-medium text-sm text-muted-foreground w-32">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>

                    {/* Body */}
                    <tbody className="divide-y">
                        {data.map((item, index) => (
                            <tr key={index} className="hover:bg-muted/50">
                                {allKeys.map(key => (
                                    <td key={key} className="p-3 text-sm border-r last:border-r-0">
                                        {renderValue(item[key] || '-')}
                                    </td>
                                ))}
                                {hasActions && (
                                    <td className="p-3 w-32">
                                        <div className="flex gap-1">
                                            {onEdit && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onEdit(item, index)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {onDelete && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => onDelete(item, index)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
