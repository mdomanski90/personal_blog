// Katalog typów elementów planu obiektu (cmentarz, plac przy świątyni, wieś…).
// Wspólny dla rysunku na stronie, edytora i legendy. Bez dostępu do plików – działa w przeglądarce.

export type Rodzaj = 'punkt' | 'obszar' | 'linia' | 'napis'
export type Warstwa = 'teren' | 'woda' | 'drogi' | 'zabudowa' | 'cmentarz' | 'groby' | 'obiekty' | 'napisy'

export const WARSTWY: { id: Warstwa; nazwa: string }[] = [
    { id: 'teren', nazwa: 'teren i roślinność' },
    { id: 'woda', nazwa: 'woda' },
    { id: 'drogi', nazwa: 'drogi i ogrodzenia' },
    { id: 'zabudowa', nazwa: 'zabudowa' },
    { id: 'cmentarz', nazwa: 'cmentarze i kwatery' },
    { id: 'groby', nazwa: 'groby' },
    { id: 'obiekty', nazwa: 'znaki (obiekty punktowe)' },
    { id: 'napisy', nazwa: 'napisy' },
]
/** kolejność rysowania warstw (od spodu) */
export const KOLEJNOSC_WARSTW: Warstwa[] = ['teren', 'woda', 'cmentarz', 'drogi', 'zabudowa', 'groby', 'obiekty', 'napisy']

/** Sposób rysowania – rysunek ma osobną funkcję dla każdego. */
export type Rys =
    | 'ikona'
    | 'wzor' // obszar wypełniony wzorem (cmentarze, groby polne, mokradło, woda)
    | 'kolor' // obszar jednolity (łąka, plac, kwatera)
    | 'las'
    | 'zagajnik'
    | 'zaglebienie'
    | 'wzniesienie'
    | 'dolina'
    | 'budynek'
    | 'gosp'
    | 'grob'
    | 'droga'
    | 'polna'
    | 'sciezka'
    | 'alejka'
    | 'rzeka'
    | 'ogrodzenie'
    | 'granica'
    | 'napis'
    | 'wlasny'

/** Kolory jako zmienne CSS (jasny i ciemny tryb w globals.css). */
export type Kolor =
    | 'tekst' | 'szary' | 'pamiec' | 'kat' | 'uni' | 'pra' | 'zyd' | 'ewa' | 'woda-txt' | 'las-txt' | 'teren'

export interface TypElementu {
    id: string
    nazwa: string
    grupa: string
    rodzaj: Rodzaj
    warstwa: Warstwa
    rys: Rys
    /** znak 24×24 (ścieżka SVG, kreska) – dla punktów i do legendy */
    ikona?: string
    kolor?: Kolor
    /** wzór obszaru (id z WZORY) albo zmienna koloru wypełnienia */
    wzor?: string
    /** obszar z przerywanym obrysem (płot cmentarza) */
    plot?: boolean
    /** typ grobu – podlega zasadzie „zmarli niedawno tylko dla bliskich” */
    grob?: boolean
    /** własny typ: elementy SVG albo plik PNG */
    wlasny?: WlasnyTyp
}

export interface WlasnyTyp {
    id: string
    nazwa: string
    grupa: string
    rodzaj: Rodzaj
    /** znak: proste elementy SVG z pliku (tylko kształty, bez skryptów) */
    svg?: ElementSvg[]
    /** viewBox pliku SVG (x, y, szer, wys) – znak skalowany do 24×24 */
    svgVb?: [number, number, number, number]
    /** znak z pliku PNG (96×96) – nazwa pliku w pliki-archiwum/plany/_ikony */
    png?: string
    /** obszar: kolor tła (#rrggbb) i wzór z listy WZORY albo brak */
    tlo?: string
    wzor?: string
    /** linia: kolor, grubość (w jednostkach „u”), kreskowanie */
    linia?: { kolor: string; grubosc: number; kreski: 'ciagla' | 'przerywana' | 'kropkowana' }
}

