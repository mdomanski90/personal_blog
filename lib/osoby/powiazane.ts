// Decyzja 22.11: pola osoby (materiał – „Powiązane osoby”, blok „Drzewo osoby”) przyjmują identyfikator z drzewa
// albo nr kat. „OS-…” (wpisany ręcznie albo przez okno wyboru). Moduł czysty – dane: lib/osoby/powiazane-serwer.ts.
import { parsujNr } from '../katalog/model'

type ZNumeru = (nr: string) => { rodzaj: string; id: string } | undefined

/** Identyfikator osoby z wpisu w polu; numer innego rodzaju albo nieznany zostaje jak był (karta go pominie, panel jakości ostrzeże). */
export function idOsoby(wpis: string, istnieje: (id: string) => boolean, zNumeru: ZNumeru): string | null {
    const t = String(wpis ?? '').trim()
    if (!t) return null
    if (istnieje(t)) return t
    const nr = parsujNr(t)
    if (nr?.startsWith('OS-')) {
        const p = zNumeru(nr)
        if (p?.rodzaj === 'osoba') return p.id
    }
    return t
}

export function idsOsob(wpisy: readonly string[], istnieje: (id: string) => boolean, zNumeru: ZNumeru): string[] {
    return [...new Set(wpisy.map((w) => idOsoby(w, istnieje, zNumeru)).filter((x): x is string => !!x))]
}
