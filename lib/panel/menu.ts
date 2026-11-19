// PK: menu panelu jako dane (zasada 2.7) – jedno źródło dla ramy panelu (app/keystatic/RamaPanelu.tsx),
// ustawienia „Menu panelu” w Keystatic (keystatic.config.ts) i adresów „na stronie ↗”. Bez fs – plik wspólny dla klienta i konfiguracji.
// Ustawienie (content/_panel/menu-panelu.json) może ukryć pozycje i zmienić kolejność grup; pulpit zostaje zawsze.

export type Ikona = 'pulpit' | 'zgloszenia' | 'opracowanie' | 'tresci' | 'archiwum' | 'biblioteka' | 'ksiegi' | 'slownik' | 'strony' | 'plany' | 'narzedzia' | 'osoby' | 'administracja'

export interface PozycjaMenu {
    klucz: string
    nazwa: string
    href: string
    /** zgłoszenia – licznik z API; plany:<rodzaj> – liczba planów danego rodzaju; kolekcja:<klucz> – liczba wpisów (P6a, zamiast karty na pulpicie) */
    licznik?: 'zgloszenia' | `plany:${string}` | `kolekcja:${string}`
}
export interface GrupaMenu { klucz: string; nazwa: string; ikona: Ikona; href?: string; licznik?: PozycjaMenu['licznik']; pozycje: PozycjaMenu[] }

// P5 (PNL-09): kolekcje otwierają listę panelu (kolumny w kolejności, filtry, zmiany zbiorcze); edycja pozycji – w Keystatic
const kol = (k: string) => `/keystatic/panel/lista/${k}`
const sin = (k: string) => `/keystatic/singleton/${k}`

