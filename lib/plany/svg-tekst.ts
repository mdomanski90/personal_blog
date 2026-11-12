// Zamiana prostego drzewa elementów React (czyste komponenty bez stanu – jak rysunek planu) na tekst SVG.
// Next.js nie pozwala używać react-dom/server w trasach, a podgląd planu ma być zwykłym plikiem SVG.
import * as React from 'react'

const BEZ_ZMIANY = new Set(['viewBox', 'preserveAspectRatio', 'patternUnits', 'gradientUnits', 'clipPathUnits', 'patternTransform', 'gradientTransform'])
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
const BEZ_JEDNOSTEK = new Set(['opacity', 'fillOpacity', 'strokeOpacity', 'stopOpacity', 'fontWeight', 'strokeWidth', 'fontSize', 'letterSpacing', 'strokeMiterlimit'])

function styl(o: Record<string, unknown>): string {
    return Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${kebab(k)}:${typeof v === 'number' && !BEZ_JEDNOSTEK.has(k) ? v : v}`).join(';')
}

export function doSvg(w: React.ReactNode): string {
    if (w === null || w === undefined || typeof w === 'boolean') return ''
    if (typeof w === 'string') return esc(w)
    if (typeof w === 'number') return String(w)
    if (Array.isArray(w)) return w.map(doSvg).join('')
    if (!React.isValidElement(w)) return ''
    const el = w as React.ReactElement<Record<string, unknown>>
    const props = el.props ?? {}
    if (typeof el.type === 'function') return doSvg((el.type as (p: unknown) => React.ReactNode)(props))
    if ((el.type as unknown) === React.Fragment) return doSvg(props.children as React.ReactNode)
    const tag = String(el.type)
    let atr = ''
    for (const [k, v] of Object.entries(props)) {
        if (k === 'children' || k === 'key' || v === undefined || v === null || v === false || typeof v === 'function') continue
        if (k === 'style' && typeof v === 'object') { const s = styl(v as Record<string, unknown>); if (s) atr += ` style="${esc(s)}"`; continue }
        const nazwa = k === 'className' ? 'class' : k.startsWith('data-') || k.startsWith('aria-') || BEZ_ZMIANY.has(k) ? k : kebab(k)
        atr += ` ${nazwa}="${esc(String(v))}"`
    }
    const dzieci = doSvg(props.children as React.ReactNode)
    if (tag === 'style') return `<style>${String(props.children ?? '')}</style>`
    return dzieci ? `<${tag}${atr}>${dzieci}</${tag}>` : `<${tag}${atr}/>`
}
