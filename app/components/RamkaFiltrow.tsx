'use client'
// Decyzja właściciela 20.11 (ankieta, wariant A, wszędzie): w zwiniętym pasku „szukaj i filtruj” od razu jest pole szukania;
// tytuł paska zastępuje pole, obok przycisk „filtry ▾” (z liczbą aktywnych filtrów), pod nim rozwijane filtry.
// Pole nie może siedzieć w <summary> (element interaktywny w summary przełączałby panel), więc nagłówek jest zwykłym
// paskiem, a <details> z ukrytym summary zostaje tylko dla animacji rozwijania (5A, .rozwin-tresc – lib/ruch.test.ts).
// Wspólny dla: osoby (ListaOsob), archiwum i biblioteka (FiltryKatalogu), księgi (KatalogKsiegiNaZywo).
import * as React from 'react'
import { odmiana } from '@/lib/tekst'

const WASKI = '(max-width: 640px)'
const subskrybuj = (cb: () => void) => { const m = window.matchMedia(WASKI); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) }
/** telefon: krótsza podpowiedź w polu (dłuższa byłaby ucięta w połowie słowa) */
export function useWaskiEkran(): boolean {
    return React.useSyncExternalStore(subskrybuj, () => window.matchMedia(WASKI).matches, () => false)
}

export const RamkaFiltrow = React.forwardRef<HTMLDivElement, {
    /** pole szukania w pasku (PoleSzukania); dostaje informację o wąskim ekranie – do krótszej podpowiedzi */
    pole: (waski: boolean) => React.ReactNode
    /** liczba aktywnych filtrów (bez frazy) – na przycisku */
    aktywnych?: number
    otwarte: boolean
    naZmiane: (otwarte: boolean) => void
    /** zawartość rozwijana: filtry */
    children: React.ReactNode
}>(function RamkaFiltrow({ pole, aktywnych = 0, otwarte, naZmiane, children }, ref) {
    const id = React.useId()
    const waski = useWaskiEkran()
    return (
        <div ref={ref} className="k-filtry-ramka" data-otwarte={otwarte ? '' : undefined}>
            <div className="k-filtry-naglowek k-filtry-pasek">
                {pole(waski)}
                <button type="button" className="k-btn k-filtry-przelacz" aria-expanded={otwarte} aria-controls={`${id}-filtry`} onClick={() => naZmiane(!otwarte)}>
                    filtry{aktywnych > 0 && <span className="k-filtry-licznik" aria-label={odmiana(aktywnych, ['aktywny filtr', 'aktywne filtry', 'aktywnych filtrów'])}>{aktywnych}</span>} <span aria-hidden="true">{otwarte ? '▴' : '▾'}</span>
                </button>
            </div>
            <details id={`${id}-filtry`} className="k-filtry-szczegoly" open={otwarte} onToggle={(e) => { const o = (e.currentTarget as HTMLDetailsElement).open; if (o !== otwarte) naZmiane(o) }}>
                <summary tabIndex={-1} aria-hidden="true" />
                <div className="rozwin-tresc">{children}</div>
            </details>
        </div>
    )
})