export const MENU: GrupaMenu[] = [
    { klucz: 'pulpit', nazwa: 'pulpit', ikona: 'pulpit', href: '/keystatic/panel', pozycje: [] },
    { klucz: 'zgloszenia', nazwa: 'zgłoszenia', ikona: 'zgloszenia', href: '/keystatic/panel/zgloszenia', licznik: 'zgloszenia', pozycje: [] },
    { klucz: 'do-opracowania', nazwa: 'do opracowania', ikona: 'opracowanie', href: '/keystatic/panel/do-opracowania', pozycje: [] },
    // P7a (uwaga właściciela 19.11 08:48): osoby i drzewo w głównej części menu; „narzędzia” → „administracja”
    { klucz: 'osoby', nazwa: 'osoby i drzewo', ikona: 'osoby', href: '/keystatic/osoby', pozycje: [] },
    { klucz: 'tresci', nazwa: 'treści', ikona: 'tresci', pozycje: [
        { klucz: 'posts', nazwa: 'wpisy', href: kol('posts'), licznik: 'kolekcja:posts' },
        { klucz: 'miejsca', nazwa: 'miejsca', href: kol('miejsca'), licznik: 'kolekcja:miejsca' },
        { klucz: 'obiekty', nazwa: 'obiekty w terenie', href: kol('obiekty'), licznik: 'kolekcja:obiekty' },
        { klucz: 'tematy', nazwa: 'tematy', href: kol('tematy'), licznik: 'kolekcja:tematy' },
        { klucz: 'biogramy', nazwa: 'osoby – biogramy', href: kol('biogramy'), licznik: 'kolekcja:biogramy' },
        { klucz: 'polacz', nazwa: 'połącz wzmianki', href: '/keystatic/panel/polacz' }, // P6b (PD-10)
    ] },
    { klucz: 'archiwum', nazwa: 'archiwum', ikona: 'archiwum', pozycje: [
        { klucz: 'materialy', nazwa: 'materiały (archiwum)', href: kol('materialy'), licznik: 'kolekcja:materialy' },
        { klucz: 'zbiory', nazwa: 'zbiory i kolekcje', href: kol('zbiory'), licznik: 'kolekcja:zbiory' },
        { klucz: 'strony-skanow', nazwa: 'strony skanów', href: '/keystatic/panel/materialy' },
    ] },
    { klucz: 'biblioteka', nazwa: 'biblioteka', ikona: 'biblioteka', pozycje: [
        { klucz: 'publikacje', nazwa: 'publikacje i opracowania', href: kol('publikacje'), licznik: 'kolekcja:publikacje' },
    ] },
    { klucz: 'ksiegi', nazwa: 'księgi metrykalne', ikona: 'ksiegi', pozycje: [
        { klucz: 'parafie', nazwa: 'parafie i urzędy', href: kol('parafie'), licznik: 'kolekcja:parafie' },
        { klucz: 'ksiegi', nazwa: 'księgi metrykalne', href: kol('ksiegi'), licznik: 'kolekcja:ksiegi' },
        { klucz: 'zespoly', nazwa: 'zespoły archiwalne', href: kol('zespoly'), licznik: 'kolekcja:zespoly' },
        { klucz: 'ksiegi-import', nazwa: 'import ksiąg · CSV/XLSX', href: '/keystatic/panel/ksiegi-import' },
        { klucz: 'raport-ksiag', nazwa: 'raport ksiąg', href: '/keystatic/panel/raport-ksiag' },
    ] },
    { klucz: 'slownik', nazwa: 'słownik', ikona: 'slownik', pozycje: [
        { klucz: 'hasla', nazwa: 'słownik (pojęcia i gwara)', href: kol('hasla'), licznik: 'kolekcja:hasla' },
    ] },
    { klucz: 'strony', nazwa: 'strony', ikona: 'strony', pozycje: [
        { klucz: 'stronaGlowna', nazwa: 'strona główna', href: sin('stronaGlowna') },
        { klucz: 'wstepyDzialow', nazwa: 'wstępy działów', href: sin('wstepyDzialow') },
        { klucz: 'oProjekcie', nazwa: 'o projekcie', href: sin('oProjekcie') },
    ] },
    { klucz: 'plany', nazwa: 'plany', ikona: 'plany', pozycje: [
        { klucz: 'plany-cmentarz', nazwa: 'plany cmentarzy', href: '/keystatic/plany?rodzaj=cmentarz', licznik: 'plany:cmentarz' },
        { klucz: 'plany-historyczny', nazwa: 'plany historyczne', href: '/keystatic/plany?rodzaj=historyczny', licznik: 'plany:historyczny' },
        { klucz: 'plany-schemat', nazwa: 'schematy i szkice', href: '/keystatic/plany?rodzaj=schemat', licznik: 'plany:schemat' },
        { klucz: 'plany-typy', nazwa: 'typy na planach', href: '/keystatic/plany/typy' },
    ] },
    { klucz: 'administracja', nazwa: 'administracja', ikona: 'administracja', pozycje: [
        { klucz: 'dostep', nazwa: 'konta i dostęp', href: '/keystatic/panel/dostep' },
        { klucz: 'wyglad', nazwa: 'wygląd strony', href: '/keystatic/panel/wyglad' },
        { klucz: 'menuPanelu', nazwa: 'menu panelu', href: sin('menuPanelu') },
        { klucz: 'kregiStopka', nazwa: 'kręgi i stopka', href: sin('kregiStopka') },
        { klucz: 'przekierowania', nazwa: 'przekierowania adresów', href: sin('przekierowania') },
        { klucz: 'system', nazwa: 'kopie, eksport, ustawienia', href: '/keystatic/panel/system' },
        { klucz: 'operacje', nazwa: 'ostatnie operacje', href: '/keystatic/panel/operacje' },
        { klucz: 'szablony', nazwa: 'mapa szablonów', href: '/keystatic/panel/szablony' },
        { klucz: 'wzorce', nazwa: 'wzorce języka wizualnego', href: '/keystatic/panel/wzorce' },
    ] },
]

/** Pozycje, których nie można ukryć (bez nich nie da się wrócić do ustawienia menu). */
export const NIEUKRYWALNE = new Set(['pulpit', 'menuPanelu'])

export interface UstawieniaMenu { ukryte?: string[]; kolejnosc?: string[] }

/** P7a: dawne klucze grup w zapisanym ustawieniu (stary → nowy). Grupa „narzędzia” została „administracją”. */
export const DAWNE_GRUPY: Record<string, string> = { narzedzia: 'administracja' }

/** P7a: zapisane ustawienie menu po zmianie nazw grup – dawny klucz zastąpiony nowym, powtórzenia usunięte; reszta bez zmian. */
export function migrujUstawieniaMenu<T extends UstawieniaMenu>(u: T): T {
    if (!u.kolejnosc?.some((k) => k in DAWNE_GRUPY)) return u
    const kolejnosc = u.kolejnosc.map((k) => DAWNE_GRUPY[k] ?? k).filter((k, i, t) => t.indexOf(k) === i)
    return { ...u, kolejnosc }
}

