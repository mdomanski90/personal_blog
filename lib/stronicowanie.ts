// Jedno stronicowanie list katalogowych (archiwum, biblioteka): ta sama liczba pozycji na stronę i to samo przycinanie numeru strony.
export const NA_STRONE = 18

export function stronicuj<T>(lista: T[], strona: number | undefined): { wyniki: T[]; razem: number; stron: number; strona: number } {
    const razem = lista.length
    const stron = Math.max(1, Math.ceil(razem / NA_STRONE))
    const nr = Math.max(1, Math.min(stron, Math.trunc(strona || 1)))
    return { wyniki: lista.slice((nr - 1) * NA_STRONE, nr * NA_STRONE), razem, stron, strona: nr }
}
