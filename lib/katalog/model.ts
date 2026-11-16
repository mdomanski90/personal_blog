/**
 * KAT-01 (decyzje właściciela 16.11): numeracja katalogowa „nr kat.” – różna od „sygnatura” (sygnatura oryginału).
 * Dwuliterowy prefiks rodzaju + kolejny numer, osobny ciąg dla rodzaju (MA-0042). Numer nie zawiera cech zmiennych,
 * nigdy się nie zmienia i nie jest używany ponownie. Nadawany wyłącznie pozycjom publicznym (bez luk zdradzających
 * pozycje niepubliczne – zasada 1.6); pozycja wycofana zostawia lukę. Kolejność przy wspólnym nadaniu: data dodania,
 * potem nazwa (decyzja 16.11). Zmiana identyfikatora z przekierowaniem (lib/przekierowania) przenosi numer.
 * Moduł czysty (bez dostępu do plików) – zapis: lib/katalog/dane.ts.
 */
import { porownajPl } from '../tekst'

export const PREFIKSY = {
    material: 'MA', wpis: 'WP', osoba: 'OS', miejsce: 'MJ', obiekt: 'OB', temat: 'TE', plan: 'PL',
    // decyzja 16.11 (ankieta przy starcie KAT): także instytucje, zbiory i publikacje
    instytucja: 'IN', zbior: 'ZB', publikacja: 'PB',
} as const
export type RodzajKat = keyof typeof PREFIKSY
export type Prefiks = (typeof PREFIKSY)[RodzajKat]
const RODZAJ_PREFIKSU = Object.fromEntries(Object.entries(PREFIKSY).map(([r, p]) => [p, r])) as Record<Prefiks, RodzajKat>

export interface PozycjaRejestru { rodzaj: RodzajKat; id: string; nadano: string }
export interface Rejestr {
    /** numer wersji pliku – zapis z kontrolą wersji (konflikt zamiast nadpisania) */
    wersja: number
    licznik: Partial<Record<Prefiks, number>>
    /** nr kat. → pozycja */
    pozycje: Record<string, PozycjaRejestru>
}

/** Pozycja publiczna do numeracji; sort – klucz kolejności (data dodania w ISO albo inny porównywalny tekst). */
export interface Kandydat { rodzaj: RodzajKat; id: string; nazwa: string; sort: string }

export const nowyRejestr = (): Rejestr => ({ wersja: 0, licznik: {}, pozycje: {} })

export const formatujNr = (p: Prefiks | string, n: number) => `${p}-${String(n).padStart(4, '0')}`

/** „ma-42”, „MA0042”, „ MA-0042 ” → „MA-0042”; null, gdy to nie numer katalogowy. */
export function parsujNr(tekst: string): string | null {
    const m = /^\s*([a-z]{2})-?0*(\d{1,7})\s*$/i.exec(tekst ?? '')
    if (!m) return null
    const p = m[1].toUpperCase()
    const n = Number(m[2])
    if (!(p in RODZAJ_PREFIKSU) || !n) return null
    return formatujNr(p, n)
}

export const rodzajNumeru = (nr: string): RodzajKat | null => RODZAJ_PREFIKSU[nr.slice(0, 2) as Prefiks] ?? null

const klucz = (rodzaj: string, id: string) => `${rodzaj}:${id}`

/** Indeks „rodzaj:id” → nr. */
export function indeks(r: Rejestr): Map<string, string> {
    return new Map(Object.entries(r.pozycje).map(([nr, p]) => [klucz(p.rodzaj, p.id), nr]))
}

export const numerDla = (r: Rejestr, rodzaj: RodzajKat, id: string): string | null => indeks(r).get(klucz(rodzaj, id)) ?? null

export interface WynikNadania {
    rejestr: Rejestr
    nadane: { nr: string; rodzaj: RodzajKat; id: string; nazwa: string }[]
    przeniesione: { nr: string; z: string; na: string }[]
}

/**
 * Plan nadania (bez zapisu): numery istniejące bez zmian; pozycje z rejestru, których już nie ma, a które mają
 * przekierowanie na istniejącego kandydata bez numeru – numer przechodzi; pozostali kandydaci bez numeru dostają
 * kolejne numery swojego ciągu, w kolejności sort → nazwa → id.
 */
export function zaplanujNadanie(
    stary: Rejestr,
    kandydaci: Kandydat[],
    przekierowanie: (rodzaj: RodzajKat, id: string) => string | null,
    dzis: string,
): WynikNadania {
    const r: Rejestr = { wersja: stary.wersja, licznik: { ...stary.licznik }, pozycje: Object.fromEntries(Object.entries(stary.pozycje).map(([n, p]) => [n, { ...p }])) }
    const ids = new Map(kandydaci.map((x) => [klucz(x.rodzaj, x.id), x]))
    let idx = indeks(r)
    const przeniesione: WynikNadania['przeniesione'] = []
    for (const [nr, p] of Object.entries(r.pozycje)) {
        if (ids.has(klucz(p.rodzaj, p.id))) continue
        const cel = przekierowanie(p.rodzaj, p.id)
        if (!cel || !ids.has(klucz(p.rodzaj, cel)) || idx.has(klucz(p.rodzaj, cel))) continue
        przeniesione.push({ nr, z: p.id, na: cel })
        r.pozycje[nr] = { ...p, id: cel }
        idx = indeks(r)
    }
    const nowe = kandydaci
        .filter((x) => !idx.has(klucz(x.rodzaj, x.id)))
        .sort((a, b) => a.sort.localeCompare(b.sort) || porownajPl(a.nazwa, b.nazwa) || a.id.localeCompare(b.id))
    const nadane: WynikNadania['nadane'] = []
    for (const x of nowe) {
        if (idx.has(klucz(x.rodzaj, x.id))) continue // powtórzony kandydat
        const p = PREFIKSY[x.rodzaj]
        const n = (r.licznik[p] ?? 0) + 1
        r.licznik[p] = n
        const nr = formatujNr(p, n)
        r.pozycje[nr] = { rodzaj: x.rodzaj, id: x.id, nadano: dzis }
        idx.set(klucz(x.rodzaj, x.id), nr)
        nadane.push({ nr, rodzaj: x.rodzaj, id: x.id, nazwa: x.nazwa })
    }
    return { rejestr: r, nadane, przeniesione }
}

/** Kontrola spójności rejestru (przy odczycie i przed zapisem): unikalność, poprawne numery, licznik ≥ numery. */
export function bledyRejestru(r: Rejestr): string[] {
    const b: string[] = []
    const widziane = new Set<string>()
    for (const [nr, p] of Object.entries(r.pozycje)) {
        if (parsujNr(nr) !== nr) b.push(`niepoprawny numer ${nr}`)
        if (rodzajNumeru(nr) !== p.rodzaj) b.push(`${nr}: rodzaj ${p.rodzaj} nie pasuje do prefiksu`)
        const k = klucz(p.rodzaj, p.id)
        if (widziane.has(k)) b.push(`${k}: dwa numery`)
        widziane.add(k)
        const n = Number(nr.slice(3))
        if (n > (r.licznik[nr.slice(0, 2) as Prefiks] ?? 0)) b.push(`${nr}: licznik mniejszy niż numer`)
    }
    return b
}
