import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Search } from 'lucide-react';

interface SmartTableProps {
    data: any[];
    searchPlaceholder: string;
    onDelete?: (item: any, index: number) => void;
}

export default function SmartTable({ data, searchPlaceholder, onDelete }: SmartTableProps) {
    const [search, setSearch] = useState('');

    if (!data.length) return <div className="p-8 text-center text-muted-foreground">No data found</div>;

    // Get all possible keys from the data
    const allKeys = Array.from(new Set(data.flatMap(item => Object.keys(item))));

    // Smart search across all fields
    const filteredData = data.filter(item =>
        Object.values(item).some(value =>
            String(value).toLowerCase().includes(search.toLowerCase())
        )
    );

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
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <div className="rounded-md border">
                <div className="overflow-x-auto">
                    {/* Header */}
                    <div className="border-b bg-muted/50 min-w-max">
                        <div className="flex">
                            {allKeys.map(key => (
                                <div key={key} className="p-3 font-medium text-sm text-muted-foreground min-w-32 border-r last:border-r-0">
                                    {key}
                                </div>
                            ))}
                            {onDelete && <div className="p-3 font-medium text-sm text-muted-foreground w-20">Actions</div>}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="divide-y min-w-max">
                        {filteredData.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                No results for "{search}"
                            </div>
                        ) : (
                            filteredData.map((item, index) => (
                                <div key={index} className="flex hover:bg-muted/50">
                                    {allKeys.map(key => (
                                        <div key={key} className="p-3 text-sm min-w-32 border-r last:border-r-0">
                                            {renderValue(item[key] || '-')}
                                        </div>
                                    ))}
                                    {onDelete && (
                                        <div className="p-3 w-20">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => onDelete(item, index)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
