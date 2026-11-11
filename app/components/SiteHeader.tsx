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
        <form action="/szukaj" method="get" role="search" className="flex items-stretch w-fit ml-auto border border-[#d1d5db] dark:border-[#4b5563]" style={{ marginTop: '0.75rem' }}>
            <label htmlFor="szukaj-q" className="bg-muted lowercase whitespace-nowrap" style={{ ...linkStyl, height: 'auto' }}>szukaj</label>
            <input
                id="szukaj-q"
                name="q"
                type="search"
                defaultValue={params?.get('q') ?? ''}
                placeholder="np. Olszanka, bieżeństwo"
                className="bg-transparent text-current border-0 border-l border-[#d1d5db] dark:border-[#4b5563] outline-none"
                style={{ fontSize: '14px', height: '28px', padding: '0 10px', width: '16rem', maxWidth: '60vw' }}
            />
        </form>
    )
}

export default function SiteHeader() {
    const pathname = usePathname()

    return (
        <header>
            <div className="flex flex-wrap items-center justify-between" style={{ gap: '0.5rem 1rem' }}>
                <div>
                    <Link href="/" className="!no-underline text-current">
                        <span className="block font-bold whitespace-nowrap" style={{ fontSize: '2rem', lineHeight: 1, marginTop: '1.34rem' }}>
                            odniepamieci.pl
                        </span>
                    </Link>
                    <p className="lowercase" style={{ fontSize: '16px', lineHeight: 1.2, marginTop: '7px' }}>
                        społeczne archiwum pamięci lokalnej
                    </p>
                </div>
                <ThemeToggle />
            </div>

            <nav aria-label="menu główne" style={{ marginTop: '2rem' }}>
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

            <div className="whitespace-nowrap overflow-hidden opacity-50" aria-hidden="true">
                ------------------------------------------------------------------------------------------------------
            </div>

            <Suspense fallback={null}>
                <Wyszukiwarka />
            </Suspense>
        </header>
    )
}
