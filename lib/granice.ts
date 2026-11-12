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
    { etykieta: '1815–1830', rok: 1825, opis: 'Królestwo Polskie (w unii personalnej z Rosją, car królem polskim) – województwo podlaskie' },
    { etykieta: '1875', rok: 1875, opis: 'kasata unii – gubernia siedlecka w Imperium Rosyjskim' },
    { etykieta: '1913', rok: 1913, opis: 'przed wojną i bieżeństwem (1915)' },
    { etykieta: '1922', rok: 1922.7, opis: 'II Rzeczpospolita po traktacie ryskim (1921) i przyłączeniu Wileńszczyzny (1922) – województwo lubelskie' },
    { etykieta: '1940', rok: 1940, opis: 'okupacja – granica niemiecko-sowiecka na Bugu, Generalne Gubernatorstwo' },
    { etykieta: '1942', rok: 1942, opis: 'okupacja niemiecka – zagłada gmin żydowskich' },
    { etykieta: '1946', rok: 1946.5, opis: 'Polska w granicach po umowie z ZSRR (VIII 1945) – województwo lubelskie, powiat siedlecki' },
    { etykieta: '1975', rok: 1980, opis: 'po reformie z 1975 r. – Łosice i Olszanka w województwie siedleckim, Międzyrzec w bialskopodlaskim' },
    { etykieta: '1999', rok: 2010, opis: 'po reformie z 1999 r. – Łosice i Olszanka w województwie mazowieckim, Międzyrzec w lubelskim' },
]

