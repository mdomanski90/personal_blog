// Operacje edytora na geometrii (czyste funkcje): przesuwanie, obrót, kopie, przyciąganie, odstęp „jak sąsiednie”.

import { kwateraDla, noweId, punktyElementu, rad, srodek, type Element, type Geometria, type Pkt, type Plan } from './model'
import type { TypElementu } from './typy'

export function przesun(g: Geometria, dx: number, dy: number): Geometria {
    switch (g.k) {
        case 'p': case 't': case 'r': return { ...g, x: g.x + dx, y: g.y + dy }
        default: return { ...g, p: g.p.map(([x, y]) => [x + dx, y + dy] as Pkt) }
    }
}

export function obrocGeom(g: Geometria, da: number, wokol?: Pkt): Geometria {
    if (g.k === 'r' || g.k === 't') {
        if (!wokol) return { ...g, a: +(((g.a + da + 540) % 360) - 180).toFixed(2) }
    }
    const [cx, cy] = wokol ?? srodek(g), a = rad(da), c = Math.cos(a), s = Math.sin(a)
    const rot = ([x, y]: Pkt): Pkt => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]
    switch (g.k) {
        case 'p': { const [x, y] = rot([g.x, g.y]); return { ...g, x, y } }
        case 'r': case 't': { const [x, y] = rot([g.x, g.y]); return { ...g, x, y, a: +(((g.a + da + 540) % 360) - 180).toFixed(2) } }
        default: return { ...g, p: g.p.map(rot) }
    }
}

export const kat = (g: Geometria) => (g.k === 'r' || g.k === 't' ? g.a : 0)

/** Kopia elementu w nowym miejscu: kształt, rozmiar, kąt i typ te same; napis, osoby, zdjęcia – puste. */
export function kopia(e: Element, dx: number, dy: number): Element {
    const { id: _i, opis: _o, osoby: _os, zdjecia: _z, rokZgonu: _r, ukryjNapis: _u, notatka: _n, nazwa, ...reszta } = e
    return { ...reszta, id: noweId(), g: przesun(e.g, dx, dy), weryfikacja: reszta.weryfikacja ? 'ok' : undefined, ...(e.typ === 'kwatera' || e.typ === 'napis' ? { nazwa } : {}) }
}

/** Typowa odległość środków sąsiadów (mediana) w kierunku u – dla grobów w rzędzie i między rzędami. */
export function rozstaw(plan: Plan, e: Element, ux: number, uy: number, wzdluzSzer: boolean): number | null {
    if (e.g.k !== 'r') return null
    const L = plan.elementy.filter((q) => q.typ === e.typ && q.g.k === 'r')
    const vx = -uy, vy = ux, D: number[] = []
    for (const g of L.slice(0, 200)) {
        const G = g.g as Extract<Geometria, { k: 'r' }>
        const dl = wzdluzSzer ? G.w : G.h, tol = (wzdluzSzer ? G.h : G.w) * 0.5
        let best = Infinity
        for (const q of L) {
            if (q === g) continue
            const Q = q.g as Extract<Geometria, { k: 'r' }>, dx = Q.x - G.x, dy = Q.y - G.y
            const a = Math.abs(dx * ux + dy * uy), b = Math.abs(dx * vx + dy * vy)
            if (b < tol && a > dl * 0.6 && a < dl * 4 && a < best) best = a
        }
        if (best < Infinity) D.push(best)
    }
    if (D.length < 3) return null
    D.sort((a, b) => a - b)
    return D[D.length >> 1]
}

/** Wektor przesunięcia kopii: „w rzędzie” (wzdłuż szerokości wzoru) albo „rząd dalej” (wzdłuż długości). */
export function wektor(plan: Plan, zazn: Element[], wzor: Element, kier: 'rzad' | 'kol', zn: 1 | -1, odstep: number | null): Pkt {
    const a = rad(kat(wzor.g)), [ux, uy] = kier === 'rzad' ? [Math.cos(a), Math.sin(a)] : [-Math.sin(a), Math.cos(a)]
    let mn = Infinity, mx = -Infinity
    for (const e of zazn) for (const [x, y] of punktyElementu(e.g)) { const p = x * ux + y * uy; mn = Math.min(mn, p); mx = Math.max(mx, p) }
    const G = wzor.g, dl = G.k === 'r' ? (kier === 'rzad' ? G.w : G.h) : Math.max(mx - mn, 1)
    const typ = rozstaw(plan, wzor, ux, uy, kier === 'rzad')
    const gap = odstep ?? (typ ? Math.max(0, typ - dl) : dl * (kier === 'rzad' ? 0.3 : 0.4))
    const d = Math.max(mx - mn, 1) + gap
    return [ux * d * zn, uy * d * zn]
}

