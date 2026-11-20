// Szerokości pomniejszonych kopii obrazów (WebP, bez metadanych), które wydaje /pliki/[...sciezka].
// Inna szerokość w adresie = serwer oddaje oryginał (lekcja 20.11: karta „z archiwum” prosiła o 320 i dostawała pełny skan;
// zapowiedzi wpisów prosiły o 640). Test lib/szerokosci-obrazow.test.ts pilnuje, by każdy ?w= w kodzie był na liście.
export const SZEROKOSCI = {
    /** /pliki/obiekty/<obiekt>/<plik> */
    obiekty: [480, 1200, 1800],
    /** /pliki/strony/<materiał>/<plik> */
    strony: [160, 480, 1200, 2400],
    /** /pliki/osoby/<id>/<plik> */
    osoby: [480, 1200],
    /** /pliki/<materiał>/<plik> – plik obrazu materiału (jpg, png, webp); te same co strony – przeglądarka dokumentu traktuje go jak stronę */
    plikMaterialu: [160, 480, 1200, 2400],
    /** /plany/<plan>/zdjecie/<plik> – zdjęcia grobów (wgrane najwyżej 2400 px); bez ?w= – całe zdjęcie do powiększenia */
    zdjeciaGrobow: [480, 1200],
} as const satisfies Record<string, readonly number[]>

export const dozwolona = (rodzaj: keyof typeof SZEROKOSCI, w: number) => (SZEROKOSCI[rodzaj] as readonly number[]).includes(w)
