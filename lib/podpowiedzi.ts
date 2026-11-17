// SRCH-D-21 (P3): wybór podpowiedzi wyszukiwarki w nagłówku. Najpierw najwyżej 2 z każdego rodzaju w stałej kolejności (różnorodność),
// potem dopełnienie pozostałymi wynikami w tej samej kolejności – do limitu (8 na komputerze, 5 na wąskim ekranie; limit podaje klient).

export const NA_RODZAJ = 2
export const MAKS_PODPOWIEDZI = 8
export const PODPOWIEDZI_WASKI = 5

/** Limit z parametru zapytania: liczba 1–8, inaczej 8. */
export const LIMIT_PODPOWIEDZI = (p: string | null): number => {
    const n = Number(p)
    return Number.isInteger(n) && n >= 1 ? Math.min(n, MAKS_PODPOWIEDZI) : MAKS_PODPOWIEDZI
}

export function wybierzPodpowiedzi<T extends { rodzaj: string }>(wyniki: T[], kolejnosc: string[], limit: number): T[] {
    const wRodzaju = kolejnosc.map((r) => wyniki.filter((w) => w.rodzaj === r))
    const pierwsze = wRodzaju.flatMap((l) => l.slice(0, NA_RODZAJ))
    const reszta = wRodzaju.flatMap((l) => l.slice(NA_RODZAJ))
    return [...pierwsze, ...reszta].slice(0, limit)
}
