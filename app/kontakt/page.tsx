import { Link } from "next-view-transitions"
import ThemeToggle from "../components/ThemeToggle"
import NavLinks from "../components/NavLinks"
import * as React from "react";
import Footer from "../components/Footer"

export default function Kontakt() {
    return (
        <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '2rem 1.25rem 5rem 1.25rem', minHeight: '100vh' }} className="font-mono">
            <div className="space-y-6">
                <header>
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

                <article className="prose dark:prose-invert prose-slate max-w-none leading-relaxed" style={{ fontSize: 'var(--blog-font-size, 18px)' }}>
                    <h2 className="font-bold lowercase" style={{ fontSize: 'calc(1.875rem * var(--font-scale, 1))' }}>kontakt</h2>
                    <p>możesz się ze mną skontaktować pisząc na adres:</p>
                    <p><a href="mailto:domanski.mateusz@proton.me">domanski.mateusz@proton.me</a></p>
                </article>

                <Footer />
            </div>
        </div>
    )
}
