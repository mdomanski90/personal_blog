'use client'

// Dane obok mapy; „rozszerz” – mapa na całą szerokość kolumny, dane zjeżdżają pod spód (wybór zapamiętany);
// „pełny ekran” – mapa na całe okno.

import * as React from 'react'

const przycisk = 'border border-[#d6d1c6] dark:border-[#4b5563] bg-[#fdfcf9] dark:bg-[#111827] text-current rounded-[7px]'
const KLUCZ = 'mapa-rozszerzona'

export default function InfoZMapa({ info, mapa, wysokosc = 320 }: { info: React.ReactNode; mapa: React.ReactNode; wysokosc?: number }) {
    const [szeroki, ustawSzeroki] = React.useState(false)
    const [pelny, ustawPelny] = React.useState(false)
    const ramka = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => { try { if (localStorage.getItem(KLUCZ) === '1') ustawSzeroki(true) } catch { /* brak dostępu */ } }, [])
    const przelacz = () => { const n = !szeroki; ustawSzeroki(n); try { localStorage.setItem(KLUCZ, n ? '1' : '0') } catch { /* brak dostępu */ } }
    const zamknij = React.useCallback(() => { ustawPelny(false); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}) }, [])
    React.useEffect(() => {
        if (!pelny) return
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') zamknij() }
        const wyjscie = () => { if (!document.fullscreenElement) ustawPelny(false) }
        document.addEventListener('keydown', esc); document.addEventListener('fullscreenchange', wyjscie)
        const o = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.removeEventListener('keydown', esc); document.removeEventListener('fullscreenchange', wyjscie); document.body.style.overflow = o }
    }, [pelny, zamknij])
    return (
        <div className={`info-z-mapa${szeroki ? ' info-z-mapa-szeroka' : ''}`}>
            <div className="info-z-mapa-info">{info}</div>
            <div ref={ramka} className={`info-z-mapa-mapa${pelny ? ' widok-pelny' : ''}`}>
                <div className="flex items-center" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    {!pelny && <button type="button" onClick={przelacz} aria-pressed={szeroki} className={`${przycisk} info-z-mapa-rozszerz`} style={{ height: 26, padding: '0 9px', fontSize: 12.5 }} title={szeroki ? 'mapa obok danych' : 'mapa na całą szerokość, dane pod spodem'}>{szeroki ? 'zwęź' : 'rozszerz'}</button>}
                    <button type="button" onClick={pelny ? zamknij : () => { ustawPelny(true); ramka.current?.requestFullscreen?.().catch(() => {}) }} className={przycisk} style={{ height: 26, padding: '0 9px', fontSize: 12.5 }}>{pelny ? 'zamknij (Esc)' : 'pełny ekran'}</button>
                </div>
                <div style={{ position: 'relative', height: pelny ? 'calc(100dvh - 60px)' : szeroki ? 'min(70vh, 620px)' : wysokosc }}><div style={{ position: 'absolute', inset: 0 }}>{mapa}</div></div>
            </div>
        </div>
    )
}
