// Słownik (SLW-01, P2): czyste funkcje listy haseł – filtr, litery, liczby rodzajów, adres hasła. Bez Next/React.
import { przygotujZapytanie, pasuje } from './szukanie'

export type HasloSlownika = { id: string; haslo: string; rodzaj: string; znaczenie: string; przyklad: string; zrodlo: string; formy: string[]; wystepowanie?: string[] }
export type FiltrHasel = { q?: string; rodzaj?: string; litera?: string; miejsce?: string }

/** Łatka P3 (plansza słownika): pełny alfabet w nawigacji liter, litery bez haseł wygaszone. */
export const ALFABET = ['A', 'B', 'C', 'Ć', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'Ł', 'M', 'N', 'O', 'P', 'R', 'S', 'Ś', 'T', 'U', 'W', 'Z', 'Ź', 'Ż']

/** Jedna strona hasła (P2, minimalna; rozbudowa – P3, SLW-02). */
export const adresHasla = (id: string) => `/biblioteka/slownik/${encodeURIComponent(id)}`

/** Pierwsza litera hasła, wielka; polskie znaki to osobne litery (Ł ≠ L, Ś ≠ S). */
export const literaHasla = (haslo: string) => haslo.trim().slice(0, 1).toLocaleUpperCase('pl')

const poFrazie = (hasla: HasloSlownika[], q: string | undefined) => {
    const z = q ? przygotujZapytanie(q) : null
    return z ? hasla.filter((x) => pasuje(z, [x.haslo, ...x.formy, x.znaczenie].join(' '))) : hasla
}

/** Fraza (z odmianą – jak w wyszukiwarce ogólnej), rodzaj i litera łącznie. */
export function filtrujHasla(hasla: HasloSlownika[], { q, rodzaj, litera, miejsce }: FiltrHasel): HasloSlownika[] {
    return poFrazie(hasla, q).filter((x) => (!rodzaj || x.rodzaj === rodzaj) && (!litera || literaHasla(x.haslo) === litera) && (!miejsce || (x.wystepowanie ?? []).includes(miejsce)))
}

/** Litery z liczbą haseł – po frazie i rodzaju, żeby pastylka liter nie obiecywała pustej listy. */
export function litery(hasla: HasloSlownika[]): { litera: string; ile: number }[] {
    const m = new Map<string, number>()
    for (const x of hasla) m.set(literaHasla(x.haslo), (m.get(literaHasla(x.haslo)) ?? 0) + 1)
    return [...m].map(([litera, ile]) => ({ litera, ile })).sort((a, b) => a.litera.localeCompare(b.litera, 'pl'))
}

/** Liczby haseł w rodzajach po samej frazie (pastylki rodzaju z liczbami; rodzaje z 0 ukrywa PastylkaFiltra). */
export function liczbyRodzajow(hasla: HasloSlownika[], q?: string): Record<string, number> {
    const wynik: Record<string, number> = {}
    for (const x of poFrazie(hasla, q)) wynik[x.rodzaj] = (wynik[x.rodzaj] ?? 0) + 1
    return wynik
}

/** Znaczenie na fiszce: do `max` znaków, cięcie na granicy słowa. */
export function skrocZnaczenie(tekst: string, max = 220): string {
    const t = tekst.replace(/\s+/g, ' ').trim()
    if (t.length <= max) return t
    const ciete = t.slice(0, max)
    const spacja = ciete.lastIndexOf(' ')
    return `${(spacja > max * 0.6 ? ciete.slice(0, spacja) : ciete).replace(/[\s,.;:–-]+$/, '')}…`
}

