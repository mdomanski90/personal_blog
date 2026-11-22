// Decyzja 22.11: logika okna wyboru osób w Keystatic (bez React) – widok: app/keystatic/WyborOsob.tsx.
import { normalizuj } from '../tekst'
import { parsujNr } from '../katalog/model'

export interface OsobaDoWyboru { id: string; nazwa: string; lata: string; miejsce: string; plec: string; widocznosc: string; nr: string | null }

export const ILE_WYNIKOW_OSOB = 30
const WIDOCZNOSC: Record<string, string> = { publiczne: 'publiczna', bliscy: 'dla bliskich', ja: 'tylko ja' }

/** Szukanie: nr kat. (dowolny zapis) – dokładnie; inaczej każde słowo w nazwie, latach, miejscowości lub identyfikatorze; wynik alfabetycznie. */
export function szukajOsob(L: OsobaDoWyboru[], q: string, ile = ILE_WYNIKOW_OSOB): OsobaDoWyboru[] {
    const nr = parsujNr(q)
    if (nr?.startsWith('OS-')) return L.filter((o) => o.nr === nr).slice(0, 1)
    const slowa = normalizuj(q).split(' ').filter(Boolean)
    if (!slowa.length) return []
    return L.filter((o) => { const t = normalizuj(`${o.nazwa} ${o.lata} ${o.miejsce} ${o.id} ${o.nr ?? ''}`); return slowa.every((s) => t.includes(s)) })
        .sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl') || a.lata.localeCompare(b.lata))
        .slice(0, ile)
}

export const opisOsoby = (o: OsobaDoWyboru) => [o.lata, o.miejsce, o.nr, WIDOCZNOSC[o.widocznosc] ?? o.widocznosc].filter(Boolean).join(' · ')
