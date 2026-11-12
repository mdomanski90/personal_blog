// Model planu obiektu i czysta logika (bez plików): geometria, numeracja grobów, zasady widoczności.

import type { Warstwa } from './typy'
import { katalog, typGrobu, type TypElementu, type UstawieniaPlanow } from './typy'

export type Widocznosc = 'publiczne' | 'bliscy' | 'ja'
export type Pkt = [number, number]

export type Geometria =
    | { k: 'p'; x: number; y: number }
    | { k: 'r'; x: number; y: number; w: number; h: number; a: number }
    | { k: 'w'; p: Pkt[] }
    | { k: 'l'; p: Pkt[] }
    | { k: 't'; x: number; y: number; a: number }

export interface Osoba {
    nazwa: string
    ur?: string
    zm?: string
    /** przyszłe powiązanie z działem „osoby” (identyfikator z drzewa) */
    id?: string
}

export interface Zdjecie {
    plik: string
    lat?: number
    lon?: number
    data?: string
}

export interface Element {
    id: string
    typ: string
    g: Geometria
    /** napis na planie (np. litera kwatery, nazwa) */
    nazwa?: string
    /** czy pokazywać napis na planie (domyślnie: tak dla napisów, kwater i świątyń) */
    pokazNazwe?: boolean
    /** wielkość i styl napisu */
    rozmiar?: 's' | 'm' | 'l'
    styl?: 'zwykly' | 'kursywa' | 'rozstrzelony'
    /** kolor napisu: tekst | szary | woda | las | teren | pamiec */
    kolor?: 'tekst' | 'szary' | 'woda' | 'las' | 'teren' | 'pamiec'
    /** przesunięcie etykiety względem elementu (jednostki planu) */
    etykieta?: { dx: number; dy: number }
    /** grubość linii (jednostki planu); domyślnie z typu */
    szer?: number
    /** treść z nagrobka, opis */
    opis?: string
    stan?: 'istnieje' | 'nie-istnieje' | 'do-sprawdzenia'
    czas?: string
    /** rok śmierci ostatniej pochowanej osoby – do zasady „zmarli niedawno” */
    rokZgonu?: number
    osoby?: Osoba[]
    zdjecia?: Zdjecie[]
    widocznosc?: Widocznosc
    /** na nagrobku są wymienione osoby żyjące – napis tylko dla bliskich */
    ukryjNapis?: boolean
    /** kwatera: kąt rzędów (°) */
    kat?: number
    /** robocze: auto | przyp | ok (sprawdzony) – tylko w edytorze */
    weryfikacja?: 'auto' | 'przyp' | 'ok'
    notatka?: string
    /** wyliczone przy wydawaniu: napis i osoby ukryte przed czytelnikiem */
    ograniczony?: boolean
}

export interface Podklad {
    id: string
    plik: string
    nazwa: string
    szer: number
    wys: number
    /** przekształcenie piksel obrazu → jednostki planu: [a, b, c, d, e, f] jak w SVG matrix() */
    macierz: [number, number, number, number, number, number]
    krycie: number
    /** kto może zobaczyć podkład na stronie */
    widocznosc: 'edycja' | 'bliscy' | 'publiczne'
}

export interface PunktGeo {
    x: number
    y: number
    lat: number
    lon: number
}

export interface Plan {
    slug: string
    tytul: string
    miejsce?: string
    obiekt?: string
    opis?: string
    widocznosc: Widocznosc
    szer: number
    wys: number
    /** metrów na jednostkę planu (z kalibracji); null – nieznana */
    skala: number | null
    /** obrót całego rysunku (°), żeby północ była u góry */
    obrot: number
    geo: PunktGeo[]
    podklady: Podklad[]
    warstwy: Partial<Record<Warstwa, { ukryta?: boolean; zablokowana?: boolean }>>
    elementy: Element[]
    wersja: number
    zmieniono: string
}

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function nowyPlan(slug: string, tytul: string, szer = 1600, wys = 1100): Plan {
    return { slug, tytul, widocznosc: 'ja', szer, wys, skala: null, obrot: 0, geo: [], podklady: [], warstwy: {}, elementy: [], wersja: 1, zmieniono: new Date().toISOString() }
}

export function noweId(): string {
    const c = 'abcdefghijkmnpqrstuvwxyz23456789'
    let s = ''
    for (let i = 0; i < 10; i++) s += c[Math.floor(Math.random() * c.length)]
    return s
}

// ---------- geometria ----------
export const rad = (d: number) => (d * Math.PI) / 180

