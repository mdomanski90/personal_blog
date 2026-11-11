// Pobiera z OpenStreetMap (Overpass API) rzeki, lasy, drogi i granice gmin dla okolicy
// Olszanki, Łosic i Międzyrzeca, upraszcza je i zapisuje do public/mapa/okolica.json
// – z tego pliku rysowana jest własna mapa SVG (bez zewnętrznych kafelków).
//
//   npm run mapa:dane
//
// Dane: © autorzy OpenStreetMap, licencja ODbL (podpis jest na mapie).

import fs from 'node:fs'
import path from 'node:path'
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson'

// południe, zachód, północ, wschód
const OBSZAR = [51.95, 22.48, 52.26, 22.88] as const
const PLIK = path.join(process.cwd(), 'public/mapa/okolica.json')
const SERWERY = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']

const bbox = OBSZAR.join(',')
const zapytanie = `[out:json][timeout:180];
(
  way["waterway"~"^(river|stream|canal)$"](${bbox});
  way["natural"="water"](${bbox});
  relation["natural"="water"](${bbox});
  way["landuse"="forest"](${bbox});
  way["natural"="wood"](${bbox});
  relation["landuse"="forest"](${bbox});
  relation["natural"="wood"](${bbox});
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"](${bbox});
  way["railway"="rail"](${bbox});
  relation["boundary"="administrative"]["admin_level"~"^(6|7)$"](${bbox});
);
out geom;`

// ---------- upraszczanie (Douglas–Peucker) ----------

function odleglosc(p: Position, a: Position, b: Position): number {
    const [x, y] = p
    const [x1, y1] = a
    const [x2, y2] = b
    const dx = x2 - x1
    const dy = y2 - y1
    if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1)
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
}

function uprosc(linia: Position[], tol: number): Position[] {
    if (linia.length <= 2) return linia
    let max = 0
    let indeks = 0
    for (let i = 1; i < linia.length - 1; i++) {
        const d = odleglosc(linia[i], linia[0], linia[linia.length - 1])
        if (d > max) {
            max = d
            indeks = i
        }
    }
    if (max <= tol) return [linia[0], linia[linia.length - 1]]
    return [...uprosc(linia.slice(0, indeks + 1), tol).slice(0, -1), ...uprosc(linia.slice(indeks), tol)]
}

const zaokr = (l: Position[]) => l.map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5])

function powierzchnia(pierscien: Position[]): number {
    let s = 0
    for (let i = 0, j = pierscien.length - 1; i < pierscien.length; j = i++) {
        s += (pierscien[j][0] + pierscien[i][0]) * (pierscien[j][1] - pierscien[i][1])
    }
    return Math.abs(s / 2)
}

function uproscGeometrie(g: Geometry, tol: number, minPow = 0): Geometry | null {
    if (g.type === 'LineString') return { type: 'LineString', coordinates: zaokr(uprosc(g.coordinates, tol)) }
    if (g.type === 'MultiLineString') return { type: 'MultiLineString', coordinates: g.coordinates.map((l) => zaokr(uprosc(l, tol))) }
    if (g.type === 'Polygon') {
        if (powierzchnia(g.coordinates[0]) < minPow) return null
        return { type: 'Polygon', coordinates: g.coordinates.map((r) => zaokr(uprosc(r, tol))).filter((r) => r.length >= 4) }
    }
    if (g.type === 'MultiPolygon') {
        const wielokaty = g.coordinates
            .filter((w) => powierzchnia(w[0]) >= minPow)
            .map((w) => w.map((r) => zaokr(uprosc(r, tol))).filter((r) => r.length >= 4))
            .filter((w) => w.length)
        return wielokaty.length ? { type: 'MultiPolygon', coordinates: wielokaty } : null
    }
    return null
}

/** Obrys wielokąta jako linia (granice gmin i powiatów rysujemy kreską). */
function obrys(g: Geometry): Geometry | null {
    if (g.type === 'Polygon') return { type: 'MultiLineString', coordinates: g.coordinates }
    if (g.type === 'MultiPolygon') return { type: 'MultiLineString', coordinates: g.coordinates.flat() }
    if (g.type === 'LineString' || g.type === 'MultiLineString') return g
    return null
}

function rodzaj(t: Record<string, string>): string | null {
    if (t.boundary === 'administrative') return t.admin_level === '6' ? 'powiat' : t.admin_level === '7' ? 'gmina' : null
    if (t.waterway === 'river' || t.waterway === 'canal') return 'rzeka'
    if (t.waterway === 'stream') return 'strumien'
    if (t.natural === 'water') return 'woda'
    if (t.landuse === 'forest' || t.natural === 'wood') return 'las'
    if (t.highway === 'motorway' || t.highway === 'trunk') return 'droga1'
    if (t.highway === 'primary') return 'droga2'
    if (t.highway === 'secondary' || t.highway === 'tertiary') return 'droga3'
    if (t.railway === 'rail') return 'kolej'
    return null
}

// ---------- Overpass (out geom) → GeoJSON ----------

type Wspolrzedna = { lat: number; lon: number }
type Element =
    | { type: 'way'; id: number; geometry?: Wspolrzedna[]; tags?: Record<string, string> }
    | { type: 'relation'; id: number; members?: { type: string; role: string; geometry?: Wspolrzedna[] }[]; tags?: Record<string, string> }
    | { type: 'node'; id: number; tags?: Record<string, string> }

const naPozycje = (g: Wspolrzedna[]): Position[] => g.map((p) => [p.lon, p.lat])
const rowne = (a: Position, b: Position) => a[0] === b[0] && a[1] === b[1]
const zamknieta = (l: Position[]) => l.length >= 4 && rowne(l[0], l[l.length - 1])

