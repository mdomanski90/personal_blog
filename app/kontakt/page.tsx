import { Link } from "next-view-transitions"
import ThemeToggle from "../components/ThemeToggle"
import * as React from "react";

export default function Kontakt() {
    return (
        <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '2rem 1.25rem 5rem 1.25rem', minHeight: '100vh' }} className="font-mono">
            <div className="space-y-6">
                <header>
                    <div className="flex flex-wrap items-center justify-between mb-2" style={{ gap: '0.5rem 1rem' }}>
                        <h1 className="text-3xl sm:text-6xl font-bold tracking-tighter whitespace-nowrap">
                            odniepamieci.pl
                        </h1>
                        <ThemeToggle />
                    </div>
                    <nav className="flex text-sm" style={{ gap: '1rem', marginTop: '1rem' }}>
                        <Link href="/" className="!text-current !no-underline hover:opacity-80 transition-opacity">
                            Strona główna
                        </Link>
                        <Link href="/kontakt" className="font-bold !text-current !no-underline bg-muted hover:opacity-80 transition-opacity">
                            Kontakt
                        </Link>
                    </nav>
                    <div className="text-gray-400 dark:text-gray-600 mt-6 whitespace-nowrap overflow-hidden">
                        ---------------------------------------------------------------------
                    </div>
                </header>

                <article className="prose dark:prose-invert prose-slate max-w-none leading-relaxed" style={{ fontSize: 'var(--blog-font-size, 18px)' }}>
                    <h2 className="text-3xl font-bold">Kontakt</h2>
                    <p>Możesz się ze mną skontaktować pisząc na adres:</p>
                    <p><a href="mailto:domanski.mateusz@proton.me">domanski.mateusz@proton.me</a></p>
                </article>

                <footer className="pt-10">
                    <code className="rounded bg-muted px-3 py-1 text-base font-semibold">
                        © {new Date().getFullYear()} odniepamieci.pl
                    </code>
                </footer>
            </div>
        </div>
    )
}