export function punktyElementu(g: Geometria): Pkt[] {
    switch (g.k) {
        case 'p':
        case 't':
            return [[g.x, g.y]]
        case 'r': {
            const a = rad(g.a), c = Math.cos(a), s = Math.sin(a)
            return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as Pkt[]).map(([sx, sy]) => {
                const lx = (sx * g.w) / 2, ly = (sy * g.h) / 2
                return [g.x + lx * c - ly * s, g.y + lx * s + ly * c] as Pkt
            })
        }
        default:
            return g.p
    }
}

export function srodek(g: Geometria): Pkt {
    if (g.k === 'p' || g.k === 't' || g.k === 'r') return [g.x, g.y]
    const p = g.p
    if (g.k === 'l') {
        // środek długości linii
        let L = 0
        for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])
        let acc = 0
        for (let i = 1; i < p.length; i++) {
            const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])
            if (acc + d >= L / 2 && d > 0) { const t = (L / 2 - acc) / d; return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t] }
            acc += d
        }
        return p[0] ?? [0, 0]
    }
    // środek ciężkości wielokąta
    let A = 0, cx = 0, cy = 0
    for (let i = 0; i < p.length; i++) {
        const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length], f = x0 * y1 - x1 * y0
        A += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f
    }
    if (Math.abs(A) < 1e-9) return [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length]
    return [cx / (3 * A), cy / (3 * A)]
}

export function wWielokacie(x: number, y: number, P: Pkt[]): boolean {
    let w = false
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const [xi, yi] = P[i], [xj, yj] = P[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) w = !w
    }
    return w
}

export function pole(P: Pkt[]): number {
    let A = 0
    for (let i = 0; i < P.length; i++) { const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length]; A += x0 * y1 - x1 * y0 }
    return Math.abs(A) / 2
}

export function dlugosc(P: Pkt[], zamkniety = false): number {
    let L = 0
    for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])
    if (zamkniety && P.length > 2) L += Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1])
    return L
}

export function obwiednia(elementy: Element[]): [number, number, number, number] | null {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const e of elementy) for (const [x, y] of punktyElementu(e.g)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
    return x0 < Infinity ? [x0, y0, x1, y1] : null
}

/** Jednostka wielkości znaków i napisów: zależy od rozmiaru planu (żeby wieś i cmentarz wyglądały podobnie). */
export const jednostka = (plan: Pick<Plan, 'szer' | 'wys'>) => Math.max(plan.szer, plan.wys) / 80

