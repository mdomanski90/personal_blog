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

// P6b (PPL-07): cyrylica → łacinka w zapisie polskim, od razu w postaci do porównań (bez ł/ż – normalizuj i tak je zdejmuje):
// akty rosyjskie „Иван” → „iwan”, „Щербань” → „szczerban”.
// Tylko do wyszukiwania – identyfikatory i wyświetlane nazwy bez zmian. Litery ukraińskie i białoruskie w tym samym zapisie.
const CYRYLICA: Record<string, string> = {
    а: 'a', б: 'b', в: 'w', г: 'g', ґ: 'g', д: 'd', е: 'e', ё: 'jo', є: 'je', ж: 'z', з: 'z', и: 'i', і: 'i', ї: 'ji', й: 'j',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ў: 'u', ф: 'f', х: 'ch', ц: 'c', ч: 'cz',
    ш: 'sz', щ: 'szcz', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'ju', я: 'ja', ѣ: 'e', ѳ: 'f', ѵ: 'i', ї: 'ji',
}

/** „Иван Щербань” → „Iwan Szczerban” (małe litery; reszta tekstu bez zmian). */
export function transliteruj(s: string): string {
    if (!/[Ѐ-ӿ]/.test(s)) return s
    return s.toLowerCase().replace(/[Ѐ-ӿ]/g, (z) => CYRYLICA[z] ?? z)
}

/** normalizuj + cyrylica jako łacinka – wspólna postać dokumentu i zapytania w wyszukiwarce (lib/szukanie, lib/indeks-szukania, lista osób). */
export function normalizujDoSzukania(s: string): string {
    return normalizuj(transliteruj(s))
}

/** Porównanie do sortowania alfabetycznego po polsku. */
export const porownajPl = new Intl.Collator('pl').compare

/** Polska odmiana po liczbie: odmiana(1, ['wpis', 'wpisy', 'wpisów']) → „1 wpis”, 3 → „3 wpisy”, 12 → „12 wpisów”. */
export function odmiana(n: number, formy: [string, string, string]): string {
    return `${n} ${formaPoLiczbie(n, formy)}`
}

/** Sama forma słowa po liczbie (bez liczby): 1 → „osoba”, 3 → „osoby”, 5 → „osób” – np. pastylka „osób · 5”. */
export function formaPoLiczbie(n: number, [jeden, kilka, wiele]: [string, string, string]): string {
    const d = n % 10, s = n % 100
    return n === 1 ? jeden : d >= 2 && d <= 4 && (s < 12 || s > 14) ? kilka : wiele
}
