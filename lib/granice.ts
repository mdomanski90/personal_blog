// Granice historyczne z OpenHistoricalMap (CC0): kafelki wektorowe „ohm_admin”, warstwa „boundaries”.
// Każda granica ma daty od–do (start_decdate, end_decdate – lata dziesiętne), więc wystarczy filtr po roku.

import type { FilterSpecification, LayerSpecification, SourceSpecification } from 'maplibre-gl'

export const ZRODLO_GRANIC: SourceSpecification = {
    type: 'vector',
    url: 'https://vtiles.openhistoricalmap.org/maps/ohm_admin.json',
    attribution: '<a href="https://www.openhistoricalmap.org/copyright">OpenHistoricalMap</a>',
}

/**
 * Okresy do wyboru: napis na przycisku, rok, dla którego rysujemy mapę (środek okresu), i opis –
 * co było wtedy na terenie Łosic, Olszanki i Międzyrzeca.
 */
export const LATA_GRANIC: { etykieta: string; rok: number; opis: string }[] = [
    { etykieta: '1520', rok: 1520, opis: 'Podlasie w Wielkim Księstwie Litewskim (przed unią lubelską)' },
    { etykieta: '1600', rok: 1600, opis: 'Rzeczpospolita Obojga Narodów – Podlasie w Koronie od 1569, unia brzeska 1596' },
    { etykieta: '1796', rok: 1796, opis: 'po III rozbiorze – na zachód od Bugu Austria (Galicja Zachodnia), za Bugiem Rosja' },
    { etykieta: '1809–1815', rok: 1811, opis: 'Księstwo Warszawskie – departament siedlecki' },
    { etykieta: '1815–1830', rok: 1825, opis: 'Królestwo Polskie – województwo podlaskie' },
    { etykieta: '1875', rok: 1875, opis: 'kasata unii – gubernia siedlecka w Imperium Rosyjskim' },
    { etykieta: '1913', rok: 1913, opis: 'przed wojną i bieżeństwem (1915)' },
    { etykieta: '1921', rok: 1921, opis: 'II Rzeczpospolita po traktacie ryskim – województwo lubelskie' },
    { etykieta: '1940', rok: 1940, opis: 'okupacja – granica niemiecko-sowiecka na Bugu, Generalne Gubernatorstwo' },
    { etykieta: '1942', rok: 1942, opis: 'okupacja niemiecka – zagłada gmin żydowskich' },
    { etykieta: '1945', rok: 1945.8, opis: 'nowe granice Polski – województwo lubelskie' },
]

export function filtrGranic(rok: number, poziomy: number[] = [2, 3, 4, 5, 6]): FilterSpecification {
    return [
        'all',
        ['<=', ['coalesce', ['get', 'start_decdate'], -9999], rok],
        ['>', ['coalesce', ['get', 'end_decdate'], 9999], rok],
        ['in', ['get', 'admin_level'], ['literal', poziomy]],
    ]
}

/** Warstwy, którym przy zmianie roku podmieniamy filtr (id → poziomy administracyjne). */
export const WARSTWY_Z_ROKIEM: Record<string, number[]> = {
    'granice-tlo': [2, 3],
    'granice-tlo-nizsze': [4],
    'granice-hist': [2, 3],
    'granice-hist-woj': [4, 5, 6],
}
export const WARSTWY_GRANIC = [...Object.keys(WARSTWY_Z_ROKIEM), 'granice-napisy']

type Panstwo = 'korona' | 'litwa' | 'rosja' | 'niemcy' | 'austria'

/** Państwa z własnym kolorem (pozostałe dostają kolor z palety wg numeru obiektu w OHM). */
export const PANSTWA: Record<Panstwo, { nazwa: string; legenda: string; kolor: string }> = {
    korona: { nazwa: 'Korona Królestwa Polskiego', legenda: 'Korona / Polska', kolor: '#c0392b' },
    litwa: { nazwa: 'Wielkie Księstwo Litewskie', legenda: 'Wielkie Księstwo Litewskie', kolor: '#2e7d4f' },
    rosja: { nazwa: 'Imperium Rosyjskie', legenda: 'Rosja / ZSRR', kolor: '#b7791f' },
    niemcy: { nazwa: 'Prusy', legenda: 'Prusy / Niemcy', kolor: '#2f6aa3' },
    austria: { nazwa: 'Austria', legenda: 'Austria', kolor: '#7b4fa0' },
}
const PALETA_INNYCH = ['#6b8e23', '#a0522d', '#4682b4', '#8b6914', '#8a5a83', '#5f8a6f']
const PRZEZROCZYSTY = 'rgba(0,0,0,0)'