export type ElementSvg =
    | { t: 'path'; d: string }
    | { t: 'circle'; cx: number; cy: number; r: number }
    | { t: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
    | { t: 'line'; x1: number; y1: number; x2: number; y2: number }
    | { t: 'polyline' | 'polygon'; points: string }

export const GRUPY = [
    'Świątynie',
    'Na cmentarzu',
    'Cmentarze (obszary)',
    'Wieś',
    'Pamięć, kult i ślady',
    'Teren i przyroda',
    'Drogi i linie',
    'Napisy',
    'Własne typy',
]

const kr = 'M12 3v18M7 8h10'
const t = (
    id: string, nazwa: string, grupa: string, rodzaj: Rodzaj, warstwa: Warstwa, rys: Rys, reszta: Partial<TypElementu> = {},
): TypElementu => ({ id, nazwa, grupa, rodzaj, warstwa, rys, ...reszta })

export const TYPY_WBUDOWANE: TypElementu[] = [
    // świątynie (znak punktowy; zarys budynku rysuje się osobno typem „budynek”)
    t('cerkiew-unicka', 'cerkiew unicka (greckokatolicka)', 'Świątynie', 'punkt', 'obiekty', 'ikona', { kolor: 'uni', ikona: 'M5 21v-8h14v8M4 13h16M8.6 13v-2.2h6.8V13M8.6 10.8q3.4-5.2 6.8 0M12 6.6V2.2M10.7 3.4h2.6' }),
    t('cerkiew-prawoslawna', 'cerkiew prawosławna', 'Świątynie', 'punkt', 'obiekty', 'ikona', { kolor: 'pra', ikona: 'M6 21v-8h12v8M5 13h14M9.2 13q-2.4-3 2.8-6.6q5.2 3.6 2.8 6.6M12 6.4V1.6M10.9 2.6h2.2M11 4.4l2-.7' }),
    t('kosciol', 'kościół rzymskokatolicki', 'Świątynie', 'punkt', 'obiekty', 'ikona', { kolor: 'kat', ikona: 'M4 21v-7h10v7M3 14l6-4 6 4M14 21V9h5v12M14 9l2.5-5 2.5 5M16.5 4V1.5M15.5 2.5h2' }),
    t('zbor', 'zbór ewangelicki', 'Świątynie', 'punkt', 'obiekty', 'ikona', { kolor: 'ewa', ikona: 'M5 21v-9h14v9M4 12l8-6 8 6M12 6V2.5M10.5 4h3M10 21v-4h4v4' }),
    t('boznica', 'bóżnica, synagoga', 'Świątynie', 'punkt', 'obiekty', 'ikona', { kolor: 'zyd', ikona: 'M4 21v-9h16v9M4 12q8-7 16 0M9 21v-4q3-2 6 0v4M10 9.5h4' }),
    t('kaplica', 'kaplica', 'Świątynie', 'punkt', 'obiekty', 'ikona', { ikona: 'M6 21v-8h12v8M5 13l7-6 7 6M12 7V3M10.5 4.5h3M10 21v-4h4v4' }),
    t('kapliczka', 'kapliczka', 'Świątynie', 'punkt', 'obiekty', 'ikona', { ikona: 'M9 21v-3h6v3M10 18v-8h4v8M8.5 10h7l-3.5-3zM12 7V3.5M10.8 4.7h2.4' }),
    t('dzwonnica', 'dzwonnica', 'Świątynie', 'punkt', 'obiekty', 'ikona', { ikona: 'M7 21V9h10v12M6 9l6-5 6 5M10 14q2-3 4 0v2h-4z' }),
    // na cmentarzu
    t('grob', 'grób', 'Na cmentarzu', 'obszar', 'groby', 'grob', { grob: true, ikona: 'M8 4h8v16H8zM10 8h4' }),
    t('grobowiec', 'grobowiec, kaplica grobowa', 'Na cmentarzu', 'obszar', 'groby', 'budynek', { grob: true, ikona: 'M5 20V10h14v10M4 10l8-5 8 5M12 5V3' }),
    t('mogila', 'mogiła ziemna (bez nagrobka)', 'Na cmentarzu', 'punkt', 'groby', 'ikona', { grob: true, ikona: 'M5 16q7-8 14 0M12 9V4M10 6h4' }),
    t('mogila-wojenna', 'mogiła wojenna', 'Na cmentarzu', 'punkt', 'groby', 'ikona', { grob: true, kolor: 'pamiec', ikona: 'M5 16q7-8 14 0M8 4l8 8M16 4l-8 8' }),
    t('mogila-zbiorowa', 'mogiła zbiorowa', 'Na cmentarzu', 'punkt', 'groby', 'ikona', { grob: true, kolor: 'pamiec', ikona: 'M3 17q9-10 18 0M8 10V6M6.5 7.5h3M16 10V6M14.5 7.5h3' }),
    t('krzyz', 'krzyż (nagrobny, cmentarny, przydrożny)', 'Na cmentarzu', 'punkt', 'obiekty', 'ikona', { ikona: kr }),
    t('figura', 'figura, pomnik', 'Na cmentarzu', 'punkt', 'obiekty', 'ikona', { ikona: 'M9 21h6M10 21v-3h4v3M12 18v-6M10 9a2 2 0 1 0 4 0a2 2 0 1 0-4 0M9.5 15h5' }),
    t('tablica', 'tablica, kamień pamiątkowy', 'Na cmentarzu', 'punkt', 'obiekty', 'ikona', { ikona: 'M6 20V9q6-5 12 0v11zM9 12h6M9 15h6' }),
    t('brama', 'brama, furtka, wejście', 'Na cmentarzu', 'punkt', 'obiekty', 'ikona', { ikona: 'M5 21V7M19 21V7M5 9h14M5 7q7-4 14 0' }),
    t('studnia', 'studnia, punkt z wodą', 'Na cmentarzu', 'punkt', 'obiekty', 'ikona', { ikona: 'M7 21V13h10v8M5 13h14M12 13V5M8 5h8' }),
    t('drzewo', 'drzewo (np. pomnikowe)', 'Na cmentarzu', 'punkt', 'obiekty', 'ikona', { ikona: 'M12 21v-6M7 11a5 5 0 1 0 10 0a5 5 0 1 0-10 0' }),
    // cmentarze jako obszary
    t('cm-katolicki', 'cmentarz rzymskokatolicki', 'Cmentarze (obszary)', 'obszar', 'cmentarz', 'wzor', { wzor: 'kat', plot: true }),
    t('cm-unicki', 'cmentarz unicki', 'Cmentarze (obszary)', 'obszar', 'cmentarz', 'wzor', { wzor: 'uni', plot: true }),
    t('cm-prawoslawny', 'cmentarz prawosławny', 'Cmentarze (obszary)', 'obszar', 'cmentarz', 'wzor', { wzor: 'pra', plot: true }),
    t('cm-zydowski', 'cmentarz żydowski (kirkut)', 'Cmentarze (obszary)', 'obszar', 'cmentarz', 'wzor', { wzor: 'zyd', plot: true }),
    t('cm-ewangelicki', 'cmentarz ewangelicki', 'Cmentarze (obszary)', 'obszar', 'cmentarz', 'wzor', { wzor: 'ewa', plot: true }),
    t('cm-wojenny', 'cmentarz wojenny, wojskowy', 'Cmentarze (obszary)', 'obszar', 'cmentarz', 'wzor', { wzor: 'woj', plot: true }),
    t('cm-epidemiczny', 'cmentarz epidemiczny (choleryczny)', 'Cmentarze (obszary)', 'obszar', 'cmentarz', 'wzor', { wzor: 'epi' }),
    t('groby-polne', 'groby polne, grzebalisko', 'Cmentarze (obszary)', 'obszar', 'cmentarz', 'wzor', { wzor: 'polne' }),
    t('teren-cmentarza', 'teren cmentarza (bez wzoru)', 'Cmentarze (obszary)', 'obszar', 'teren', 'kolor', { wzor: 'laka', plot: true }),
    t('kwatera', 'kwatera', 'Cmentarze (obszary)', 'obszar', 'cmentarz', 'kolor', { wzor: 'kw' }),
    t('plac', 'plac, parking, utwardzenie', 'Cmentarze (obszary)', 'obszar', 'cmentarz', 'kolor', { wzor: 'plac' }),
    // wieś
    t('dom', 'dom (z numerem)', 'Wieś', 'obszar', 'zabudowa', 'budynek', { ikona: 'M5 21v-9h14v9M4 12l8-6 8 6' }),
    t('budynek', 'budynek (świątynia, szkoła, dwór – zarys)', 'Wieś', 'obszar', 'zabudowa', 'budynek', { ikona: 'M4 20V8h16v12z' }),
    t('gosp', 'zabudowa gospodarcza', 'Wieś', 'obszar', 'zabudowa', 'gosp', { ikona: 'M3 16v-5h18v5z' }),
    t('dwor', 'dwór', 'Wieś', 'punkt', 'obiekty', 'ikona', { ikona: 'M3 21v-8h18v8M2 13l10-6 10 6M10 21v-4h4v4M7 16h1M16 16h1' }),
    t('szkola', 'szkoła', 'Wieś', 'punkt', 'obiekty', 'ikona', { ikona: 'M4 21v-9h16v9M3 12l9-6 9 6M8 16h2M14 16h2M12 6V3l3 1-3 1' }),
    t('mlyn-wodny', 'młyn wodny', 'Wieś', 'punkt', 'obiekty', 'ikona', { ikona: 'M3 21v-8h10v8M17 15a4 4 0 1 0 0.01 0M17 11v8M13 15h8' }),
    t('wiatrak', 'wiatrak', 'Wieś', 'punkt', 'obiekty', 'ikona', { ikona: 'M9 21l1-8h4l1 8M12 9L6 3M12 9l6-6M12 9l-6 6M12 9l6 6' }),
    t('kuznia', 'kuźnia', 'Wieś', 'punkt', 'obiekty', 'ikona', { ikona: 'M5 21v-8h14v8M4 13l8-5 8 5M8 18h8l-2-3h-4z' }),
    t('karczma', 'karczma', 'Wieś', 'punkt', 'obiekty', 'ikona', { ikona: 'M4 21v-9h16v9M3 12l9-6 9 6M15 15h3v3h-3z' }),
    // pamięć
    t('miejsce-pamieci', 'miejsce pamięci, zdarzenia', 'Pamięć, kult i ślady', 'punkt', 'obiekty', 'ikona', { kolor: 'pamiec', ikona: 'M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11zM10 10h4M12 8v5' }),
    t('miejsce-meczenstwa', 'miejsce męczeństwa, kaźni', 'Pamięć, kult i ślady', 'punkt', 'obiekty', 'ikona', { kolor: 'pamiec', ikona: 'M9 21V3M6 7.5h6M13 21q1-8 7-13M15.6 13.6l-2.4-1.2M15.6 13.6l.6-2.6M17.6 10.8l-2-1.4M17.6 10.8l.9-2.3M14.6 17l-2.2-.8M14.6 17l1-2.4' }),
    t('miejsce-kultu', 'miejsce kultu (święte źródło, kamień, drzewo)', 'Pamięć, kult i ślady', 'punkt', 'obiekty', 'ikona', { ikona: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1' }),
    t('okop', 'okop, ślad wojenny', 'Pamięć, kult i ślady', 'punkt', 'obiekty', 'ikona', { kolor: 'pamiec', ikona: 'M2 14l3-4 3 4 3-4 3 4 3-4 3 4 3-4' }),
    t('nie-istnieje', 'obiekt nieistniejący', 'Pamięć, kult i ślady', 'punkt', 'obiekty', 'ikona', { kolor: 'szary', ikona: 'M5 19V9h14v10zM5 9l14 10M19 9L5 19' }),
    t('zrodlo', 'źródło', 'Pamięć, kult i ślady', 'punkt', 'obiekty', 'ikona', { kolor: 'woda-txt', ikona: 'M12 21a4 4 0 0 1-4-4c0-3 4-7 4-7s4 4 4 7a4 4 0 0 1-4 4zM12 3v3' }),
    // teren i przyroda
    t('zaglebienie', 'zagłębienie, dół, glinianka', 'Teren i przyroda', 'obszar', 'teren', 'zaglebienie'),
    t('dolina', 'dolina, wąwóz, parów', 'Teren i przyroda', 'linia', 'teren', 'dolina'),
    t('wzniesienie', 'wzniesienie, kurhan', 'Teren i przyroda', 'obszar', 'teren', 'wzniesienie'),
    t('las', 'las', 'Teren i przyroda', 'obszar', 'teren', 'las'),
    t('zagajnik', 'zagajnik, zadrzewienie', 'Teren i przyroda', 'obszar', 'teren', 'zagajnik'),
    t('laka', 'łąka, pastwisko', 'Teren i przyroda', 'obszar', 'teren', 'kolor', { wzor: 'laka' }),
    t('pole', 'pole uprawne', 'Teren i przyroda', 'obszar', 'teren', 'kolor', { wzor: 'pole' }),
    t('mokradlo', 'mokradło, bagno', 'Teren i przyroda', 'obszar', 'teren', 'wzor', { wzor: 'bagno' }),
    t('staw', 'staw, jezioro', 'Teren i przyroda', 'obszar', 'woda', 'wzor', { wzor: 'woda' }),
    t('rzeka', 'rzeka, strumień, rów', 'Teren i przyroda', 'linia', 'woda', 'rzeka'),
    // drogi i linie
    t('droga', 'droga (bita, utwardzona)', 'Drogi i linie', 'linia', 'drogi', 'droga'),
    t('droga-polna', 'droga polna, gruntowa', 'Drogi i linie', 'linia', 'drogi', 'polna'),
    t('sciezka', 'ścieżka, miedza', 'Drogi i linie', 'linia', 'drogi', 'sciezka'),
    t('alejka', 'alejka (na cmentarzu)', 'Drogi i linie', 'linia', 'drogi', 'alejka'),
    t('ogrodzenie', 'ogrodzenie, mur', 'Drogi i linie', 'linia', 'drogi', 'ogrodzenie'),
    t('granica', 'granica gruntów, działki', 'Drogi i linie', 'linia', 'drogi', 'granica'),
    // napisy
    t('napis', 'napis (nazwa terenu, uwaga)', 'Napisy', 'napis', 'napisy', 'napis'),
]

/** Wzory obszarów: tło i rysunek kafelka 20×20 (w jednostkach kafelka). Kolory to zmienne CSS. */
export const WZORY: Record<string, { tlo: string; rys?: string; kreska?: string; w?: number; h?: number }> = {
    kat: { tlo: 'var(--pl-kat-tlo)', kreska: 'var(--pl-kat-wz)', rys: 'M10 6v8M7.5 8.5h5' },
    uni: { tlo: 'var(--pl-uni-tlo)', kreska: 'var(--pl-uni-wz)', rys: 'M10 5v10M8.5 7h3M7.5 9.5h5' },
    pra: { tlo: 'var(--pl-pra-tlo)', kreska: 'var(--pl-pra-wz)', rys: 'M10 5v10M8.5 7h3M7.5 9.5h5M8.5 13.2l3-1.2' },
    zyd: { tlo: 'var(--pl-zyd-tlo)', kreska: 'var(--pl-zyd-wz)', rys: 'M7.5 14V9.5q2.5-3 5 0V14' },
    ewa: { tlo: 'var(--pl-ewa-tlo)', kreska: 'var(--pl-ewa-wz)', rys: 'M10 6v8M7.5 8.5h5' },
    woj: { tlo: 'var(--pl-woj-tlo)', kreska: 'var(--pl-woj-wz)', rys: 'M7 7l6 6M13 7l-6 6' },
    epi: { tlo: 'var(--pl-epi-tlo)', kreska: 'var(--pl-woj-wz)', rys: 'M10 9.4v1.2', w: 16, h: 16 },
    polne: { tlo: 'var(--pl-laka)', kreska: 'var(--pl-woj-wz)', rys: 'M8 6v6M6 8h4M22 15v6M20 17h4', w: 30, h: 26 },
    bagno: { tlo: 'var(--pl-bagno-tlo)', kreska: 'var(--pl-bagno-wz)', rys: 'M4 11h9M6.5 11l-1-3M8.5 11V7.5M10.5 11l1-3', w: 26, h: 16 },
    woda: { tlo: 'var(--pl-woda)', kreska: 'var(--pl-woda-wz)', rys: 'M4 7q3-2.4 6 0t6 0', w: 34, h: 14 },
    laka: { tlo: 'var(--pl-laka)' },
    pole: { tlo: 'var(--pl-pole)' },
    kw: { tlo: 'var(--pl-kw)' },
    plac: { tlo: 'var(--pl-plac)' },
}

export const KOLORY: Record<Kolor, string> = {
    tekst: 'var(--pl-tekst)', szary: 'var(--pl-szary)', pamiec: 'var(--pl-pamiec)', kat: 'var(--pl-kat)', uni: 'var(--pl-uni)',
    pra: 'var(--pl-pra)', zyd: 'var(--pl-zyd)', ewa: 'var(--pl-ewa)', 'woda-txt': 'var(--pl-woda-txt)', 'las-txt': 'var(--pl-las-txt)', teren: 'var(--pl-teren)',
}

export interface UstawieniaPlanow {
    /** groby osób zmarłych w ciągu tylu lat – napis, osoby i zdjęcia tylko dla bliskich */
    progLat: number
    ukryteTypy: string[]
    wlasneTypy: WlasnyTyp[]
}

export const USTAWIENIA_DOMYSLNE: UstawieniaPlanow = { progLat: 30, ukryteTypy: [], wlasneTypy: [] }

const RYS_WLASNY: Record<Rodzaj, Rys> = { punkt: 'wlasny', obszar: 'wlasny', linia: 'wlasny', napis: 'napis' }
const WARSTWA_WLASNA: Record<Rodzaj, Warstwa> = { punkt: 'obiekty', obszar: 'teren', linia: 'drogi', napis: 'napisy' }

/** Pełny katalog: wbudowane + własne. `ukryte` są zwracane, ale oznaczone – rysunek je pomija. */
export function katalog(u: UstawieniaPlanow = USTAWIENIA_DOMYSLNE): Map<string, TypElementu> {
    const m = new Map<string, TypElementu>()
    for (const t of TYPY_WBUDOWANE) m.set(t.id, t)
    for (const w of u.wlasneTypy ?? []) {
        m.set(w.id, { id: w.id, nazwa: w.nazwa, grupa: 'Własne typy', rodzaj: w.rodzaj, warstwa: WARSTWA_WLASNA[w.rodzaj], rys: RYS_WLASNY[w.rodzaj], wlasny: w })
    }
    return m
}

export const typGrobu = (t: TypElementu | undefined) => !!t?.grob
