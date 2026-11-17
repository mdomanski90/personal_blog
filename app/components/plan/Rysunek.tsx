// Rysunek planu obiektu (SVG). Czysty komponent – ten sam na stronie, w podglądzie i w edytorze.
// Zasady: ściszone tło, kontrastowe to, co ważne; drogi rysowane dwuprzebiegowo (bez konturów na skrzyżowaniach);
// znaki z obwódką w kolorze tła; napisy z poświatą; kolory jako zmienne CSS (tryb jasny i ciemny).

import * as React from 'react'
import { jednostka, losowe, pole, punktyElementu, rad, srodek, wWielokacie, type Element, type Numer, type Pkt, type Plan, type Podklad } from '@/lib/plany/model'
import { KOLEJNOSC_WARSTW, KOLORY, WZORY, type TypElementu } from '@/lib/plany/typy'
import { ROZMIAR_STOPNIA, stopienNapisu, type Stopien } from '@/lib/plany/metadane'
import { doCzytania, liniaWskazujaca, probkiOsi, punktKotwicy, sciezka, szerokoscWiersza, wierszeNapisu, wstega, type Wyrownanie } from '@/lib/plany/ph3'

const F = { fontFamily: 'var(--font-jetbrains), JetBrains Mono, ui-monospace, monospace' }
const v = (nazwa: string) => `var(--pl-${nazwa})`
const P = (pts: Pkt[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
const M = (pts: Pkt[]) => 'M' + P(pts)

/** Gładka krzywa zamknięta przez punkty (Catmull-Rom → Bézier). */
export function gladka(pts: Pkt[]): string {
    const n = pts.length
    if (n < 3) return M(pts) + 'Z'
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
    for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]
        d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
    }
    return d + 'Z'
}

/** Otwarta krzywa gładka, gęsto próbkowana (dla dolin). */
function krzywa(pts: Pkt[], k = 8): Pkt[] {
    const o: Pkt[] = [], n = pts.length
    if (n < 3) return pts
    for (let i = 0; i < n - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)]
        for (let j = 0; j < k; j++) {
            const t = j / k, t2 = t * t, t3 = t2 * t
            o.push([0, 1].map((q) => 0.5 * (2 * p1[q] + (-p0[q] + p2[q]) * t + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * t2 + (-p0[q] + 3 * p1[q] - 3 * p2[q] + p3[q]) * t3)) as Pkt)
        }
    }
    o.push(pts[n - 1])
    return o
}

/** Krótkie kreski prostopadle do obrysu – w stronę środka (dół) albo na zewnątrz (wzniesienie). */
function kreski(pts: Pkt[], dl: number, co: number, doSrodka: boolean): string {
    const n = pts.length, cx = pts.reduce((s, p) => s + p[0], 0) / n, cy = pts.reduce((s, p) => s + p[1], 0) / n
    let d = '', acc = 0
    for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1])
        if (L < 1e-6) continue
        let t = acc ? co - acc : 0
        while (t < L) {
            const x = a[0] + ((b[0] - a[0]) * t) / L, y = a[1] + ((b[1] - a[1]) * t) / L
            let nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L
            if ((cx - x) * nx + (cy - y) * ny < 0) { nx = -nx; ny = -ny }
            if (!doSrodka) { nx = -nx; ny = -ny }
            d += `M${x.toFixed(1)},${y.toFixed(1)}l${(nx * dl).toFixed(1)},${(ny * dl).toFixed(1)}`
            t += co
        }
        acc = (acc + L) % co
    }
    return d
}

/** Obrys z gładkiej krzywej próbkowany do punktów (żeby kreski leżały na krzywej). */
function probkujZamknieta(pts: Pkt[], k = 6): Pkt[] {
    const n = pts.length, o: Pkt[] = []
    for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]
        for (let j = 0; j < k; j++) {
            const t = j / k, t2 = t * t, t3 = t2 * t
            o.push([0, 1].map((q) => 0.5 * (2 * p1[q] + (-p0[q] + p2[q]) * t + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * t2 + (-p0[q] + 3 * p1[q] - 3 * p2[q] + p3[q]) * t3)) as Pkt)
        }
    }
    return o
}

const skalowane = (pts: Pkt[], f: number): Pkt[] => {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
    return pts.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f])
}

// ---------- wzory obszarów ----------
export function Wzory({ prefix, u }: { prefix: string; u: number }) {
    const k = u / 20
    return (
        <>
            {Object.entries(WZORY).filter(([, w]) => w.rys).map(([id, w]) => {
                const W = (w.w ?? 20) * k, H = (w.h ?? 20) * k
                return (
                    <pattern key={id} id={`${prefix}-${id}`} width={W} height={H} patternUnits="userSpaceOnUse">
                        <rect width={W} height={H} style={{ fill: w.tlo }} />
                        <path d={w.rys} transform={`scale(${k})`} style={{ fill: 'none', stroke: w.kreska, strokeWidth: 0.9, strokeLinecap: 'round' }} />
                    </pattern>
                )
            })}
            <radialGradient id={`${prefix}-dol`}>
                <stop offset="0" style={{ stopColor: v('teren-cien') }} />
                <stop offset=".65" style={{ stopColor: v('teren-jasny') }} />
                <stop offset="1" style={{ stopColor: v('teren-jasny'), stopOpacity: 0 }} />
            </radialGradient>
        </>
    )
}

const wypelnienie = (prefix: string, wzor?: string) => {
    const w = wzor ? WZORY[wzor] : undefined
    if (!w) return v('laka')
    return w.rys ? `url(#${prefix}-${wzor})` : w.tlo
}

