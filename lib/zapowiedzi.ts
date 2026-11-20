// Zapowiedzi wpisów (strona główna i /wpisy – jeden komponent ZapowiedziWpisow). Uwagi właściciela 16.11, wariant B:
// tekst do prawej krawędzi wpisu, w kolumnach wyrównanych z limitem wierszy (CSS: z miniaturą 2 × 7, bez miniatury 3 × 9).
// Zapowiedź automatyczna jest dłuższa niż miejsce – resztę obcina CSS; krótka (do ok. jednej kolumny) nie dzieli się na kolumny.

/** Długość zapowiedzi z treści wpisu (znaki), gdy pole „zapowiedź” jest puste. */
export const DLUGOSC_ZAPOWIEDZI = { zObrazem: 640, bezObrazu: 1200 } as const

/** Wyraźnie mniej niż jedna kolumna (z miniaturą 7 wierszy × ok. 37 znaków, bez miniatury 9 × ok. 33) – zapas na łamanie wyrazów;
 *  sprawdzone na renderze 16.11: 250 znaków obok miniatury zajmowało już ponad 7 wierszy pół szerokości. */
const JEDNA_KOLUMNA = { zObrazem: 200, bezObrazu: 230 } as const

export function czyKrotkaZapowiedz(tekst: string, zObrazem: boolean): boolean {
    return tekst.trim().length <= (zObrazem ? JEDNA_KOLUMNA.zObrazem : JEDNA_KOLUMNA.bezObrazu)
}

/** Adres obrazu miniatury wpisu z materiału: pierwsza strona skanu albo plik obrazu; inne pliki (PDF, nagranie) – brak.
 *  Wspólne dla zapowiedzi i strony wpisu (makieta wpisu 17.11, P1). Szerokość z listy serwera (lib/szerokosci-obrazow.ts) –
 *  dawne 640 nie było na liście i dawało pełny oryginał (20.11). */
export function adresMiniatury(m: { strony: { adres: string }[]; plik?: string | null } | undefined, w: 480 | 1200 = 480): string | undefined {
    if (!m) return undefined
    const skan = m.strony[0]?.adres
    if (skan) return skan.startsWith('/pliki/strony/') ? `${skan}?w=${w}` : skan
    return m.plik && /\.(jpe?g|png|webp)$/i.test(m.plik) ? `${m.plik}?w=${w}` : undefined
}

/**
 * Uwaga właściciela 17.11 (wariant B): miniatura wpisu w pasku bocznym znika, gdy przed pierwszą wstawką materiału ze skanem
 * (pełna szerokość) jest mniej niż PROG_WSTEPU_MINIATURY znaków tekstu wpisu – inaczej ten sam dokument widać od razu dwa razy.
 * Bez wstawki – miniatura zostaje. Liczy się tekst treści (bez zapowiedzi pod metryczką).
 */
export const PROG_WSTEPU_MINIATURY = 800
export function miniaturaWBoku(odcinki: ({ html: string } | { material: string })[]): boolean {
    const i = odcinki.findIndex((o) => 'material' in o)
    if (i < 0) return true
    const tekst = odcinki.slice(0, i).map((o) => ('html' in o ? o.html : '')).join(' ')
        .replace(/<[^>]*>/g, ' ').replace(/&[a-z0-9#]+;/gi, ' ').replace(/\s+/g, ' ').trim()
    return tekst.length >= PROG_WSTEPU_MINIATURY
}
