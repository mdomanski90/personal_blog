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

export function filtrGranic(rok: number): FilterSpecification {
    return [
        'all',
        ['<=', ['coalesce', ['get', 'start_decdate'], -9999], rok],
        ['>', ['coalesce', ['get', 'end_decdate'], 9999], rok],
        ['in', ['get', 'admin_level'], ['literal', [2, 3, 4, 5, 6]]],
    ]
}

/** Warstwy granic: państwa grubą kreską, województwa / departamenty / gubernie cieńszą, powiaty najcieńszą. */
export function warstwyGranic(rok: number, ciemny: boolean): LayerSpecification[] {
    const kolor = ciemny ? '#c98a6a' : '#9a3b22'
    const napis = ciemny ? '#e2b49c' : '#7a2e1a'
    const obwodka = ciemny ? '#1c1d1f' : '#f3ede0'
    return [
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
            id: 'granice-hist-nazwy',
            type: 'symbol',
            source: 'granice',
            'source-layer': 'boundaries',
            filter: filtrGranic(rok),
            minzoom: 7,
            layout: {
                'symbol-placement': 'line',
                'symbol-spacing': 400,
                'text-field': ['coalesce', ['get', 'name_pl'], ['get', 'name']],
                'text-font': ['Noto Sans Italic'],
                'text-size': ['match', ['get', 'admin_level'], 2, 12, 11],
                'text-offset': [0, -0.8],
                'text-letter-spacing': 0.05,
            },
            paint: { 'text-color': napis, 'text-halo-color': obwodka, 'text-halo-width': 1.6 },
        },
    ]
}
