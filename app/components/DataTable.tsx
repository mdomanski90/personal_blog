'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'

interface DataTableProps {
    data: any[]
}

type SortConfig = {
    key: string
    direction: 'asc' | 'desc' | null
}

export default function DataTable({ data = [] }: DataTableProps) {
    const [filters, setFilters] = useState<Record<string, string>>({})
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'data_dodania', direction: 'desc' })

    const columns = [
        { key: 'data_dodania', label: 'data dodania', sortable: true, type: 'date', width: '120px' },
        { key: 'typ', label: 'typ', sortable: false, width: '120px' },
        { key: 'osoba', label: 'osoba', sortable: false, width: '180px' },
        { key: 'miejscowosc', label: 'miejscowość', sortable: false, width: '150px' },
        { key: 'data_wydarzenia', label: 'data wydarzenia', sortable: true, type: 'date', width: '140px' },
        { key: 'zawartosc', label: 'zawartość', sortable: false, width: 'auto' },
    ]

    const handleSort = (columnKey: string) => {
        const column = columns.find(col => col.key === columnKey)
        if (!column?.sortable) return

        setSortConfig(prev => {
            if (prev.key === columnKey) {
                if (prev.direction === 'asc') return { key: columnKey, direction: 'desc' }
                if (prev.direction === 'desc') return { key: columnKey, direction: null }
                return { key: columnKey, direction: 'asc' }
            }
            return { key: columnKey, direction: 'asc' }
        })
    }

    const sortedAndFilteredData = useMemo(() => {
        // Filtrowanie
        let filtered = data.filter(row => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true
                const cellValue = String(row[key] || '').toLowerCase()
                return cellValue.includes(value.toLowerCase())
            })
        })

        // Sortowanie
        if (sortConfig.direction) {
            filtered = [...filtered].sort((a, b) => {
                const aVal = a[sortConfig.key]
                const bVal = b[sortConfig.key]

                // Obsługa wartości null/undefined
                if (aVal == null) return 1
                if (bVal == null) return -1

                // Porównanie dat
                const column = columns.find(col => col.key === sortConfig.key)
                if (column?.type === 'date') {
                    const dateA = new Date(aVal).getTime()
                    const dateB = new Date(bVal).getTime()
                    return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA
                }

                // Porównanie tekstowe
                const comparison = String(aVal).localeCompare(String(bVal))
                return sortConfig.direction === 'asc' ? comparison : -comparison
            })
        }

        return filtered
    }, [data, filters, sortConfig])

    const handleFilterChange = (column: string, value: string) => {
        setFilters(prev => ({ ...prev, [column]: value }))
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return '-'
        try {
            const date = new Date(dateString)
            return date.toLocaleDateString('pl-PL', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            })
        } catch {
            return dateString
        }
    }

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        const isActive = sortConfig.key === columnKey && sortConfig.direction

        if (!isActive) {
            return (
                <span className="inline-flex flex-col leading-none opacity-20 hover:opacity-40 transition-opacity ml-1">
                    <span className="text-[8px]">▴</span>
                    <span className="text-[8px] -mt-[2px]">▾</span>
                </span>
            )
        }

        return sortConfig.direction === 'asc'
            ? <span className="text-sm font-bold ml-1">▴</span>
            : <span className="text-sm font-bold ml-1">▾</span>
    }

    return (
        <div className="space-y-4">
            <div className="text-sm lowercase text-gray-600 dark:text-gray-400">
                wyświetlono: <span className="font-bold">{sortedAndFilteredData.length}</span> z {data.length}
            </div>

            <article className="post-content prose prose-slate dark:prose-invert max-w-none leading-relaxed" style={{ fontSize: 'var(--blog-font-size, 18px)' }}>
                <div className="overflow-x-auto">
                    <table>
                        <colgroup>
                            {columns.map(col => (
                                <col key={col.key} style={{ width: col.width }} />
                            ))}
                        </colgroup>
                        <thead>
                        <tr>
                            {columns.map(col => (
                                <th key={col.key} style={{ verticalAlign: 'bottom' }}>
                                    <div className="flex flex-col justify-between not-prose" style={{ minHeight: '60px' }}>
                                        <div
                                            className={`lowercase font-bold flex items-center select-none ${
                                                col.sortable
                                                    ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                                                    : ''
                                            }`}
                                            onClick={() => col.sortable && handleSort(col.key)}
                                        >
                                            <span>{col.label}</span>
                                            {col.sortable && <SortIcon columnKey={col.key} />}
                                        </div>
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
                        {sortedAndFilteredData.length > 0 ? (
                            sortedAndFilteredData.map((row) => (
                                <tr key={row.id}>
                                    {columns.map(col => (
                                        <td key={col.key}>
                                            {col.type === 'date'
                                                ? formatDate(row[col.key])
                                                : (row[col.key] || '-')
                                            }
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
