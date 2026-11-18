// P4 (MAP-06): polskie napisy MapLibre – pełny zestaw kluczy MapLibre 6.x, bez pustych wartości.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LOCALE_PL } from './mapa-locale'

const KLUCZE_MAPLIBRE = [
    'AttributionControl.ToggleAttribution', 'AttributionControl.MapFeedback', 'FullscreenControl.Enter', 'FullscreenControl.Exit',
    'GeolocateControl.FindMyLocation', 'GeolocateControl.LocationNotAvailable', 'LogoControl.Title', 'Map.Title', 'Marker.Title',
    'NavigationControl.ResetBearing', 'NavigationControl.ZoomIn', 'NavigationControl.ZoomOut', 'Popup.Close',
    'ScaleControl.Feet', 'ScaleControl.Meters', 'ScaleControl.Kilometers', 'ScaleControl.Miles', 'ScaleControl.NauticalMiles',
    'GlobeControl.Enable', 'GlobeControl.Disable', 'TerrainControl.Enable', 'TerrainControl.Disable',
    'CooperativeGesturesHandler.WindowsHelpText', 'CooperativeGesturesHandler.MacHelpText', 'CooperativeGesturesHandler.MobileHelpText',
]

test('są wszystkie klucze interfejsu MapLibre, każdy z polskim napisem', () => {
    assert.deepEqual(Object.keys(LOCALE_PL).sort(), [...KLUCZE_MAPLIBRE].sort())
    for (const [k, v] of Object.entries(LOCALE_PL)) assert.ok(v.trim().length > 0, `pusty napis: ${k}`)
})
test('klucze zgadzają się z zainstalowaną wersją MapLibre (po aktualizacji biblioteki zestaw trzeba uzupełnić)', () => {
    const kod = readFileSync(new URL('../node_modules/maplibre-gl/dist/maplibre-gl-dev.mjs', import.meta.url), 'utf8')
    const blok = kod.slice(kod.indexOf('const defaultLocale = {'), kod.indexOf('};', kod.indexOf('const defaultLocale = {')))
    const wBibliotece = [...blok.matchAll(/^\t"([A-Za-z]+\.[A-Za-z]+)":/gm)].map((m) => m[1])
    assert.ok(wBibliotece.length >= 20, 'nie odczytano domyślnych napisów MapLibre')
    assert.deepEqual(wBibliotece.filter((k) => !(k in LOCALE_PL)), [], 'brakuje polskiego napisu dla klucza z biblioteki')
})
test('żaden napis nie został po angielsku', () => {
    for (const v of ['Zoom in', 'Zoom out', 'Toggle attribution', 'Enter fullscreen', 'Use two fingers to move the map']) assert.ok(!Object.values(LOCALE_PL).includes(v))
})
