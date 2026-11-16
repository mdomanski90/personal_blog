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

// PACZKA5_2026: zachowujemy zakładki teczki i resztę strony bez zmian.
const PODMENU: Record<string, { href: string; tekst: string }[]> = {
    '/miejsca': [
        { href: '/miejsca', tekst: 'miejscowości' },
        { href: '/parafie', tekst: 'instytucje' },
        { href: '/obiekty', tekst: 'obiekty' },
    ],
    // P7D-1: kolejność jak w spisie działów archiwum (I–VIII)
    '/archiwum': [
        { href: '/archiwum', tekst: 'wszystkie materiały' },
        { href: '/archiwum?rodzaj=dokument', tekst: 'dokumenty' },
        { href: '/archiwum?rodzaj=akt', tekst: 'akty metrykalne' },
        { href: '/archiwum?rodzaj=wspomnienie', tekst: 'wspomnienia i relacje' },
        { href: '/archiwum?rodzaj=zdjecie', tekst: 'fotografie' },
        { href: '/archiwum?rodzaj=nagranie', tekst: 'nagrania' },
        { href: '/archiwum?rodzaj=mapa', tekst: 'mapy' },
        { href: '/archiwum/zbiory', tekst: 'zbiory i kolekcje' },
    ],
    // P7D-1 (AUD-01): biblioteka z podmenu jak archiwum – te same działy co w spisie biblioteki
    // (16.11: parafie i urzędy tylko w „miejsca → instytucje”)
    '/biblioteka': [
        { href: '/biblioteka/publikacje', tekst: 'publikacje i opracowania' },
        { href: '/biblioteka/ksiegi', tekst: 'księgi metrykalne' },
        { href: '/biblioteka/slownik', tekst: 'słownik' },
    ],
}
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
    const [rozwiniete, setRozwiniete] = React.useState<string | null>(null)
    // P7A-3: na telefonie menu schowane pod przyciskiem ≡ (lista z działami, podmenu rozwijane w miejscu)
    const [menuOtwarte, setMenuOtwarte] = React.useState(false)
    const navRef = React.useRef<HTMLElement>(null)
    React.useEffect(() => { setRozwiniete(null); setMenuOtwarte(false) }, [pathname])
    React.useEffect(() => {
        const key = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && rozwiniete) {
                navRef.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus()
                setRozwiniete(null)
            }
        }
        const click = (e: MouseEvent) => { if (navRef.current && !navRef.current.contains(e.target as Node)) setRozwiniete(null) }
        document.addEventListener('keydown', key)
        document.addEventListener('mousedown', click)
        return () => { document.removeEventListener('keydown', key); document.removeEventListener('mousedown', click) }
    }, [rozwiniete])

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
                <div className="naglowek-przyciski flex shrink-0 items-center justify-end gap-2">
                    <button type="button" className="k-btn k-btn--s menu-przelacz" aria-expanded={menuOtwarte} aria-controls="menu-glowne"
                        onClick={() => setMenuOtwarte((o) => !o)}>
                        <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"><path d="M1 1h14M1 6h14M1 11h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                        menu
                    </button>
                    <Logowanie />
                    <ThemeToggle />
                </div>
            </div>

            <nav ref={navRef} id="menu-glowne" aria-label="menu główne" className={`menu-zakladki${menuOtwarte ? ' menu-otwarte' : ''}`}>
                {MENU.map((m) => {
                    const akt = aktywny(pathname, m.href) ||
                        (m.href === '/miejsca' && (!!pathname?.startsWith('/parafie') || !!pathname?.startsWith('/obiekty')))
                    const pod = PODMENU[m.href]
                    return <div key={m.href} className={`menu-grupa ${m.href === '/archiwum' ? 'menu-archiwum' : ''}`}
                        onMouseEnter={(e) => { if (pod && window.matchMedia('(hover: hover) and (pointer: fine)').matches) setRozwiniete(m.href) }}
                        onMouseLeave={() => { if (pod && window.matchMedia('(hover: hover) and (pointer: fine)').matches) setRozwiniete(null) }}
                        onBlurCapture={(e) => { if (pod && !e.currentTarget.contains(e.relatedTarget as Node | null)) setRozwiniete(null) }}
                    >
                        <Link href={m.href} aria-current={akt ? 'page' : undefined} className="zakladka">
                            {m.tekst}
                        </Link>
                        {pod && <button type="button" className="menu-rozwij" aria-label={`podstrony: ${m.tekst}`}
                            aria-controls={rozwiniete === m.href ? `podmenu-${m.href.slice(1)}` : undefined} aria-expanded={rozwiniete === m.href}
                            onClick={() => setRozwiniete(rozwiniete === m.href ? null : m.href)}>{rozwiniete === m.href ? '▴' : '▾'}</button>}
                        {pod && rozwiniete === m.href && <div id={`podmenu-${m.href.slice(1)}`} className="menu-podlista">
                            {pod.map((x) => <Link key={x.href} href={x.href} aria-current={!x.href.includes('?') && pathname === x.href ? 'page' : undefined} onClick={() => setRozwiniete(null)}>{x.tekst}</Link>)}
                        </div>}
                    </div>
                })}
            </nav>

            {glowna ? (
                <div id="wysz-start" tabIndex={-1} style={{ marginTop: '1.25rem' }}>
                    <Suspense fallback={<div style={{ height: 50 }} />}><Wyszukiwarka wariant="duzy" /></Suspense>
                    {/* P7A-4: druga droga obok wyszukiwania – dla tych, którzy przychodzą bez konkretnego pytania */}
                    <nav aria-label="przeglądaj" className="glowna-przegladaj">
                        <Link href="/archiwum" className="glowna-przegladaj-glowny">przeglądaj archiwum →</Link>
                        <Link href="/miejsca" className="odn">miejscowości</Link>
                        <Link href="/osoby" className="odn">osoby</Link>
                    </nav>
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
