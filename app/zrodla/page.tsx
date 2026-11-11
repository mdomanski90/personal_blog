import * as React from "react"
import { getAllItems } from '@/lib/db'
import SiteHeader from "../components/SiteHeader"
import Footer from "../components/Footer"
import ScrollToTop from "../components/ScrollToTop"
import DataTable from "../components/DataTable"

export const dynamic = 'force-dynamic';

export default function ZrodlaPage() {
    const items = getAllItems();

    return (
        <>
            <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '2rem 1.25rem 5rem 1.25rem', minHeight: '100vh' }} className="font-mono">
                <div className="space-y-6 w-full">
                    <div style={{ maxWidth: '52rem', margin: '0 auto' }}>
                        <SiteHeader />
                    </div>

                    <DataTable data={items} />

                    <Footer />
                </div>
            </div>

            <ScrollToTop />
        </>
    )
}