// ---------- znaki ----------
export function Znak({ typ, x, y, s, halo = true, kolor }: { typ: TypElementu; x: number; y: number; s: number; halo?: boolean; kolor?: string }) {
    const k = s / 24, barwa = kolor ?? (typ.kolor ? KOLORY[typ.kolor] : v('tekst'))
    if (typ.wlasny?.png) {
        return <image href={`/plany/ikona/${typ.wlasny.png}`} x={x - s / 2} y={y - s / 2} width={s} height={s} />
    }
    const ksztalty = typ.wlasny?.svg, vb = typ.wlasny?.svgVb
    const dop = vb ? `scale(${24 / Math.max(vb[2], vb[3])}) translate(${-vb[0]} ${-vb[1]})` : undefined
    const rysuj = (styl: React.CSSProperties, klucz: string) =>
        ksztalty ? (
            <g key={klucz} style={{ ...styl, strokeWidth: vb ? (Number(styl.strokeWidth) * Math.max(vb[2], vb[3])) / 24 : styl.strokeWidth }} transform={dop}>
                {ksztalty.map((e, i) => {
                    switch (e.t) {
                        case 'path': return <path key={i} d={e.d} />
                        case 'circle': return <circle key={i} cx={e.cx} cy={e.cy} r={e.r} />
                        case 'rect': return <rect key={i} x={e.x} y={e.y} width={e.width} height={e.height} rx={e.rx} />
                        case 'line': return <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
                        case 'polyline': return <polyline key={i} points={e.points} />
                        case 'polygon': return <polygon key={i} points={e.points} />
                    }
                })}
            </g>
        ) : (
            <path key={klucz} d={typ.ikona ?? 'M6 12a6 6 0 1 0 12 0a6 6 0 1 0-12 0'} style={styl} strokeDasharray={typ.id === 'nie-istnieje' ? '2 2.5' : undefined} />
        )
    const baza: React.CSSProperties = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
    return (
        <g transform={`translate(${(x - s / 2).toFixed(1)} ${(y - s / 2).toFixed(1)}) scale(${k.toFixed(4)})`}>
            {halo && rysuj({ ...baza, stroke: v('papier'), strokeWidth: 4.4 }, 'h')}
            {rysuj({ ...baza, stroke: barwa, strokeWidth: 1.6 }, 'z')}
        </g>
    )
}

