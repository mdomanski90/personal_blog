'use client'

import { Link } from 'next-view-transitions'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import ThemeToggle from './ThemeToggle'
import Logowanie from './Logowanie'
import Emblemat from './Emblemat'

// Menu główne (docelowe). Na telefonie zwinięte pod jednym przyciskiem.
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

const RAMKA = 'border-[#d1d5db] dark:border-[#4b5563]'

function Wyszukiwarka() {
    const params = useSearchParams()
    return (
        <form
            action="/szukaj"
            method="get"
            role="search"
            className={`flex items-stretch flex-1 min-w-0 sm:flex-none sm:ml-auto overflow-hidden border ${RAMKA}`}
            style={{ borderRadius: '7px' }}
        >
            <label htmlFor="szukaj-q" className="bg-muted lowercase whitespace-nowrap" style={{ ...linkStyl, height: 'auto' }}>szukaj</label>
            <input
                id="szukaj-q"
                name="q"
                type="search"
                defaultValue={params?.get('q') ?? ''}
                placeholder="np. Olszanka, bieżeństwo"
                className={`flex-1 min-w-0 sm:flex-none sm:w-64 bg-transparent text-current border-0 border-l ${RAMKA} outline-none`}
                style={{ fontSize: '14px', height: '28px', padding: '0 10px' }}
            />
        </form>
    )
}

export default function SiteHeader() {
    const pathname = usePathname()
    const [otwarte, setOtwarte] = useState(false)
    useEffect(() => setOtwarte(false), [pathname])
    const biezacy = MENU.find((m) => aktywny(pathname, m.href))?.tekst ?? 'menu'

    return (
        <header>
            <div className="flex items-center justify-between" style={{ gap: '0.5rem 1rem' }}>
                <div className="min-w-0 flex items-end" style={{ gap: '14px' }}>
                    <Link href="/" className="!no-underline text-current shrink-0" aria-label="odniepamieci.pl – strona główna" style={{ marginTop: '0.6rem' }}>
                        <Emblemat rozmiar={64} />
                    </Link>
                    <div className="min-w-0">
                    <Link href="/" className="!no-underline text-current">
                        <span className="block font-bold whitespace-nowrap" style={{ fontSize: 'clamp(1.5rem, 8vw, 2rem)', lineHeight: 1, marginTop: '1.34rem' }}>
                            odniepamieci.pl
                        </span>
                    </Link>
                    <p className="lowercase" style={{ fontSize: '16px', lineHeight: 1.2, marginTop: '7px' }}>
                        społeczne archiwum pamięci lokalnej
                    </p>
                    </div>
                </div>
                {/* na szerszym ekranie przyciski obok tytułu, na telefonie w linii z wyszukiwarką */}
                <div className="hidden sm:flex shrink-0 items-center gap-2">
                    <Logowanie />
                    <ThemeToggle />
                </div>
            </div>

            <nav aria-label="menu główne" style={{ marginTop: '2rem' }}>
                {/* telefon: jeden przycisk z nazwą bieżącego działu, po kliknięciu pełna lista */}
                <div className="sm:hidden flex items-center justify-between gap-2" style={{ marginBottom: otwarte ? 6 : 0 }}>
                <button
                    type="button"
                    className={`border ${RAMKA} bg-muted text-current cursor-pointer`}
                    style={{ ...linkStyl, fontWeight: 700, fontFamily: 'inherit' }}
                    aria-expanded={otwarte}
                    aria-controls="menu-glowne"
                    onClick={() => setOtwarte((o) => !o)}
                >
                    {biezacy} {otwarte ? '▴' : '▾'}
                </button>
                <Logowanie />
                </div>
                {/* każda pozycja ma pełną ramkę, a sąsiednie nachodzą na siebie o 1px –
                    po zawinięciu do drugiej linii kreski się nie dublują i nie zostaje pusta ramka */}
                <div id="menu-glowne" className={`${otwarte ? 'flex flex-col sm:flex-row' : 'hidden'} sm:flex flex-wrap w-fit`} style={{ paddingLeft: 1, paddingTop: 1 }}>
                    {MENU.map((m) => {
                        const akt = aktywny(pathname, m.href)
                        return (
                            <Link
                                key={m.href}
                                href={m.href}
                                aria-current={akt ? 'page' : undefined}
                                style={{ ...linkStyl, fontWeight: akt ? 700 : 400, margin: '-1px 0 0 -1px' }}
                                className={`${akt ? 'bg-muted text-accent-foreground' : 'text-current hover:opacity-80 transition-opacity'} whitespace-nowrap !no-underline border ${RAMKA}`}
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

            <div className="flex items-center gap-2" style={{ marginTop: '0.75rem' }}>
                <Suspense fallback={<div className="flex-1" style={{ height: 30 }} />}>
                    <Wyszukiwarka />
                </Suspense>
                <div className="sm:hidden shrink-0 flex items-center gap-2">
                    <ThemeToggle />
                </div>
            </div>
        </header>
    )
}
