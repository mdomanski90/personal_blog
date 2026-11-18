'use client'

// Mała mapa w nagłówku karty (w miejscu zdjęcia). P4 (MAP-05): przyciski „+ − ⤢” w jednej grupie w rogu mapy (rysuje je mapa –
// KontekstMapyKarty), pod mapą podpis i „legenda”. Pełny ekran: mapa na całe okno, Esc zamyka, fokus wraca na przycisk ⤢.

import * as React from 'react'
import { useFokusPowrotu } from '@/lib/ruch'
import { KontekstMapyKarty } from './KontekstMapyKarty'

export default function MapaKarty({ mapa, wysokosc = 200, podpis, legenda }: { mapa: React.ReactNode; wysokosc?: number; podpis?: React.ReactNode; legenda?: React.ReactNode }) {
    const [pelny, ustawPelny] = React.useState(false)
    const ramka = React.useRef<HTMLDivElement>(null)
    const zamknij = React.useCallback(() => { ustawPelny(false); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}) }, [])
    const otworz = React.useCallback(() => { ustawPelny(true); ramka.current?.requestFullscreen?.().catch(() => {}) }, [])
    const przelacz = React.useCallback(() => (pelny ? zamknij() : otworz()), [pelny, zamknij, otworz])
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
    // zasada 5.3: po zamknięciu fokus wraca na przycisk ⤢, którym otwarto (mapa zostaje w tym samym miejscu drzewa)
    useFokusPowrotu(pelny, { zapasowy: () => ramka.current?.querySelector<HTMLElement>('.mapa-sterowanie button:last-child') })
    const kontekst = React.useMemo(() => ({ pelny, przelacz }), [pelny, przelacz])
    return (
        <figure className="karta-mapa">
            <div ref={ramka} className={`karta-mapa-ramka${pelny ? ' widok-pelny' : ''}`}>
                {pelny && (
                    <div className="flex justify-end karta-mapa-pasek">
                        <button type="button" onClick={zamknij} className="k-btn k-btn--s">zamknij (Esc)</button>
                    </div>
                )}
                <div className="karta-mapa-pole" style={{ height: pelny ? 'calc(100dvh - 48px)' : `calc(${wysokosc}px * var(--font-scale, 1))` }}>
                    <div className="karta-mapa-wnetrze">
                        <KontekstMapyKarty.Provider value={kontekst}>{mapa}</KontekstMapyKarty.Provider>
                    </div>
                </div>
            </div>
            <figcaption>
                {podpis && <span>{podpis}</span>}
                {podpis && legenda && <span aria-hidden="true">·</span>}
                {legenda}
            </figcaption>
        </figure>
    )
}
