'use client'

import { useState } from 'react'
import PhotoFilters, { FilterState } from './PhotoFilters'
import PhotoGallery from './PhotoGallery'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination'

interface Photo {
    id: number
    title: string
    src: string
    thumbnail: string
    width: number
    height: number
    location: string
    category: string
    year: string
    description: string
    source: string
}

interface PhotosContentProps {
    allPhotos: Photo[]
}

function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: (number | 'ellipsis')[] = [1]

    if (currentPage > 3) {
        pages.push('ellipsis')
    }

    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)

    for (let i = start; i <= end; i++) {
        pages.push(i)
    }

    if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
    }

    pages.push(totalPages)

    return pages
}

export default function PhotosContent({ allPhotos }: PhotosContentProps) {
    const [filteredPhotos, setFilteredPhotos] = useState(allPhotos)
    const [currentPage, setCurrentPage] = useState(1)
    const photosPerPage = 24

    const locations = [...new Set(allPhotos.map(p => p.location))].sort()
    const categories = [...new Set(allPhotos.map(p => p.category))].sort()
    const years = [...new Set(allPhotos.map(p => p.year))].sort()

    const handleFilterChange = (filters: FilterState) => {
        let filtered = allPhotos

        if (filters.location !== 'wszystkie') {
            filtered = filtered.filter(p => p.location === filters.location)
        }
        if (filters.category !== 'wszystkie') {
            filtered = filtered.filter(p => p.category === filters.category)
        }
        if (filters.year !== 'wszystkie') {
            filtered = filtered.filter(p => p.year === filters.year)
        }
        if (filters.search) {
            filtered = filtered.filter(p =>
                p.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                p.description.toLowerCase().includes(filters.search.toLowerCase())
            )
        }

        setFilteredPhotos(filtered)
        setCurrentPage(1)
    }

    const totalPages = Math.ceil(filteredPhotos.length / photosPerPage)
    const startIndex = (currentPage - 1) * photosPerPage
    const currentPhotos = filteredPhotos.slice(startIndex, startIndex + photosPerPage)
    const pageNumbers = getPageNumbers(currentPage, totalPages)

    const goToPage = (page: number) => {
        setCurrentPage(page)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <>
            {/* Filtry */}
            <div className="mb-16">
                <PhotoFilters
                    locations={locations}
                    categories={categories}
                    years={years}
                    onFilterChange={handleFilterChange}
                />
            </div>

            {/* Licznik */}
            <div className="flex justify-end items-center mb-6">
                <div className="text-sm text-gray-500">
                    {filteredPhotos.length} {filteredPhotos.length === 1 ? 'zdjęcie' : 'zdjęć'}
                </div>
            </div>

            {/* Grid zdjęć */}
            <div className="mb-8">
                <PhotoGallery photos={currentPhotos} />
            </div>

            {/* Paginacja */}
            {totalPages > 1 && (
                <div className="pt-10">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (currentPage > 1) goToPage(currentPage - 1)
                                    }}
                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                                />
                            </PaginationItem>

                            {pageNumbers.map((page, index) =>
                                page === 'ellipsis' ? (
                                    <PaginationItem key={`ellipsis-${index}`}>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                ) : (
                                    <PaginationItem key={page}>
                                        <PaginationLink
                                            href="#"
                                            isActive={page === currentPage}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                goToPage(page)
                                            }}
                                        >
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                )
                            )}

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (currentPage < totalPages) goToPage(currentPage + 1)
                                    }}
                                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </>
    )
}