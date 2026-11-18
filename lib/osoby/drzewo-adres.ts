// P4 (VIEW-05, DRZ-01): liczba pokoleń drzewa na karcie osoby żyje w adresie (?wstecz=N&naprzod=M&rodzenstwo=1) –
// pasek nad drzewem zmienia adres, serwer rysuje drzewo od nowa, a link do karty pamięta ustawienie.
// Moduł bez zależności od Markdoc (używa go też kod przeglądarki).

/** najwięcej pokoleń w jedną stronę */
export const MAKS_POKOLEN = 15
export const DOMYSLNE_WSTECZ = 2
export const DOMYSLNE_NAPRZOD = 2

export type ZakresKarty = 'malzonkowie' | 'rodzenstwo'
export interface ParametryDrzewa { wstecz: number; naprzod: number; zakres: ZakresKarty }
/** Wartości domyślne pokoleń – na karcie osoby 2/2; na stronie „całe drzewo” (PK, /osoby/drzewo) 0 w górę i wszystkie w dół. */
export interface DomyslnePokolenia { wstecz: number; naprzod: number }
export const DOMYSLNE_KARTY: DomyslnePokolenia = { wstecz: DOMYSLNE_WSTECZ, naprzod: DOMYSLNE_NAPRZOD }
export const DOMYSLNE_CALEGO_DRZEWA: DomyslnePokolenia = { wstecz: 0, naprzod: MAKS_POKOLEN }

const liczba = (v: string | null | undefined, domyslna: number): number => {
    if (v == null || !/^-?\d+$/.test(v.trim())) return domyslna
    return Math.max(0, Math.min(MAKS_POKOLEN, Number.parseInt(v, 10)))
}

/** Parametry drzewa z adresu: zła wartość = domyślna, liczby ograniczone do 0…MAKS_POKOLEN (stare linki ?wstecz=1|3 działają). */
export function parametryDrzewa(sp: { wstecz?: string | null; naprzod?: string | null; rodzenstwo?: string | null }, d: DomyslnePokolenia = DOMYSLNE_KARTY): ParametryDrzewa {
    return {
        wstecz: liczba(sp.wstecz, d.wstecz),
        naprzod: liczba(sp.naprzod, d.naprzod),
        zakres: sp.rodzenstwo === '1' ? 'rodzenstwo' : 'malzonkowie',
    }
}

/** Adres z nowymi parametrami drzewa: wartości domyślne znikają z adresu, inne parametry zostają. */
export function zastosujParametryDrzewa(sp: URLSearchParams, p: ParametryDrzewa, d: DomyslnePokolenia = DOMYSLNE_KARTY): URLSearchParams {
    const wyn = new URLSearchParams(sp)
    const ustaw = (k: string, v: number, domyslna: number) => { if (v === domyslna) wyn.delete(k); else wyn.set(k, String(Math.max(0, Math.min(MAKS_POKOLEN, v)))) }
    ustaw('wstecz', p.wstecz, d.wstecz)
    ustaw('naprzod', p.naprzod, d.naprzod)
    if (p.zakres === 'rodzenstwo') wyn.set('rodzenstwo', '1'); else wyn.delete('rodzenstwo')
    return wyn
}

/** Nowa liczba pokoleń po kroku (±1) – w granicach 0…MAKS_POKOLEN. */
export const krokPokolen = (aktualne: number, kierunek: 1 | -1): number => Math.max(0, Math.min(MAKS_POKOLEN, aktualne + kierunek))
