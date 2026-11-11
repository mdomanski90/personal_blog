// Własna mapa SVG rysowana na serwerze z public/mapa/okolica.json (npm run mapa:dane).
// Bez zewnętrznych kafelków i bez JavaScriptu w przeglądarce; nie da się jej przybliżać.

import fs from 'node:fs'
import path from 'node:path'
import { geoArea, geoMercator, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, Polygon } from 'geojson'
import { tarczaMiejsca, type Wyznanie } from '@/lib/tarcze'
import type { PunktTarczy } from './MapaWektor'

type Dane = FeatureCollection & { obszar: [number, number, number, number]; pobrano: string }

function wczytaj(): Dane | null {
    const plik = path.join(process.cwd(), 'public/mapa/okolica.json')
    try {
        return JSON.parse(fs.readFileSync(plik, 'utf8')) as Dane
    } catch {
        return null
    }
}

const SZEROKOSC = 760

/** d3-geo oczekuje pierścieni zewnętrznych w odwrotnym kierunku niż GeoJSON z OSM – inaczej „las” zalałby całą mapę. */
function popraw(f: Feature): Feature {
    const g = f.geometry
    if (g && (g.type === 'Polygon' || g.type === 'MultiPolygon') && geoArea(f) > 2 * Math.PI) {
        const odwroc = (w: number[][][]) => w.map((r) => [...r].reverse())
        return { ...f, geometry: g.type === 'Polygon' ? { type: 'Polygon', coordinates: odwroc(g.coordinates) } : { type: 'MultiPolygon', coordinates: g.coordinates.map(odwroc) } }
    }
    return f
}

export default function MapaSvg({ punkty }: { punkty: PunktTarczy[] }) {
    const dane = wczytaj()
    if (!dane) {
        return (
            <p className="text-gray-500 lowercase" style={{ fontSize: 14 }}>
                brak danych mapy – na serwerze uruchom <code>npm run mapa:dane</code>, potem odśwież stronę.
            </p>
        )
    }
    const [s, w, n, e] = dane.obszar
    const ramka: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        // kolejność zgodna z ruchem wskazówek zegara – tak d3-geo rozumie „wnętrze” prostokąta
        geometry: { type: 'Polygon', coordinates: [[[w, s], [w, n], [e, n], [e, s], [w, s]]] },
    }
    const rzut = geoMercator().fitWidth(SZEROKOSC, ramka)
    const [[, y0], [, y1]] = geoPath(rzut).bounds(ramka)
    const WYSOKOSC = Math.round(y1 - y0)
    rzut.clipExtent([[0, 0], [SZEROKOSC, WYSOKOSC]])
    const sciezka = geoPath(rzut)

    return (
        <div className="mapa-svg border border-[#d1d5db] dark:border-[#4b5563]" style={{ borderRadius: 8, overflow: 'hidden' }}>
            <svg viewBox={`0 0 ${SZEROKOSC} ${WYSOKOSC}`} width="100%" role="img" aria-label="mapa okolicy Olszanki, Łosic i Międzyrzeca">
                <rect width={SZEROKOSC} height={WYSOKOSC} className="m-tlo" />
                {dane.features.map((f, i) => {
                    const d = sciezka(popraw(f))
                    return d ? <path key={i} d={d} className={`m-${f.properties?.k}`} /> : null
                })}
                {punkty.map((p) => {
                    const xy = rzut([p.lng, p.lat])
                    if (!xy) return null
                    const r = p.rodzaj === 'miasto' ? 30 : 26
                    const sz = Math.round(r * (40 / 44))
                    return (
                        <a key={p.id} href={`/miejsca/${p.id}`} className="m-punkt">
                            <g
                                transform={`translate(${(xy[0] - sz / 2).toFixed(1)} ${(xy[1] - r / 2).toFixed(1)})`}
                                dangerouslySetInnerHTML={{ __html: tarczaMiejsca(p.rodzaj, p.wyznanie as Wyznanie, p.nazwa, r, p.przyblizone) }}
                            />
                            <text x={xy[0] + sz / 2 + 4} y={xy[1] + 4} className={`m-napis${p.rodzaj === 'miasto' ? ' m-napis-miasto' : ''}`}>
                                {p.nazwa}
                            </text>
                        </a>
                    )
                })}
                <text x={SZEROKOSC - 8} y={WYSOKOSC - 8} textAnchor="end" className="m-podpis">
                    © autorzy OpenStreetMap (ODbL) · dane z {dane.pobrano}
                </text>
            </svg>
        </div>
    )
}