/** Łączy kawałki obrysu (drogi członkowskie relacji) w zamknięte pierścienie. */
function zszyj(kawalki: Position[][]): Position[][] {
    const pula = kawalki.filter((k) => k.length >= 2).map((k) => [...k])
    const pierscienie: Position[][] = []
    while (pula.length) {
        let biezacy = pula.shift()!
        let dalej = true
        while (!zamknieta(biezacy) && dalej) {
            dalej = false
            const koniec = biezacy[biezacy.length - 1]
            for (let i = 0; i < pula.length; i++) {
                const k = pula[i]
                if (rowne(k[0], koniec)) biezacy = [...biezacy, ...k.slice(1)]
                else if (rowne(k[k.length - 1], koniec)) biezacy = [...biezacy, ...[...k].reverse().slice(1)]
                else continue
                pula.splice(i, 1)
                dalej = true
                break
            }
        }
        if (zamknieta(biezacy)) pierscienie.push(biezacy)
    }
    return pierscienie
}

function naGeoJSON(elementy: Element[]): Feature[] {
    const wynik: Feature[] = []
    for (const el of elementy) {
        const tags = el.tags ?? {}
        if (el.type === 'way' && el.geometry?.length) {
            const linia = naPozycje(el.geometry)
            const obszar = (tags.landuse === 'forest' || tags.natural === 'wood' || tags.natural === 'water') && zamknieta(linia)
            wynik.push({ type: 'Feature', properties: tags, geometry: obszar ? { type: 'Polygon', coordinates: [linia] } : { type: 'LineString', coordinates: linia } })
        } else if (el.type === 'relation' && el.members?.length) {
            const drogi = el.members.filter((m) => m.type === 'way' && m.geometry?.length)
            if (tags.boundary === 'administrative') {
                // granice: same linie, bez składania wielokąta
                wynik.push({ type: 'Feature', properties: tags, geometry: { type: 'MultiLineString', coordinates: drogi.map((m) => naPozycje(m.geometry!)) } })
            } else {
                const zewnetrzne = zszyj(drogi.filter((m) => m.role !== 'inner').map((m) => naPozycje(m.geometry!)))
                if (zewnetrzne.length) wynik.push({ type: 'Feature', properties: tags, geometry: { type: 'MultiPolygon', coordinates: zewnetrzne.map((r) => [r]) } })
            }
        }
    }
    return wynik
}

async function pobierz(): Promise<unknown> {
    for (const url of SERWERY) {
        try {
            console.log(`Pobieram z ${url} …`)
            const odp = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: zapytanie }), headers: { 'User-Agent': 'odniepamieci.pl (mapa okolicy)' } })
            if (!odp.ok) throw new Error(`HTTP ${odp.status}`)
            return await odp.json()
        } catch (e) {
            console.log(`  nie udało się: ${(e as Error).message}`)
        }
    }
    throw new Error('Żaden serwer Overpass nie odpowiedział – spróbuj za kilka minut.')
}

async function main() {
    const osm = await pobierz()
    const zrodlo = naGeoJSON(((osm as { elements?: Element[] }).elements ?? []))
    const wynik: Feature[] = []
    const licznik: Record<string, number> = {}
    for (const f of zrodlo) {
        const t = (f.properties ?? {}) as Record<string, string>
        const k = rodzaj(t)
        if (!k || !f.geometry) continue
        let g: Geometry | null = f.geometry
        if (k === 'gmina' || k === 'powiat') g = obrys(g)
        // zamknięta linia lasu/wody = wielokąt
        if ((k === 'las' || k === 'woda') && g?.type === 'LineString') {
            const c = g.coordinates
            if (c.length >= 4 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]) g = { type: 'Polygon', coordinates: [c] }
            else g = null
        }
        if (!g) continue
        const tol = k === 'las' ? 0.0004 : k.startsWith('droga') || k === 'kolej' ? 0.0002 : 0.00015
        g = uproscGeometrie(g, tol, k === 'las' ? 2e-6 : k === 'woda' ? 5e-7 : 0)
        if (!g) continue
        const wlasciwosci: Record<string, string> = { k }
        if (t.name && (k === 'rzeka' || k === 'gmina' || k === 'powiat')) wlasciwosci.n = t.name
        wynik.push({ type: 'Feature', properties: wlasciwosci, geometry: g })
        licznik[k] = (licznik[k] ?? 0) + 1
    }
    const kolejnosc = ['las', 'woda', 'strumien', 'rzeka', 'droga3', 'droga2', 'droga1', 'kolej', 'gmina', 'powiat']
    wynik.sort((a, b) => kolejnosc.indexOf(String(a.properties?.k)) - kolejnosc.indexOf(String(b.properties?.k)))
    const plik: FeatureCollection & { obszar: readonly number[]; pobrano: string } = {
        type: 'FeatureCollection',
        obszar: OBSZAR,
        pobrano: new Date().toISOString().slice(0, 10),
        features: wynik,
    }
    fs.mkdirSync(path.dirname(PLIK), { recursive: true })
    fs.writeFileSync(PLIK, JSON.stringify(plik))
    const kb = Math.round(fs.statSync(PLIK).size / 1024)
    console.log(`✓ ${path.relative(process.cwd(), PLIK)}: ${wynik.length} obiektów, ${kb} kB`)
    console.log('  ' + Object.entries(licznik).map(([k, n]) => `${k}: ${n}`).join(', '))
}

main().catch((e) => {
    console.error(`✗ ${(e as Error).message}`)
    process.exit(1)
})
