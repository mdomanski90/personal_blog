'use client'
// Skan obok tekstu: przybliżanie (przyciski, kółko z Ctrl, dwa palce), przesuwanie, obrót, dopasowanie, pełny ekran.
import * as React from 'react'

const RAMKA = 'border border-[#d1d5db] dark:border-[#4b5563]'
const przycisk: React.CSSProperties = { height: 'calc(28px * var(--font-scale, 1))', padding: '0 9px', fontSize: 'calc(13px * var(--font-scale, 1))', background: 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit' }

export default function PodgladSkanu({ src, alt }: { src: string; alt: string }) {
    const [skala, ustawSkale] = React.useState(1)
    const [obrot, ustawObrot] = React.useState(0)
    const [poz, ustawPoz] = React.useState<[number, number]>([0, 0])
    const [pelny, ustawPelny] = React.useState(false)
    const ramka = React.useRef<HTMLDivElement>(null)
    const wsk = React.useRef(new Map<number, [number, number]>())
    const start = React.useRef<{ x: number; y: number; poz: [number, number]; d?: number; s?: number } | null>(null)
    const dopasuj = () => { ustawSkale(1); ustawPoz([0, 0]) }
    const zoom = (f: number) => ustawSkale((s) => Math.min(8, Math.max(0.5, s * f)))
    React.useEffect(() => {
        const el = ramka.current
        if (!el) return
        const k = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey && !pelny) return; e.preventDefault(); zoom(e.deltaY > 0 ? 1 / 1.15 : 1.15) }
        el.addEventListener('wheel', k, { passive: false })
        return () => el.removeEventListener('wheel', k)
    }, [pelny])
    React.useEffect(() => {
        if (!pelny) return
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') ustawPelny(false) }
        window.addEventListener('keydown', esc)
        return () => window.removeEventListener('keydown', esc)
    }, [pelny])
    const down = (e: React.PointerEvent) => {
        wsk.current.set(e.pointerId, [e.clientX, e.clientY])
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        const p = [...wsk.current.values()]
        start.current = p.length === 2 ? { x: 0, y: 0, poz, d: Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]), s: skala } : { x: e.clientX, y: e.clientY, poz }
    }
    const move = (e: React.PointerEvent) => {
        if (!wsk.current.has(e.pointerId) || !start.current) return
        wsk.current.set(e.pointerId, [e.clientX, e.clientY])
        const p = [...wsk.current.values()], s = start.current
        if (p.length === 2 && s.d) { ustawSkale(Math.min(8, Math.max(0.5, (s.s ?? 1) * Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) / s.d))); return }
        ustawPoz([s.poz[0] + e.clientX - s.x, s.poz[1] + e.clientY - s.y])
    }
    const up = (e: React.PointerEvent) => { wsk.current.delete(e.pointerId); start.current = wsk.current.size ? { x: [...wsk.current.values()][0][0], y: [...wsk.current.values()][0][1], poz } : null }
    return (
        <div className={pelny ? 'fixed inset-0 z-50 bg-[#fbfaf7] dark:bg-[#0b1020] flex flex-col' : 'flex flex-col'} style={{ gap: 6, padding: pelny ? 12 : 0 }}>
            <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
                <span className={`inline-flex rounded-[7px] overflow-hidden ${RAMKA}`}>
                    <button type="button" style={przycisk} onClick={() => zoom(1 / 1.25)} aria-label="pomniejsz">−</button>
                    <span style={{ ...przycisk, display: 'inline-flex', alignItems: 'center', borderLeft: '1px solid #d1d5db', borderRight: '1px solid #d1d5db', minWidth: 52, justifyContent: 'center' }}>{Math.round(skala * 100)}%</span>
                    <button type="button" style={przycisk} onClick={() => zoom(1.25)} aria-label="powiększ">+</button>
                </span>
                <button type="button" className={`rounded-[7px] ${RAMKA}`} style={przycisk} onClick={dopasuj}>dopasuj</button>
                <button type="button" className={`rounded-[7px] ${RAMKA}`} style={przycisk} onClick={() => ustawObrot((o) => (o + 90) % 360)}>obróć</button>
                <button type="button" className={`rounded-[7px] ${RAMKA}`} style={przycisk} onClick={() => ustawPelny((p) => !p)}>{pelny ? 'zamknij ✕' : 'pełny ekran ⤢'}</button>
                <a href={src} download className="lowercase" style={{ fontSize: 'calc(13px * var(--font-scale, 1))', marginLeft: 'auto' }}>pobierz plik</a>
            </div>
            <div ref={ramka} className={`${RAMKA} rounded-[8px] overflow-hidden relative bg-muted`} style={{ height: pelny ? '100%' : 'min(70vh, 640px)', flex: pelny ? 1 : undefined, touchAction: 'none', cursor: 'grab' }}
                onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onDoubleClick={() => zoom(1.6)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt} draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', transform: `translate(${poz[0]}px, ${poz[1]}px) scale(${skala}) rotate(${obrot}deg)`, transition: start.current ? 'none' : 'transform .12s', userSelect: 'none' }} />
            </div>
            <span className="text-gray-500" style={{ fontSize: 'calc(12px * var(--font-scale, 1))' }}>przeciągnij, by przesunąć · Ctrl + kółko, dwuklik albo dwa palce – powiększenie</span>
        </div>
    )
}
