import * as React from 'react'
import { Link } from 'next-view-transitions'
import SiteHeader from './SiteHeader'
import Footer from './Footer'
import ScrollToTop from './ScrollToTop'
import ImageZoom from './ImageZoom'
import DokumentyWTresci from './DokumentyWTresci'
import DrzewaLinie from './DrzewaLinie'

// Wspólne elementy wyglądu: obramowane „segmenty”, linia z kresek, nagłówki sekcji.

export const RAMKA = 'border border-[var(--linia-podzialu)]'
export const RAMKA_L = 'border-l border-[var(--linia-podzialu)]'

const segmentStyl: React.CSSProperties = {
    margin: '-1px 0 0 -1px',
    fontSize: 'calc(15px * var(--font-scale, 1))',
    minHeight: 'calc(28px * var(--font-scale, 1))',
    padding: '0 10px',
    display: 'flex',
    alignItems: 'center',
}

/** Strona z nagłówkiem, stopką i powiększaniem obrazków. */
export function Strona({ children, szeroka = false, akcje }: { children: React.ReactNode; szeroka?: boolean; akcje?: React.ReactNode }) {
    return (
        <>
            <div style={{ maxWidth: szeroka ? '64rem' : '52rem', margin: '0 auto', padding: '2rem 1.25rem 5rem 1.25rem', minHeight: '100vh' }} className="odp">
                <div className="space-y-6 w-full">
                    <div style={szeroka ? { maxWidth: '52rem', margin: '0 auto' } : undefined}>
                        <SiteHeader akcje={akcje} />
                    </div>
                    <main id="tresc" tabIndex={-1} className="space-y-6 outline-none">{children}</main>
                    <ImageZoom />
                    <DokumentyWTresci />
                    <DrzewaLinie />
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
        // pełne ramki nachodzące o 1px – po zawinięciu na telefonie kreski się nie dublują
        <div className="flex flex-wrap items-stretch w-fit" style={{ paddingLeft: 1, paddingTop: 1 }}>
            {widoczne.map((e, i) => {
                const klasy = `${RAMKA} ${i === 0 ? 'bg-muted' : ''} text-current whitespace-nowrap`
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

/** Tytuł strony; „akcje” (np. ← mapa, kopiuj link) stoją nad ścieżką, po lewej. */
export function TytulStrony({ children, sciezka, akcje }: { children: React.ReactNode; sciezka?: { tekst: string; href: string }[]; akcje?: React.ReactNode }) {
    return (
        <div className="flex flex-col" style={{ gap: '0.4rem' }}>
            {akcje && <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: '0.6rem' }}>{akcje}</div>}
            {/* P7B-2 (JV-15): okruszki – od strony głównej do działu; bieżąca strona to tytuł pod spodem (aria-current) */}
            {/* P7D-1 (AUD-07): okruszki na każdej stronie poza główną – na stronie działu samo „strona główna” */}
            <nav aria-label="okruszki" className="okruszki">
                <ol>
                    <li><Link href="/">strona główna</Link></li>
                    {(sciezka ?? []).map((s) => <li key={s.href}><Link href={s.href}>{s.tekst}</Link></li>)}
                </ol>
            </nav>
            <h1 className="font-bold break-words leading-tight" aria-current="page" style={{ fontSize: 'calc(1.75rem * var(--font-scale, 1))' }}>
                {children}
            </h1>
        </div>
    )
}

/** Czy HTML zawiera jakikolwiek tekst albo obraz (pusty dokument z panelu to np. „<article></article>”). */
export const maTekst = (html: string | null | undefined) => !!html && (/<img|<iframe|<video|<audio/i.test(html) || html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0)

/** Treść Markdoc wyrenderowana do HTML (z klasami typografii jak dotąd). */
export function Tresc({ html, pusta = 'treść nie została jeszcze dodana.' }: { html: string; pusta?: string | null }) {
    if (!maTekst(html)) return pusta ? <p className="text-[var(--tekst-etykieta)] italic lowercase">{pusta}</p> : null
    return (
        <div className="post-content" style={{ fontSize: 'var(--blog-font-size, 18px)' }}>
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    )
}

/** Wiersz metryczki: etykieta – wartość. */
export function Wiersz({ etykieta, children }: { etykieta: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-3 border-b border-[var(--linia-podzialu)] py-2" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>
            <span className="text-[var(--tekst-opis)] shrink-0" style={{ width: '9rem', fontSize: 'calc(13px * var(--font-scale, 1))' }}>{etykieta}</span>
            <span className="min-w-0 break-words">{children}</span>
        </div>
    )
}

const MIESIACE = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']

/** Data publikacji wpisu słownie: „4 lutego 2026” (bez dnia tygodnia; niezależnie od ustawień serwera). */
export function dataWpisu(iso: string | null): string {
    if (!iso) return 'brak daty'
    const [r, m, d] = iso.slice(0, 10).split('-').map(Number)
    if (!r || !m || !d || m > 12) return iso
    return `${d} ${MIESIACE[m - 1]} ${r}`
}
