'use client'

// Mapa wektorowa (MapLibre + OpenFreeMap) z tarczami miejscowości i obiektów w terenie.
// Tarcze są warstwą mapy: zawsze widoczne, a podpisy chowają się same, gdy brakuje miejsca
// (miasta mają pierwszeństwo, nazwy świątyń pojawiają się dopiero po przybliżeniu).

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { LngLatBounds, Map as MapaGL, MercatorCoordinate, NavigationControl, Popup, setWorkerUrl, type GeoJSONSource, type GeoJSONSourceSpecification, type SymbolLayerSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { stylMapy } from '@/lib/mapa-styl'
import { ATRYBUCJA_GRANIC, LATA_GRANIC, LEGENDA_PANSTW, PUSTE, WARSTWY_OKRESU, czyRzeczpospolita, czyZiemie, etykietaOkresu, nazwaNaMapie, wczytajOkres, warstwyOkresu } from '@/lib/granice'
import type { PlanNaMapie } from '@/lib/plany/serwer'
import { GRUPY_OBIEKTOW, grupaObiektu, tarczaMiejsca, tarczaObiektu } from '@/lib/tarcze'
import { ileObiektow, rozsun } from '@/lib/mapa-rozsuwanie'

export interface PunktMapy {
    id: string
    nazwa: string
    href: string
    typ: 'miejsce' | 'obiekt'
    rodzaj: string
    wyznania?: string[]
    wyznaniaRowne?: boolean
    przyblizone?: boolean
    istnieje?: boolean
    lat: number
    lng: number
    /** plany obiektu / wsi zrobione w edytorze – po kliknięciu plakietki podgląd w panelu */
    plany?: { slug: string; tytul: string }[]
    /** wieś: publiczne obiekty w terenie przypisane do niej (plakietka z liczbą przy oddalonej mapie) */
    obiekty?: { nazwa: string; href: string }[]
}

// znaczek „jest plan” w prawym górnym rogu tarczy (układ tarczy: viewBox -20 -22 40 44)
const ZNACZEK_PLANU = '<g transform="translate(12 -15)"><circle r="7" fill="#fff" stroke="#2b2925" stroke-width="1.4"/><path d="M-3.6-2.6 -1.2-3.6 1.2-2.6 3.6-3.6V2.6L1.2 3.6-1.2 2.6-3.6 3.6Z M-1.2-3.6V2.6M1.2-2.6V3.6" fill="none" stroke="#2b2925" stroke-width="1" stroke-linejoin="round"/></g>'
const zZnaczkiem = (svg: string) => svg.replace(/<\/svg>$/, `${ZNACZEK_PLANU}</svg>`)

const SKALA = 2
const PROG_OBIEKTOW = 11 // od tego przybliżenia widać obiekty w terenie // tarcze rysowane w podwójnej rozdzielczości – ostre na ekranach retina

function ikona(p: PunktMapy): { id: string; svg: string } {
    const plan = p.plany?.length ? '-plan' : ''
    if (p.typ === 'obiekt') {
        const id = `o-${p.rodzaj}-${p.istnieje === false ? 0 : 1}${plan}`
        const svg = tarczaObiektu(p.rodzaj, '', 26 * SKALA, p.istnieje !== false)
        return { id, svg: plan ? zZnaczkiem(svg) : svg }
    }
    const miasto = p.rodzaj === 'miasto'
    const id = `m-${miasto ? 'miasto' : p.wyznania?.join('+') || 'brak'}-${p.wyznaniaRowne ? 'r' : ''}${p.przyblizone ? 1 : 0}${plan}`
    const svg = tarczaMiejsca(miasto ? 'miasto' : 'wies', p.wyznania ?? [], '', (miasto ? 32 : 27) * SKALA, p.przyblizone, p.wyznaniaRowne)
    return { id, svg: plan ? zZnaczkiem(svg) : svg }
}

// plakietka z liczbą obiektów na tarczy wsi (atrament na papierze; w ciemnym motywie odwrotnie)
function plakietka(n: number, ciemny: boolean): { id: string; svg: string } {
    const tekst = n > 99 ? '99+' : String(n)
    const w = tekst.length > 1 ? 22 + (tekst.length - 2) * 6 : 18
    const [tlo, pismo] = ciemny ? ['#e7e2d6', '#1c1d1f'] : ['#1c1b18', '#fbfaf7']
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${(w + 4) * SKALA}" height="${22 * SKALA}" viewBox="-2 -2 ${w + 4} 22"><rect x="0" y="0" width="${w}" height="18" rx="9" fill="${tlo}" stroke="${pismo}" stroke-width="1.5"/><text x="${w / 2}" y="13" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="11" font-weight="700" fill="${pismo}">${tekst}</text></svg>`
    return { id: `licznik-${tekst}-${ciemny ? 1 : 0}`, svg }
}

const obrazy = new Map<string, HTMLImageElement>()
async function wczytajObraz(id: string, svg: string): Promise<HTMLImageElement> {
    const gotowy = obrazy.get(id)
    if (gotowy) return gotowy
    const img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    await img.decode()
    obrazy.set(id, img)
    return img
}

export default function MapaMiejsc({
    punkty,
    wysokosc = 520,
    srodek,
    przyblizenie = 12.5,
    granice = false,
    zapamietaj,
    obrys,
    wyroznione,
    planyGeo,
}: {
    punkty: PunktMapy[]
    wysokosc?: number | string
    /** gdy podany: mapa wyśrodkowana na tym punkcie (strona miejscowości), inaczej dopasowana do wszystkich */
    srodek?: [number, number]
    przyblizenie?: number
    /** pokaż wybór granic historycznych */
    granice?: boolean
    /** klucz, pod którym mapa pamięta widok w tej karcie (powrót ze strony miejscowości) */
    zapamietaj?: string
    /** granica obszaru (np. gminy) – przerywaną linią, mapa dopasowana do niej */
    obrys?: { url: string; nazwa: string }
    /** miejscowości wyróżnione (np. wsie gminy) – pozostałe przygaszone */
    wyroznione?: string[]
    /** plany z punktami geo – obraz planu na mapie przy dużym przybliżeniu */
    planyGeo?: PlanNaMapie[]
}) {
    const kontener = useRef<HTMLDivElement>(null)
    const mapa = useRef<MapaGL | null>(null)
    const router = useRouter()
    const routerRef = useRef(router)
    routerRef.current = router
    const { resolvedTheme } = useTheme()
    const ciemny = resolvedTheme === 'dark'
    const ciemnyRef = useRef(ciemny)
    ciemnyRef.current = ciemny
    const pierwszyMotyw = useRef(true)
    const nazwyMiejsc = punkty.filter((p) => p.typ === 'miejsce').map((p) => p.nazwa)
    const grupy = Object.keys(GRUPY_OBIEKTOW).filter((g) => punkty.some((p) => p.typ === 'obiekt' && grupaObiektu(p.rodzaj) === g))
    const [aktywne, setAktywne] = useState<string[]>(grupy)
    const [pokazPlany, setPokazPlany] = useState(true)
    const pokazPlanyRef = useRef(pokazPlany)
    pokazPlanyRef.current = pokazPlany
    const planyRef = useRef(planyGeo ?? [])
    planyRef.current = planyGeo ?? []
    const aktywneRef = useRef(aktywne)
    aktywneRef.current = aktywne
    const [zoom, setZoom] = useState(srodek ? przyblizenie : 10)
    const [rok, setRok] = useState<number | null>(null)
    const [panel, setPanel] = useState<{ nazwa: string; href: string; plany: { slug: string; tytul: string }[] } | null>(null)
    const rokRef = useRef(rok)
    const odswiezNapisyRef = useRef<() => void>(() => {})
    const pokazOkresRef = useRef<(r: number | null) => void>(() => {})
    rokRef.current = rok
    const przeliczRef = useRef<() => void>(() => {})
    const filtrObiektow = (a: string[]) => ['all', ['==', ['get', 'typ'], 'obiekt'], ['in', ['get', 'grupa'], ['literal', a]]] as never

    useEffect(() => {
        if (!kontener.current || mapa.current) return
        setWorkerUrl('/api/mapa-worker')
        const m = new MapaGL({
            container: kontener.current,
            style: stylMapy(ciemny, nazwyMiejsc),
            center: srodek ? [srodek[1], srodek[0]] : [22.68, 52.11],
            zoom: srodek ? przyblizenie : 10,
            attributionControl: { compact: true },
            cooperativeGestures: true,
        })
        m.addControl(new NavigationControl({ showCompass: false }), 'top-left')
        let zapisany: { c: [number, number]; z: number; r?: number | null } | null = null
        try {
            if (zapamietaj) zapisany = JSON.parse(sessionStorage.getItem(zapamietaj) ?? 'null')
        } catch {}
        if (zapisany) {
            m.jumpTo({ center: zapisany.c, zoom: zapisany.z })
            if (granice && zapisany.r && LATA_GRANIC.some((l) => l.rok === zapisany!.r)) setRok(zapisany.r)
        } else if (!srodek && punkty.length > 1) {
            const b = new LngLatBounds()
            punkty.forEach((p) => b.extend([p.lng, p.lat]))
            m.fitBounds(b, { padding: 50, duration: 0 })
        }

        const wlasciwosci = (p: PunktMapy) => ({
            nazwa: p.nazwa,
            href: p.href,
            typ: p.typ,
            grupa: p.typ === 'obiekt' ? grupaObiektu(p.rodzaj) : '',
            ikona: ikona(p).id,
            plany: p.plany?.length ? JSON.stringify(p.plany) : '',
            przygas: !!wyroznione && !wyroznione.includes(p.id),
            // niższa wartość = pierwszeństwo przy nachodzeniu podpisów
            kolejnosc: p.typ === 'miejsce' ? (p.rodzaj === 'miasto' ? 0 : 1) : 2,
        })
        const dane: GeoJSONSourceSpecification['data'] = {
            type: 'FeatureCollection',
            features: punkty.map((p) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
                properties: wlasciwosci(p),
            })),
        }
        const ikony = punkty.map(ikona)
        // wsie z publicznymi obiektami – plakietka z liczbą przy oddalonej mapie
        const zObiektami = punkty.filter((p) => p.typ === 'miejsce' && p.obiekty?.length)
        const liczniki = (): GeoJSONSourceSpecification['data'] => ({
            type: 'FeatureCollection',
            features: zObiektami.map((p) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
                properties: { ikona: plakietka(p.obiekty!.length, ciemnyRef.current).id, nazwa: p.nazwa, n: p.obiekty!.length, lista: JSON.stringify(p.obiekty), przygas: !!wyroznione && !wyroznione.includes(p.id) },
            })),
        })
        // obiekty w miejscu wyliczonym przez rozsuwanie (nachodzące na siebie – obok siebie, z kreską do prawdziwego punktu)
        const obiektyPkt = punkty.filter((p) => p.typ === 'obiekt')
        const wsiePkt = punkty.filter((p) => p.typ === 'miejsce')
        const PUSTA: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
        const przelicz = () => {
            const zrP = m.getSource('obiekty-poz') as GeoJSONSource | undefined
            const zrL = m.getSource('rozsuniecia') as GeoJSONSource | undefined
            if (!zrP || !zrL) return
            const z = m.getZoom()
            const swiat = 512 * Math.pow(2, z)
            const merc = (p: PunktMapy) => MercatorCoordinate.fromLngLat([p.lng, p.lat])
            const widoczne = obiektyPkt.filter((p) => aktywneRef.current.includes(grupaObiektu(p.rodzaj)))
            const przes = z < PROG_OBIEKTOW ? new Map() : rozsun([
                ...wsiePkt.map((p) => { const c = merc(p); return { id: 'w:' + p.id, x: c.x * swiat, y: c.y * swiat, staly: true } }),
                ...widoczne.map((p) => { const c = merc(p); return { id: p.id, x: c.x * swiat, y: c.y * swiat } }),
            ])
            const linie: GeoJSON.Feature[] = []
            const obiekty: GeoJSON.Feature[] = obiektyPkt.map((p) => {
                const r = przes.get(p.id)
                let wsp: [number, number] = [p.lng, p.lat]
                if (r) {
                    const c = merc(p)
                    const ll = new MercatorCoordinate(c.x + r.dx / swiat, c.y + r.dy / swiat).toLngLat()
                    wsp = [ll.lng, ll.lat]
                    linie.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [wsp, [p.lng, p.lat]] }, properties: {} })
                    linie.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: {} })
                }
                return { type: 'Feature', geometry: { type: 'Point', coordinates: wsp }, properties: { ...wlasciwosci(p), strona: r?.strona ?? 'p' } }
            })
            zrP.setData({ type: 'FeatureCollection', features: obiekty })
            zrL.setData({ type: 'FeatureCollection', features: linie })
        }
        przeliczRef.current = przelicz
        let klatka = 0
        const zaplanujPrzeliczenie = () => { if (!klatka) klatka = requestAnimationFrame(() => { klatka = 0; przelicz() }) }

        // po każdej zmianie stylu (np. motywu) warstwy i obrazy trzeba dodać na nowo
        const dodajWarstwy = async () => {
            for (const { id, svg } of [...ikony, ...zObiektami.map((p) => plakietka(p.obiekty!.length, ciemnyRef.current))]) {
                const img = await wczytajObraz(id, svg)
                if (!m.hasImage(id)) m.addImage(id, img, { pixelRatio: SKALA })
            }
            if (m.getSource('punkty')) return
            if (granice) {
                m.addSource('okres', { type: 'geojson', data: PUSTE, attribution: ATRYBUCJA_GRANIC })
                m.addSource('granice-napisy', { type: 'geojson', data: PUSTE })
                ostatnieNapisy = ''
                for (const w of warstwyOkresu(ciemnyRef.current)) {
                    m.addLayer({ ...w, layout: { ...w.layout, visibility: rokRef.current ? 'visible' : 'none' } } as typeof w)
                }
                pokazOkres(rokRef.current)
            }
            if (m.getLayer('granice')) m.setLayoutProperty('granice', 'visibility', !rokRef.current || rokRef.current >= 1999 ? 'visible' : 'none')
            m.addSource('punkty', { type: 'geojson', data: dane })
            const wspolne: SymbolLayerSpecification['layout'] = {
                'icon-image': ['get', 'ikona'],
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
                'text-anchor': 'left',
                'text-offset': [1.1, 0],
                'text-optional': true,
                'text-padding': 3,
            }
            const farby = {
                'text-color': ciemnyRef.current ? '#e7e2d6' : '#2b2a26',
                'text-halo-color': ciemnyRef.current ? '#1c1d1f' : '#f3ede0',
                'text-halo-width': 1.6,
                'icon-opacity': ['case', ['get', 'przygas'], 0.35, 1] as unknown as number,
                'text-opacity': ['case', ['get', 'przygas'], 0.45, 1] as unknown as number,
            }
            if (obrys && !m.getSource('obrys')) {
                fetch(obrys.url).then((r) => r.json()).then((fc: { features: { properties: { nazwa: string }; geometry: { type: string; coordinates: unknown } }[] }) => {
                    const f = fc.features.find((x) => x.properties.nazwa.toLowerCase() === obrys.nazwa.toLowerCase())
                    if (!f || m.getSource('obrys')) return
                    m.addSource('obrys', { type: 'geojson', data: f as unknown as GeoJSON.Feature, attribution: 'granica gminy: PRG (GUGiK), uproszczona' })
                    m.addLayer({ id: 'obrys-linia', type: 'line', source: 'obrys', paint: { 'line-color': ciemnyRef.current ? '#c98a6a' : '#9a3b22', 'line-width': 2, 'line-dasharray': [3, 2], 'line-opacity': 0.85 } }, 'miejsca')
                    const b = new LngLatBounds()
                    const dodaj = (c: unknown): void => { if (Array.isArray(c) && typeof c[0] === 'number') b.extend(c as [number, number]); else if (Array.isArray(c)) c.forEach(dodaj) }
                    dodaj(f.geometry.coordinates)
                    m.fitBounds(b, { padding: 30, duration: 0 })
                }).catch(() => {})
            }
            // plany (cmentarze, wsie) z punktami geo – obraz rysunku na mapie przy dużym przybliżeniu
            for (const pl of planyRef.current) {
                const id = `plan-${pl.slug}`
                if (m.getSource(id)) continue
                m.addSource(id, { type: 'image', url: `/plany/${encodeURIComponent(pl.slug)}/mapa.png`, coordinates: pl.naroza })
                m.addLayer({ id, type: 'raster', source: id, minzoom: 14, layout: { visibility: pokazPlanyRef.current ? 'visible' : 'none' }, paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.6, 0.92], 'raster-fade-duration': 0 } })
            }
            // obiekty dopiero po przybliżeniu (przy oddaleniu zasłaniałyby tarcze miejscowości), nazwy od 13
            m.addSource('obiekty-poz', { type: 'geojson', data: PUSTA })
            m.addSource('rozsuniecia', { type: 'geojson', data: PUSTA })
            const kreska = ciemnyRef.current ? '#b8b2a6' : '#4f4a41'
            m.addLayer({ id: 'rozsuniecia-linie', type: 'line', source: 'rozsuniecia', minzoom: PROG_OBIEKTOW, filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': kreska, 'line-width': 1, 'line-opacity': 0.8 } })
            m.addLayer({ id: 'rozsuniecia-punkty', type: 'circle', source: 'rozsuniecia', minzoom: PROG_OBIEKTOW, filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 2.5, 'circle-color': kreska, 'circle-stroke-color': ciemnyRef.current ? '#1c1d1f' : '#fbfaf7', 'circle-stroke-width': 1 } })
            m.addLayer({
                id: 'obiekty',
                type: 'symbol',
                source: 'obiekty-poz',
                minzoom: PROG_OBIEKTOW,
                filter: filtrObiektow(aktywneRef.current),
                layout: {
                    ...wspolne,
                    'text-field': ['step', ['zoom'], '', 13, ['get', 'nazwa']],
                    'text-font': ['Noto Sans Regular'],
                    'text-size': 11,
                    // rozsunięta para: podpis lewego z lewej, prawego z prawej
                    'text-anchor': ['match', ['get', 'strona'], 'l', 'right', 'left'],
                    'text-offset': ['match', ['get', 'strona'], 'l', ['literal', [-1.1, 0]], ['literal', [1.1, 0]]],
                },
                paint: farby,
            })
            przelicz()
            m.addLayer({
                id: 'miejsca',
                type: 'symbol',
                source: 'punkty',
                filter: ['==', ['get', 'typ'], 'miejsce'],
                layout: {
                    ...wspolne,
                    'symbol-sort-key': ['get', 'kolejnosc'],
                    'text-field': ['get', 'nazwa'],
                    'text-font': ['case', ['==', ['get', 'kolejnosc'], 0], ['literal', ['Noto Sans Bold']], ['literal', ['Noto Sans Regular']]],
                    'text-size': ['case', ['==', ['get', 'kolejnosc'], 0], 13, 12],
                },
                paint: farby,
            })
            // liczba obiektów w terenie na tarczy wsi – tylko dopóki samych obiektów nie widać
            m.addSource('liczniki', { type: 'geojson', data: liczniki() })
            m.addLayer({
                id: 'liczniki',
                type: 'symbol',
                source: 'liczniki',
                maxzoom: PROG_OBIEKTOW,
                layout: { 'icon-image': ['get', 'ikona'], 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-offset': [-13, -14] },
                paint: { 'icon-opacity': ['case', ['get', 'przygas'], 0.4, 1] as unknown as number },
            })
        }
        // Podpisy państw i województw: próbkujemy kadr siatką punktów i każdemu obszarowi dajemy
        // jeden podpis w „środkowym” z trafionych punktów – także sąsiadom, których środek jest poza kadrem.
        let ostatnieNapisy = ''
        const odswiezNapisy = () => {
            const zrodlo = m.getSource('granice-napisy') as GeoJSONSource | undefined
            if (!zrodlo || !m.getLayer('okres-tlo')) return
            const obszary = new Map<string, { nazwa: string; poziom: number; pkt: [number, number][] }>()
            if (rokRef.current) {
                const { clientWidth: W, clientHeight: H } = m.getCanvas()
                const KOL = 10
                const WIER = 7
                for (let i = 0; i < KOL; i++) {
                    for (let j = 0; j < WIER; j++) {
                        const x = (W * (i + 0.5)) / KOL
                        const y = (H * (j + 0.5)) / WIER
                        for (const f of m.queryRenderedFeatures([x, y], { layers: ['okres-tlo'] })) {
                            const w = f.properties ?? {}
                            const dodaj = (n: unknown, p: number) => {
                                const nazwa = nazwaNaMapie(String(n ?? '').trim(), rokRef.current ?? 0)
                                if (!nazwa) return
                                const klucz = `${p}|${nazwa}`
                                const o = obszary.get(klucz) ?? { nazwa, poziom: p, pkt: [] }
                                if (!o.pkt.some(([a, b]) => a === x && b === y)) o.pkt.push([x, y])
                                obszary.set(klucz, o)
                            }
                            // państwo, część państwa (Korona i Litwa w Rzeczypospolitej, kraje Rzeszy), województwo, ziemia
                            dodaj(w.n2, 2)
                            dodaj(w.n3, 3)
                            if (!w.bp) dodaj(w.n4, 4)
                            dodaj(w.n5, 5)
                        }
                    }
                }
            }
            // najpierw państwa, potem województwa – każde w innym punkcie siatki, żeby podpisy nie nachodziły
            const zajete = new Set<string>()
            // punkty siatki zasłonięte tarczą i nazwą miejscowości (nazwy wsi mają pierwszeństwo, więc
            // podpis państwa postawiony na nich by zniknął)
            const tarcze = punkty.filter((p) => p.typ === 'miejsce').map((p) => m.project([p.lng, p.lat]))
            for (const o of obszary.values()) {
                for (const [x, y] of o.pkt) {
                    const pol = o.poziom <= 3 ? 95 : 70
                    const { clientWidth: W, clientHeight: H } = m.getCanvas()
                    const zaKrawedzia = x - pol < 4 || x + pol > W - 4 || y < 24 || y > H - 40
                    if (zaKrawedzia || tarcze.some((t) => x + pol > t.x - 14 && x - pol < t.x + 110 && Math.abs(y - t.y) < 26)) zajete.add(`${x},${y}`)
                }
            }
            // kolejność: części państwa (Korona, Litwa – poziom 3), całe państwa, województwa
            const waga = (p: number) => (p === 3 ? 0 : p === 2 ? 1 : p)
            // ta sama nazwa z dwóch źródeł (obszar państwa i przynależność województw) – jeden podpis
            const nazwy = new Set<string>()
            const features = [...obszary.values()].sort((a, b) => waga(a.poziom) - waga(b.poziom)).filter((o) => !nazwy.has(o.nazwa.toLowerCase()) && !!nazwy.add(o.nazwa.toLowerCase())).map((o) => {
                const sx = o.pkt.reduce((a, p) => a + p[0], 0) / o.pkt.length
                const sy = o.pkt.reduce((a, p) => a + p[1], 0) / o.pkt.length
                const odl = (p: [number, number]) => Math.hypot(p[0] - sx, p[1] - sy)
                const wolne = o.pkt.filter((p) => !zajete.has(p.join()))
                const [x, y] = (wolne.length ? wolne : o.pkt).reduce((n, p) => (odl(p) < odl(n) ? p : n))
                zajete.add(`${x},${y}`)
                // wąski skrawek przy krawędzi: podpis przesuwamy do środka, żeby nie był ucięty
                const { clientWidth: W, clientHeight: H } = m.getCanvas()
                const pol = o.poziom <= 3 ? 95 : 70
                const ll = m.unproject([Math.min(Math.max(x, pol + 4), W - pol - 4), Math.min(Math.max(y, 24), H - 40)])
                return { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [ll.lng, ll.lat] }, properties: { nazwa: o.nazwa, poziom: o.poziom } }
            })
            // „idle” przychodzi też po samym setData – bez tej kontroli podpisy odświeżałyby się w kółko
            const c = m.getCenter()
            const klucz = JSON.stringify([features.map((f) => f.properties), c.lng.toFixed(4), c.lat.toFixed(4), m.getZoom().toFixed(2)])
            if (klucz === ostatnieNapisy) return
            ostatnieNapisy = klucz
            zrodlo.setData({ type: 'FeatureCollection', features })
        }
        // okres: obszary i linie z pliku public/granice/okresy/<okres>.json (pobierany raz, potem z pamięci)
        const pokazOkres = (r: number | null) => {
            const zr = m.getSource('okres') as GeoJSONSource | undefined
            if (!zr) return
            for (const id of WARSTWY_OKRESU) if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', r ? 'visible' : 'none')
            // dzisiejsze granice województw i powiatów z podkładu – tylko na mapie współczesnej (bez okresu albo od 1999)
            if (m.getLayer('granice')) m.setLayoutProperty('granice', 'visibility', !r || r >= 1999 ? 'visible' : 'none')
            const et = r ? etykietaOkresu(r) : null
            if (!et) {
                zr.setData(PUSTE)
                return
            }
            wczytajOkres(et)
                .then((fc) => {
                    const z = m.getSource('okres') as GeoJSONSource | undefined
                    if (rokRef.current !== r || !z) return
                    z.setData(fc)
                    odswiezNapisyRef.current()
                })
                .catch(() => {})
        }
        pokazOkresRef.current = pokazOkres
        if (granice) m.on('idle', odswiezNapisy)
        odswiezNapisyRef.current = () => {
            ostatnieNapisy = ''
            odswiezNapisy()
        }
        m.on('style.load', () => void dodajWarstwy())
        m.on('zoomend', () => setZoom(m.getZoom()))
        m.on('zoom', zaplanujPrzeliczenie)
        // plakietka z liczbą: po najechaniu lista obiektów, kliknięcie przybliża do wsi
        const dymek = new Popup({ closeButton: false, closeOnClick: false, offset: { center: [0, 0], top: [-13, 0], 'top-left': [-13, 0], 'top-right': [-13, 0], bottom: [-13, -26], 'bottom-left': [-13, -26], 'bottom-right': [-13, -26], left: [0, -14], right: [-28, -14] }, className: 'mapa-dymek', maxWidth: '280px' })
        m.on('mouseenter', 'liczniki', (e) => {
            const w = e.features?.[0]
            if (!w) return
            m.getCanvas().style.cursor = 'pointer'
            let lista: { nazwa: string }[] = []
            try { lista = JSON.parse(String(w.properties?.lista ?? '[]')) } catch {}
            const el = document.createElement('div')
            const b = document.createElement('b')
            b.textContent = `${w.properties?.nazwa}: ${ileObiektow(lista.length)} w terenie`
            el.appendChild(b)
            const ul = document.createElement('ul')
            for (const o of lista.slice(0, 8)) { const li = document.createElement('li'); li.textContent = o.nazwa; ul.appendChild(li) }
            if (lista.length > 8) { const li = document.createElement('li'); li.textContent = `i ${lista.length - 8} więcej…`; ul.appendChild(li) }
            el.appendChild(ul)
            const s = document.createElement('span')
            s.textContent = 'kliknij, żeby przybliżyć'
            el.appendChild(s)
            dymek.setLngLat((w.geometry as GeoJSON.Point).coordinates as [number, number]).setDOMContent(el).addTo(m)
        })
        m.on('mouseleave', 'liczniki', () => { m.getCanvas().style.cursor = ''; dymek.remove() })
        m.on('click', 'liczniki', (e) => {
            const w = e.features?.[0]
            if (!w) return
            dymek.remove()
            m.flyTo({ center: (w.geometry as GeoJSON.Point).coordinates as [number, number], zoom: Math.max(14, m.getZoom()), duration: 900 })
        })
        m.on('moveend', () => {
            if (!zapamietaj) return
            try {
                const c = m.getCenter()
                sessionStorage.setItem(zapamietaj, JSON.stringify({ c: [c.lng, c.lat], z: m.getZoom(), r: rokRef.current }))
            } catch {}
        })
        for (const warstwa of ['miejsca', 'obiekty']) {
            m.on('click', warstwa, (e) => {
                const w = e.features?.[0]?.properties
                if (!w) return
                if (m.getLayer('liczniki') && m.queryRenderedFeatures(e.point, { layers: ['liczniki'] }).length) return
                // plakietka z planem: panel z podglądem zamiast przejścia na stronę
                if (w.plany) { try { setPanel({ nazwa: String(w.nazwa), href: String(w.href), plany: JSON.parse(String(w.plany)) }); return } catch {} }
                if (w.href) routerRef.current.push(String(w.href))
            })
            m.on('mouseenter', warstwa, () => (m.getCanvas().style.cursor = 'pointer'))
            m.on('mouseleave', warstwa, () => (m.getCanvas().style.cursor = ''))
        }

        mapa.current = m
        if (process.env.NODE_ENV === 'development') (window as unknown as { __mapa?: MapaGL }).__mapa = m // do testów w przeglądarce
        return () => {
            m.remove()
            mapa.current = null
        }
        // mapa tworzona raz; motyw zmienia tylko styl (niżej)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const m = mapa.current
        if (!m) return
        if (pierwszyMotyw.current) {
            pierwszyMotyw.current = false
            return
        }
        m.setStyle(stylMapy(ciemny, nazwyMiejsc), { diff: false })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ciemny])

    useEffect(() => {
        const m = mapa.current
        if (m?.getLayer('obiekty')) m.setFilter('obiekty', filtrObiektow(aktywne))
        przeliczRef.current()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aktywne])

    useEffect(() => {
        const m = mapa.current
        if (!m) return
        for (const pl of planyRef.current) if (m.getLayer(`plan-${pl.slug}`)) m.setLayoutProperty(`plan-${pl.slug}`, 'visibility', pokazPlany ? 'visible' : 'none')
    }, [pokazPlany])

    useEffect(() => {
        const m = mapa.current
        if (!m || !granice) return
        pokazOkresRef.current(rok)
        odswiezNapisyRef.current()
        if (zapamietaj) {
            try {
                const c = m.getCenter()
                sessionStorage.setItem(zapamietaj, JSON.stringify({ c: [c.lng, c.lat], z: m.getZoom(), r: rok }))
            } catch {}
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rok])

    const przelacz = (g: string) => setAktywne((a) => (a.includes(g) ? a.filter((x) => x !== g) : [...a, g]))

    // wysokość w procentach (np. mapa wypełniająca kolumnę obok metryczki): całość wypełnia rodzica, mapa bierze resztę miejsca
    const wypelnij = typeof wysokosc === 'string'
    return (
        <div className="flex flex-col" style={{ gap: 6, height: wypelnij ? wysokosc : undefined }}>
            {(grupy.length > 0 || (planyGeo?.length ?? 0) > 0) && (
                <div className="flex flex-wrap items-center" style={{ gap: '6px 12px', fontSize: 'calc(13px * var(--font-scale, 1))' }}>
                    <div className="flex flex-wrap w-fit" style={{ paddingLeft: 1, paddingTop: 1 }} role="group" aria-label="pokaż na mapie">
                        {grupy.map((g) => {
                            const wl = aktywne.includes(g)
                            return (
                                <button
                                    key={g}
                                    type="button"
                                    aria-pressed={wl}
                                    onClick={() => przelacz(g)}
                                    className={`border border-[#d6d1c6] dark:border-[#4b5563] lowercase cursor-pointer ${wl ? 'bg-muted text-accent-foreground font-bold' : 'bg-transparent text-current'}`}
                                    style={{ margin: '-1px 0 0 -1px', padding: '0 10px', height: 26, fontSize: 'inherit', fontFamily: 'inherit' }}
                                >
                                    {GRUPY_OBIEKTOW[g]}
                                </button>
                            )
                        })}
                        {(planyGeo?.length ?? 0) > 0 && (
                            <button
                                type="button"
                                aria-pressed={pokazPlany}
                                onClick={() => setPokazPlany((x) => !x)}
                                title="rysunki planów (cmentarzy, wsi) na mapie przy dużym przybliżeniu"
                                className={`border border-[#d6d1c6] dark:border-[#4b5563] lowercase cursor-pointer ${pokazPlany ? 'bg-muted text-accent-foreground font-bold' : 'bg-transparent text-current'}`}
                                style={{ margin: '-1px 0 0 -1px', padding: '0 10px', height: 26, fontSize: 'inherit', fontFamily: 'inherit' }}
                            >
                                plany
                            </button>
                        )}
                    </div>
                    {zoom < PROG_OBIEKTOW && (aktywne.length > 0 || (planyGeo?.length ?? 0) > 0) && <span className="text-gray-500 lowercase">przybliż mapę, żeby zobaczyć obiekty{(planyGeo?.length ?? 0) > 0 ? ' i plany' : ''}</span>}
                </div>
            )}
            <div style={{ position: 'relative', ...(wypelnij ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : {}) }}>
            <div
            ref={kontener}
            role="region"
            aria-label="mapa miejsc"
            className="border border-[#d6d1c6] dark:border-[#4b5563] w-full mapa-wektor"
            style={wypelnij ? { flex: 1, minHeight: 0, borderRadius: '8px', overflow: 'hidden' } : { height: wysokosc, borderRadius: '8px', overflow: 'hidden' }}
            />
            {panel && <PanelPlanu panel={panel} zamknij={() => setPanel(null)} />}
            </div>
            {granice && (
                <div className="flex flex-col" style={{ gap: 6, fontSize: 'calc(13px * var(--font-scale, 1))' }}>
                    <div className="flex flex-wrap items-center" style={{ gap: '6px 10px' }}>
                        <span className="lowercase text-gray-600 dark:text-gray-400">granice historyczne:</span>
                        <div className="flex flex-wrap w-fit" style={{ paddingLeft: 1, paddingTop: 1 }} role="group" aria-label="granice historyczne – rok">
                            {[null, ...LATA_GRANIC].map((l) => {
                                const wl = l ? rok === l.rok : rok === null
                                return (
                                    <button
                                        key={l?.etykieta ?? 'brak'}
                                        type="button"
                                        aria-pressed={wl}
                                        title={l ? l.opis : 'bez granic historycznych'}
                                        onClick={() => setRok(l ? l.rok : null)}
                                        className={`border border-[#d6d1c6] dark:border-[#4b5563] lowercase cursor-pointer whitespace-nowrap ${wl ? 'bg-muted text-accent-foreground font-bold' : 'bg-transparent text-current'}`}
                                        style={{ margin: '-1px 0 0 -1px', padding: '0 8px', height: 26, fontSize: 'inherit', fontFamily: 'inherit' }}
                                    >
                                        {l?.etykieta ?? 'brak'}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    {rok && (
                        <p style={{ margin: 0 }}>
                            <span className="font-bold">{LATA_GRANIC.find((l) => l.rok === rok)?.etykieta ?? Math.floor(rok)}</span>{' '}
                            <span className="text-gray-600 dark:text-gray-400">{LATA_GRANIC.find((l) => l.rok === rok)?.opis ?? ''}</span>
                        </p>
                    )}
                    {rok && (
                        <div className="flex flex-wrap items-center text-gray-600 dark:text-gray-400" style={{ gap: '4px 14px', fontSize: 'calc(12px * var(--font-scale, 1))' }}>
                            {LEGENDA_PANSTW.map((p) => (
                                <span key={p.nazwa} className="inline-flex items-center" style={{ gap: 5 }}>
                                    <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 3, background: p.kolor, opacity: 0.45, border: `1px solid ${p.kolor}` }} />
                                    {p.nazwa}
                                </span>
                            ))}
                            <span>· inne państwa – pozostałe kolory</span>
                        </div>
                    )}
                    {rok && (
                        <div className="flex flex-wrap items-center text-gray-600 dark:text-gray-400" style={{ gap: '4px 14px', fontSize: 'calc(12px * var(--font-scale, 1))' }}>
                            <span className="inline-flex items-center" style={{ gap: 5 }}>
                                <svg aria-hidden="true" width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#9a3b22" strokeWidth="2.6" /></svg>
                                granica państwa
                            </span>
                            <span className="inline-flex items-center" style={{ gap: 5 }}>
                                <svg aria-hidden="true" width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#9a3b22" strokeWidth="1.4" strokeDasharray="5 3" opacity="0.85" /></svg>
                                województwo / departament / gubernia (różne odcienie)
                            </span>
                            {czyZiemie(rok) && (
                                <span className="inline-flex items-center" style={{ gap: 5 }}>
                                    <svg aria-hidden="true" width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#9a3b22" strokeWidth="1.1" strokeDasharray="2.5 2.5" opacity="0.8" /></svg>
                                    ziemia (drohicka, mielnicka, bielska – wg Atlasu historycznego Polski XVI w.)
                                </span>
                            )}
                            {czyRzeczpospolita(rok) && <span>· Rzeczpospolita Obojga Narodów = Korona + Litwa (wspólna granica zewnętrzna)</span>}
                        </div>
                    )}
                    {rok && (
                        <p className="text-gray-500 lowercase" style={{ fontSize: 'calc(12px * var(--font-scale, 1))' }}>
                            granice: OpenHistoricalMap (CC0) – dane społeczności, nie zawsze kompletne dla każdego roku; Korona i ziemie podlaskie w XVI w. – Atlas historyczny Polski XVI w., IH PAN (CC BY 4.0). Granice z obu źródeł dopasowane do siebie i uproszczone.
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

/** Panel z podglądem planu po kliknięciu plakietki: na komputerze z boku mapy, na telefonie od dołu. */
function PanelPlanu({ panel, zamknij }: { panel: { nazwa: string; href: string; plany: { slug: string; tytul: string }[] }; zamknij: () => void }) {
    useEffect(() => {
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') zamknij() }
        window.addEventListener('keydown', esc)
        return () => window.removeEventListener('keydown', esc)
    }, [zamknij])
    return (
        <div className="mapa-panel-planu border border-[#d6d1c6] dark:border-[#4b5563] bg-[#fdfcf9] dark:bg-[#111827]" role="dialog" aria-label={`plany: ${panel.nazwa}`}>
            <style>{`.mapa-panel-planu{position:absolute;top:10px;right:10px;bottom:10px;width:min(300px,calc(100% - 20px));overflow:auto;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:14px;box-shadow:0 4px 18px rgb(0 0 0 / .14);z-index:5}@media (max-width:640px){.mapa-panel-planu{top:auto;left:0;right:0;bottom:0;width:auto;max-height:75%;border-radius:12px 12px 0 0}}`}</style>
            <div className="flex items-start justify-between" style={{ gap: 8 }}>
                <div className="flex flex-col" style={{ gap: 2 }}>
                    <b style={{ fontSize: 15 }}>{panel.nazwa}</b>
                    <a href={panel.href} style={{ fontSize: 13 }}>strona miejsca →</a>
                </div>
                <button type="button" onClick={zamknij} aria-label="zamknij" className="text-gray-500" style={{ fontSize: 20, lineHeight: 1, background: 'none', border: 0, cursor: 'pointer' }}>×</button>
            </div>
            {panel.plany.map((p) => (
                <a key={p.slug} href={`/plany/${p.slug}`} className="flex flex-col !no-underline text-current" style={{ gap: 6 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/plany/${p.slug}/podglad.svg`} alt={`podgląd: ${p.tytul}`} loading="lazy" style={{ width: '100%', borderRadius: 6, border: '1px solid #e7e2d8', background: '#f6f3ec', aspectRatio: '4 / 3', objectFit: 'contain' }} />
                    <span style={{ fontSize: 13 }}>{p.tytul}</span>
                    <span className="border border-[#d6d1c6] dark:border-[#4b5563] rounded-[7px] w-fit" style={{ fontSize: 13, padding: '3px 10px' }}>otwórz plan →</span>
                </a>
            ))}
        </div>
    )
}
