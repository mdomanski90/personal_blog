import * as React from 'react'
import { Link } from 'next-view-transitions'
import SiteHeader from './SiteHeader'
import Footer from './Footer'
import ScrollToTop from './ScrollToTop'
import ImageZoom from './ImageZoom'

// Wspólne elementy wyglądu: obramowane „segmenty”, linia z kresek, nagłówki sekcji.

export const RAMKA = 'border border-[#d1d5db] dark:border-[#4b5563]'
export const RAMKA_L = 'border-l border-[#d1d5db] dark:border-[#4b5563]'

const segmentStyl: React.CSSProperties = {
    fontSize: 'calc(15px * var(--font-scale, 1))',
    minHeight: 'calc(28px * var(--font-scale, 1))',
    padding: '0 10px',
    display: 'flex',
    alignItems: 'center',
}

/** Strona z nagłówkiem, stopką i powiększaniem obrazków. */
export function Strona({ children, szeroka = false }: { children: React.ReactNode; szeroka?: boolean }) {
    return (
        <>
            <div style={{ maxWidth: szeroka ? '64rem' : '52rem', margin: '0 auto', padding: '2rem 1.25rem 5rem 1.25rem', minHeight: '100vh' }} className="odp">
                <div className="space-y-6 w-full">
                    <div style={szeroka ? { maxWidth: '52rem', margin: '0 auto' } : undefined}>
                        <SiteHeader />
                    </div>
                    {children}
                    <ImageZoom />
                    <Footer />
                </div>
            </div>
            <ScrollToTop />
        </>
    )
}

export function Kreski({ className = '' }: { className?: string }) {
    return (
        <div aria-hidden="true" className={`whitespace-nowrap overflow-hidden opacity-50 ${className}`}>
            ------------------------------------------------------------------------------------------------------------------------
        </div>
    )
}

/** Rząd obramowanych etykiet, np. data · rodzaj · miejsca. Pierwsza wyróżniona tłem. */
export function Metki({ elementy }: { elementy: (React.ReactNode | { tekst: React.ReactNode; href: string })[] }) {
    const widoczne = elementy.filter((e) => e !== null && e !== undefined && e !== false && e !== '')
    if (!widoczne.length) return null
    return (
        <div className={`flex flex-wrap items-stretch w-fit ${RAMKA}`}>
            {widoczne.map((e, i) => {
                const klasy = `${i === 0 ? 'bg-muted' : RAMKA_L} text-current whitespace-nowrap`
                if (e && typeof e === 'object' && 'href' in (e as object)) {
                    const l = e as { tekst: React.ReactNode; href: string }
                    return (
                        <Link key={i} href={l.href} style={segmentStyl} className={`${klasy} !no-underline hover:opacity-80`}>
                            {l.tekst}
                        </Link>
                    )
                }
                return (
                    <span key={i} style={segmentStyl} className={klasy}>
                        {e as React.ReactNode}
                    </span>
                )
            })}
        </div>
    )
}

export function Sekcja({ tytul, children, id }: { tytul: string; children: React.ReactNode; id?: string }) {
    return (
        <section id={id} className="flex flex-col" style={{ gap: 'calc(0.75rem * var(--font-scale, 1))' }}>
            <h2 className="font-bold lowercase" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>{tytul}</h2>
            {children}
        </section>
    )
}

export function TytulStrony({ children, sciezka }: { children: React.ReactNode; sciezka?: { tekst: string; href: string }[] }) {
    return (
        <div className="flex flex-col" style={{ gap: '0.4rem' }}>
            {sciezka && sciezka.length > 0 && (
                <p className="text-gray-600 dark:text-gray-400 lowercase" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>
                    {sciezka.map((s, i) => (
                        <span key={s.href}>
                            {i > 0 && ' / '}
                            <Link href={s.href} className="!no-underline hover:underline">{s.tekst}</Link>
                        </span>
                    ))}
                </p>
            )}
            <h1 className="font-bold break-words leading-tight" style={{ fontSize: 'calc(1.75rem * var(--font-scale, 1))' }}>
                {children}
            </h1>
        </div>
    )
}

/** Treść Markdoc wyrenderowana do HTML (z klasami typografii jak dotąd). */
export function Tresc({ html, pusta = 'treść nie została jeszcze dodana.' }: { html: string; pusta?: string | null }) {
    if (!html) return pusta ? <p className="text-gray-500 italic lowercase">{pusta}</p> : null
    return (
        <div className="post-content" style={{ fontSize: 'var(--blog-font-size, 18px)' }}>
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    )
}

/** Wiersz metryczki: etykieta – wartość. */
export function Wiersz({ etykieta, children }: { etykieta: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-3 border-b border-[#e5e7eb] dark:border-[#374151] py-2" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>
            <span className="text-gray-600 dark:text-gray-400 shrink-0" style={{ width: '9rem', fontSize: 'calc(13px * var(--font-scale, 1))' }}>{etykieta}</span>
            <span className="min-w-0 break-words">{children}</span>
        </div>
    )
}

/** Data publikacji opowieści z nazwą dnia tygodnia (jak dotąd na stronie). */
export function dataZDniem(iso: string | null): string {
    if (!iso) return 'brak daty'
    const d = new Date(iso + 'T12:00:00')
    const dni = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota']
    return `${dni[d.getDay()]}, ${d.toLocaleDateString('pl-PL')}`
}
