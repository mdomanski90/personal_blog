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
 *  Wspólne dla zapowiedzi i strony wpisu (makieta wpisu 17.11, P1). */
export function adresMiniatury(m: { strony: { adres: string }[]; plik?: string | null } | undefined, w = 640): string | undefined {
    if (!m) return undefined
    const skan = m.strony[0]?.adres
    if (skan) return skan.startsWith('/pliki/strony/') ? `${skan}?w=${w}` : skan
    return m.plik && /\.(jpe?g|png|webp)$/i.test(m.plik) ? `${m.plik}?w=${w}` : undefined
}
