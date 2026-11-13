// Daty w formacie EDTF (Extended Date/Time Format, Library of Congress) – obsługiwany podzbiór:
//   1750-05-27   dzień            1908-02   miesiąc        1875   rok
//   195X         dekada           18XX      stulecie
//   1750~        około            1750?     niepewna       1750% około i niepewna
//   1915-1918    przedział (też 1915–1918, 1915 - 1918 i zapis EDTF 1915/1918)
//   ..-1920      do 1920          1945-..   od 1945
// Przedział z łącznikiem działa dla pełnych lat (dwie czterocyfrowe liczby); daty z miesiącem
// w przedziale zapisuje się po EDTF-owemu: 1915-03/1916-05. Do eksportu dla Omeka S trafia zapis
// EDTF z ukośnikiem (dcterms:date / dcterms:temporal) – zamienia go normalizujEdtf().

const POJEDYNCZA = '(?:\\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\\d|3[01]))?)?|\\d{3}X|\\d{2}XX)[~?%]?'

const ROK = '\\d{4}[~?%]?'
const ROK_LUB_OTWARTY = `(?:${ROK}|\\.\\.)`
// przedział pełnych lat zapisany łącznikiem / półpauzą / pauzą, ze spacjami albo bez: 1810-1825, 1810 – 1825
const PRZEDZIAL_LAT = new RegExp(`^(${ROK_LUB_OTWARTY})\\s*[-–—]\\s*(${ROK_LUB_OTWARTY})$`)

/** Wyrażenie do sprawdzania pola w panelu (pusta wartość jest dozwolona). */
export const EDTF_REGEX = new RegExp(
    `^(?:|${POJEDYNCZA}|(?:${POJEDYNCZA}|\\.\\.)/(?:${POJEDYNCZA}|\\.\\.)|${ROK_LUB_OTWARTY}\\s*[-–—]\\s*${ROK_LUB_OTWARTY})$`
)

export const EDTF_OPIS =
    'Np. 1750-05-27, 1908-02, 1875, 1810-1825 (przedział), 195X (dekada), 18XX (wiek), 1750~ (około), 1750? (niepewna), ..-1920 (do 1920), 1945-.. (od 1945)'

/** Zapis EDTF z ukośnikiem (do eksportu i obliczeń): „1810-1825” → „1810/1825”; pozostałe bez zmian. */
export function normalizujEdtf(zapis: string | null | undefined): string {
    const s = (zapis ?? '').trim()
    const m = PRZEDZIAL_LAT.exec(s)
    return m ? `${m[1]}/${m[2]}` : s
}

type Precyzja = 'dzien' | 'miesiac' | 'rok' | 'dekada' | 'wiek'

export interface Punkt {
    rok: number
    miesiac?: number
    dzien?: number
    precyzja: Precyzja
    okolo: boolean
    niepewna: boolean
}

export interface DataEdtf {
    zapis: string
    od: Punkt | null // null = otwarty początek („..”)
    do: Punkt | null // null = otwarty koniec
    przedzial: boolean
}

function parsujPunkt(s: string): Punkt | null {
    const m = /^(\d{2})(\d|X)(\d|X)(?:-(\d{2})(?:-(\d{2}))?)?([~?%])?$/.exec(s)
    if (!m) return null
    const [, poczatek, c3, c4, mm, dd, kwal] = m
    if (c3 === 'X' && c4 !== 'X') return null
    const okolo = kwal === '~' || kwal === '%'
    const niepewna = kwal === '?' || kwal === '%'
    if (c3 === 'X') {
        if (mm) return null
        return { rok: Number(poczatek + '00'), precyzja: 'wiek', okolo, niepewna }
    }
    if (c4 === 'X') {
        if (mm) return null
        return { rok: Number(poczatek + c3 + '0'), precyzja: 'dekada', okolo, niepewna }
    }
    const rok = Number(poczatek + c3 + c4)
    if (!mm) return { rok, precyzja: 'rok', okolo, niepewna }
    const miesiac = Number(mm)
    if (miesiac < 1 || miesiac > 12) return null
    if (!dd) return { rok, miesiac, precyzja: 'miesiac', okolo, niepewna }
    const dzien = Number(dd)
    const dniWMiesiacu = new Date(Date.UTC(rok, miesiac, 0)).getUTCDate()
    if (dzien < 1 || dzien > dniWMiesiacu) return null
    return { rok, miesiac, dzien, precyzja: 'dzien', okolo, niepewna }
}

