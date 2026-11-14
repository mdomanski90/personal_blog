'use client'

// Mała mapa w nagłówku karty (w miejscu zdjęcia) z przyciskiem „pełny ekran” – mapa na całe okno, Esc zamyka.

import * as React from 'react'

export default function MapaKarty({ mapa, wysokosc = 200, podpis }: { mapa: React.ReactNode; wysokosc?: number; podpis?: React.ReactNode }) {
    const [pelny, ustawPelny] = React.useState(false)
    const ramka = React.useRef<HTMLDivElement>(null)
    const zamknij = React.useCallback(() => { ustawPelny(false); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}) }, [])
    React.useEffect(() => {
        if (!pelny) return
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') zamknij() }
        const wyjscie = () => { if (!document.fullscreenElement) ustawPelny(false) }
        document.addEventListener('keydown', esc)
        document.addEventListener('fullscreenchange', wyjscie)
        const o = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.removeEventListener('keydown', esc); document.removeEventListener('fullscreenchange', wyjscie); document.body.style.overflow = o }
    }, [pelny, zamknij])
    return (
        <figure className="karta-mapa">
            <div ref={ramka} className={`karta-mapa-ramka${pelny ? ' widok-pelny' : ''}`}>
                {pelny && (
                    <div className="flex justify-end" style={{ padding: 6 }}>
                        <button type="button" onClick={zamknij} className="karta-mapa-przycisk">zamknij (Esc)</button>
                    </div>
                )}
                <div style={{ position: 'relative', height: pelny ? 'calc(100dvh - 48px)' : `calc(${wysokosc}px * var(--font-scale, 1))` }}>
                    <div style={{ position: 'absolute', inset: 0 }}>{mapa}</div>
                </div>
            </div>
            <figcaption>
                {podpis}
                {podpis && ' · '}
                <button type="button" className="odn" style={{ background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }}
                    onClick={() => { ustawPelny(true); ramka.current?.requestFullscreen?.().catch(() => {}) }}>pełny ekran ⤢</button>
            </figcaption>
        </figure>
    )
}
