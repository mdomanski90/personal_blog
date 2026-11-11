// Styl mapy wektorowej (MapLibre) na danych OpenFreeMap (schemat OpenMapTiles).
// Papierowe tło, przygaszone drogi, rzeki i lasy; bez sklepów, numerów domów i nazw wsi
// (nazwy naszych miejscowości są przy tarczach). Osobne kolory dla trybu ciemnego.

import type { StyleSpecification } from 'maplibre-gl'

const PALETY = {
    jasny: {
        tlo: '#f3ede0', las: '#dfe5cf', mokradlo: '#e4e9dc', zabudowa: '#ebe2d0', woda: '#b9cbd9', rzeka: '#9fb7cc',
        droga1: '#e2bf98', droga2: '#e9cfae', droga3: '#efdfc6', droga4: '#f7f0e3', kolej: '#b3a893',
        granica: '#a59c8a', napis: '#6b665b', napisObwodka: '#f3ede0',
    },
    ciemny: {
        tlo: '#1c1d1f', las: '#232b24', mokradlo: '#22282a', zabudowa: '#262523', woda: '#283746', rzeka: '#33485c',
        droga1: '#5a4a38', droga2: '#4a4036', droga3: '#3d3731', droga4: '#302d2a', kolej: '#55504a',
        granica: '#5f594f', napis: '#a39d91', napisObwodka: '#1c1d1f',
    },
}

/** `pomin` – nazwy miejscowości, które mają własne tarcze (bez podwójnych napisów). */
export function stylMapy(ciemny: boolean, pomin: string[] = []): StyleSpecification {
    const p = ciemny ? PALETY.ciemny : PALETY.jasny
    const szer = (z8: number, z14: number): ['interpolate', ['exponential', number], ['zoom'], number, number, number, number] => [
        'interpolate', ['exponential', 1.5], ['zoom'], 8, z8, 14, z14,
    ]
    return {
        version: 8,
        glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
        sources: {
            omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: '© <a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright">autorzy OpenStreetMap</a>' },
        },
        layers: [
            { id: 'tlo', type: 'background', paint: { 'background-color': p.tlo } },
            { id: 'zabudowa', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood', 'commercial', 'industrial']]], paint: { 'fill-color': p.zabudowa } },
            { id: 'las', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wood'], paint: { 'fill-color': p.las } },
            { id: 'mokradlo', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wetland'], paint: { 'fill-color': p.mokradlo } },
            { id: 'woda', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': p.woda } },
            {
                id: 'rzeki', type: 'line', source: 'omt', 'source-layer': 'waterway',
                filter: ['in', ['get', 'class'], ['literal', ['river', 'canal']]],
                paint: { 'line-color': p.rzeka, 'line-width': szer(1, 3) },
            },
            {
                id: 'strumienie', type: 'line', source: 'omt', 'source-layer': 'waterway', minzoom: 10,
                filter: ['in', ['get', 'class'], ['literal', ['stream', 'ditch', 'drain']]],
                paint: { 'line-color': p.rzeka, 'line-width': szer(0.4, 1.4), 'line-opacity': 0.8 },
            },
            {
                id: 'granice', type: 'line', source: 'omt', 'source-layer': 'boundary',
                filter: ['all', ['in', ['get', 'admin_level'], ['literal', [4, 6, 7]]], ['!=', ['get', 'maritime'], 1]],
                paint: {
                    'line-color': p.granica,
                    'line-width': ['match', ['get', 'admin_level'], 4, 1.4, 6, 1, 0.7],
                    'line-dasharray': ['literal', [4, 3]],
                    'line-opacity': ['match', ['get', 'admin_level'], 7, 0.6, 0.85],
                },
            },
            {
                id: 'drogi-lokalne', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 11,
                filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'track']]],
                paint: { 'line-color': p.droga4, 'line-width': szer(0.5, 3) },
            },
            {
                id: 'drogi-powiatowe', type: 'line', source: 'omt', 'source-layer': 'transportation',
                filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary']]],
                paint: { 'line-color': p.droga3, 'line-width': szer(0.8, 5) },
            },
            {
                id: 'drogi-glowne', type: 'line', source: 'omt', 'source-layer': 'transportation',
                filter: ['in', ['get', 'class'], ['literal', ['primary', 'trunk']]],
                paint: { 'line-color': p.droga2, 'line-width': szer(1.2, 6) },
            },
            {
                id: 'autostrady', type: 'line', source: 'omt', 'source-layer': 'transportation',
                filter: ['==', ['get', 'class'], 'motorway'],
                paint: { 'line-color': p.droga1, 'line-width': szer(1.6, 7) },
            },
            {
                id: 'kolej', type: 'line', source: 'omt', 'source-layer': 'transportation',
                filter: ['==', ['get', 'class'], 'rail'],
                paint: { 'line-color': p.kolej, 'line-width': szer(0.8, 2), 'line-dasharray': ['literal', [3, 2]] },
            },
            {
                id: 'nazwy-rzek', type: 'symbol', source: 'omt', 'source-layer': 'waterway', minzoom: 10,
                filter: ['==', ['get', 'class'], 'river'],
                layout: { 'symbol-placement': 'line', 'text-field': ['coalesce', ['get', 'name:pl'], ['get', 'name']], 'text-font': ['Noto Sans Italic'], 'text-size': 11, 'text-letter-spacing': 0.1 },
                paint: { 'text-color': p.rzeka, 'text-halo-color': p.napisObwodka, 'text-halo-width': 1.5 },
            },
            {
                id: 'nazwy-miast', type: 'symbol', source: 'omt', 'source-layer': 'place',
                filter: ['all', ['in', ['get', 'class'], ['literal', ['city', 'town']]], ['!', ['in', ['get', 'name'], ['literal', pomin]]]],
                layout: { 'text-field': ['coalesce', ['get', 'name:pl'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': ['match', ['get', 'class'], 'city', 13, 11.5], 'text-letter-spacing': 0.05 },
                paint: { 'text-color': p.napis, 'text-halo-color': p.napisObwodka, 'text-halo-width': 1.5 },
            },
        ],
    }
}
