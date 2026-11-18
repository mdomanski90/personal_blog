// Łatka po PK (decyzja właściciela 18.11: „podobne elementy w podobnych narzędziach mają działać tak samo”, „wspólny
// mechanizm”): jedna definicja przybliżania dla przeglądarki planu i całego drzewa – krok przycisków i klawiszy, czułość
// kółka (także gładzik i szczypanie), znaczenie klawiszy + − 0 i podpowiedź pod widokiem. Rama i pasek:
// app/components/aplet/RamaPrzegladarki.tsx. Czyste funkcje.

/** krok przycisków „+ / −” w pasku i klawiszy + − (×1,25) */
export const KROK_PRZYCISKU = 1.25

/** Mnożnik przybliżenia po obrocie kółka: > 1 przybliża, < 1 oddala. deltaMode 1 = linie (Firefox), 2 = strony;
 *  szczypanie na gładziku przychodzi z ctrlKey i małą deltą – stąd większa czułość. */
export function czynnikKolka(deltaY: number, deltaMode = 0, szczypanie = false): number {
    const px = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 400 : 1)
    return Math.exp(-px * (szczypanie ? 0.01 : 0.0015))
}

/** Przesunięcie w bok (Shift + kółko) w pikselach ekranu. */
export const przesuniecieKolka = (deltaX: number, deltaY: number, deltaMode = 0): number => (deltaX || deltaY) * (deltaMode === 1 ? 16 : deltaMode === 2 ? 400 : 1)

export type AkcjaPrzyblizenia = 'przybliz' | 'oddal' | 'calosc'
/** Klawisze przybliżania wspólne dla obu widoków: + (=) przybliża, − (_) oddala, 0 / Home – całość. */
export function klawiszPrzyblizenia(klawisz: string): AkcjaPrzyblizenia | null {
    if (klawisz === '+' || klawisz === '=') return 'przybliz'
    if (klawisz === '-' || klawisz === '_') return 'oddal'
    if (klawisz === '0' || klawisz === 'Home') return 'calosc'
    return null
}

/** Podpowiedź pod widokiem: najpierw to, co robi kliknięcie w danym narzędziu, potem wspólne przesuwanie i przybliżanie. */
export const wskazowkaPrzyblizenia = (klik: string): string => `${klik} · przeciągnij – przesuń · kółko – przybliż · Shift + kółko – w bok`

/** Wiersz „klawiatura” w panelu – część wspólna. */
export const KLAWISZE_PRZYBLIZENIA = '+ − – przybliż · 0 – całość'
