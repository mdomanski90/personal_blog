// Granice historyczne: dla każdego okresu jeden spójny plik public/granice/okresy/<okres>.json (TopoJSON),
// zbudowany skryptem scripts/granice/okresy.py z OpenHistoricalMap (CC0) i – dla XVI w. – z Atlasu historycznego
// Polski (CC BY 4.0). Sąsiednie obszary mają wspólne krawędzie (bez szczelin i nakładek), a linie granic powstają
// ze wspólnych odcinków, więc kreska leży dokładnie na styku wypełnień.

import type { LayerSpecification } from 'maplibre-gl'
import { linie, obszary, odcinki, type Topologia } from './topojson'

export const ATRYBUCJA_GRANIC =
    'granice: <a href="https://www.openhistoricalmap.org/copyright">OpenHistoricalMap</a> (CC0); Korona i ziemie w XVI w.: <a href="https://data.atlasfontium.pl/layers/geonode:powiaty">Atlas historyczny Polski XVI w., IH PAN</a>, <a href="https://creativecommons.org/licenses/by/4.0/deed.pl">CC BY 4.0</a>; dopasowane do siebie i uproszczone'

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
    { etykieta: '1975', rok: 1980, opis: 'po reformie z 1975 r. – Łosice w województwie siedleckim, Olszanka i Międzyrzec w bialskopodlaskim' },
    { etykieta: '1999', rok: 2010, opis: 'po reformie z 1999 r. – Łosice i Olszanka w województwie mazowieckim, Międzyrzec w lubelskim' },
]

type Panstwo = 'korona' | 'litwa' | 'rosja' | 'niemcy' | 'austria'

/** Kolory państw (te same co w skrypcie budującym pliki okresów) – do legendy. */
export const PANSTWA: Record<Panstwo, { nazwa: string; legenda: string; kolor: string }> = {
    korona: { nazwa: 'Korona Królestwa Polskiego', legenda: 'Korona / Polska', kolor: '#c0392b' },
    litwa: { nazwa: 'Wielkie Księstwo Litewskie', legenda: 'Wielkie Księstwo Litewskie', kolor: '#2e7d4f' },
    rosja: { nazwa: 'Imperium Rosyjskie', legenda: 'Rosja / ZSRR', kolor: '#b7791f' },
    niemcy: { nazwa: 'Prusy', legenda: 'Prusy / Niemcy', kolor: '#2f6aa3' },
    austria: { nazwa: 'Austria', legenda: 'Austria', kolor: '#7b4fa0' },
}

/** Klucz kolorów pod mapą. */
export const LEGENDA_PANSTW = Object.values(PANSTWA).map((p) => ({ nazwa: p.legenda, kolor: p.kolor }))
export const czyRzeczpospolita = (rok: number) => rok >= 1569.5 && rok < 1795.82
/** Ziemie województwa podlaskiego (Atlas) – w plikach okresów XVI w. */
export const czyZiemie = (rok: number | null) => rok !== null && rok >= 1500 && rok < 1772.6

export const etykietaOkresu = (rok: number) => LATA_GRANIC.find((l) => l.rok === rok)?.etykieta ?? null

/** Rodzaj kreski między dwoma obszarami (b = null: brzeg całości – morze albo teren bez danych). */
export function rodzajGranicy(a: Record<string, unknown>, b: Record<string, unknown> | null): string | null {
    if (!b || a.n2 !== b.n2) return 'panstwo'
    if (a.n3 !== b.n3) return 'czesc'
    if (a.n4 !== b.n4) return 'woj'
    if (a.n5 !== b.n5) return 'ziemia'
    return null
}

const pamiec = new Map<string, Promise<GeoJSON.FeatureCollection>>()

/** Obszary i linie granic okresu jako GeoJSON (plik pobierany raz). */
export function wczytajOkres(etykieta: string): Promise<GeoJSON.FeatureCollection> {
    let p = pamiec.get(etykieta)
    if (!p) {
        p = fetch(`/granice/okresy/${encodeURIComponent(etykieta)}.json`)
            .then((r) => {
                if (!r.ok) throw new Error(`granice ${etykieta}: ${r.status}`)
                return r.json() as Promise<Topologia>
            })
            .then((t) => {
                const l = odcinki(t)
                return { type: 'FeatureCollection', features: [...obszary(t, 'obszary', l), ...linie(t, 'obszary', rodzajGranicy, l)] } as GeoJSON.FeatureCollection
            })
        p.catch(() => pamiec.delete(etykieta))
        pamiec.set(etykieta, p)
    }
    return p
}

export const PUSTE: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

/** Warstwy okresu: wypełnienia państw, lekkie odcienie województw, linie granic i podpisy. */
export function warstwyOkresu(ciemny: boolean): LayerSpecification[] {
    const kolor = ciemny ? '#c98a6a' : '#9a3b22'
    const napis = ciemny ? '#ece4d6' : '#3a2a20'
    const obwodka = ciemny ? '#1c1d1f' : '#f3ede0'
    const k = ciemny ? 1.35 : 1
    const linia = (id: string, rodzaj: string, paint: Record<string, unknown>): LayerSpecification =>
        ({ id, type: 'line', source: 'okres', filter: ['==', ['get', 'linia'], rodzaj], layout: { 'line-join': 'round', 'line-cap': 'round' }, paint }) as LayerSpecification
    const wielokat = ['!', ['has', 'linia']] as const
    return [
        {
            id: 'okres-tlo', type: 'fill', source: 'okres', filter: wielokat as never,
            paint: {
                'fill-color': ['coalesce', ['get', 'kolor'], 'rgba(0,0,0,0)'] as never,
                'fill-opacity': ['*', ['coalesce', ['get', 'jasnosc'], 1], ciemny ? 0.28 : 0.22] as never,
                'fill-antialias': false,
            },
        },
        // województwa / gubernie: tylko lekkie przyciemnienie, kolor państwa zostaje ten sam
        {
            id: 'okres-cien', type: 'fill', source: 'okres', filter: wielokat as never,
            paint: { 'fill-color': '#3a2a20', 'fill-opacity': ['match', ['get', 'odcien'], 1, 0.015 * k, 2, 0.03 * k, 0] as never, 'fill-antialias': false },
        },
        linia('okres-ziemie', 'ziemia', { 'line-color': kolor, 'line-width': 1.1, 'line-opacity': 0.75, 'line-dasharray': ['literal', [2, 2]] }),
        linia('okres-woj', 'woj', { 'line-color': kolor, 'line-width': 1.4, 'line-opacity': 0.8, 'line-dasharray': ['literal', [4, 2.5]] }),
        linia('okres-czesc', 'czesc', { 'line-color': kolor, 'line-width': 2, 'line-opacity': 0.9 }),
        linia('okres-panstwo', 'panstwo', { 'line-color': kolor, 'line-width': 2.6, 'line-opacity': 0.9 }),
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

export const WARSTWY_OKRESU = ['okres-tlo', 'okres-cien', 'okres-ziemie', 'okres-woj', 'okres-czesc', 'okres-panstwo', 'granice-napisy']

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

