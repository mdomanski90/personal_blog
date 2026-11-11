// Pomocnicze funkcje tekstowe: identyfikatory bez polskich znaków i porównywanie przy wyszukiwaniu.

const ZAMIANY: Record<string, string> = {
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
    Ą: 'a', Ć: 'c', Ę: 'e', Ł: 'l', Ń: 'n', Ó: 'o', Ś: 's', Ź: 'z', Ż: 'z',
}

function bezZnakowDiakrytycznych(s: string): string {
    return s
        .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (z) => ZAMIANY[z] ?? z)
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
}

/** „Łepki Stare” → „lepki-stare”. Używane jako identyfikator (nazwa pliku i adres strony). */
export function identyfikatorZNazwy(nazwa: string): string {
    return bezZnakowDiakrytycznych(nazwa)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/** Postać do porównań w wyszukiwarce: małe litery, bez polskich znaków i akcentów, pojedyncze spacje. */
export function normalizuj(s: string): string {
    return bezZnakowDiakrytycznych(s)
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
}

/** Porównanie do sortowania alfabetycznego po polsku. */
export const porownajPl = new Intl.Collator('pl').compare
