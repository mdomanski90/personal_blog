'use client'
import * as React from 'react'

import { Link } from 'next-view-transitions'
import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import ThemeToggle from './ThemeToggle'
import Logowanie from './Logowanie'
import Emblemat from './Emblemat'
import Wroc from './Wroc'
import Wyszukiwarka from './Wyszukiwarka'

// Menu główne: zakładki teczki stojące na linii w kolorze atramentu; na telefonie siatka w dwóch kolumnach.
const MENU: { href: string; tekst: string }[] = [
    { href: '/', tekst: 'strona główna' },
    { href: '/wpisy', tekst: 'wpisy' },
    { href: '/miejsca', tekst: 'miejsca' },
    { href: '/osoby', tekst: 'osoby' },
    { href: '/tematy', tekst: 'tematy' },
    { href: '/archiwum', tekst: 'archiwum' },
    { href: '/biblioteka', tekst: 'biblioteka' },
    { href: '/o-projekcie', tekst: 'o projekcie' },
]

function aktywny(pathname: string | null, href: string) {
    if (!pathname) return false
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
}

// Dwie rzeki – Toczna i Liwiec – dwie spokojne fale tą samą kreską co emblemat (currentColor).
// Płyną obok siebie, nie łączą się (obie uchodzą osobno do Bugu).
function Fale() {
    return (
        <svg width="46" height="12" viewBox="0 0 46 12" aria-hidden="true" focusable="false">
            <path d="M1 3.6c3.6-2.4 7.2-2.4 10.8 0s7.2 2.4 10.8 0 7.2-2.4 10.8 0 7.2 2.4 10.8 0" />
            <path d="M5 9.2c3.1-2 6.2-2 9.3 0s6.2 2 9.3 0 6.2-2 9.3 0 4.7 1.6 7.8.6" opacity=".55" />
        </svg>
    )
}

export default function SiteHeader({ akcje }: { akcje?: React.ReactNode } = {}) {
    const pathname = usePathname()
    const glowna = pathname === '/'

    return (
        <header>
            {/* niewidoczny, dopóki nie dojdzie się do niego klawiszem Tab */}
            <a href={glowna ? '#wysz-start' : '#tresc'} className="pomin-do-tresci">przejdź do treści</a>
            {/* na telefonie przyciski (zaloguj, motyw, A−/A+) nad tytułem, na szerszym ekranie obok */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between" style={{ gap: '0.75rem 1rem' }}>
                <div className="min-w-0 flex items-end" style={{ gap: '14px' }}>
                    <Link href="/" className="!no-underline text-current shrink-0 naglowek-emblemat" aria-label="odniepamieci.pl – strona główna">
                        <Emblemat rozmiar={100} />
                    </Link>
                    <div className="min-w-0">
                    <Link href="/" className="!no-underline text-current">
                        <span className="block font-bold whitespace-nowrap" style={{ fontSize: 'clamp(1.5rem, 8vw, 2rem)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                            odniepamieci.pl
                        </span>
                    </Link>
                    <p className="lowercase" style={{ fontSize: '16px', lineHeight: 1.2, marginTop: '7px' }}>
                        społeczne archiwum pamięci lokalnej
                    </p>
                    <p className="naglowek-rzeki">
                        <Fale />
                        <span>opowieści znad Tocznej i Liwca</span>
                    </p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2">
                    <Logowanie />
                    <ThemeToggle />
                </div>
            </div>

            <nav aria-label="menu główne" className="menu-zakladki">
                {MENU.map((m) => {
                    const akt = aktywny(pathname, m.href)
                    return (
                        <Link key={m.href} href={m.href} aria-current={akt ? 'page' : undefined} className="zakladka">
                            {m.tekst}
                        </Link>
                    )
                })}
            </nav>

            {glowna ? (
                <div id="wysz-start" tabIndex={-1} style={{ marginTop: '1.25rem' }}>
                    <Suspense fallback={<div style={{ height: 50 }} />}><Wyszukiwarka wariant="duzy" /></Suspense>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2" style={{ marginTop: '1rem' }}>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto empty:hidden"><Wroc />{akcje}</div>
                    <Suspense fallback={<div className="flex-1" style={{ height: 30 }} />}><Wyszukiwarka /></Suspense>
                </div>
            )}
        </header>
    )
}
