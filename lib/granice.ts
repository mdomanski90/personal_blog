// Granice historyczne z OpenHistoricalMap (CC0): kafelki wektorowe „ohm_admin”, warstwa „boundaries”.
// Każda granica ma daty od–do (start_decdate, end_decdate – lata dziesiętne), więc wystarczy filtr po roku.

import type { FilterSpecification, LayerSpecification, SourceSpecification } from 'maplibre-gl'

export const ZRODLO_GRANIC: SourceSpecification = {
    type: 'vector',
    url: 'https://vtiles.openhistoricalmap.org/maps/ohm_admin.json',
    attribution: '<a href="https://www.openhistoricalmap.org/copyright">OpenHistoricalMap</a>',
}

/** Lata do szybkiego wyboru z krótkim opisem tego, co było wtedy na tym terenie. */
export const LATA_GRANIC: { rok: number; opis: string }[] = [
    { rok: 1500, opis: 'Podlasie w Wielkim Księstwie Litewskim' },
    { rok: 1600, opis: 'województwo podlaskie w Koronie' },
    { rok: 1700, opis: 'Rzeczpospolita Obojga Narodów' },
    { rok: 1796, opis: 'po III rozbiorze – zabór austriacki' },
    { rok: 1810, opis: 'Księstwo Warszawskie' },
    { rok: 1830, opis: 'Królestwo Polskie' },
    { rok: 1880, opis: 'gubernia siedlecka' },
    { rok: 1914, opis: 'przed I wojną światową' },
    { rok: 1930, opis: 'II Rzeczpospolita' },
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
    'granice-tlo': [2],
    'granice-tlo-nizsze': [3, 4],
    'granice-hist': [2, 3, 4, 5, 6],
}
export const WARSTWY_GRANIC = [...Object.keys(WARSTWY_Z_ROKIEM), 'granice-napisy']

// Kolor państwa po nazwie (sprawdzamy nazwę angielską, oryginalną i polską):
// Polska / Korona / Księstwo Warszawskie – czerwień, Litwa – zieleń, Rosja – ochra,
// Prusy / Niemcy – błękit, Austria – fiolet; pozostałe dostają kolor z palety wg numeru obiektu w OHM.
const PALETA_INNYCH = ['#6b8e23', '#a0522d', '#4682b4', '#8b6914', '#8a5a83', '#5f8a6f']
/** Klucz kolorów pod mapą. */
export const LEGENDA_PANSTW: { nazwa: string; kolor: string }[] = [
    { nazwa: 'Polska', kolor: '#c0392b' },
    { nazwa: 'Litwa', kolor: '#2e7d4f' },
    { nazwa: 'Rosja', kolor: '#b7791f' },
    { nazwa: 'Prusy / Niemcy', kolor: '#2f6aa3' },
    { nazwa: 'Austria', kolor: '#7b4fa0' },
]
const KOLORY_PANSTW: [string[], string][] = [
    [['polsk', 'poland', 'polish', 'polon', 'korona', 'warsaw', 'warszaw', 'rzeczpospolita'], '#c0392b'],
    [['lithuan', 'litew', 'litw', 'lietuv'], '#2e7d4f'],
    [['russia', 'rosyj', 'rossi', 'moscow', 'moskiew', 'moskov', 'росс', 'русск'], '#b7791f'],
    [['prus', 'german', 'niemc', 'niemie', 'deutsch', 'preu'], '#2f6aa3'],
    [['austri', 'habsburg', 'galic', 'österr', 'lodomer'], '#7b4fa0'],
]

function kolorPanstwa(): unknown {
    const nazwa = ['downcase', ['concat', ['coalesce', ['get', 'name_en'], ''], ' ', ['coalesce', ['get', 'name'], ''], ' ', ['coalesce', ['get', 'name_pl'], '']]]
    const zawiera = (s: string) => ['>=', ['index-of', s, nazwa], 0]
    const reszta = ['to-color', ['at', ['%', ['floor', ['abs', ['to-number', ['coalesce', ['get', 'osm_id'], 0], 0]]], PALETA_INNYCH.length], ['literal', PALETA_INNYCH]]]
    return ['case', ...KOLORY_PANSTW.flatMap(([klucze, kolor]) => [['any', ...klucze.map(zawiera)], kolor]), reszta]
}

/**
 * Warstwy granic: tło państw (półprzezroczyste kolory), niewidoczne tło województw / guberni
 * (tylko do wyszukiwania nazw), kreski granic i podpisy. Podpisy liczy komponent mapy –
 * po jednym na każde państwo / województwo widoczne w kadrze (źródło GeoJSON „granice-napisy”).
 */
export function warstwyGranic(rok: number, ciemny: boolean): LayerSpecification[] {
    const kolor = ciemny ? '#c98a6a' : '#9a3b22'
    const napis = ciemny ? '#ece4d6' : '#3a2a20'
    const obwodka = ciemny ? '#1c1d1f' : '#f3ede0'
    const tlo = (id: string, poziomy: number[], przezroczystosc: number): LayerSpecification => ({
        id,
        type: 'fill',
        source: 'granice',
        'source-layer': 'boundaries',
        filter: filtrGranic(rok, poziomy),
        paint: { 'fill-color': kolorPanstwa() as string, 'fill-opacity': przezroczystosc, 'fill-antialias': false },
    })
    return [
        tlo('granice-tlo', WARSTWY_Z_ROKIEM['granice-tlo'], ciemny ? 0.24 : 0.17),
        tlo('granice-tlo-nizsze', WARSTWY_Z_ROKIEM['granice-tlo-nizsze'], 0),
        {
            id: 'granice-hist',
            type: 'line',
            source: 'granice',
            'source-layer': 'boundaries',
            filter: filtrGranic(rok),
            layout: { 'line-join': 'round' },
            paint: {
                'line-color': kolor,
                'line-width': ['match', ['get', 'admin_level'], 2, 2.6, 3, 2, 4, 1.6, 1],
                'line-opacity': ['match', ['get', 'admin_level'], 2, 0.9, 3, 0.8, 4, 0.75, 0.55],
                'line-dasharray': ['literal', [5, 2.5]],
            },
        },
        {
            id: 'granice-napisy',
            type: 'symbol',
            source: 'granice-napisy',
            layout: {
                'symbol-sort-key': ['get', 'poziom'],
                'text-field': ['get', 'nazwa'],
                'text-font': ['case', ['==', ['get', 'poziom'], 2], ['literal', ['Noto Sans Bold']], ['literal', ['Noto Sans Italic']]],
                'text-size': ['case', ['==', ['get', 'poziom'], 2], 14, 12],
                'text-transform': ['case', ['==', ['get', 'poziom'], 2], 'uppercase', 'none'],
                'text-letter-spacing': ['case', ['==', ['get', 'poziom'], 2], 0.18, 0.03],
                'text-max-width': 12,
                // podpis województwa trafia zwykle w ten sam punkt co państwa – wtedy schodzi pod lub nad nie
                'text-variable-anchor': ['center', 'top', 'bottom'],
                'text-radial-offset': ['case', ['==', ['get', 'poziom'], 2], 0, 2.4],
                'text-padding': 3,
            },
            paint: { 'text-color': napis, 'text-halo-color': obwodka, 'text-halo-width': 2, 'text-opacity': ['case', ['==', ['get', 'poziom'], 2], 0.9, 0.75] },
        },
    ]
}
