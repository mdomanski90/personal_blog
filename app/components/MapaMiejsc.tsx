'use client'

// Mapa wektorowa (MapLibre + OpenFreeMap) z tarczami miejscowości i obiektów w terenie.
// Tarcze są warstwą mapy: zawsze widoczne, a podpisy chowają się same, gdy brakuje miejsca
// (miasta mają pierwszeństwo, nazwy świątyń pojawiają się dopiero po przybliżeniu).

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { LngLatBounds, Map as MapaGL, NavigationControl, setWorkerUrl, type GeoJSONSource, type GeoJSONSourceSpecification, type SymbolLayerSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { stylMapy } from '@/lib/mapa-styl'
import { LATA_GRANIC, LEGENDA_PANSTW, WARSTWY_GRANIC, WARSTWY_Z_ROKIEM, ZRODLO_GRANIC, filtrGranic, warstwyGranic } from '@/lib/granice'
import { GRUPY_OBIEKTOW, grupaObiektu, tarczaMiejsca, tarczaObiektu, type Wyznanie } from '@/lib/tarcze'

export interface PunktMapy {
    id: string
    nazwa: string
    href: string
    typ: 'miejsce' | 'obiekt'
    rodzaj: string
    wyznanie?: string
    przyblizone?: boolean
    istnieje?: boolean
    lat: number
    lng: number
}

const SKALA = 2
const PROG_OBIEKTOW = 11 // od tego przybliżenia widać obiekty w terenie // tarcze rysowane w podwójnej rozdzielczości – ostre na ekranach retina

function ikona(p: PunktMapy): { id: string; svg: string } {
    if (p.typ === 'obiekt') {
        const id = `o-${p.rodzaj}-${p.istnieje === false ? 0 : 1}`
        return { id, svg: tarczaObiektu(p.rodzaj, '', 26 * SKALA, p.istnieje !== false) }
    }
    const miasto = p.rodzaj === 'miasto'
    const id = `m-${miasto ? 'miasto' : p.wyznanie || 'brak'}-${p.przyblizone ? 1 : 0}`
    return { id, svg: tarczaMiejsca(miasto ? 'miasto' : 'wies', (p.wyznanie || '') as Wyznanie, '', (miasto ? 32 : 27) * SKALA, p.przyblizone) }
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
}: {
    punkty: PunktMapy[]
    wysokosc?: number
    /** gdy podany: mapa wyśrodkowana na tym punkcie (strona miejscowości), inaczej dopasowana do wszystkich */
    srodek?: [number, number]
    przyblizenie?: number
    /** pokaż wybór granic historycznych */
    granice?: boolean
    /** klucz, pod którym mapa pamięta widok w tej karcie (powrót ze strony miejscowości) */
    zapamietaj?: string
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
    const aktywneRef = useRef(aktywne)
    aktywneRef.current = aktywne
    const [zoom, setZoom] = useState(srodek ? przyblizenie : 10)
    const [rok, setRok] = useState<number | null>(null)
    const rokRef = useRef(rok)
    const odswiezNapisyRef = useRef<() => void>(() => {})
    rokRef.current = rok
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
            if (granice && zapisany.r) setRok(zapisany.r)
        } else if (!srodek && punkty.length > 1) {
            const b = new LngLatBounds()
            punkty.forEach((p) => b.extend([p.lng, p.lat]))
            m.fitBounds(b, { padding: 50, duration: 0 })
        }

        const dane: GeoJSONSourceSpecification['data'] = {
            type: 'FeatureCollection',
            features: punkty.map((p) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
                properties: {
                    nazwa: p.nazwa,
                    href: p.href,
                    typ: p.typ,
                    grupa: p.typ === 'obiekt' ? grupaObiektu(p.rodzaj) : '',
                    ikona: ikona(p).id,
                    // niższa wartość = pierwszeństwo przy nachodzeniu podpisów
                    kolejnosc: p.typ === 'miejsce' ? (p.rodzaj === 'miasto' ? 0 : 1) : 2,
                },
            })),
        }
        const ikony = punkty.map(ikona)

        // po każdej zmianie stylu (np. motywu) warstwy i obrazy trzeba dodać na nowo
        const dodajWarstwy = async () => {
            for (const { id, svg } of ikony) {
                const img = await wczytajObraz(id, svg)
                if (!m.hasImage(id)) m.addImage(id, img, { pixelRatio: SKALA })
            }
            if (m.getSource('punkty')) return
            if (granice) {
                m.addSource('granice', ZRODLO_GRANIC)
                m.addSource('granice-napisy', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
                ostatnieNapisy = ''
                for (const w of warstwyGranic(rokRef.current ?? 1600, ciemnyRef.current)) {
                    m.addLayer({ ...w, layout: { ...w.layout, visibility: rokRef.current ? 'visible' : 'none' } } as typeof w)
                }
            }
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
            }
            // obiekty dopiero po przybliżeniu (przy oddaleniu zasłaniałyby tarcze miejscowości), nazwy od 13
            m.addLayer({
                id: 'obiekty',
                type: 'symbol',
                source: 'punkty',
                minzoom: PROG_OBIEKTOW,
                filter: filtrObiektow(aktywneRef.current),
                layout: { ...wspolne, 'text-field': ['step', ['zoom'], '', 13, ['get', 'nazwa']], 'text-font': ['Noto Sans Regular'], 'text-size': 11 },
                paint: farby,
            })
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
        }
        // Podpisy państw i województw: próbkujemy kadr siatką punktów i każdemu obszarowi dajemy
        // jeden podpis w „środkowym” z trafionych punktów – także sąsiadom, których środek jest poza kadrem.
        let ostatnieNapisy = ''
        const odswiezNapisy = () => {
            const zrodlo = m.getSource('granice-napisy') as GeoJSONSource | undefined
            if (!zrodlo || !m.getLayer('granice-tlo')) return
            const obszary = new Map<string, { nazwa: string; poziom: number; pkt: [number, number][] }>()
            if (rokRef.current) {
                const { clientWidth: W, clientHeight: H } = m.getCanvas()
                const KOL = 10
                const WIER = 7
                for (let i = 0; i < KOL; i++) {
                    for (let j = 0; j < WIER; j++) {
                        const x = (W * (i + 0.5)) / KOL
                        const y = (H * (j + 0.5)) / WIER
                        for (const f of m.queryRenderedFeatures([x, y], { layers: ['granice-tlo', 'granice-tlo-nizsze'] })) {
                            const w = f.properties ?? {}
                            const nazwa = String(w.name_pl || w.name || '').trim()
                            if (!nazwa) continue
                            const poziom = Number(w.admin_level)
                            const klucz = `${poziom}|${nazwa}`
                            const o = obszary.get(klucz) ?? { nazwa, poziom, pkt: [] }
                            if (!o.pkt.some(([a, b]) => a === x && b === y)) o.pkt.push([x, y])
                            obszary.set(klucz, o)
                        }
                    }
                }
            }
            // najpierw państwa, potem województwa – każde w innym punkcie siatki, żeby podpisy nie nachodziły
            const zajete = new Set<string>()
            const features = [...obszary.values()].sort((a, b) => a.poziom - b.poziom).map((o) => {
                const sx = o.pkt.reduce((a, p) => a + p[0], 0) / o.pkt.length
                const sy = o.pkt.reduce((a, p) => a + p[1], 0) / o.pkt.length
                const odl = (p: [number, number]) => Math.hypot(p[0] - sx, p[1] - sy)
                const wolne = o.pkt.filter((p) => !zajete.has(p.join()))
                const [x, y] = (wolne.length ? wolne : o.pkt).reduce((n, p) => (odl(p) < odl(n) ? p : n))
                zajete.add(`${x},${y}`)
                const ll = m.unproject([x, y])
                return { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [ll.lng, ll.lat] }, properties: { nazwa: o.nazwa, poziom: o.poziom } }
            })
            // „idle” przychodzi też po samym setData – bez tej kontroli podpisy odświeżałyby się w kółko
            const c = m.getCenter()
            const klucz = JSON.stringify([features.map((f) => f.properties), c.lng.toFixed(4), c.lat.toFixed(4), m.getZoom().toFixed(2)])
            if (klucz === ostatnieNapisy) return
            ostatnieNapisy = klucz
            zrodlo.setData({ type: 'FeatureCollection', features })
        }
        if (granice) m.on('idle', odswiezNapisy)
        odswiezNapisyRef.current = () => {
            ostatnieNapisy = ''
            odswiezNapisy()
        }
        m.on('style.load', () => void dodajWarstwy())
        m.on('zoomend', () => setZoom(m.getZoom()))
        m.on('moveend', () => {
            if (!zapamietaj) return
            try {
                const c = m.getCenter()
                sessionStorage.setItem(zapamietaj, JSON.stringify({ c: [c.lng, c.lat], z: m.getZoom(), r: rokRef.current }))
            } catch {}
        })
        for (const warstwa of ['miejsca', 'obiekty']) {
            m.on('click', warstwa, (e) => {
                const href = e.features?.[0]?.properties?.href
                if (href) routerRef.current.push(String(href))
            })
            m.on('mouseenter', warstwa, () => (m.getCanvas().style.cursor = 'pointer'))
            m.on('mouseleave', warstwa, () => (m.getCanvas().style.cursor = ''))
        }

        mapa.current = m
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aktywne])

    useEffect(() => {
        const m = mapa.current
        if (!m || !granice) return
        for (const id of WARSTWY_GRANIC) {
            if (!m.getLayer(id)) continue
            m.setLayoutProperty(id, 'visibility', rok ? 'visible' : 'none')
            if (rok && WARSTWY_Z_ROKIEM[id]) m.setFilter(id, filtrGranic(rok, WARSTWY_Z_ROKIEM[id]))
        }
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

    return (
        <div className="flex flex-col" style={{ gap: 6 }}>
            {grupy.length > 0 && (
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
                                    className={`border border-[#d1d5db] dark:border-[#4b5563] lowercase cursor-pointer ${wl ? 'bg-muted text-accent-foreground font-bold' : 'bg-transparent text-current'}`}
                                    style={{ margin: '-1px 0 0 -1px', padding: '0 10px', height: 26, fontSize: 'inherit', fontFamily: 'inherit' }}
                                >
                                    {GRUPY_OBIEKTOW[g]}
                                </button>
                            )
                        })}
                    </div>
                    {zoom < PROG_OBIEKTOW && aktywne.length > 0 && <span className="text-gray-500 lowercase">przybliż mapę, żeby zobaczyć obiekty</span>}
                </div>
            )}
            <div
            ref={kontener}
            role="region"
            aria-label="mapa miejsc"
            className="border border-[#d1d5db] dark:border-[#4b5563] w-full mapa-wektor"
            style={{ height: wysokosc, borderRadius: '8px', overflow: 'hidden' }}
            />
            {granice && (
                <div className="flex flex-col" style={{ gap: 6, fontSize: 'calc(13px * var(--font-scale, 1))' }}>
                    <div className="flex flex-wrap items-center" style={{ gap: '6px 10px' }}>
                        <span className="lowercase text-gray-600 dark:text-gray-400">granice historyczne:</span>
                        <div className="flex flex-wrap w-fit" style={{ paddingLeft: 1, paddingTop: 1 }} role="group" aria-label="granice historyczne – rok">
                            {[null, ...LATA_GRANIC.map((l) => l.rok)].map((r) => {
                                const wl = rok === r
                                return (
                                    <button
                                        key={r ?? 'brak'}
                                        type="button"
                                        aria-pressed={wl}
                                        title={r ? LATA_GRANIC.find((l) => l.rok === r)?.opis : 'bez granic historycznych'}
                                        onClick={() => setRok(r)}
                                        className={`border border-[#d1d5db] dark:border-[#4b5563] lowercase cursor-pointer ${wl ? 'bg-muted text-accent-foreground font-bold' : 'bg-transparent text-current'}`}
                                        style={{ margin: '-1px 0 0 -1px', padding: '0 8px', height: 26, fontSize: 'inherit', fontFamily: 'inherit' }}
                                    >
                                        {r ?? 'brak'}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    {rok && (
                        <div className="flex flex-wrap items-center" style={{ gap: '4px 10px' }}>
                            <input
                                type="range"
                                min={1400}
                                max={1950}
                                step={1}
                                value={rok}
                                onChange={(e) => setRok(Number(e.target.value))}
                                aria-label="rok"
                                style={{ width: 'min(100%, 22rem)', accentColor: '#9a3b22' }}
                            />
                            <span className="font-bold">{rok}</span>
                            <span className="text-gray-600 dark:text-gray-400 lowercase">
                                {LATA_GRANIC.find((l) => l.rok === rok)?.opis ?? ''}
                            </span>
                        </div>
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
                        <p className="text-gray-500 lowercase" style={{ fontSize: 'calc(12px * var(--font-scale, 1))' }}>
                            granice: OpenHistoricalMap – dane społeczności, nie zawsze kompletne dla każdego roku.
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