/** Kąt rzędów w miejscu (kwatera pod punktem) – nowe groby od razu ustawione jak sąsiednie. */
export function katWMiejscu(plan: Plan, x: number, y: number): number {
    const k = kwateraDla(x, y, plan.elementy.filter((e) => e.typ === 'kwatera'))
    return k?.kat ?? 0
}

/** Typowy rozmiar grobu w kwaterze pod punktem (mediana), inaczej z całego planu. */
export function rozmiarGrobu(plan: Plan, x: number, y: number, u: number): { w: number; h: number } {
    const kw = plan.elementy.filter((e) => e.typ === 'kwatera')
    const k = kwateraDla(x, y, kw)
    let L = plan.elementy.filter((e) => e.typ === 'grob' && e.g.k === 'r')
    const wK = k ? L.filter((e) => { const [a, b] = srodek(e.g); return kwateraDla(a, b, kw) === k }) : []
    if (wK.length >= 3) L = wK
    if (!L.length) return { w: u * 0.7, h: u * 1.3 }
    const md = (f: (e: Element) => number) => L.map(f).sort((a, b) => a - b)[L.length >> 1]
    return { w: md((e) => (e.g as { w: number }).w), h: md((e) => (e.g as { h: number }).h) }
}

// ---------- przyciąganie ----------
export interface Przyciaganie { punkty: boolean; siatka: boolean; krok: number }

/** Najbliższy wierzchołek albo punkt na krawędzi innego elementu (w promieniu r), inaczej siatka. */
export function przyciagnij(p: Pkt, elementy: Element[], typy: Map<string, TypElementu>, r: number, opcje: Przyciaganie, pomin?: Set<string>): { p: Pkt; rodzaj: 'wierzcholek' | 'krawedz' | 'siatka' | null } {
    if (opcje.punkty) {
        let best: Pkt | null = null, bd = r
        for (const e of elementy) {
            if (pomin?.has(e.id)) continue
            for (const q of punktyElementu(e.g)) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = q } }
        }
        if (best) return { p: [best[0], best[1]], rodzaj: 'wierzcholek' }
        bd = r * 0.8
        for (const e of elementy) {
            if (pomin?.has(e.id)) continue
            const t = typy.get(e.typ)
            if (!t || t.rodzaj === 'punkt' || t.rodzaj === 'napis') continue
            const pts = punktyElementu(e.g), zamk = e.g.k !== 'l'
            for (let i = 0; i < pts.length - (zamk ? 0 : 1); i++) {
                const a = pts[i], b = pts[(i + 1) % pts.length], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1
                const s = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)), q: Pkt = [a[0] + s * dx, a[1] + s * dy]
                const d = Math.hypot(q[0] - p[0], q[1] - p[1])
                if (d < bd) { bd = d; best = q }
            }
        }
        if (best) return { p: best, rodzaj: 'krawedz' }
    }
    if (opcje.siatka && opcje.krok > 0) return { p: [Math.round(p[0] / opcje.krok) * opcje.krok, Math.round(p[1] / opcje.krok) * opcje.krok], rodzaj: 'siatka' }
    return { p, rodzaj: null }
}

/** Kąt przyciągany do kąta rzędów kwatery (gdy blisko) i – z Shift – do wielokrotności 15°. */
export function przyciagnijKat(a: number, katKwatery: number | null, shift: boolean): number {
    if (shift) return Math.round(a / 15) * 15
    if (katKwatery !== null) {
        for (const k of [katKwatery, katKwatery + 90, katKwatery - 90, katKwatery + 180, katKwatery - 180]) if (Math.abs(a - k) < 3) return k
    }
    return Math.round(a * 2) / 2
}
