// Mała próbka typu do legendy, katalogu i palety edytora (24×16).
import * as React from 'react'
import type { TypElementu } from '@/lib/plany/typy'
import { WZORY } from '@/lib/plany/typy'
import { Wzory, Znak } from './Rysunek'

const v = (n: string) => `var(--pl-${n})`

/** Wzory dla próbek – raz na stronę (ukryty SVG). */
export function WzoryProbek({ prefix }: { prefix: string }) {
    return (
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
            <defs><Wzory prefix={prefix} u={7} /></defs>
        </svg>
    )
}

export function Probka({ typ, prefix, w = 26, h = 18 }: { typ: TypElementu; prefix: string; w?: number; h?: number }) {
    const okr: React.CSSProperties = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
    const lin = (stroke: string, sw: number, dash?: string, pod?: [string, number]) => (
        <>
            {pod && <line x1="3" y1={h / 2} x2={w - 3} y2={h / 2} style={{ ...okr, stroke: pod[0], strokeWidth: pod[1] }} />}
            <line x1="3" y1={h / 2} x2={w - 3} y2={h / 2} style={{ ...okr, stroke, strokeWidth: sw, strokeDasharray: dash }} />
        </>
    )
    let tresc: React.ReactNode
    const wl = typ.wlasny
    switch (typ.rys) {
        case 'ikona': tresc = <Znak typ={typ} x={w / 2} y={h / 2} s={h + 2} halo={false} />; break
        case 'wlasny':
            if (typ.rodzaj === 'punkt') tresc = <Znak typ={typ} x={w / 2} y={h / 2} s={h + 2} halo={false} />
            else if (typ.rodzaj === 'linia') tresc = lin(wl?.linia?.kolor ?? v('tekst'), 1.6, wl?.linia?.kreski === 'przerywana' ? '4 2.5' : wl?.linia?.kreski === 'kropkowana' ? '1 2' : undefined)
            else tresc = <rect x="1" y="2" width={w - 2} height={h - 4} rx="2" style={{ fill: wl?.wzor ? `url(#${prefix}-${wl.wzor})` : wl?.tlo ?? v('laka') }} />
            break
        case 'wzor':
        case 'kolor': {
            const wz = typ.wzor ? WZORY[typ.wzor] : undefined
            tresc = <rect x="1" y="2" width={w - 2} height={h - 4} rx="2" style={{ fill: wz?.rys ? `url(#${prefix}-${typ.wzor})` : wz?.tlo ?? v('laka'), stroke: typ.plot ? v('plot') : typ.wzor === 'woda' ? v('woda-brzeg') : 'none', strokeWidth: 0.8, strokeDasharray: typ.plot ? '4 2 1 2' : undefined }} />
            break
        }
        case 'las':
        case 'zagajnik': {
            const kola = typ.rys === 'las' ? [[6, 6, 4.5], [14, 5, 4.5], [21, 7, 4], [9, 12, 4.5], [17, 12, 4.5]] : [[7, 7, 3], [15, 6, 3], [11, 12, 3], [20, 11, 3]]
            tresc = <><rect x="1" y="2" width={w - 2} height={h - 4} rx="2" style={{ fill: v('las') }} />{kola.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} style={{ fill: v(['korona1', 'korona2', 'korona3'][i % 3]), stroke: v('las-brzeg'), strokeWidth: 0.5 }} />)}</>
            break
        }
        case 'zaglebienie':
        case 'wzniesienie': {
            const wzn = typ.rys === 'wzniesienie', kol = wzn ? v('teren-wzn') : v('teren')
            tresc = <><ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 3} ry={h / 2 - 3} style={{ fill: wzn ? v('teren-wzn-tlo') : v('teren-cien'), stroke: kol, strokeWidth: 0.8 }} />
                <path d={wzn ? 'M13 3.5V1M5 9H2.5M24 9h-2.5M13 14.5V17M7.5 4.8 6 3.5M18.5 4.8 20 3.5' : 'M13 3.5V6M5 9h2.5M21 9h-2.5M13 14.5V12M7.5 4.8 9 6M18.5 4.8 17 6'} style={{ ...okr, stroke: kol, strokeWidth: 0.8 }} /></>
            break
        }
        case 'dolina':
            tresc = <><path d="M2 6Q13 9 24 14L24 17Q12 13 2 10Z" style={{ fill: v('teren-jasny') }} /><path d="M2 6Q13 9 24 14M2 10Q12 13 24 17" style={{ ...okr, stroke: v('teren'), strokeWidth: 0.8 }} /><path d="M6 7l.5 1.6M11 8.4l.4 1.6M16 10.3l.2 1.5M20 12.2l0 1.5" style={{ ...okr, stroke: v('teren'), strokeWidth: 0.7 }} /></>
            break
        case 'budynek': tresc = <rect x={w / 2 - 5} y="2" width="10" height={h - 4} style={{ fill: v('bud') }} />; break
        case 'gosp': tresc = <rect x="2" y={h / 2 - 3} width={w - 4} height="6" style={{ fill: v('gosp') }} />; break
        case 'grob': tresc = <><rect x="6" y="2" width="5.5" height={h - 4} style={{ fill: v('grob'), stroke: v('grob-obw'), strokeWidth: 0.8 }} /><rect x="14.5" y="2" width="5.5" height={h - 4} style={{ fill: v('grob'), stroke: v('grob-obw'), strokeWidth: 0.8 }} /></>; break
        case 'droga': tresc = lin(v('droga'), 4, undefined, [v('droga-obw'), 6]); break
        case 'alejka': tresc = lin(v('alejka'), 4, undefined, [v('alejka-obw'), 5.6]); break
        case 'polna': tresc = lin(v('polna'), 1.3, '4.5 2.5', [v('polna-tlo'), 5]); break
        case 'sciezka': tresc = lin(v('polna'), 1.1, '1 2.2'); break
        case 'rzeka': tresc = lin(v('rzeka'), 3); break
        case 'ogrodzenie': tresc = lin(v('plot'), 1.2, '4 2 1 2'); break
        case 'granica': tresc = lin(v('szary'), 1, '4.5 2.5'); break
        case 'napis': tresc = <text x={w / 2} y={h / 2 + 4} fontSize="11" textAnchor="middle" style={{ fill: v('tekst'), fontStyle: 'italic' }}>Aa</text>; break
    }
    return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ flexShrink: 0, overflow: 'visible' }}>{tresc}</svg>
}
