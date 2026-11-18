// PK (decyzja 18.11): płynne przybliżanie całego drzewa (+ − ⤢, kółko myszy) – skala widoku, nie tylko wielkość liter.
// Skala to --dr-skala (CSS zoom planszy); przewinięcie poprawiane tak, by punkt pod kursorem został na miejscu. Czyste funkcje.

export const SKALA_MIN = 0.3
export const SKALA_MAX = 2
/** skala startowa całego drzewa (jak w makiecie zatwierdzonej 18.11) */
export const SKALA_START = 0.8
/** krok przycisków + / − */
export const KROK_PRZYCISKU = 1.25

export const ogranicz = (s: number): number => Math.min(SKALA_MAX, Math.max(SKALA_MIN, Math.round(s * 1000) / 1000))

/** Nowe przewinięcie (w jednej osi), żeby punkt `kursor` (px od lewej / góry okna drzewa) został w tym samym miejscu treści. */
export const przewiniecie = (przew: number, kursor: number, s0: number, s1: number): number => Math.max(0, (przew + kursor) * (s1 / s0) - kursor)

/** Skala po obrocie kółka: deltaMode 1 = linie (Firefox), 2 = strony; gest szczypania na gładziku przychodzi z ctrlKey i małą deltą. */
export function skalaZKolka(s: number, deltaY: number, deltaMode = 0, szczypanie = false): number {
    const px = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 400 : 1)
    return ogranicz(s * Math.exp(-px * (szczypanie ? 0.01 : 0.0015)))
}

/** Skala, przy której cała plansza mieści się w oknie drzewa (⤢). */
export function dopasowana(oknoSzer: number, oknoWys: number, planszaSzer: number, planszaWys: number): number {
    if (planszaSzer <= 0 || planszaWys <= 0) return SKALA_START
    return ogranicz(Math.min(oknoSzer / planszaSzer, oknoWys / planszaWys))
}
