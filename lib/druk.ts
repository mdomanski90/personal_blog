// JW-1 · JW-17: pomocnicze funkcje wydruku (stopka @page i blok końca treści czytają zmienne CSS).

/** Wartość zmiennej CSS jako napis CSS (do `content:`); białe znaki zwinięte, cudzysłów i ukośnik zabezpieczone. */
export const napisCss = (t: string) => `"${t.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\s+/g, ' ').trim()}"`

/** Data wydruku „DD.MM.RRRR” (niezależnie od ustawień regionalnych przeglądarki). */
export function dataWydruku(d = new Date()): string {
    const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}.${mm}.${d.getFullYear()}`
}
