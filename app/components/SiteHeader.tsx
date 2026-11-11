'use client'

import { Link } from 'next-view-transitions'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import ThemeToggle from './ThemeToggle'

// Menu: tylko działy, które już istnieją. Kolejne (osoby, archiwum, biblioteczka) dochodzą z kolejnymi etapami.
const MENU: { href: string; tekst: string }[] = [
    { href: '/', tekst: 'strona główna' },
    { href: '/opowiesci', tekst: 'opowieści' },
    { href: '/miejsca', tekst: 'miejsca' },
    { href: '/tematy', tekst: 'tematy' },
    { href: '/o-projekcie', tekst: 'o projekcie' },
]

const linkStyl = {
    fontSize: '14px',
    height: '25px',
    padding: '0 10px',
    display: 'flex',
    alignItems: 'center',
    textTransform: 'lowercase' as const,
}

function aktywny(pathname: string | null, href: string) {
    if (!pathname) return false
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
}

function Wyszukiwarka() {
    const params = useSearchParams()
    return (
        <form action="/szukaj" method="get" role="search" className="flex flex-wrap items-center gap-2 w-full" style={{ marginTop: '0.75rem' }}>
            <label htmlFor="szukaj-q" className="lowercase" style={{ fontSize: '14px' }}>szukaj</label>
            <input
                id="szukaj-q"
                name="q"
                type="search"
                defaultValue={params?.get('q') ?? ''}
                placeholder="np. Olszanka, bieżeństwo"
                className="flex-1 bg-transparent border border-[#d1d5db] dark:border-[#4b5563] px-2"
                style={{ fontSize: '14px', height: '28px', minWidth: '12rem' }}
            />
        </form>
    )
}

export default function SiteHeader() {
    const pathname = usePathname()

    return (
        <header>
            <div className="flex flex-wrap items-center justify-between mb-1" style={{ gap: '0.5rem 1rem' }}>
                <div>
                    <Link href="/" className="!no-underline text-current">
                        <span
                            className="block text-3xl sm:text-6xl font-bold tracking-tighter whitespace-nowrap"
                            style={{ lineHeight: 1, marginBottom: 0 }}
                        >
                            odniepamieci.pl
                        </span>
                    </Link>
                    <p
                        className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 tracking-tight lowercase"
                        style={{ lineHeight: 1.2, marginTop: '7px' }}
                    >
                        społeczne archiwum pamięci lokalnej
                    </p>
                </div>
                <ThemeToggle />
            </div>

            <nav aria-label="menu główne" style={{ marginTop: '1rem' }}>
                <div className="flex flex-wrap items-center border border-[#d1d5db] dark:border-[#4b5563] w-fit">
                    {MENU.map((m, i) => {
                        const akt = aktywny(pathname, m.href)
                        return (
                            <Link
                                key={m.href}
                                href={m.href}
                                aria-current={akt ? 'page' : undefined}
                                style={{ ...linkStyl, fontWeight: akt ? 700 : 400 }}
                                className={`${akt ? 'bg-muted text-accent-foreground' : 'text-current hover:opacity-80 transition-opacity'} whitespace-nowrap !no-underline ${i > 0 ? 'border-l border-[#d1d5db] dark:border-[#4b5563]' : ''}`}
                            >
                                {m.tekst}
                            </Link>
                        )
                    })}
                </div>
            </nav>

            <Suspense fallback={null}>
                <Wyszukiwarka />
            </Suspense>

            <div className="text-gray-400 dark:text-gray-600 mt-6 whitespace-nowrap overflow-hidden opacity-50" aria-hidden="true">
                ------------------------------------------------------------------------------------------------------
            </div>
        </header>
    )
}