// ---------- las ----------
function Las({ e, p, u, gesty, prefix, d }: { e: Element; p: Pkt[]; u: number; gesty: boolean; prefix: string; d?: string }) {
    const los = losowe(e.id)
    // korony rozrzucone nieregularnie: różna wielkość, prześwity między nimi, część zachodzi na siebie
    const rmin = gesty ? u * 0.6 : u * 0.45, rmax = gesty ? u * 1.6 : u * 1.1, gest = gesty ? 0.36 : 0.22
    const xs = p.map((q) => q[0]), ys = p.map((q) => q[1])
    let A = 0
    for (let i = 0; i < p.length; i++) A += p[i][0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * p[i][1]
    const n = Math.min(1600, Math.floor((Math.abs(A) / 2 / ((rmin + rmax) / 2) ** 2) * gest))
    const kola: [number, number, number][] = []
    let proby = 0
    while (kola.length < n && proby < n * 40) {
        proby++
        const x = Math.min(...xs) + los() * (Math.max(...xs) - Math.min(...xs)), y = Math.min(...ys) + los() * (Math.max(...ys) - Math.min(...ys))
        if (!wWielokacie(x, y, p)) continue
        const r = rmin + los() * (rmax - rmin)
        if (kola.some(([a, b, c]) => (x - a) ** 2 + (y - b) ** 2 < (0.62 * (r + c)) ** 2)) continue
        kola.push([x, y, r])
    }
    kola.sort((a, b) => a[1] - b[1])
    const id = `${prefix}-las-${e.id}`
    return (
        <g>
            <clipPath id={id}>{d ? <path d={d} /> : <polygon points={P(p)} />}</clipPath>
            {d ? <path d={d} style={/* styl-dynamiczny: kolor z tokenu --pl-* */ { fill: v('las') }} /> : <polygon points={P(p)} style={{ fill: v('las') }} />}
            <g clipPath={`url(#${id})`}>
                {kola.map(([x, y, r], i) => {
                    const m = 6 + Math.floor(los() * 3), faza = los() * 6.28
                    const pts: Pkt[] = Array.from({ length: m }, (_, t) => {
                        const f = faza + (t / m) * 2 * Math.PI, rr = r * (0.9 + los() * 0.14)
                        return [x + rr * Math.cos(f), y + rr * Math.sin(f)]
                    })
                    const kol = ['korona1', 'korona2', 'korona3'][Math.floor(los() * 3)]
                    return <path key={i} d={gladka(pts)} style={{ fill: v(kol), stroke: v('las-brzeg'), strokeWidth: Math.max(0.4, r / 16), strokeOpacity: 0.95, strokeLinejoin: 'round' }} />
                })}
            </g>
            {d ? <path d={d} style={/* styl-dynamiczny: grubość z jednostki planu, kolor z tokenu --pl-* */ { fill: 'none', stroke: v('las-brzeg'), strokeWidth: Math.max(0.5, rmin / 14) }} /> : <polygon points={P(p)} style={{ fill: 'none', stroke: v('las-brzeg'), strokeWidth: Math.max(0.5, rmin / 14) }} />}
        </g>
    )
}

// ---------- teren ----------
function Zaglebienie({ p, u, prefix, wypukle }: { p: Pkt[]; u: number; prefix: string; wypukle: boolean }) {
    const zew = probkujZamknieta(p), wew = skalowane(p, 0.55), sw = u * 0.035
    const kol = wypukle ? v('teren-wzn') : v('teren')
    return (
        <g>
            <path d={gladka(p)} style={{ fill: wypukle ? v('teren-wzn-tlo') : `url(#${prefix}-dol)` }} />
            <path d={gladka(p)} style={{ fill: 'none', stroke: kol, strokeWidth: sw }} />
            <path d={kreski(zew, u * 0.33, u * 0.55, !wypukle)} style={{ fill: 'none', stroke: kol, strokeWidth: sw * 0.9, strokeLinecap: 'round' }} />
            {p.length >= 3 && <path d={gladka(wew)} style={{ fill: wypukle ? v('teren-wzn-jasny') : 'none', stroke: kol, strokeWidth: sw * 0.8, strokeOpacity: 0.8 }} />}
        </g>
    )
}

function Dolina({ pts, szer, u }: { pts: Pkt[]; szer: number; u: number }) {
    const c = krzywa(pts), n = c.length
    if (n < 2) return null
    const L: Pkt[] = [], R: Pkt[] = [], W: number[] = [], N: Pkt[] = []
    c.forEach(([x, y], i) => {
        const a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
        const nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d, t = i / (n - 1)
        const w = szer * (0.25 + 0.75 * Math.sin((Math.PI / 2) * Math.min(1, t * 1.25))) * (1 - (0.15 * Math.max(0, t - 0.85)) / 0.15)
        W.push(w); N.push([nx, ny]); L.push([x + nx * w, y + ny * w]); R.push([x - nx * w, y - ny * w])
    })
    const pas = (f: number) => [...c.map(([x, y], i) => [x + N[i][0] * W[i] * f, y + N[i][1] * W[i] * f] as Pkt), ...c.map(([x, y], i) => [x - N[i][0] * W[i] * f, y - N[i][1] * W[i] * f] as Pkt).reverse()]
    const co = u * 0.45, dl = u * 0.7, sw = u * 0.03
    const kr = (kraw: Pkt[], zn: number) => {
        let d = '', acc = co * 0.5
        for (let i = 1; i < n; i++) {
            acc += Math.hypot(kraw[i][0] - kraw[i - 1][0], kraw[i][1] - kraw[i - 1][1])
            if (acc >= co) {
                acc = 0
                const l = Math.min(dl, W[i] * 0.55)
                if (l > u * 0.1) d += `M${kraw[i][0].toFixed(1)},${kraw[i][1].toFixed(1)}l${(-N[i][0] * zn * l).toFixed(1)},${(-N[i][1] * zn * l).toFixed(1)}`
            }
        }
        return d
    }
    return (
        <g>
            <polygon points={P(pas(1))} style={{ fill: v('teren-jasny'), fillOpacity: 0.8 }} />
            <polygon points={P(pas(0.45))} style={{ fill: v('teren-cien'), fillOpacity: 0.7 }} />
            {[L, R].map((k, i) => <polyline key={i} points={P(k)} style={{ fill: 'none', stroke: v('teren'), strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' }} />)}
            <path d={kr(L, 1) + kr(R, -1)} style={{ fill: 'none', stroke: v('teren'), strokeWidth: sw * 0.85, strokeLinecap: 'round', strokeOpacity: 0.85 }} />
            <polyline points={P(c)} style={{ fill: 'none', stroke: v('teren'), strokeWidth: sw * 0.8, strokeDasharray: `${u * 0.08} ${u * 0.1}`, strokeOpacity: 0.7 }} />
        </g>
    )
}

// ---------- linie ----------
/** pr – PH-04: próbki osi z szerokością w węzłach (linia rysowana wstęgą zamiast kreską) */
interface Linia { d: string; szer: number; e: Element; rys: string; wl?: { kolor: string; kreski: string }; pr?: [number, number, number][] }
const DOMYSLNA_SZER: Record<string, number> = { ulica: 1.5, kolej: 0.3, wal: 0.55, most: 0.9, droga: 0.9, polna: 0.45, sciezka: 0.09, alejka: 0.85, rzeka: 0.36, ogrodzenie: 0.05, granica: 0.045, dolina: 1.2, wlasny: 0.12 }
export const szerLinii = (e: Element, rys: string, u: number) => e.szer ?? (DOMYSLNA_SZER[rys] ?? 0.1) * u

function SiecDrog({ linie, u }: { linie: Linia[]; u: number }) {
    // kolejność: podkłady dróg polnych, ich kreskowanie, obwódki dróg i alejek, wypełnienia – bez konturów na skrzyżowaniach
    // ulica (PH-22) rysuje się razem z drogami – skrzyżowania ulic bez konturów; mocniejszy brzeg z tokenu --pl-ulica-obw
    const pol = linie.filter((l) => l.rys === 'polna'), bite = linie.filter((l) => l.rys === 'droga' || l.rys === 'alejka' || l.rys === 'ulica')
    const obw: Record<string, [string, number]> = { droga: ['droga-obw', 0.2], alejka: ['alejka-obw', 0.14], ulica: ['ulica-obw', 0.16] }
    const okr: React.CSSProperties = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
    return (
        <g>
            {pol.map((l) => <path key={'pt' + l.e.id} d={l.d} style={{ ...okr, stroke: v('polna-tlo'), strokeWidth: l.szer }} />)}
            {pol.map((l) => <path key={'pk' + l.e.id} d={l.d} style={{ ...okr, stroke: v('polna'), strokeWidth: Math.max(u * 0.08, l.szer * 0.26), strokeDasharray: `${u * 0.45} ${u * 0.25}` }} />)}
            {bite.map((l) => l.pr
                ? <path key={'o' + l.e.id} d={wstega(l.pr, u * obw[l.rys][1])} style={/* styl-dynamiczny: kolor z tokenu --pl-* (PH-04 wstęga) */ { fill: v(obw[l.rys][0]) }} />
                : <path key={'o' + l.e.id} d={l.d} style={{ ...okr, stroke: v(obw[l.rys][0]), strokeWidth: l.szer + u * obw[l.rys][1] }} />)}
            {bite.map((l) => l.pr
                ? <path key={'w' + l.e.id} d={wstega(l.pr)} style={/* styl-dynamiczny: kolor z tokenu --pl-* (PH-04 wstęga) */ { fill: v(l.rys === 'alejka' ? 'alejka' : 'droga') }} />
                : <path key={'w' + l.e.id} d={l.d} style={{ ...okr, stroke: v(l.rys === 'alejka' ? 'alejka' : 'droga'), strokeWidth: l.szer }} />)}
        </g>
    )
}

function LiniaInna({ l, u }: { l: Linia; u: number }) {
    const okr: React.CSSProperties = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
    switch (l.rys) {
        case 'sciezka': return <path d={l.d} style={{ ...okr, stroke: v('polna'), strokeWidth: l.szer, strokeDasharray: `${u * 0.1} ${u * 0.2}` }} />
        // PH-04 (S1): rzeka o zmiennej szerokości – warstwy: brzeg (szersza wstęga), na nim woda
        case 'rzeka': return l.pr
            ? <><path d={wstega(l.pr, u * 0.08)} style={/* styl-dynamiczny: kolor z tokenu --pl-* (PH-04 wstęga) */ { fill: v('woda-brzeg') }} /><path d={wstega(l.pr)} style={/* styl-dynamiczny: kolor z tokenu --pl-* (PH-04 wstęga) */ { fill: v('rzeka') }} /></>
            : <path d={l.d} style={{ ...okr, stroke: v('rzeka'), strokeWidth: l.szer }} />
        case 'ogrodzenie': return <path d={l.d} style={{ ...okr, strokeLinecap: 'butt', stroke: v('plot'), strokeWidth: l.szer, strokeDasharray: `${u * 0.4} ${u * 0.2} ${u * 0.08} ${u * 0.2}` }} />
        case 'granica': return <path d={l.d} style={{ ...okr, stroke: v('szary'), strokeWidth: l.szer, strokeDasharray: `${u * 0.45} ${u * 0.25}` }} />
        // PH-22: kolej – ciemna linia z jasnymi odcinkami w środku (klasyczny znak mapy)
        case 'kolej': return <><path d={l.d} style={/* styl-dynamiczny: grubość i kreski z jednostki planu, kolor z tokenu --pl-* */ { ...okr, strokeLinecap: 'butt', stroke: v('tekst'), strokeWidth: l.szer }} /><path d={l.d} style={/* styl-dynamiczny: grubość i kreski z jednostki planu, kolor z tokenu --pl-* */ { ...okr, strokeLinecap: 'butt', stroke: v('papier'), strokeWidth: l.szer * 0.55, strokeDasharray: `${u * 0.7} ${u * 0.7}` }} /></>
        // wał, grobla – oś i krótkie kreski poprzeczne (szeroka kreska z gęstym przerywaniem)
        case 'wal': return <><path d={l.d} style={/* styl-dynamiczny: grubość i kreski z jednostki planu, kolor z tokenu --pl-* */ { ...okr, stroke: v('teren'), strokeWidth: u * 0.07 }} /><path d={l.d} style={/* styl-dynamiczny: grubość i kreski z jednostki planu, kolor z tokenu --pl-* */ { ...okr, strokeLinecap: 'butt', stroke: v('teren'), strokeWidth: l.szer, strokeDasharray: `${u * 0.06} ${u * 0.22}` }} /></>
        // most – jezdnia z mocnymi brzegami, ucięte końce (kładzie się na rzece)
        case 'most': return <><path d={l.d} style={/* styl-dynamiczny: grubość i kreski z jednostki planu, kolor z tokenu --pl-* */ { ...okr, strokeLinecap: 'butt', stroke: v('bud'), strokeWidth: l.szer + u * 0.22 }} /><path d={l.d} style={/* styl-dynamiczny: grubość i kreski z jednostki planu, kolor z tokenu --pl-* */ { ...okr, strokeLinecap: 'butt', stroke: v('droga'), strokeWidth: l.szer }} /></>
        case 'wlasny': {
            const w = l.wl
            const kreski = w?.kreski === 'przerywana' ? `${u * 0.45} ${u * 0.25}` : w?.kreski === 'kropkowana' ? `${u * 0.1} ${u * 0.2}` : undefined
            return <path d={l.d} style={{ ...okr, stroke: w?.kolor ?? v('tekst'), strokeWidth: l.szer, strokeDasharray: kreski }} />
        }
        default: return null
    }
}

// ---------- PH-19: niepewna identyfikacja – przerywany obrys (tylko elementy z ustawionym polem) ----------
function Niepewnosc({ elementy, u }: { elementy: Element[]; u: number }) {
    const L = elementy.filter((e) => e.identyfikacja === 'przypuszczalna' || e.identyfikacja === 'nieustalona')
    if (!L.length) return null
    return (
        <g data-warstwa="niepewnosc" pointerEvents="none">
            {L.map((e) => {
                const klasa = `pl-niepewny pl-niepewny-${e.identyfikacja}`
                const kreska = /* styl-dynamiczny: grubość i kreski z jednostki planu */ { strokeWidth: u * 0.08, strokeDasharray: `${u * 0.3} ${u * 0.2}` }
                const g = e.g
                if (g.k === 'p' || g.k === 't') return <circle key={e.id} cx={g.x} cy={g.y} r={u * 1.1} className={klasa} style={/* styl-dynamiczny: grubość i kreski z jednostki planu */ kreska} />
                const pts = punktyElementu(g)
                return g.k === 'l'
                    ? <polyline key={e.id} points={P(pts)} className={klasa} style={/* styl-dynamiczny: grubość i kreski z jednostki planu */ kreska} />
                    : <polygon key={e.id} points={P(pts)} className={klasa} style={/* styl-dynamiczny: grubość i kreski z jednostki planu */ kreska} />
            })}
        </g>
    )
}

// ---------- napisy ----------
const KOLOR_NAPISU: Record<string, string> = { tekst: v('tekst'), szary: v('szary'), woda: v('woda-txt'), las: v('las-txt'), teren: v('teren-txt'), pamiec: v('pamiec') }

export function Napis({ x, y, tekst, u, stopien = 3, styl = 'zwykly', kolor = 'tekst', kat = 0, obrotPlanu = 0, kotwica = 'middle', waga, wyrownanie, tlo }: {
    x: number; y: number; tekst: string; u: number; stopien?: Stopien; styl?: string; kolor?: string; kat?: number; obrotPlanu?: number; kotwica?: 'start' | 'middle' | 'end'; waga?: number
    /** PH-06: wyrównanie wierszy w bloku napisu (blok wyśrodkowany w punkcie x, y) */
    wyrownanie?: Wyrownanie
    /** PH-06: jasne tło pod napisem */
    tlo?: boolean
}) {
    const fs = u * ROZMIAR_STOPNIA[stopien]
    const roz = styl === 'rozstrzelony'
    const L = wierszeNapisu(roz ? tekst.toUpperCase() : tekst), lh = fs * 1.2
    const szer = Math.max(0, ...L.map((w) => szerokoscWiersza(w, fs, roz)))
    // PH-06: wiele wierszy – blok wyśrodkowany w punkcie; wyrównanie przesuwa kotwicę wierszy do krawędzi bloku
    const wiele = L.length > 1 || !!wyrownanie
    const anchor = wiele ? (wyrownanie === 'l' ? 'start' : wyrownanie === 'p' ? 'end' : 'middle') : kotwica
    const xa = wiele ? (wyrownanie === 'l' ? x - szer / 2 : wyrownanie === 'p' ? x + szer / 2 : x) : x
    const y0 = y - ((L.length - 1) * lh) / 2, pad = fs * 0.3
    return (
        <g transform={kat || obrotPlanu ? `rotate(${kat - obrotPlanu} ${x} ${y})` : undefined}>
            {tlo && <rect x={x - szer / 2 - pad} y={y0 - lh / 2 - pad * 0.6} width={szer + 2 * pad} height={L.length * lh + pad * 1.2} rx={fs * 0.25} className="pl-napis-tlo" />}
            <text
                x={xa} y={y0} fontSize={fs} textAnchor={anchor} dominantBaseline="middle"
                style={{
                    ...F, fill: KOLOR_NAPISU[kolor] ?? v('tekst'), fontStyle: styl === 'kursywa' ? 'italic' : undefined, fontWeight: waga ?? (roz ? 700 : 400),
                    letterSpacing: roz ? fs * 0.45 : undefined, stroke: v('papier'), strokeWidth: tlo ? 0 : fs * 0.32, strokeLinejoin: 'round', paintOrder: 'stroke',
                }}
            >{L.length > 1 ? L.map((w, i) => <tspan key={i} x={xa} dy={i ? lh : 0}>{w || '\u00a0'}</tspan>) : L[0] ?? ''}</text>
        </g>
    )
}

// ---------- całość ----------
export interface OpcjeRysunku {
    prefix: string
    typy: Map<string, TypElementu>
    ukryteTypy?: Set<string>
    /** dodatkowy filtr (np. legenda na stronie) */
    pokaz?: (e: Element) => boolean
    wyroznione?: Set<string>
    wybrane?: Set<string>
    /** „groby rodziny”: te groby podświetlone, pozostałe przygaszone */
    rodzina?: Set<string>
    numery?: Map<string, Numer>
    podklady?: { p: Podklad; adres: string; krycie?: number }[]
    /** w edytorze: ukryte warstwy */
    ukryteWarstwy?: Set<string>
    edycja?: boolean
}

/** Obszar rysunku (viewBox) – obwiednia elementów po obrocie planu, z marginesem. */
export function kadr(plan: Plan, elementy: Element[] = plan.elementy): [number, number, number, number] {
    const u = jednostka(plan), a = rad(plan.obrot), cx = plan.szer / 2, cy = plan.wys / 2
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    const dodaj = ([x, y]: Pkt) => {
        const dx = x - cx, dy = y - cy, X = cx + dx * Math.cos(a) - dy * Math.sin(a), Y = cy + dx * Math.sin(a) + dy * Math.cos(a)
        x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y)
    }
    for (const e of elementy) for (const q of punktyElementu(e.g)) dodaj(q)
    if (x0 === Infinity) { [[0, 0], [plan.szer, 0], [plan.szer, plan.wys], [0, plan.wys]].forEach((q) => dodaj(q as Pkt)) }
    const m = u * 3
    return [x0 - m, y0 - m, x1 - x0 + 2 * m, y1 - y0 + 2 * m]
}

export function RysunekPlanu({ plan, o }: { plan: Plan; o: OpcjeRysunku }) {
    const u = jednostka(plan)
    const { typy, prefix } = o
    const widoczny = (e: Element) => {
        const t = typy.get(e.typ)
        if (!t || o.ukryteTypy?.has(e.typ)) return false
        if (o.ukryteWarstwy?.has(t.warstwa)) return false
        // PH-08 (K3): obiekt znany tylko z legendy – na planie dla czytelnika go nie ma (w edytorze widać miejsce robocze)
        if (e.nieznanePolozenie && !o.edycja) return false
        return o.pokaz ? o.pokaz(e) : true
    }
    // PH-05: gładki obrys obszaru (krzywa przez węzły z ostrymi narożnikami)
    const dGladki = (e: Element) => (e.gladka && e.g.k === 'w' ? sciezka(e.g.p, { zamknieta: true, gladka: true, ostre: e.ostre }) : undefined)
    const dLinii = (e: Element, p: Pkt[], zamknieta = false) => sciezka(p, { zamknieta, gladka: e.gladka, ostre: e.ostre })
    const linieWg = new Map(plan.elementy.filter((e) => e.g.k === 'l').map((e) => [e.id, e]))
    const el = plan.elementy.filter(widoczny)
    const wg = new Map<string, Element[]>()
    for (const e of el) {
        const w = typy.get(e.typ)!.warstwa
        if (!wg.has(w)) wg.set(w, [])
        wg.get(w)!.push(e)
    }
    const napisy: React.ReactNode[] = []
    const obrot = plan.obrot || 0
    const wyrozn = (e: Element) => o.wybrane?.has(e.id) || o.wyroznione?.has(e.id)
    const obrysWyr = (e: Element, pts: Pkt[], zamk = true) => wyrozn(e) ? (
        zamk ? <polygon key={'wyr' + e.id} points={P(pts)} style={{ fill: v('akcent-tlo'), stroke: v('akcent'), strokeWidth: u * (o.wybrane?.has(e.id) ? 0.14 : 0.1) }} pointerEvents="none" />
            : <polyline key={'wyr' + e.id} points={P(pts)} style={{ fill: 'none', stroke: v('akcent'), strokeWidth: u * 0.12, strokeOpacity: 0.7 }} pointerEvents="none" />
    ) : null

    const etykieta = (e: Element, t: TypElementu) => {
        const pokaz = e.pokazNazwe ?? (t.id === 'kwatera' || t.rys === 'napis' || t.rys === 'ulica' || (t.rodzaj === 'obszar' && !t.grob && t.rys !== 'budynek' && t.rys !== 'gosp'))
        const tekst = t.rys === 'napis' ? (e.nazwa || e.opis || '') : e.nazwa
        if (!pokaz || !tekst) return
        // PH-06: napis wzdłuż linii (rzeka, droga) – po krzywej linii, zawsze do czytania; brak linii → napis prosty niżej
        const wz = e.wzdluz ? linieWg.get(e.wzdluz) : undefined
        if (wz && wz.g.k === 'l' && wz.g.p.length > 1) {
            const p0 = wz.g.p, p1 = doCzytania(p0, obrot), odwr = p1 !== p0, n = p0.length
            const idS = `${prefix}-wz-${e.id}`, fs = u * ROZMIAR_STOPNIA[stopienNapisu(e, t.rys === 'napis' ? 3 : 2)]
            const domKolorWz = t.warstwa === 'woda' || typy.get(wz.typ)?.warstwa === 'woda' ? 'woda' : 'tekst'
            napisy.push(
                <g key={'n' + e.id} data-id={o.edycja ? e.id : undefined} data-czesc={o.edycja ? 'etykieta' : undefined}>
                    <path id={idS} d={sciezka(p1, { gladka: wz.gladka, ostre: odwr ? wz.ostre?.map((j) => n - 1 - j) : wz.ostre })} fill="none" />
                    <text fontSize={fs} dominantBaseline="middle" style={/* styl-dynamiczny: wielkość z jednostki planu, kolor z tokenu --pl-* */ { ...F, fill: KOLOR_NAPISU[e.kolor ?? domKolorWz] ?? v('tekst'), fontStyle: (e.styl ?? (domKolorWz === 'woda' ? 'kursywa' : 'zwykly')) === 'kursywa' ? 'italic' : undefined, letterSpacing: e.styl === 'rozstrzelony' ? fs * 0.45 : undefined, stroke: v('papier'), strokeWidth: fs * 0.32, strokeLinejoin: 'round', paintOrder: 'stroke' }}>
                        <textPath href={`#${idS}`} startOffset="50%" textAnchor="middle">{wierszeNapisu(e.styl === 'rozstrzelony' ? tekst.toUpperCase() : tekst).join(' ')}</textPath>
                    </text>
                </g>,
            )
            return
        }
        if (t.rys === 'ulica' && e.g.k === 'l' && e.g.p.length > 1 && !e.etykieta) {
            // PH-22: nazwa ulicy w środku jezdni, wzdłuż najdłuższego odcinka, zawsze do czytania (bez napisu do góry nogami)
            const p = e.g.p
            let i = 0
            for (let j = 1; j < p.length - 1; j++) if (Math.hypot(p[j + 1][0] - p[j][0], p[j + 1][1] - p[j][1]) > Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1])) i = j
            let kat = (Math.atan2(p[i + 1][1] - p[i][1], p[i + 1][0] - p[i][0]) * 180) / Math.PI
            const widziany = kat + obrot
            if (Math.cos((widziany * Math.PI) / 180) < 0) kat += 180
            napisy.push(
                <g key={'n' + e.id} data-id={o.edycja ? e.id : undefined} data-czesc={o.edycja ? 'etykieta' : undefined}>
                    <Napis x={(p[i][0] + p[i + 1][0]) / 2} y={(p[i][1] + p[i + 1][1]) / 2} tekst={tekst} u={u} stopien={stopienNapisu(e, 2)} styl={e.styl ?? 'zwykly'} kolor={e.kolor ?? 'tekst'} kat={kat + obrot} obrotPlanu={obrot} />
                </g>,
            )
            return
        }
        const [cx, cy] = e.g.k === 't' ? [e.g.x, e.g.y] : srodek(e.g)
        const dx = e.etykieta?.dx ?? 0, dy = e.etykieta?.dy ?? (t.rodzaj === 'punkt' ? u * 1.55 : 0)
        if (t.id === 'kwatera') {
            napisy.push(<text key={'n' + e.id} x={cx + dx} y={cy + dy} fontSize={u * 1.7} textAnchor="middle" dominantBaseline="middle" transform={obrot ? `rotate(${-obrot} ${cx + dx} ${cy + dy})` : undefined} style={{ ...F, fontWeight: 700, fill: v('kw-txt') }} pointerEvents="none">{tekst}</text>)
            return
        }
        const domKolor = t.rys === 'las' || t.rys === 'zagajnik' || t.rys === 'kolor' && t.wzor === 'laka' ? 'las' : t.warstwa === 'woda' ? 'woda' : t.warstwa === 'teren' ? 'teren' : 'tekst'
        const domStyl = domKolor === 'tekst' ? 'zwykly' : 'kursywa'
        const st = stopienNapisu(e, t.rys === 'napis' ? 3 : 2), styl = e.styl ?? domStyl, kat = e.g.k === 't' ? e.g.a : 0
        // PH-07 (K2): linia / strzałka od odsuniętej etykiety do punktu elementu (kotwica w obwiedni; brak = środek) – sieroty niemożliwe
        let wsk: React.ReactNode = null
        if (e.wskaznik) {
            const fs = u * ROZMIAR_STOPNIA[st], L = wierszeNapisu(styl === 'rozstrzelony' ? tekst.toUpperCase() : tekst)
            const hw = Math.max(0, ...L.map((w) => szerokoscWiersza(w, fs, styl === 'rozstrzelony'))) / 2 + fs * 0.35, hh = (L.length * fs * 1.2) / 2 + fs * 0.25
            const cel = punktKotwicy(punktyElementu(e.g), e.kotwica, [cx, cy])
            const ln = liniaWskazujaca([cx + dx, cy + dy], hw, hh, cel, e.wskaznik === 'strzalka' ? u * 0.6 : 0, kat - obrot)
            if (ln) wsk = <>
                <path d={ln.d} className="pl-wskaznik" style={/* styl-dynamiczny: grubość z jednostki planu */ { strokeWidth: u * 0.07 }} />
                {ln.grot && <path d={ln.grot} className="pl-wskaznik-grot" />}
            </>
        }
        napisy.push(
            <g key={'n' + e.id} data-id={o.edycja ? e.id : undefined} data-czesc={o.edycja ? 'etykieta' : undefined}>
                {wsk}
                <Napis x={cx + dx} y={cy + dy} tekst={tekst} u={u} stopien={st} styl={styl} kolor={e.kolor ?? domKolor} kat={kat} obrotPlanu={obrot} wyrownanie={e.wyrownanie} tlo={e.tlo} />
            </g>,
        )
    }

    // PH-08: numer legendy w kółku przy elemencie (znak punktowy – z boku znaku, obszar i linia – w środku)
    const numery: React.ReactNode[] = []
    const numerLegendy = (e: Element, t: TypElementu) => {
        if (!e.nrLegendy || e.nieznanePolozenie) return
        const [x0, y0] = e.g.k === 't' ? [e.g.x, e.g.y] : srodek(e.g)
        const r = u * (0.55 + 0.17 * Math.min(3, e.nrLegendy.length))
        // nazwa pokazana w środku obszaru (bez przesunięcia) – numer nad nią, żeby się nie nakładały
        const nazwa = (e.pokazNazwe ?? (t.rodzaj === 'obszar' && !t.grob && t.rys !== 'budynek' && t.rys !== 'gosp')) && !e.etykieta && !e.wzdluz && e.nazwa
        const nadNazwa = nazwa ? (wierszeNapisu(e.nazwa!).length * u * ROZMIAR_STOPNIA[stopienNapisu(e, 2)] * 1.2) / 2 + r * 1.3 : 0
        const [x, y] = t.rodzaj === 'punkt' || e.g.k === 'p' ? [x0 + u * 1.25, y0 - u * 1.25] : [x0, y0 - nadNazwa]
        numery.push(
            <g key={'nr' + e.id} transform={obrot ? `rotate(${-obrot} ${x} ${y})` : undefined}>
                <circle cx={x} cy={y} r={r} className="pl-nr-legendy" style={/* styl-dynamiczny: grubość z jednostki planu */ { strokeWidth: u * 0.08 }} />
                <text x={x} y={y} fontSize={u * 0.85} textAnchor="middle" dominantBaseline="central" className="pl-nr-legendy-txt">{e.nrLegendy}</text>
            </g>,
        )
    }

    const warstwa = (w: string) => {
        // w warstwie: najpierw duże obszary, potem mniejsze (mały staw nie znika pod łąką), na końcu linie i znaki
        const waga = (e: Element) => (e.g.k === 'w' || e.g.k === 'r' ? -pole(punktyElementu(e.g)) : e.g.k === 'l' ? 1 : 2)
        const L = [...(wg.get(w) ?? [])].sort((a, b) => waga(a) - waga(b))
        if (!L.length) return null
        const linie: Linia[] = [], inne: React.ReactNode[] = []
        for (const e of L) {
            const t = typy.get(e.typ)!
            const g = e.g, id = e.id
            const pts = punktyElementu(g)
            etykieta(e, t)
            numerLegendy(e, t)
            const dane = { 'data-id': id } as Record<string, string>
            switch (t.rys) {
                case 'ikona':
                case 'wlasny': {
                    if (t.rodzaj === 'punkt' || g.k === 'p') {
                        const [x, y] = srodek(g)
                        inne.push(<g key={id} {...dane}>{wyrozn(e) && <circle cx={x} cy={y} r={u * 1.3} style={{ fill: v('akcent-tlo'), stroke: v('akcent'), strokeWidth: u * 0.1 }} />}<Znak typ={t} x={x} y={y} s={u * 1.8} kolor={e.stan === 'nie-istnieje' ? v('szary') : undefined} /><circle cx={x} cy={y} r={u * 1.1} style={{ fill: 'transparent' }} /></g>)
                    } else if (t.rodzaj === 'linia' && g.k === 'l') {
                        linie.push({ d: dLinii(e, g.p), szer: szerLinii(e, 'wlasny', u) * (t.wlasny?.linia?.grubosc ?? 1), e, rys: 'wlasny', wl: t.wlasny?.linia })
                    } else {
                        const wl = t.wlasny
                        const dg = dGladki(e)
                        inne.push(<g key={id} {...dane}>{dg ? <path d={dg} style={/* styl-dynamiczny: wzór / kolor własnego typu z ustawień planu */ { fill: wl?.wzor ? `url(#${prefix}-${wl.wzor})` : wl?.tlo ?? v('laka'), stroke: wl?.tlo ? 'none' : undefined }} /> : <polygon points={P(pts)} style={{ fill: wl?.wzor ? `url(#${prefix}-${wl.wzor})` : wl?.tlo ?? v('laka'), stroke: wl?.tlo ? 'none' : undefined }} />}{obrysWyr(e, pts)}</g>)
                    }
                    break
                }
                case 'wzor':
                case 'kolor':
                    inne.push(
                        <g key={id} {...dane}>
                            {dGladki(e)
                                ? <path d={dGladki(e)} style={/* styl-dynamiczny: grubość i kreski z jednostki planu, kolor z tokenu --pl-* */ { fill: wypelnienie(prefix, t.wzor), stroke: t.plot ? v('plot') : t.wzor === 'woda' ? v('woda-brzeg') : 'none', strokeWidth: t.plot ? u * 0.035 : u * 0.03, strokeDasharray: t.plot ? `${u * 0.22} ${u * 0.11} ${u * 0.045} ${u * 0.11}` : undefined }} />
                                : <polygon points={P(pts)} style={{ fill: wypelnienie(prefix, t.wzor), stroke: t.plot ? v('plot') : t.wzor === 'woda' ? v('woda-brzeg') : 'none', strokeWidth: t.plot ? u * 0.035 : u * 0.03, strokeDasharray: t.plot ? `${u * 0.22} ${u * 0.11} ${u * 0.045} ${u * 0.11}` : undefined }} />}
                            {obrysWyr(e, pts)}
                        </g>,
                    )
                    break
                case 'las':
                case 'zagajnik':
                    inne.push(<g key={id} {...dane}><Las e={e} p={pts} u={u} gesty={t.rys === 'las'} prefix={prefix} d={dGladki(e)} />{obrysWyr(e, pts)}</g>)
                    break
                case 'zaglebienie':
                case 'wzniesienie':
                    inne.push(<g key={id} {...dane}><Zaglebienie p={pts} u={u} prefix={prefix} wypukle={t.rys === 'wzniesienie'} />{obrysWyr(e, pts)}</g>)
                    break
                case 'dolina':
                    if (g.k === 'l') inne.push(<g key={id} {...dane}><Dolina pts={g.p} szer={szerLinii(e, 'dolina', u)} u={u} />{obrysWyr(e, g.p, false)}</g>)
                    break
                case 'budynek':
                case 'gosp':
                    inne.push(<g key={id} {...dane}>{dGladki(e) ? <path d={dGladki(e)} style={/* styl-dynamiczny: grubość z jednostki planu, kolor z tokenu --pl-* */ { fill: v(t.rys === 'gosp' ? 'gosp' : 'bud'), stroke: wyrozn(e) ? v('akcent') : 'none', strokeWidth: u * 0.12 }} /> : <polygon points={P(pts)} style={{ fill: v(t.rys === 'gosp' ? 'gosp' : 'bud'), stroke: wyrozn(e) ? v('akcent') : 'none', strokeWidth: u * 0.12 }} />}{e.stan === 'nie-istnieje' && <polygon points={P(pts)} style={{ fill: v('papier'), stroke: v('szary'), strokeWidth: u * 0.05, strokeDasharray: `${u * 0.12} ${u * 0.12}` }} />}</g>)
                    break
                case 'grob': {
                    const wyb = o.wybrane?.has(id), wyr = o.wyroznione?.has(id), rodz = o.rodzina?.has(id)
                    inne.push(
                        <polygon key={id} {...dane} points={P(pts)} style={{
                            fill: wyb || wyr ? v('akcent-tlo') : rodz ? v('rodzina-tlo') : e.stan === 'nie-istnieje' ? 'transparent' : v('grob'),
                            stroke: wyb || wyr ? v('akcent') : rodz ? v('rodzina') : v('grob-obw'), strokeWidth: wyb ? u * 0.12 : wyr || rodz ? u * 0.1 : Math.max(u * 0.03, 0.5),
                            strokeDasharray: e.stan === 'nie-istnieje' ? `${u * 0.1} ${u * 0.08}` : undefined,
                            opacity: o.rodzina && !rodz && !wyb ? 0.35 : undefined,
                        }} />,
                    )
                    break
                }
                case 'droga':
                case 'polna':
                case 'alejka':
                case 'sciezka':
                case 'rzeka':
                case 'ogrodzenie':
                case 'granica':
                case 'ulica':
                case 'kolej':
                case 'wal':
                case 'most':
                    if (g.k === 'l') {
                        const szer = szerLinii(e, t.rys, u)
                        // PH-04: szerokość w węzłach – próbki osi do wstęgi (droga, ulica, alejka, rzeka); inne typy – kreska o największej szerokości
                        const pr = e.s && ['droga', 'ulica', 'alejka', 'rzeka'].includes(t.rys) ? probkiOsi(g.p, e.s, szer, { gladka: e.gladka, ostre: e.ostre }) : undefined
                        linie.push({ d: dLinii(e, g.p), szer: e.s ? Math.max(...e.s) : szer, e, rys: t.rys, pr })
                    } else if (g.k === 'w') linie.push({ d: dLinii(e, g.p, true), szer: szerLinii(e, t.rys, u), e, rys: t.rys })
                    break
                case 'napis':
                    if (g.k === 't' && wyrozn(e)) inne.push(<circle key={id} cx={g.x} cy={g.y} r={u * 0.35} style={{ fill: v('akcent') }} pointerEvents="none" />)
                    break
            }
        }
        return (
            <g key={w} data-warstwa={w}>
                {inne}
                {linie.length > 0 && <SiecDrog linie={linie} u={u} />}
                {linie.filter((l) => !['droga', 'polna', 'alejka', 'ulica'].includes(l.rys)).map((l) => <g key={'l' + l.e.id}><LiniaInna l={l} u={u} /></g>)}
                {/* szersze, niewidoczne pasy do klikania w linie */}
                {linie.map((l) => <path key={'k' + l.e.id} data-id={l.e.id} d={l.d} style={{ fill: 'none', stroke: 'transparent', strokeWidth: Math.max(l.szer, u * 0.6), strokeLinecap: 'round' }} />)}
                {linie.map((l) => obrysWyr(l.e, l.e.g.k === 'l' || l.e.g.k === 'w' ? l.e.g.p : [], false))}
            </g>
        )
    }

    const cx = plan.szer / 2, cy = plan.wys / 2
    return (
        <g transform={obrot ? `rotate(${obrot} ${cx} ${cy})` : undefined}>
            {o.podklady?.map(({ p, adres, krycie }) => (
                <image key={p.id} href={adres} width={p.szer} height={p.wys} transform={`matrix(${p.macierz.join(' ')})`} opacity={krycie ?? p.krycie} preserveAspectRatio="none" pointerEvents="none" />
            ))}
            {KOLEJNOSC_WARSTW.map(warstwa)}
            <Niepewnosc elementy={el} u={u} />
            <g data-warstwa="etykiety" pointerEvents={o.edycja ? undefined : 'none'}>{napisy}</g>
            {numery.length > 0 && <g data-warstwa="legenda" pointerEvents="none">{numery}</g>}
        </g>
    )
}

/** Podziałka i strzałka północy (w układzie viewBox, poza obrotem). */
export function Podzialka({ plan, kadr: [x, y, w, h] }: { plan: Plan; kadr: [number, number, number, number] }) {
    const u = jednostka(plan)
    // PH-11: szkic schematyczny nie udaje pomiaru – bez paska skali, nawet gdy ustawiono miarkę
    if (!plan.skala || plan.dokladnosc === 'schematyczny') return null
    const cel = (w * 0.18) * plan.skala
    const kroki = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000]
    const m = kroki.reduce((b, k) => (k <= cel ? k : b), kroki[0])
    const dl = m / plan.skala, x0 = x + u * 1.5, y0 = y + h - u * 1.6
    const st: React.CSSProperties = { stroke: v('szary'), strokeWidth: u * 0.06, fill: 'none' }
    return (
        <g pointerEvents="none">
            <path d={`M${x0} ${y0 - u * 0.3}v${u * 0.3}h${dl}v${-u * 0.3}M${x0 + dl / 2} ${y0}v${-u * 0.2}`} style={st} />
            <text x={x0} y={y0 + u * 0.8} fontSize={u * 0.7} style={{ ...F, fill: v('szary') }}>0</text>
            <text x={x0 + dl} y={y0 + u * 0.8} fontSize={u * 0.7} textAnchor="end" style={{ ...F, fill: v('szary') }}>{m} m</text>
            <g transform={`translate(${x + w - u * 1.8} ${y + h - u * 3})`}>
                <path d={`M0 ${u * 1.6}V0M${-u * 0.4} ${u * 0.5}L0 0L${u * 0.4} ${u * 0.5}`} style={st} />
                <text x={0} y={u * 2.4} fontSize={u * 0.7} textAnchor="middle" style={{ ...F, fill: v('szary') }}>N</text>
            </g>
        </g>
    )
}