// Rozpoznawanie po nazwie (angielska + oryginalna + polska, małymi literami).
// Kolejność ma znaczenie: Rzeczpospolita Obojga Narodów nie dostaje własnego koloru – w środku
// leżą Korona i Litwa (OHM: poziom 3), a granica zewnętrzna zostaje grubą kreską.
const RZECZPOSPOLITA = ['obojga', 'poland-lithuania', 'polish-lithuanian']
const KLUCZE_PANSTW: [string[], Panstwo][] = [
    [['lithuan', 'litew', 'lietuv'], 'litwa'],
    [['polsk', 'poland', 'polish', 'polon', 'korona', 'warsaw', 'warszaw', 'rzeczpospolita', 'polen'], 'korona'],
    [['russia', 'rosyj', 'rossi', 'moscow', 'moskiew', 'moskov', 'росс', 'русск', 'soviet', 'radzieck', 'ссср', 'ssr', 'socjalistyczna'], 'rosja'],
    [['prus', 'german', 'niemc', 'niemie', 'deutsch', 'preu', 'generalgouv', 'gubernatorstwo', 'bezirk', 'ober ost'], 'niemcy'],
    [['austri', 'habsburg', 'galic', 'österr', 'oesterr', 'lodomer'], 'austria'],
]

// Lata, dla których OHM nie ma tu państw, tylko województwa / gubernie – przynależność bierzemy z nich.
const PRZED_UNIA: [number, number] = [-9999, 1569.5] // przed unią lubelską (1 VII 1569)
const PO_I_ROZBIORZE: [number, number] = [1773.71, 1795.82] // Rzeczpospolita bez podziału w OHM
const WOJ_ZMIANA = ['podlas', 'kijow', 'kijów', 'kyiv', 'kiev', 'wołyń', 'wolyn', 'volhyn', 'bracław', 'braclaw', 'bratslav']
const WOJ_KORONY = ['lubelsk', 'lublin', 'krakow', 'krakó', 'cracow', 'sandomier', 'ruskie', 'ruthen', 'bełsk', 'belz', 'podolsk', 'podolia', 'kalisk', 'kalisz', 'poznań', 'poznan', 'sieradz', 'łęczyc', 'leczyc', 'rawsk', 'rawa', 'płock', 'plock', 'mazow', 'masov', 'mazov', 'inowrocław', 'inowroclaw', 'chełmiń', 'chelmin', 'chełmno', 'chelmno', 'malbor', 'pomorsk', 'prusy król', 'royal prussia', 'gnieźn', 'gniezn', 'czernihow', 'chernihiv', 'dobrzy', 'chełmsk', 'chelm']
const WOJ_LITWY = ['brzeskie lit', 'brześć lit', 'brest lit', 'brzesko-lit', 'wileń', 'wilen', 'vilni', 'vilnius', 'trock', 'trakai', 'trakų', 'nowogródz', 'nowogrodz', 'navahrud', 'naugard', 'połock', 'polock', 'polotsk', 'witebsk', 'vitebsk', 'mścisław', 'mscislaw', 'mstsislaw', 'mińsk', 'minsk', 'smoleń', 'smolensk', 'żmud', 'zmud', 'samogit', 'žemait']
const ZASTEPCZE: { klucze: string[]; lata: [number, number]; panstwo: Panstwo; nazwa?: string }[] = [
    { klucze: ['brzesko-kuj', 'brześć kuj', 'brest kuj'], lata: PRZED_UNIA, panstwo: 'korona' },
    { klucze: ['brzesko-kuj', 'brześć kuj', 'brest kuj'], lata: PO_I_ROZBIORZE, panstwo: 'korona' },
    { klucze: WOJ_ZMIANA, lata: PRZED_UNIA, panstwo: 'litwa' },
    { klucze: WOJ_ZMIANA, lata: PO_I_ROZBIORZE, panstwo: 'korona' },
    { klucze: WOJ_LITWY, lata: PRZED_UNIA, panstwo: 'litwa' },
    { klucze: WOJ_LITWY, lata: PO_I_ROZBIORZE, panstwo: 'litwa' },
    { klucze: WOJ_KORONY, lata: PRZED_UNIA, panstwo: 'korona' },
    { klucze: WOJ_KORONY, lata: PO_I_ROZBIORZE, panstwo: 'korona' },
    // po 1867 OHM nie ma tu Imperium Rosyjskiego, po 1918 – II Rzeczypospolitej
    { klucze: ['gubern', 'губерн', 'governorate'], lata: [1867, 1915.6], panstwo: 'rosja', nazwa: 'Imperium Rosyjskie' },
    { klucze: ['wojew', 'voivod'], lata: [1918.86, 1939.75], panstwo: 'korona', nazwa: 'Rzeczpospolita Polska' },
    { klucze: ['wojew', 'voivod'], lata: [1944.55, 1999], panstwo: 'korona', nazwa: 'Polska' },
]