/** Pseudolosowość powtarzalna (ten sam las na serwerze i w przeglądarce). */
export function losowe(ziarno: string): () => number {
    let h = 1779033703 ^ ziarno.length
    for (let i = 0; i < ziarno.length; i++) { h = Math.imul(h ^ ziarno.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
    let a = h >>> 0
    return () => {
        a |= 0; a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// ---------- przekształcenia (kalibracja) ----------
export type Macierz = [number, number, number, number, number, number]
export const JEDNOSTKOWA: Macierz = [1, 0, 0, 1, 0, 0]
export const zastosuj = (m: Macierz, [x, y]: Pkt): Pkt => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]

/** Przekształcenie afiniczne z 3 par punktów (źródło → cel). */
export function afiniczna(zr: Pkt[], cel: Pkt[]): Macierz | null {
    if (zr.length < 3 || cel.length < 3) return podobienstwo(zr, cel)
    const [[x1, y1], [x2, y2], [x3, y3]] = zr
    const det = x1 * (y2 - y3) - y1 * (x2 - x3) + (x2 * y3 - x3 * y2)
    if (Math.abs(det) < 1e-9) return null
    const rozw = (u1: number, u2: number, u3: number) => [
        (u1 * (y2 - y3) - y1 * (u2 - u3) + (u2 * y3 - u3 * y2)) / det,
        (x1 * (u2 - u3) - u1 * (x2 - x3) + (x2 * u3 - x3 * u2)) / det,
        (x1 * (y2 * u3 - y3 * u2) - y1 * (x2 * u3 - x3 * u2) + u1 * (x2 * y3 - x3 * y2)) / det,
    ]
    const [a, c, e] = rozw(cel[0][0], cel[1][0], cel[2][0])
    const [b, d, f] = rozw(cel[0][1], cel[1][1], cel[2][1])
    return [a, b, c, d, e, f]
}

/** Podobieństwo (przesunięcie, obrót, skala) z 2 par punktów. */
export function podobienstwo(zr: Pkt[], cel: Pkt[]): Macierz | null {
    if (zr.length < 2 || cel.length < 2) return null
    const [p1, p2] = zr, [q1, q2] = cel
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1], ex = q2[0] - q1[0], ey = q2[1] - q1[1]
    const L = dx * dx + dy * dy
    if (L < 1e-9) return null
    const a = (dx * ex + dy * ey) / L, b = (dx * ey - dy * ex) / L
    return [a, b, -b, a, q1[0] - a * p1[0] + b * p1[1], q1[1] - b * p1[0] - a * p1[1]]
}

/** Współrzędne geograficzne → jednostki planu (z 2–3 punktów kalibracji). Liczone w metrach lokalnie. */
export function geoNaPlan(geo: PunktGeo[]): ((lat: number, lon: number) => Pkt) | null {
    if (geo.length < 2) return null
    const lat0 = geo[0].lat, lon0 = geo[0].lon, kx = 111320 * Math.cos(rad(lat0)), ky = 110540
    const m = (lat: number, lon: number): Pkt => [(lon - lon0) * kx, -(lat - lat0) * ky]
    const T = geo.length >= 3 ? afiniczna(geo.slice(0, 3).map((g) => m(g.lat, g.lon)), geo.slice(0, 3).map((g) => [g.x, g.y])) : podobienstwo(geo.map((g) => m(g.lat, g.lon)), geo.map((g) => [g.x, g.y]))
    if (!T) return null
    return (lat, lon) => zastosuj(T, m(lat, lon))
}

/** Jednostki planu → [długość, szerokość geograficzna] (odwrotność geoNaPlan), np. do położenia obrazu planu na mapie. */
export function planNaGeo(geo: PunktGeo[]): ((p: Pkt) => [number, number]) | null {
    if (geo.length < 2) return null
    const lat0 = geo[0].lat, lon0 = geo[0].lon, kx = 111320 * Math.cos(rad(lat0)), ky = 110540
    const m = (lat: number, lon: number): Pkt => [(lon - lon0) * kx, -(lat - lat0) * ky]
    const T = geo.length >= 3 ? afiniczna(geo.slice(0, 3).map((g) => m(g.lat, g.lon)), geo.slice(0, 3).map((g) => [g.x, g.y])) : podobienstwo(geo.map((g) => m(g.lat, g.lon)), geo.map((g) => [g.x, g.y]))
    if (!T) return null
    const [a, b, c, d, e, f] = T, det = a * d - b * c
    if (Math.abs(det) < 1e-12) return null
    return ([x, y]) => {
        const X = (d * (x - e) - c * (y - f)) / det, Y = (-b * (x - e) + a * (y - f)) / det
        return [lon0 + X / kx, lat0 - Y / ky]
    }
}

/** Skala (m na jednostkę) wynikająca z punktów geo – gdy nie ustawiono jej ręcznie. */
export function skalaZGeo(geo: PunktGeo[]): number | null {
    if (geo.length < 2) return null
    const [a, b] = geo, kx = 111320 * Math.cos(rad(a.lat))
    const m = Math.hypot((b.lon - a.lon) * kx, (b.lat - a.lat) * 110540), u = Math.hypot(b.x - a.x, b.y - a.y)
    return u > 0 ? m / u : null
}

// ---------- cmentarz: kwatery, rzędy, miejsca ----------
export interface Numer { kwatera: string; rzad: number; miejsce: number }

export function kwateraDla(x: number, y: number, kwatery: Element[]): Element | null {
    for (const k of kwatery) if (k.g.k === 'w' && wWielokacie(x, y, k.g.p)) return k
    for (const k of kwatery) if (k.g.k === 'r' && wWielokacie(x, y, punktyElementu(k.g))) return k
    return null
}

/** Numeracja grobów: kwatera (z położenia), rząd i miejsce wzdłuż kąta rzędów kwatery. */
export function numeracja(plan: Pick<Plan, 'elementy'>, typy: Map<string, TypElementu>): Map<string, Numer> {
    const kwatery = plan.elementy.filter((e) => e.typ === 'kwatera')
    const wg = new Map<Element | null, { e: Element; x: number; y: number }[]>()
    for (const e of plan.elementy) {
        if (!typGrobu(typy.get(e.typ))) continue
        const [x, y] = srodek(e.g), k = kwateraDla(x, y, kwatery)
        if (!wg.has(k)) wg.set(k, [])
        wg.get(k)!.push({ e, x, y })
    }
    const wyn = new Map<string, Numer>()
    for (const [k, L] of wg) {
        const a = rad(k?.kat ?? 0), ux = Math.cos(a), uy = Math.sin(a)
        const dl = L.map((z) => (z.e.g.k === 'r' ? z.e.g.h : 20)).sort((p, q) => p - q)[L.length >> 1] ?? 20
        const prog = dl * 0.75
        const P = L.map((z) => ({ z, p: -z.x * uy + z.y * ux, w: z.x * ux + z.y * uy })).sort((p, q) => p.p - q.p)
        const rz: { sr: number; L: typeof P }[] = []
        for (const q of P) {
            const r = rz[rz.length - 1]
            if (r && Math.abs(q.p - r.sr) < prog) { r.L.push(q); r.sr = r.L.reduce((s, v) => s + v.p, 0) / r.L.length }
            else rz.push({ sr: q.p, L: [q] })
        }
        rz.forEach((r, ri) => r.L.sort((p, q) => p.w - q.w).forEach((q, mi) => wyn.set(q.z.e.id, { kwatera: k?.nazwa ?? '', rzad: ri + 1, miejsce: mi + 1 })))
    }
    return wyn
}

/** Rok śmierci: z pola, inaczej najpóźniejszy rok z dat osób i z napisu. */
export function rokZgonu(e: Element): number | null {
    if (e.rokZgonu) return e.rokZgonu
    const lata: number[] = []
    for (const o of e.osoby ?? []) { const m = (o.zm ?? '').match(/(1[6-9]|20)\d\d/); if (m) lata.push(+m[0]) }
    for (const m of (e.opis ?? '').matchAll(/(?<!\d)(1[6-9]\d\d|20\d\d)(?!\d)/g)) lata.push(+m[1])
    return lata.length ? Math.max(...lata) : null
}

/** Czy treść grobu ma być ukryta przed czytelnikiem bez logowania. */
export function grobOgraniczony(e: Element, typ: TypElementu | undefined, progLat: number, rok = new Date().getFullYear()): boolean {
    if (!typGrobu(typ)) return false
    if (e.ukryjNapis) return true
    const r = rokZgonu(e)
    return r !== null && r > rok - progLat
}

export function widoczne(w: Widocznosc | undefined, poziom: Widocznosc): boolean {
    const v = w || 'publiczne'
    if (v === 'publiczne') return true
    if (v === 'bliscy') return poziom !== 'publiczne'
    return poziom === 'ja'
}

/**
 * Plan przygotowany dla czytelnika: bez elementów, których nie może widzieć, bez typów ukrytych,
 * bez podkładów „tylko do edycji”, bez pól roboczych; groby zmarłych niedawno – sam kształt.
 */
export function dlaCzytelnika(plan: Plan, poziom: Widocznosc, u: UstawieniaPlanow): Plan {
    const typy = katalog(u), ukryte = new Set(u.ukryteTypy ?? [])
    const elementy: Element[] = []
    for (const e of plan.elementy) {
        if (ukryte.has(e.typ) || !typy.has(e.typ) || !widoczne(e.widocznosc, poziom)) continue
        const { weryfikacja: _w, notatka: _n, ...czysty } = e
        if (poziom === 'publiczne' && grobOgraniczony(e, typy.get(e.typ), u.progLat)) {
            elementy.push({ id: e.id, typ: e.typ, g: e.g, stan: e.stan, ograniczony: true })
        } else elementy.push(czysty)
    }
    const podklady = plan.podklady.filter((p) => p.widocznosc === 'publiczne' || (p.widocznosc === 'bliscy' && poziom !== 'publiczne'))
    return { ...plan, geo: poziom === 'publiczne' ? [] : plan.geo, podklady, elementy }
}

/** Tekst do wyszukiwania nazwisk (bez polskich znaków, małe litery). */
export function doSzukania(e: Element): string {
    return [e.nazwa, e.opis, ...(e.osoby ?? []).map((o) => o.nazwa)].filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
}

/** Kontrola i naprawa wczytanego pliku (stare wersje, braki). */
export function popraw(p: Partial<Plan> & { slug: string }): Plan {
    return {
        slug: p.slug,
        tytul: p.tytul || p.slug,
        miejsce: p.miejsce || undefined,
        obiekt: p.obiekt || undefined,
        opis: p.opis || undefined,
        widocznosc: (['publiczne', 'bliscy', 'ja'] as const).includes(p.widocznosc as Widocznosc) ? (p.widocznosc as Widocznosc) : 'ja',
        szer: Number(p.szer) > 0 ? Number(p.szer) : 1600,
        wys: Number(p.wys) > 0 ? Number(p.wys) : 1100,
        skala: typeof p.skala === 'number' && p.skala > 0 ? p.skala : null,
        obrot: Number(p.obrot) || 0,
        geo: Array.isArray(p.geo) ? p.geo.filter((g) => [g.x, g.y, g.lat, g.lon].every((v) => typeof v === 'number')) : [],
        podklady: Array.isArray(p.podklady) ? p.podklady : [],
        warstwy: p.warstwy && typeof p.warstwy === 'object' ? p.warstwy : {},
        elementy: Array.isArray(p.elementy) ? p.elementy.filter((e) => e && typeof e.id === 'string' && e.g && typeof e.typ === 'string') : [],
        wersja: Number(p.wersja) || 1,
        zmieniono: p.zmieniono || new Date().toISOString(),
    }
}
