import * as React from "react"
import { getAllItems } from '@/lib/db'
import ThemeToggle from "../components/ThemeToggle"
import NavLinks from "../components/NavLinks"
import Footer from "../components/Footer"
import ScrollToTop from "../components/ScrollToTop"
import DataTable from "../components/DataTable"

export const dynamic = 'force-dynamic';

export default function BazaPage() {
    const items = getAllItems();

    return (
        <>
            <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '2rem 1.25rem 5rem 1.25rem', minHeight: '100vh' }} className="font-mono">
                <div className="space-y-6 w-full">
                    <header style={{ maxWidth: '52rem', margin: '0 auto' }}>
                        <div className="flex flex-wrap items-center justify-between mb-2" style={{ gap: '0.5rem 1rem' }}>
                            <h1 className="text-3xl sm:text-6xl font-bold tracking-tighter whitespace-nowrap">
                                odniepamieci.pl
                            </h1>
                            <ThemeToggle />
                        </div>
                        <div style={{ marginTop: '1rem' }}>
                            <NavLinks />
                        </div>
                        <div className="text-gray-400 dark:text-gray-600 mt-6 whitespace-nowrap overflow-hidden opacity-50">
                            ------------------------------------------------------------------------------------------------------
                        </div>
                    </header>

                    <DataTable data={items} />

                    <Footer />
                </div>
            </div>

            <ScrollToTop />
        </>
    )
}