const nazwaWyrazenie = ['downcase', ['concat', ['coalesce', ['get', 'name_en'], ''], ' ', ['coalesce', ['get', 'name'], ''], ' ', ['coalesce', ['get', 'name_pl'], '']]]
const zawiera = (klucze: string[]) => ['any', ...klucze.map((s) => ['>=', ['index-of', s, nazwaWyrazenie], 0])]

/** Kolor państw (poziom 2–3). */
function kolorPanstwa(): unknown {
    const reszta = ['to-color', ['at', ['%', ['floor', ['abs', ['to-number', ['coalesce', ['get', 'osm_id'], 0], 0]]], PALETA_INNYCH.length], ['literal', PALETA_INNYCH]]]
    return ['case', zawiera(RZECZPOSPOLITA), PRZEZROCZYSTY, ...KLUCZE_PANSTW.flatMap(([klucze, p]) => [zawiera(klucze), PANSTWA[p].kolor]), reszta]
}

const zastepczeNaRok = (rok: number) => ZASTEPCZE.filter((z) => rok >= z.lata[0] && rok < z.lata[1])

// Każde województwo / gubernia dostaje jeden z trzech odcieni (wg numeru obiektu w OHM),
// żeby sąsiednie dało się odróżnić. Przy znanym państwie – odcień jego koloru, poza tym
// jaśniejsza / ciemniejsza nakładka na kolor państwa z warstwy niżej.
const odcien = ['%', ['floor', ['abs', ['to-number', ['coalesce', ['get', 'osm_id'], 0], 0]]], 3]

/** Kolor województw / guberni (poziom 4) w danym roku. */
export function kolorWojewodztw(rok: number): unknown {
    const nakladka = ['match', odcien, 0, '#ffffff', 1, '#3a2a20', '#ffffff']
    const reguly = zastepczeNaRok(rok)
    if (!reguly.length) return nakladka
    return ['case', ...reguly.flatMap((z) => [zawiera(z.klucze), PANSTWA[z.panstwo].kolor]), nakladka]
}

/** Przezroczystość województw: odcień koloru państwa albo delikatna nakładka. */
export function przezroczystoscWojewodztw(rok: number, ciemny: boolean): unknown {
    const k = ciemny ? 1.35 : 1
    const nakladka = ['match', odcien, 0, 0.22 * k, 1, 0.06 * k, 0]
    const reguly = zastepczeNaRok(rok)
    if (!reguly.length) return nakladka
    return ['case', ['any', ...reguly.map((z) => zawiera(z.klucze))], ['match', odcien, 0, 0.12 * k, 1, 0.24 * k, 0.18 * k], nakladka]
}

/** Do jakiego państwa należało województwo w danym roku (tylko lata bez danych o państwach). */
export function panstwoWojewodztwa(w: Record<string, unknown>, rok: number): string | null {
    const nazwa = `${w.name_en ?? ''} ${w.name ?? ''} ${w.name_pl ?? ''}`.toLowerCase()
    const z = zastepczeNaRok(rok).find((r) => r.klucze.some((k) => nazwa.includes(k)))
    return z ? (z.nazwa ?? PANSTWA[z.panstwo].nazwa) : null
}

/** Klucz kolorów pod mapą. */
export const LEGENDA_PANSTW = Object.values(PANSTWA).map((p) => ({ nazwa: p.legenda, kolor: p.kolor }))
export const czyRzeczpospolita = (rok: number) => rok >= 1569.5 && rok < 1795.82

/**
 * Warstwy granic: tło państw (półprzezroczyste kolory), odcienie województw / guberni,
 * kreski granic (państwa ciągłą, województwa i gubernie przerywaną) i podpisy. Podpisy liczy komponent mapy –
 * po jednym na każde państwo / województwo widoczne w kadrze (źródło GeoJSON „granice-napisy”).
 */