/** Parsuje zapis EDTF; zwraca null dla pustego lub błędnego. */
export function parsujEdtf(zapis: string | null | undefined): DataEdtf | null {
    const s = normalizujEdtf(zapis)
    if (!s || !EDTF_REGEX.test(s)) return null
    if (s.includes('/')) {
        const [a, b] = s.split('/')
        if (a === '..' && b === '..') return null
        const od = a === '..' ? null : parsujPunkt(a)
        const doP = b === '..' ? null : parsujPunkt(b)
        if ((a !== '..' && !od) || (b !== '..' && !doP)) return null
        if (od && doP && klucz(od, 'poczatek') > klucz(doP, 'koniec')) return null
        return { zapis: s, od, do: doP, przedzial: true }
    }
    const p = parsujPunkt(s)
    if (!p) return null
    return { zapis: s, od: p, do: p, przedzial: false }
}

export function czyPoprawnaEdtf(zapis: string | null | undefined): boolean {
    const s = (zapis ?? '').trim()
    return s === '' || parsujEdtf(s) !== null
}

/** Liczba RRRRMMDD – najwcześniejszy (poczatek) albo najpóźniejszy (koniec) dzień objęty punktem. */
function klucz(p: Punkt, strona: 'poczatek' | 'koniec'): number {
    let rokOd = p.rok
    let rokDo = p.rok
    if (p.precyzja === 'dekada') rokDo = p.rok + 9
    if (p.precyzja === 'wiek') rokDo = p.rok + 99
    if (strona === 'poczatek') {
        return rokOd * 10000 + (p.miesiac ?? 1) * 100 + (p.dzien ?? 1)
    }
    const miesiac = p.miesiac ?? 12
    const dzien = p.dzien ?? new Date(Date.UTC(rokDo, miesiac, 0)).getUTCDate()
    return rokDo * 10000 + miesiac * 100 + dzien
}

/** Klucz do sortowania (rosnąco od najstarszych). Brak daty → Infinity (na końcu). */
export function kluczSortowania(zapis: string | null | undefined): number {
    const d = parsujEdtf(zapis)
    if (!d) return Number.POSITIVE_INFINITY
    if (d.od) return klucz(d.od, 'poczatek')
    if (d.do) return klucz(d.do, 'koniec')
    return Number.POSITIVE_INFINITY
}

/** Zakres dat (ISO) do eksportu, np. dla modułu Numeric Data Types w Omeka. */
export function zakresIso(zapis: string | null | undefined): { od: string | null; do: string | null } | null {
    const d = parsujEdtf(zapis)
    if (!d) return null
    const iso = (n: number) => {
        const s = String(n).padStart(8, '0')
        return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
    }
    return {
        od: d.od ? iso(klucz(d.od, 'poczatek')) : null,
        do: d.do ? iso(klucz(d.do, 'koniec')) : null,
    }
}

const MIESIACE_DOPELNIACZ = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']
const MIESIACE = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień']

function rzymskie(n: number): string {
    const tab: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
    let wynik = ''
    for (const [w, z] of tab) {
        while (n >= w) { wynik += z; n -= w }
    }
    return wynik
}

function formatPunktu(p: Punkt): string {
    let tekst: string
    switch (p.precyzja) {
        case 'dzien':
            tekst = `${p.dzien} ${MIESIACE_DOPELNIACZ[p.miesiac! - 1]} ${p.rok}`
            break
        case 'miesiac':
            tekst = `${MIESIACE[p.miesiac! - 1]} ${p.rok}`
            break
        case 'rok':
            tekst = String(p.rok)
            break
        case 'dekada': {
            const dekada = p.rok % 100
            tekst = dekada === 0
                ? `${p.rok}–${p.rok + 9}`
                : `lata ${String(dekada).padStart(2, '0')}. ${rzymskie(Math.floor(p.rok / 100) + 1)} w.`
            break
        }
        case 'wiek':
            tekst = `${rzymskie(p.rok / 100 + 1)} w.`
            break
    }
    if (p.okolo) tekst = `ok. ${tekst}`
    if (p.niepewna) tekst = `${tekst} (?)`
    return tekst
}

/** Czytelny zapis po polsku, np. „27 maja 1750”, „lata 50. XX w.”, „1915–1918”, „do 1920”. */
export function formatujEdtf(zapis: string | null | undefined): string {
    const d = parsujEdtf(zapis)
    if (!d) return (zapis ?? '').trim()
    if (!d.przedzial) return formatPunktu(d.od!)
    if (!d.od) return `do ${formatPunktu(d.do!)}`
    if (!d.do) return `od ${formatPunktu(d.od)}`
    return `${formatPunktu(d.od)}–${formatPunktu(d.do)}`
}

/** Rok początku (do osi czasu); null gdy brak. */
export function rokPoczatku(zapis: string | null | undefined): number | null {
    const d = parsujEdtf(zapis)
    if (!d) return null
    return (d.od ?? d.do)!.rok
}