/** Wszystkie pozycje do listy w ustawieniu „Menu panelu” (klucz → „grupa · nazwa”). */
export const pozycjeDoUstawien = (): { value: string; label: string }[] =>
    MENU.flatMap((g) => (g.pozycje.length ? g.pozycje.map((p) => ({ value: p.klucz, label: `${g.nazwa} · ${p.nazwa}` })) : [{ value: g.klucz, label: g.nazwa }]))
        .filter((x) => !NIEUKRYWALNE.has(x.value))

/** Menu po ustawieniu: kolejność grup (nieznane klucze pomijane, brakujące grupy na końcu w domyślnej kolejności), ukryte pozycje oznaczone. */
export type GrupaWgUstawien = Omit<GrupaMenu, 'pozycje'> & { ukryta: boolean; pozycje: (PozycjaMenu & { ukryta: boolean })[] }
export function menuWgUstawien(u: UstawieniaMenu | null | undefined): GrupaWgUstawien[] {
    const ukryte = new Set((u?.ukryte ?? []).filter((k) => !NIEUKRYWALNE.has(k)))
    const kolejnosc = (u?.kolejnosc ?? []).filter((k, i, t) => t.indexOf(k) === i && MENU.some((g) => g.klucz === k))
    const grupy = [...kolejnosc.map((k) => MENU.find((g) => g.klucz === k)!), ...MENU.filter((g) => !kolejnosc.includes(g.klucz))]
    return grupy.map((g) => {
        const pozycje = g.pozycje.map((p) => ({ ...p, ukryta: ukryte.has(p.klucz) }))
        const ukryta = g.pozycje.length ? pozycje.every((p) => p.ukryta) : ukryte.has(g.klucz)
        return { ...g, ukryta, pozycje }
    })
}

/** Strona publiczna pozycji Keystatic („na stronie ↗” w pasku i previewUrl). Kolekcje bez własnej strony – brak. */
export const STRONA_PUBLICZNA: Record<string, string> = {
    posts: '/wpisy/{slug}', miejsca: '/miejsca/{slug}', obiekty: '/obiekty/{slug}', tematy: '/tematy/{slug}',
    materialy: '/archiwum/{slug}', zbiory: '/archiwum/zbiory/{slug}', publikacje: '/biblioteka/publikacje/{slug}',
    parafie: '/parafie/{slug}', hasla: '/biblioteka/slownik/{slug}', biogramy: '/osoby/{slug}',
    stronaGlowna: '/', oProjekcie: '/o-projekcie',
}

/** Adres w Keystatic → strona publiczna (albo null). */
export function stronaZAdresuKeystatic(sciezka: string): string | null {
    const k = sciezka.match(/^\/keystatic\/collection\/(\w+)\/item\/([^/?#]+)/)
    if (k) return STRONA_PUBLICZNA[k[1]]?.replace('{slug}', k[2]) ?? null
    const s = sciezka.match(/^\/keystatic\/singleton\/(\w+)/)
    return s ? STRONA_PUBLICZNA[s[1]] ?? null : null
}

/** Rodzaj widoku ramy: pełne menu (strony panelu), kolumna ikon (edytor planu), menu Keystatic (bez naszego menu bocznego). */
export function rodzajWidoku(sciezka: string): 'panel' | 'edytor-planu' | 'keystatic' {
    if (/^\/keystatic\/plany\/(?!typy(?:\/|$))[^/]+/.test(sciezka)) return 'edytor-planu'
    if (/^\/keystatic\/(panel|osoby|plany)(\/|$)/.test(sciezka)) return 'panel'
    return 'keystatic'
}

/** Czy pozycja menu jest aktywna dla ścieżki i zapytania (plany po rodzaju – po ?rodzaj=). */
export function aktywna(href: string, sciezka: string, szukane: string): boolean {
    const [h, q] = href.split('?')
    if (q) return sciezka === h && new URLSearchParams(szukane).toString().includes(q)
    if (h === '/keystatic/panel') return sciezka === h
    if (h === '/keystatic/plany') return sciezka === h && !new URLSearchParams(szukane).get('rodzaj')
    return sciezka === h || sciezka.startsWith(h + '/')
}
