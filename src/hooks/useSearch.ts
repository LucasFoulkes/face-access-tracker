import { useState, useMemo } from 'react';

interface UseSearchOptions {
    data: any[];
    searchFields?: string[];
    normalizeText?: boolean;
}

export function useSearch({ data, searchFields, normalizeText = true }: UseSearchOptions) {
    const [searchQuery, setSearchQuery] = useState('');

    const normalize = (text: string) => normalizeText
        ? text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
        : text.toLowerCase().trim();

    const filteredData = useMemo(() => {
        if (!data?.length || !searchQuery.trim()) return data || [];

        const normalizedQuery = normalize(searchQuery);
        const fieldsToSearch = searchFields || (data.length ? Object.keys(data[0]) : []);

        return data.filter(row =>
            fieldsToSearch.some(field =>
                normalize(String(row[field] || '')).includes(normalizedQuery)
            )
        );
    }, [data, searchQuery, searchFields, normalizeText]);

    return {
        searchQuery,
        setSearchQuery,
        filteredData,
        hasActiveSearch: searchQuery.trim().length > 0
    };
}
