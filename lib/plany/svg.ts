// Bezpieczne odczytanie znaku z pliku SVG: tylko proste kształty i liczby, bez skryptów, stylów i odnośników.
import type { ElementSvg } from './typy'

const LICZBA = /^-?\d*\.?\d+(e-?\d+)?$/i
const atrybuty = (tag: string) => {
    const a: Record<string, string> = {}
    for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) a[m[1].toLowerCase()] = m[3] ?? m[4] ?? ''
    return a
}
const n = (v: string | undefined) => (v !== undefined && LICZBA.test(v.trim()) ? Number(v) : NaN)

export function odczytajSvg(tekst: string): { elementy: ElementSvg[]; vb: [number, number, number, number] } | null {
    if (tekst.length > 200_000) return null
    const svg = tekst.match(/<svg\b[^>]*>/i)?.[0]
    if (!svg) return null
    const a = atrybuty(svg)
    let vb = (a.viewbox ?? '').trim().split(/[\s,]+/).map(Number) as number[]
    if (vb.length !== 4 || vb.some((x) => !Number.isFinite(x)) || vb[2] <= 0 || vb[3] <= 0) {
        const w = parseFloat(a.width ?? '24'), h = parseFloat(a.height ?? '24')
        vb = [0, 0, w > 0 ? w : 24, h > 0 ? h : 24]
    }
    const el: ElementSvg[] = []
    for (const m of tekst.matchAll(/<(path|circle|ellipse|rect|line|polyline|polygon)\b([^>]*)\/?>/gi)) {
        const t = m[1].toLowerCase(), at = atrybuty(m[2])
        if (t === 'path' && at.d && /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+-eE]+$/.test(at.d)) el.push({ t: 'path', d: at.d.trim() })
        else if (t === 'circle' && [at.cx, at.cy, at.r].every((x) => Number.isFinite(n(x ?? '0')))) el.push({ t: 'circle', cx: n(at.cx ?? '0'), cy: n(at.cy ?? '0'), r: n(at.r) })
        else if (t === 'ellipse' && Number.isFinite(n(at.rx))) el.push({ t: 'circle', cx: n(at.cx ?? '0'), cy: n(at.cy ?? '0'), r: (n(at.rx) + n(at.ry ?? at.rx)) / 2 })
        else if (t === 'rect' && Number.isFinite(n(at.width)) && Number.isFinite(n(at.height))) el.push({ t: 'rect', x: n(at.x ?? '0') || 0, y: n(at.y ?? '0') || 0, width: n(at.width), height: n(at.height), rx: Number.isFinite(n(at.rx)) ? n(at.rx) : undefined })
        else if (t === 'line' && [at.x1, at.y1, at.x2, at.y2].every((x) => Number.isFinite(n(x)))) el.push({ t: 'line', x1: n(at.x1), y1: n(at.y1), x2: n(at.x2), y2: n(at.y2) })
        else if ((t === 'polyline' || t === 'polygon') && at.points && /^[0-9.,\s+-eE]+$/.test(at.points)) el.push({ t, points: at.points.trim() })
        if (el.length > 200) break
    }
    return el.length ? { elementy: el, vb: vb as [number, number, number, number] } : null
}
