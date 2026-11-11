'use client'

// Mapa wektorowa (MapLibre + OpenFreeMap) z tarczami miejscowości i obiektów w terenie.
// Tarcze są warstwą mapy: zawsze widoczne, a podpisy chowają się same, gdy brakuje miejsca
// (miasta mają pierwszeństwo, nazwy świątyń pojawiają się dopiero po przybliżeniu).

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { LngLatBounds, Map as MapaGL, NavigationControl, setWorkerUrl, type GeoJSONSourceSpecification, type SymbolLayerSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { stylMapy } from '@/lib/mapa-styl'
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
}: {
    punkty: PunktMapy[]
    wysokosc?: number
    /** gdy podany: mapa wyśrodkowana na tym punkcie (strona miejscowości), inaczej dopasowana do wszystkich */
    srodek?: [number, number]
    przyblizenie?: number
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
        if (!srodek && punkty.length > 1) {
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
        m.on('style.load', () => void dodajWarstwy())
        m.on('zoomend', () => setZoom(m.getZoom()))
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
        </div>
    )
}
