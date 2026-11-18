// P4 (VIEW-05, DRZ-01): liczba pokoleń drzewa na karcie osoby żyje w adresie (?wstecz=N&naprzod=M&rodzenstwo=1) –
// pasek nad drzewem zmienia adres, serwer rysuje drzewo od nowa, a link do karty pamięta ustawienie.
// Moduł bez zależności od Markdoc (używa go też kod przeglądarki).

/** najwięcej pokoleń w jedną stronę */
export const MAKS_POKOLEN = 15
export const DOMYSLNE_WSTECZ = 2
export const DOMYSLNE_NAPRZOD = 2

export type ZakresKarty = 'malzonkowie' | 'rodzenstwo'
export interface ParametryDrzewa { wstecz: number; naprzod: number; zakres: ZakresKarty }

const liczba = (v: string | null | undefined, domyslna: number): number => {
    if (v == null || !/^-?\d+$/.test(v.trim())) return domyslna
    return Math.max(0, Math.min(MAKS_POKOLEN, Number.parseInt(v, 10)))
}

/** Parametry drzewa z adresu: zła wartość = domyślna, liczby ograniczone do 0…MAKS_POKOLEN (stare linki ?wstecz=1|3 działają). */
export function parametryDrzewa(sp: { wstecz?: string | null; naprzod?: string | null; rodzenstwo?: string | null }): ParametryDrzewa {
    return {
        wstecz: liczba(sp.wstecz, DOMYSLNE_WSTECZ),
        naprzod: liczba(sp.naprzod, DOMYSLNE_NAPRZOD),
        zakres: sp.rodzenstwo === '1' ? 'rodzenstwo' : 'malzonkowie',
    }
}

/** Adres z nowymi parametrami drzewa: wartości domyślne znikają z adresu, inne parametry zostają. */
export function zastosujParametryDrzewa(sp: URLSearchParams, p: ParametryDrzewa): URLSearchParams {
    const wyn = new URLSearchParams(sp)
    const ustaw = (k: string, v: number, domyslna: number) => { if (v === domyslna) wyn.delete(k); else wyn.set(k, String(Math.max(0, Math.min(MAKS_POKOLEN, v)))) }
    ustaw('wstecz', p.wstecz, DOMYSLNE_WSTECZ)
    ustaw('naprzod', p.naprzod, DOMYSLNE_NAPRZOD)
    if (p.zakres === 'rodzenstwo') wyn.set('rodzenstwo', '1'); else wyn.delete('rodzenstwo')
    return wyn
}

/** Nowa liczba pokoleń po kroku (±1) – w granicach 0…MAKS_POKOLEN. */
export const krokPokolen = (aktualne: number, kierunek: 1 | -1): number => Math.max(0, Math.min(MAKS_POKOLEN, aktualne + kierunek))
