// Adresy katalogów z filtrami w zapytaniu (archiwum, biblioteka): jedna funkcja zamiast osobnych w każdej stronie.
export type Parametry = Record<string, string | string[] | undefined>

/** Pierwsza wartość parametru, przycięta (adres z zewnątrz). */
export const wartosc = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v ?? '').slice(0, 120)

/**
 * Adres katalogu z bieżącymi filtrami: `pomin` – parametry usuwane, `ustaw` – nadpisywane (pusty tekst = usuń).
 * Numer strony zawsze od nowa, chyba że podany w `ustaw`.
 */
export function adresFiltrow(baza: string, sp: Parametry, { pomin = [], ustaw = {} }: { pomin?: string[]; ustaw?: Record<string, string> } = {}): string {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) {
        if (k === 'strona' || pomin.includes(k) || k in ustaw) continue
        const s = wartosc(v)
        if (s) p.set(k, s)
    }
    for (const [k, v] of Object.entries(ustaw)) if (v) p.set(k, v)
    const s = p.toString()
    return s ? `${baza}?${s}` : baza
}