export function filtrGranic(rok: number, poziomy: number[] = [2, 3, 4, 5, 6]): FilterSpecification {
    const wRoku: FilterSpecification = [
        'all',
        ['<=', ['coalesce', ['get', 'start_decdate'], -9999], rok],
        ['>', ['coalesce', ['get', 'end_decdate'], 9999], rok],
        ['in', ['get', 'admin_level'], ['literal', poziomy]],
    ]
    // Przed unią lubelską OHM nie ma tu Wielkiego Księstwa jako całości – bierzemy jego obszar z lat 1569–1773.
    // Ziemie przeniesione w 1569 do Korony (Podlasie, Wołyń, Kijów, Bracław) dochodzą z województw (ZASTEPCZE).
    if (rok < 1569.5 && poziomy.includes(3)) {
        return ['any', wRoku, ['all', ['==', ['get', 'admin_level'], 3], ['==', ['get', 'name_en'], 'Grand Duchy of Lithuania']]]
    }
    return wRoku
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
// bez własnego koloru: RON (w środku Korona i Litwa) i obszar Korony z OHM (w OHM bywa uszkodzony –
// Koronę kolorujemy z województw: Atlas historyczny Polski XVI w. + wschodnie województwa z OHM)
const RZECZPOSPOLITA = ['obojga', 'poland-lithuania', 'polish-lithuanian', 'crown of the kingdom']
// Kolejność ma znaczenie: Prusy przed Rosją („Prussia” zawiera „russia”), Prusy Królewskie przy Koronie.
const KLUCZE_PANSTW: [string[], Panstwo][] = [
    [['lithuan', 'litew', 'lietuv'], 'litwa'],
    [['polsk', 'poland', 'polish', 'polon', 'korona', 'warsaw', 'warszaw', 'rzeczpospolita', 'polen', 'royal prussia', 'prusy król'], 'korona'],
    [['prus', 'preu', 'german', 'niemc', 'niemie', 'deutsch', 'teuton', 'krzyżac', 'generalgouv', 'gubernatorstwo', 'bezirk', 'ober ost'], 'niemcy'],
    [['russia', 'rosyj', 'rossi', 'moscow', 'moskiew', 'moskov', 'росс', 'русск', 'soviet', 'radzieck', 'ссср', 'ssr', 'socjalistyczna'], 'rosja'],
    [['austri', 'habsburg', 'galic', 'österr', 'oesterr', 'lodomer', 'royal hungary', 'królewskie węgry'], 'austria'],
]

// Lata, dla których OHM nie ma tu państw, tylko województwa / gubernie – przynależność bierzemy z nich.
const PRZED_UNIA: [number, number] = [-9999, 1569.5] // przed unią lubelską (1 VII 1569)
const PO_I_ROZBIORZE: [number, number] = [1773.71, 1795.82] // Rzeczpospolita bez podziału w OHM
const WOJ_ZMIANA = ['kijow', 'kijów', 'kyiv', 'kiev', 'wołyń', 'wolyn', 'volhyn', 'bracław', 'braclaw', 'bratslav']
const WOJ_KORONY = ['podlas', 'lubelsk', 'lublin', 'krakow', 'krakó', 'cracow', 'sandomier', 'ruskie', 'ruthen', 'bełsk', 'belz', 'podolsk', 'podolia', 'kalisk', 'kalisz', 'poznań', 'poznan', 'sieradz', 'łęczyc', 'leczyc', 'rawsk', 'rawa', 'płock', 'plock', 'mazow', 'masov', 'mazov', 'inowrocław', 'inowroclaw', 'chełmiń', 'chelmin', 'chełmno', 'chelmno', 'malbor', 'pomorsk', 'prusy król', 'royal prussia', 'gnieźn', 'gniezn', 'czernihow', 'chernihiv', 'dobrzy', 'chełmsk', 'chelm']
const WOJ_LITWY = ['brzeskie lit', 'brześć lit', 'brest lit', 'brzesko-lit', 'wileń', 'wilen', 'vilni', 'vilnius', 'trock', 'trakai', 'trakų', 'nowogródz', 'nowogrodz', 'navahrud', 'naugard', 'połock', 'polock', 'polotsk', 'witebsk', 'vitebsk', 'mścisław', 'mscislaw', 'mstsislaw', 'mińsk', 'minsk', 'smoleń', 'smolensk', 'żmud', 'zmud', 'samogit', 'žemait']
// wschód Korony (Ruś Czerwona, Podole) – poza Atlasem historycznym Polski, więc z województw OHM
const WOJ_KORONY_WSCHOD = ['ruskie', 'ruthen', 'bełsk', 'belz', 'podolsk', 'podolia', 'czernihow', 'chernihiv', 'chełmsk']
/** Lata, w których Koronę rysuje warstwa z Atlasu historycznego Polski XVI w. (do I rozbioru). */
export const czyKorona = (rok: number | null) => rok !== null && rok < 1772.6
const ZASTEPCZE: { klucze: string[]; lata: [number, number]; panstwo: Panstwo; nazwa?: string }[] = [
    { klucze: WOJ_KORONY_WSCHOD, lata: [-9999, 1795.82], panstwo: 'korona' },
    { klucze: ['brzesko-kuj', 'brześć kuj', 'brest kuj'], lata: PO_I_ROZBIORZE, panstwo: 'korona' },
    { klucze: WOJ_ZMIANA, lata: PRZED_UNIA, panstwo: 'litwa' },
    { klucze: WOJ_ZMIANA, lata: [1569.5, 1795.82], panstwo: 'korona' },
    // reszta Litwy przed 1569 – z obszaru Wielkiego Księstwa z lat 1569–1773 (filtrGranic), nie z województw
    { klucze: WOJ_LITWY, lata: PO_I_ROZBIORZE, panstwo: 'litwa' },
    { klucze: WOJ_KORONY, lata: PO_I_ROZBIORZE, panstwo: 'korona' },
    // po 1867 OHM nie ma tu Imperium Rosyjskiego, po 1918 – II Rzeczypospolitej
    { klucze: ['gubern', 'губерн', 'governorate'], lata: [1867, 1915.6], panstwo: 'rosja', nazwa: 'Imperium Rosyjskie' },
    // tylko lata bez obszaru Polski w OHM (1918–VI 1922) – potem województwa bez własnego koloru, żeby nie odcinały się od reszty kraju
    { klucze: ['wojew', 'voivod'], lata: [1918.86, 1922.47], panstwo: 'korona', nazwa: 'Rzeczpospolita Polska' },
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
// lekkie przyciemnienie koloru państwa z warstwy niżej.
const odcien = ['%', ['floor', ['abs', ['to-number', ['coalesce', ['get', 'osm_id'], 0], 0]]], 3]

/** Kolor województw / guberni (poziom 4) w danym roku. */
export function kolorWojewodztw(rok: number): unknown {
    const nakladka = '#3a2a20'
    const reguly = zastepczeNaRok(rok)
    if (!reguly.length) return nakladka
    return ['case', ...reguly.flatMap((z) => [zawiera(z.klucze), PANSTWA[z.panstwo].kolor]), nakladka]
}

/** Przezroczystość województw: odcień koloru państwa albo delikatna nakładka. */
export function przezroczystoscWojewodztw(rok: number, ciemny: boolean): unknown {
    const k = ciemny ? 1.35 : 1
    // tylko lekkie przyciemnienie – kolor państwa zostaje ten sam we wszystkich okresach
    const nakladka = ['match', odcien, 0, 0, 1, 0.03 * k, 0.06 * k]
    const reguly = zastepczeNaRok(rok)
    if (!reguly.length) return nakladka
    return ['case', ['any', ...reguly.map((z) => zawiera(z.klucze))], ['match', odcien, 0, 0.18 * k, 1, 0.24 * k, 0.21 * k], nakladka]
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
        tlo('granice-tlo', WARSTWY_Z_ROKIEM['granice-tlo'], ciemny ? 0.28 : 0.22, kolorPanstwa()),
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
                // wielkimi literami tylko państwa (2); części państw (3: Korona i Litwa w RON, Galicja, Węgry
                // w Cesarstwie) zwykłym pogrubionym, województwa i ziemie kursywą
                'text-font': ['case', ['<=', ['get', 'poziom'], 3], ['literal', ['Noto Sans Bold']], ['literal', ['Noto Sans Italic']]],
                'text-size': ['match', ['get', 'poziom'], 2, 14, 3, 12, 11.5],
                'text-transform': ['case', ['==', ['get', 'poziom'], 2], 'uppercase', 'none'],
                'text-letter-spacing': ['case', ['==', ['get', 'poziom'], 2], 0.18, 0.02],
                'text-max-width': 12,
                // podpis województwa trafia zwykle w ten sam punkt co państwa – wtedy schodzi pod lub nad nie
                'text-variable-anchor': ['center', 'top', 'bottom'],
                'text-radial-offset': ['case', ['<=', ['get', 'poziom'], 3], 0, 2.4],
                'text-padding': 3,
            },
            paint: { 'text-color': napis, 'text-halo-color': obwodka, 'text-halo-width': 2, 'text-opacity': ['match', ['get', 'poziom'], 2, 0.9, 3, 0.8, 0.75] },
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

/** Podpis na mapie – w niektórych okresach dopowiadamy, czym było państwo (np. unia personalna). */
export function nazwaNaMapie(nazwa: string, rok: number): string {
    // Królestwo Polskie 1815–1831: osobne państwo, car Rosji królem polskim
    if (rok >= 1815.4 && rok < 1831.1 && /^królestwo polskie$/i.test(nazwa.trim())) return 'Królestwo Polskie w unii z Imperium Rosyjskim'
    // „Królewskie Węgry” to tylko habsburska część Węgier w latach 1526–1699
    if (rok >= 1699 && /^królewskie węgry$/i.test(nazwa.trim())) return 'Królestwo Węgier'
    // Mazowsze do 1526 – księstwo, lenno Korony
    if (rok < 1526 && /^województwo mazowieckie$/i.test(nazwa.trim())) return 'Księstwo Mazowieckie (lenno Korony)'
    return nazwa
}

// ---------- Korona w XVI w. (Atlas historyczny Polski XVI w., warstwa „Województwa”) ----------
// public/granice/korona-xvi.geojson: województwa Korony (bez Rusi, Wołynia, Podola, Kijowszczyzny i Bracławszczyzny –
// tych Atlas nie obejmuje, biorą się z OHM), linie granic województw i granica Podlasia z Koroną sprzed 1569.

export const ZRODLO_KORONY: SourceSpecification = { ...ZRODLO_ZIEM, data: '/granice/korona-xvi.geojson' }
export const WARSTWY_KORONY = ['korona-tlo', 'korona-linie', 'korona-granica-1569']

/** Kolor województwa z Atlasu: Podlasie do 1569 litewskie, reszta – Korona. */
export function kolorKorony(rok: number): unknown {
    return rok < 1569.5 ? ['case', ['has', 'przed1569'], PANSTWA.litwa.kolor, PANSTWA.korona.kolor] : PANSTWA.korona.kolor
}

/** Państwo, do którego należał obszar (województwo z Atlasu albo z OHM) – do podpisu państwa. */
export function panstwoObszaru(w: Record<string, unknown>, rok: number): string | null {
    if (w.zrodlo === 'ohm-luka') return w.panstwo ? String(w.panstwo) : null
    if (w.zrodlo === 'ahp') return rok < 1569.5 && w.przed1569 ? String(w.przed1569) : String(w.panstwo)
    return panstwoWojewodztwa(w, rok)
}

/** Przezroczystość województw z Atlasu: Mazowsze przed 1526 – księstwo, lenno Korony – jaśniej. */
export function przezroczystoscKorony(rok: number, ciemny: boolean): unknown {
    const pelna = ciemny ? 0.28 : 0.22
    return rok < 1526 ? ['case', ['==', ['get', 'name'], 'województwo mazowieckie'], pelna * 0.45, pelna] : pelna
}

export function warstwyKorony(rok: number, ciemny: boolean): LayerSpecification[] {
    const kolor = ciemny ? '#c98a6a' : '#9a3b22'
    return [
        { id: 'korona-tlo', type: 'fill', source: 'korona', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': kolorKorony(rok) as string, 'fill-opacity': przezroczystoscKorony(rok, ciemny) as number, 'fill-antialias': false } },
        {
            id: 'korona-linie',
            type: 'line',
            source: 'korona',
            filter: ['==', ['get', 'linia'], 'wojewodztwa'],
            layout: { 'line-join': 'round' },
            paint: { 'line-color': kolor, 'line-width': 1.4, 'line-opacity': 0.8, 'line-dasharray': ['literal', [4, 2.5]] },
        },
        {
            id: 'korona-granica-1569',
            type: 'line',
            source: 'korona',
            filter: ['==', ['get', 'linia'], 'granica-1569'],
            layout: { 'line-join': 'round', visibility: rok < 1569.5 ? 'visible' : 'none' },
            paint: { 'line-color': kolor, 'line-width': 2.6, 'line-opacity': 0.9 },
        },
    ]
}

// ---------- Rzeczpospolita ok. 1600: obszary, których OHM nie dzieli na województwa ----------
// public/granice/rzeczpospolita-1600-uzupelnienia.geojson – wyliczone z OHM (CC0) jako część obszaru RON z 1600 r.
// poza Wielkim Księstwem i województwami (OHM i Atlas): województwo kijowskie, Inflanty, Prusy Książęce i drobne lenna.
export const ZRODLO_UZUPELNIEN: SourceSpecification = { type: 'geojson', data: '/granice/rzeczpospolita-1600-uzupelnienia.geojson', attribution: 'Kijowszczyzna, Inflanty i lenna ok. 1600: wyznaczone z danych <a href="https://www.openhistoricalmap.org/copyright">OpenHistoricalMap</a> (CC0)' }
export const WARSTWY_UZUPELNIEN = ['uzupelnienia-tlo', 'uzupelnienia-linie']
export const czyUzupelnienia = (rok: number | null) => rok !== null && rok >= 1569.5 && rok < 1618.9

export function warstwyUzupelnien(ciemny: boolean): LayerSpecification[] {
    const a = ciemny ? 0.28 : 0.22
    return [
        {
            id: 'uzupelnienia-tlo', type: 'fill', source: 'uzupelnienia',
            paint: {
                'fill-color': ['match', ['get', 'rodzaj'], 'kondominium', '#77603d', PANSTWA.korona.kolor] as unknown as string,
                'fill-opacity': ['match', ['get', 'rodzaj'], 'lenno', a * 0.45, 'kondominium', a * 0.9, a] as unknown as number,
                'fill-antialias': false,
            },
        },
        {
            id: 'uzupelnienia-linie', type: 'line', source: 'uzupelnienia', filter: ['!=', ['get', 'rodzaj'], 'korona'],
            layout: { 'line-join': 'round' },
            paint: { 'line-color': ciemny ? '#c98a6a' : '#9a3b22', 'line-width': 1.2, 'line-opacity': 0.7, 'line-dasharray': ['literal', [3, 2]] },
        },
    ]
}

/**
 * Nazwa państwa dla części (poziom 3), gdy OHM nie ma całego państwa jako obszaru – np. ziemie Habsburgów
 * w 1796 są w OHM tylko jako Galicja, Królewskie Węgry, Korona Czeska, Austriacki Okręg Rzeszy.
 */
export function panstwoCzesci(w: Record<string, unknown>, rok: number): string | null {
    const nazwa = `${w.name_en ?? ''} ${w.name ?? ''} ${w.name_pl ?? ''}`.toLowerCase()
    const habsburskie = ['galic', 'lodomer', 'królewskie węgry', 'royal hungary', 'koruny české', 'bohemian crown', 'österreichischer reichskreis', 'austrian circle']
    if (rok >= 1526 && rok < 1918.9 && habsburskie.some((k) => nazwa.includes(k))) return rok < 1804.6 ? 'Monarchia Habsburgów' : rok < 1867.4 ? 'Cesarstwo Austriackie' : 'Austro-Węgry'
    return null
}
