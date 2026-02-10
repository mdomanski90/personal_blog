'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'

interface DataTableProps {
    data: any[]
}

export default function DataTable({ data = [] }: DataTableProps) {
    const [filters, setFilters] = useState<Record<string, string>>({})

    const columns = [
        { key: 'title', label: 'tytuł' },
        { key: 'author', label: 'autor' },
        { key: 'category', label: 'kategoria' },
        { key: 'year', label: 'rok' },
        { key: 'rating', label: 'ocena' },
        { key: 'description', label: 'opis' },
    ]

    const filteredData = useMemo(() => {
        return data.filter(row => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true
                const cellValue = String(row[key] || '').toLowerCase()
                return cellValue.includes(value.toLowerCase())
            })
        })
    }, [data, filters])

    const handleFilterChange = (column: string, value: string) => {
        setFilters(prev => ({ ...prev, [column]: value }))
    }

    return (
        <div className="space-y-4">
            <div className="text-sm lowercase text-gray-600 dark:text-gray-400">
                wyświetlono: <span className="font-bold">{filteredData.length}</span> z {data.length}
            </div>

            <article className="post-content prose prose-slate dark:prose-invert max-w-none leading-relaxed" style={{ fontSize: 'var(--blog-font-size, 18px)' }}>
                <div className="overflow-x-auto">
                    <table>
                        <thead>
                        <tr>
                            {columns.map(col => (
                                <th key={col.key}>
                                    <div className="space-y-2 not-prose">
                                        <div className="lowercase font-bold">{col.label}</div>
                                        <Input
                                            placeholder="filtruj..."
                                            value={filters[col.key] || ''}
                                            onChange={(e) => handleFilterChange(col.key, e.target.value)}
                                            className="h-7 text-xs lowercase font-mono rounded-sm"
                                        />
                                    </div>
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {filteredData.length > 0 ? (
                            filteredData.map((row) => (
                                <tr key={row.id}>
                                    {columns.map(col => (
                                        <td key={col.key}>
                                            {row[col.key] || '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="text-center italic lowercase">
                                    brak wyników dla podanych filtrów
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </article>
        </div>
    )
}