export function warstwyGranic(rok: number, ciemny: boolean): LayerSpecification[] {
    const kolor = ciemny ? '#c98a6a' : '#9a3b22'
    const napis = ciemny ? '#ece4d6' : '#3a2a20'
    const obwodka = ciemny ? '#1c1d1f' : '#f3ede0'
    const tlo = (id: string, poziomy: number[], przezroczystosc: unknown, kolorTla: unknown): LayerSpecification => ({
        id,
        type: 'fill',
        source: 'granice',
        'source-layer': 'boundaries',
        filter: filtrGranic(rok, poziomy),
        paint: { 'fill-color': kolorTla as string, 'fill-opacity': przezroczystosc as number, 'fill-antialias': false },
    })
    return [
        tlo('granice-tlo', WARSTWY_Z_ROKIEM['granice-tlo'], ciemny ? 0.24 : 0.17, kolorPanstwa()),
        tlo('granice-tlo-nizsze', WARSTWY_Z_ROKIEM['granice-tlo-nizsze'], przezroczystoscWojewodztw(rok, ciemny), kolorWojewodztw(rok)),
        // województwa / ziemie / departamenty / gubernie przerywaną kreską, powiaty cieńszą
        {
            id: 'granice-hist-woj',
            type: 'line',
            source: 'granice',
            'source-layer': 'boundaries',
            filter: filtrGranic(rok, WARSTWY_Z_ROKIEM['granice-hist-woj']),
            layout: { 'line-join': 'round' },
            paint: {
                'line-color': kolor,
                'line-width': ['match', ['get', 'admin_level'], 4, 1.4, 0.9],
                'line-opacity': ['match', ['get', 'admin_level'], 4, 0.8, 0.5],
                'line-dasharray': ['literal', [4, 2.5]],
            },
        },
        {
            id: 'granice-hist',
            type: 'line',
            source: 'granice',
            'source-layer': 'boundaries',
            filter: filtrGranic(rok, WARSTWY_Z_ROKIEM['granice-hist']),
            layout: { 'line-join': 'round' },
            paint: {
                'line-color': kolor,
                'line-width': ['match', ['get', 'admin_level'], 2, 2.6, 2],
                'line-opacity': 0.9,
            },
        },
        {
            id: 'granice-napisy',
            type: 'symbol',
            source: 'granice-napisy',
            layout: {
                // pierwszeństwo: Korona / Litwa (3), państwa (2), województwa (4+)
                'symbol-sort-key': ['match', ['get', 'poziom'], 3, 0, 2, 1, ['get', 'poziom']],
                'text-field': ['get', 'nazwa'],
                'text-font': ['case', ['<=', ['get', 'poziom'], 3], ['literal', ['Noto Sans Bold']], ['literal', ['Noto Sans Italic']]],
                'text-size': ['case', ['<=', ['get', 'poziom'], 3], 14, 12],
                'text-transform': ['case', ['<=', ['get', 'poziom'], 3], 'uppercase', 'none'],
                'text-letter-spacing': ['case', ['<=', ['get', 'poziom'], 3], 0.18, 0.03],
                'text-max-width': 12,
                // podpis województwa trafia zwykle w ten sam punkt co państwa – wtedy schodzi pod lub nad nie
                'text-variable-anchor': ['center', 'top', 'bottom'],
                'text-radial-offset': ['case', ['<=', ['get', 'poziom'], 3], 0, 2.4],
                'text-padding': 3,
            },
            paint: { 'text-color': napis, 'text-halo-color': obwodka, 'text-halo-width': 2, 'text-opacity': ['case', ['<=', ['get', 'poziom'], 3], 0.9, 0.75] },
        },
    ]
}

// ---------- ziemie województwa podlaskiego (drohicka, mielnicka, bielska) ----------
// Granice z „Atlasu historycznego Polski. Mapy szczegółowe XVI wieku” (IH PAN, Atlas Fontium),
// warstwa „Powiaty”, uproszczone – public/granice/ziemie-podlaskie-xvi.geojson. OpenHistoricalMap ich nie ma.
// Atlas obejmuje tylko Koronę, więc ziemia brzeska (Międzyrzec, Wielkie Księstwo Litewskie) jest poza nim.

export const ZRODLO_ZIEM: SourceSpecification = {
    type: 'geojson',
    data: '/granice/ziemie-podlaskie-xvi.geojson',
    // CC BY 4.0 – wymaga podania autora, licencji i informacji o zmianach (granice uproszczone)
    attribution: 'ziemie: <a href="https://data.atlasfontium.pl/layers/geonode:powiaty">Atlas historyczny Polski XVI w., IH PAN</a>, <a href="https://creativecommons.org/licenses/by/4.0/deed.pl">CC BY 4.0</a>, uproszczone',
}

export const WARSTWY_ZIEM = ['ziemie-tlo', 'ziemie-linie']

/** Ziemie pokazujemy w czasach województwa podlaskiego (od początku XVI w. do III rozbioru). */
export const czyZiemie = (rok: number | null) => rok !== null && rok >= 1500 && rok < 1795.82

export function warstwyZiem(ciemny: boolean): LayerSpecification[] {
    return [
        // niewidoczne wypełnienie – tylko do podpisów (jak województwa)
        { id: 'ziemie-tlo', type: 'fill', source: 'ziemie', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#000000', 'fill-opacity': 0 } },
        // granice jako osobne linie (wspólny odcinek dwóch ziem tylko raz – inaczej przerywane kreski się nakładają)
        {
            id: 'ziemie-linie',
            type: 'line',
            source: 'ziemie',
            filter: ['==', ['geometry-type'], 'LineString'],
            layout: { 'line-join': 'round' },
            paint: { 'line-color': ciemny ? '#c98a6a' : '#9a3b22', 'line-width': 1.1, 'line-opacity': 0.75, 'line-dasharray': ['literal', [2, 2]] },
        },
    ]
}
