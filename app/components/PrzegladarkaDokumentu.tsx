'use client'

// Przeglądarka skanów dokumentu (OpenSeadragon): strony ‹ ›, miniatury, przybliżanie (przyciski, dwa palce,
// kółko na pełnym ekranie), obrót, dopasowanie. Kliknięcie w skan – pełny ekran; Esc albo ✕ zamyka.

import * as React from 'react'
import type OpenSeadragon from 'openseadragon'

export interface StronaPodgladu { adres: string; podpis?: string }

// strony z panelu mają pomniejszone kopie (?w=…), stary pojedynczy plik – tylko oryginał
const zKopiami = (a: string) => a.startsWith('/pliki/strony/')
export const obrazStrony = (a: string, w: 160 | 480 | 1200 | 2400) => (zKopiami(a) ? `${a}?w=${w}` : a)

export function ileStron(n: number): string {
    if (n === 1) return '1 strona'
    const d = n % 10, s = n % 100
    return d >= 2 && d <= 4 && (s < 12 || s > 14) ? `${n} strony` : `${n} stron`
}

export default function PrzegladarkaDokumentu({ strony, tytul, wysokosc = 'min(75vh, 720px)', pelnyNaStart = false, onZamknij, startStrona = 0 }: {
    strony: StronaPodgladu[]
    tytul: string
    wysokosc?: string
    /** otwarta od razu na pełnym ekranie (np. z wpisu) – zamknięcie wywołuje onZamknij */
    pelnyNaStart?: boolean
    onZamknij?: () => void
    startStrona?: number
}) {
    const ramka = React.useRef<HTMLDivElement>(null)
    const pole = React.useRef<HTMLDivElement>(null)
    const widz = React.useRef<OpenSeadragon.Viewer | null>(null)
    const [strona, ustawStrone] = React.useState(startStrona)
    const [skala, ustawSkale] = React.useState(100)
    const [obrot, ustawObrot] = React.useState(0)
    const [pelny, ustawPelny] = React.useState(pelnyNaStart)
    const pelnyRef = React.useRef(pelny)
    pelnyRef.current = pelny
    const n = strony.length

    const otworz = React.useCallback(() => {
        ustawPelny(true)
        ramka.current?.requestFullscreen?.().catch(() => {})
    }, [])
    const zamknij = React.useCallback(() => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        if (onZamknij) onZamknij()
        else ustawPelny(false)
    }, [onZamknij])

    React.useEffect(() => {
        let zywy = true
        import('openseadragon').then(({ default: OSD }) => {
            if (!zywy || !pole.current) return
            const v = OSD({
                element: pole.current,
                tileSources: strony.map((s) => ({ type: 'image', url: obrazStrony(s.adres, 2400) })) as unknown as OpenSeadragon.Options['tileSources'],
                sequenceMode: true,
                initialPage: Math.min(startStrona, Math.max(0, n - 1)),
                showNavigationControl: false,
                showSequenceControl: false,
                visibilityRatio: 0.6,
                constrainDuringPan: true,
                minZoomImageRatio: 0.6,
                maxZoomPixelRatio: 3,
                animationTime: 0.35,
                gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true, scrollToZoom: pelnyRef.current },
                gestureSettingsTouch: { clickToZoom: false, dblClickToZoom: true, pinchToZoom: true },
            })
            const odswiezSkale = () => {
                const vp = v.viewport
                if (vp) ustawSkale(Math.round((vp.getZoom(true) / vp.getHomeZoom()) * 100))
            }
            v.addHandler('zoom', odswiezSkale)
            v.addHandler('open', () => { odswiezSkale(); v.viewport.setRotation(0); ustawObrot(0) })
            v.addHandler('page', (e) => ustawStrone((e as unknown as { page: number }).page))
            // krótkie kliknięcie (nie przeciągnięcie) w skan – pełny ekran
            v.addHandler('canvas-click', (e) => { if ((e as unknown as { quick: boolean }).quick && !pelnyRef.current) otworz() })
            widz.current = v
        })
        return () => { zywy = false; widz.current?.destroy(); widz.current = null }
        // przeglądarka tworzona raz dla danego zestawu stron
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [strony.map((s) => s.adres).join('|')])

    // pełny ekran: kółko przybliża, Esc zamyka, strzałki zmieniają stronę; przewijanie strony pod spodem wyłączone
    React.useEffect(() => {
        const v = widz.current
        // typy nie opisują tego pola, ale OpenSeadragon czyta je przy każdym ruchu kółkiem
        const gm = (v as unknown as { gestureSettingsMouse?: { scrollToZoom: boolean } } | null)?.gestureSettingsMouse
        if (gm) gm.scrollToZoom = pelny
        // po zmianie rozmiaru okna przeglądarki skan od nowa dopasowany do pola
        const t = window.setTimeout(() => widz.current?.viewport?.goHome(true), 80)
        if (!pelny) return () => window.clearTimeout(t)
        const k = (e: KeyboardEvent) => {
            if (e.key === 'Escape') zamknij()
            else if (e.key === 'ArrowRight') idz(1)
            else if (e.key === 'ArrowLeft') idz(-1)
        }
        const wyjscie = () => { if (!document.fullscreenElement && pelnyRef.current && !pelnyNaStart) ustawPelny(false) }
        document.addEventListener('keydown', k)
        document.addEventListener('fullscreenchange', wyjscie)
        const o = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { window.clearTimeout(t); document.removeEventListener('keydown', k); document.removeEventListener('fullscreenchange', wyjscie); document.body.style.overflow = o }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pelny, zamknij])

    React.useEffect(() => {
        if (pelnyNaStart) ramka.current?.requestFullscreen?.().catch(() => {})
    }, [pelnyNaStart])

    const idz = (d: number) => { const v = widz.current; if (!v) return; const c = Math.min(n - 1, Math.max(0, v.currentPage() + d)); v.goToPage(c) }
    const naStrone = (i: number) => widz.current?.goToPage(i)
    const przybliz = (f: number) => { const vp = widz.current?.viewport; if (!vp) return; vp.zoomBy(f); vp.applyConstraints() }
    const obroc = () => { const vp = widz.current?.viewport; if (!vp) return; const r = (obrot + 90) % 360; vp.setRotation(r); ustawObrot(r) }
    const dopasuj = () => widz.current?.viewport.goHome()
    const podpis = strony[strona]?.podpis

    return (
        <div ref={ramka} className={`dok${pelny ? ' dok-pelny' : ''}`}>
            <div className="dok-pasek" role="toolbar" aria-label="przeglądanie dokumentu">
                {pelny && <b className="dok-tytul">{tytul}</b>}
                {n > 1 && (
                    <span className="dok-grupa">
                        <button type="button" onClick={() => idz(-1)} disabled={strona === 0} aria-label="poprzednia strona">‹</button>
                        <span className="dok-stan" aria-label={`strona ${strona + 1} z ${n}`}>{strona + 1} / {n}</span>
                        <button type="button" onClick={() => idz(1)} disabled={strona >= n - 1} aria-label="następna strona">›</button>
                    </span>
                )}
                <span className="dok-grupa">
                    <button type="button" onClick={() => przybliz(1 / 1.3)} aria-label="pomniejsz">−</button>
                    <span className="dok-stan dok-skala">{skala}%</span>
                    <button type="button" onClick={() => przybliz(1.3)} aria-label="powiększ">+</button>
                </span>
                <span className="dok-grupa">
                    <button type="button" onClick={dopasuj}>dopasuj</button>
                    <button type="button" onClick={obroc}>obróć</button>
                    {pelny
                        ? <button type="button" onClick={zamknij} aria-label="zamknij pełny ekran">zamknij ✕</button>
                        : <button type="button" onClick={otworz}>pełny ekran ⤢</button>}
                </span>
            </div>
            <div ref={pole} className="dok-pole" style={pelny ? undefined : { height: wysokosc }} aria-label={`skan: ${tytul}${n > 1 ? `, strona ${strona + 1} z ${n}` : ''}`} role="img" />
            {(podpis || n > 1) && (
                <div className="dok-dol">
                    {n > 1 && (
                        <div className="dok-miniatury">
                            {strony.map((s, i) => (
                                <button key={s.adres} type="button" onClick={() => naStrone(i)} aria-current={i === strona} aria-label={`strona ${i + 1}${s.podpis ? `: ${s.podpis}` : ''}`}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={obrazStrony(s.adres, 160)} alt="" loading="lazy" />
                                </button>
                            ))}
                        </div>
                    )}
                    {podpis && <span className="dok-podpis">{podpis}</span>}
                </div>
            )}
        </div>
    )
}
