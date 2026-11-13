'use client'

// Objaśnienia na skanie w przeglądarce dokumentu (lekka warstwa zamiast Annotoriousa po stronie czytelnika):
// prostokąty na skanie (SVG nad OpenSeadragonem) i notatki na marginesie z kreską do prostokąta
// albo numerki na skanie + lista. Położenie liczone przy każdym ruchu widoku (przybliżanie, przesuwanie, obrót).

import * as React from 'react'
import type OpenSeadragon from 'openseadragon'
import { RODZAJE_OBJASNIEN, type ObjasnienieWidoku } from '@/lib/objasnienia-widok'

export type TrybObjasnien = 'margines' | 'numery' | 'ukryj'
export type ObjasnienieNaStronie = ObjasnienieWidoku & { nr: number }

const NS = 'http://www.w3.org/2000/svg'
const ODSTEP = 8

// [...] i [uzupełnienia] w odczycie – przygaszone, jak w transkrypcjach we wpisach
export function TekstZrodla({ tekst }: { tekst: string }) {
    const czesci = tekst.split(/((?<!\[)\[(?!\[)[^\[\]]*\](?!\]))/g)
    return <>{czesci.map((c, i) => (i % 2 ? <span key={i} className="uzupelnienie">{c}</span> : c))}</>
}

export function Notka({ o, aktywna, wskazana, onKlik, onNad, pelna, wezel, role }: {
    o: ObjasnienieNaStronie
    aktywna: boolean
    wskazana: boolean
    onKlik: () => void
    onNad: (nad: boolean) => void
    /** zawsze pełny tekst (lista); na marginesie – skrócony, cały po kliknięciu */
    pelna?: boolean
    wezel?: (el: HTMLDivElement | null) => void
    role?: string
}) {
    const r = RODZAJE_OBJASNIEN[o.rodzaj]
    return (
        <div ref={wezel} role={role} className={`dok-obj-notka dok-obj-${o.rodzaj}${aktywna ? ' aktywna' : ''}${wskazana ? ' wskazana' : ''}${pelna ? ' pelna' : ''}`}
            onMouseEnter={() => onNad(true)} onMouseLeave={() => onNad(false)}>
            <button type="button" className="dok-obj-glowka" onClick={onKlik} aria-expanded={aktywna}>
                <span className="dok-obj-nr">{o.nr}</span>
                <span>{r.nazwa}{o.jezyk ? ` · ${o.jezyk}` : ''}</span>
            </button>
            {o.tekst && <div className="dok-obj-tekst" onClick={onKlik}><TekstZrodla tekst={o.tekst} /></div>}
            {(aktywna || pelna) && (o.powiazania.length > 0 || o.opracowal || o.weryfikacja) && (
                <div className="dok-obj-wiecej">
                    {o.powiazania.length > 0 && (
                        <span className="dok-obj-powiazania">{o.powiazania.map((p, i) => <React.Fragment key={p.adres}>{i > 0 && ', '}<a href={p.adres}>{p.nazwa}</a></React.Fragment>)}</span>
                    )}
                    {o.opracowal && <span className="dok-obj-kto">opracował(a): {o.opracowal}</span>}
                    {o.weryfikacja && (
                        <details className="dok-obj-weryfikacja">
                            <summary>weryfikacja w źródłach</summary>
                            <div>{o.weryfikacja}</div>
                        </details>
                    )}
                </div>
            )}
        </div>
    )
}

export interface ApiWarstwy {
    /** objaśnienie pod punktem (piksele względem pola przeglądarki) */
    trafienie: (x: number, y: number) => string | null
    /** przybliżenie do prostokąta objaśnienia */
    pokaz: (id: string) => void
}

export default function ObjasnieniaSkanu({ widz, osd, pole, obszar, lista, tryb, pelny, aktywne, wskazane, ustawAktywne, ustawWskazane, api, wersja }: {
    widz: React.RefObject<OpenSeadragon.Viewer | null>
    osd: React.RefObject<typeof OpenSeadragon | null>
    pole: React.RefObject<HTMLDivElement | null>
    obszar: React.RefObject<HTMLDivElement | null>
    lista: ObjasnienieNaStronie[]
    tryb: TrybObjasnien
    pelny: boolean
    aktywne: string | null
    wskazane: string | null
    ustawAktywne: (id: string | null) => void
    ustawWskazane: (id: string | null) => void
    api: React.MutableRefObject<ApiWarstwy | null>
    /** zmienia się po otwarciu nowej strony skanu */
    wersja: number
}) {
    const svg = React.useRef<SVGSVGElement>(null)
    const idPrzyciecia = `dok-obj-${React.useId().replace(/:/g, '')}`
    const notki = React.useRef(new Map<string, HTMLDivElement>())
    const kolumny = React.useRef<{ lewa: HTMLDivElement | null; prawa: HTMLDivElement | null }>({ lewa: null, prawa: null })
    const stan = React.useRef({ lista, tryb, aktywne, wskazane })
    stan.current = { lista, tryb, aktywne, wskazane }

    // w trybie marginesu na pełnym ekranie notki po obu stronach (wg środka prostokąta), poza nim – tylko z prawej
    const strona = (o: ObjasnienieNaStronie) => (pelny && o.x + o.w / 2 < 50 ? 'lewa' : 'prawa')

    /** narożniki prostokąta w pikselach względem obszaru (z uwzględnieniem obrotu) */
    const naroza = React.useCallback((o: ObjasnienieWidoku) => {
        const v = widz.current, ti = v?.world.getItemAt(0), P = osd.current?.Point
        if (!v || !ti || !P || !pole.current || !obszar.current) return null
        const s = ti.getContentSize()
        const ob = obszar.current.getBoundingClientRect(), pr = pole.current.getBoundingClientRect()
        const dx = pr.left - ob.left, dy = pr.top - ob.top
        const px = (x: number, y: number) => {
            const p = v.viewport.pixelFromPoint(ti.imageToViewportCoordinates(new P((x / 100) * s.x, (y / 100) * s.y)), true)
            return { x: p.x + dx, y: p.y + dy }
        }
        const pkt = [px(o.x, o.y), px(o.x + o.w, o.y), px(o.x + o.w, o.y + o.h), px(o.x, o.y + o.h)]
        const xs = pkt.map((p) => p.x), ys = pkt.map((p) => p.y)
        return { pkt, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys), pole: { l: dx, t: dy, r: dx + pr.width, b: dy + pr.height } }
    }, [widz, osd, pole, obszar])

    const uloz = React.useCallback(() => {
        const el = svg.current, ob = obszar.current
        if (!el || !ob) return
        const { lista: l, tryb: t, aktywne: a, wskazane: w } = stan.current
        el.setAttribute('width', String(ob.clientWidth))
        el.setAttribute('height', String(ob.clientHeight))
        while (el.firstChild) el.removeChild(el.firstChild)
        if (t === 'ukryj') return
        const geo = new Map<string, NonNullable<ReturnType<typeof naroza>>>()
        for (const o of l) { const g = naroza(o); if (g) geo.set(o.id, g) }
        const widac = (g: NonNullable<ReturnType<typeof naroza>>) => g.maxX > g.pole.l && g.minX < g.pole.r && g.maxY > g.pole.t && g.minY < g.pole.b
        // prostokąty i numerki przycięte do pola skanu (nie wchodzą na listę ani miniatury)
        const pg = geo.values().next().value?.pole
        const grupa = document.createElementNS(NS, 'g')
        if (pg) {
            const cp = document.createElementNS(NS, 'clipPath'); cp.setAttribute('id', idPrzyciecia)
            const cr = document.createElementNS(NS, 'rect'); cr.setAttribute('x', String(pg.l)); cr.setAttribute('y', String(pg.t)); cr.setAttribute('width', String(pg.r - pg.l)); cr.setAttribute('height', String(pg.b - pg.t))
            cp.appendChild(cr); el.appendChild(cp)
            grupa.setAttribute('clip-path', `url(#${idPrzyciecia})`)
        }
        el.appendChild(grupa)
        for (const o of l) {
            const g = geo.get(o.id); if (!g) continue
            const p = document.createElementNS(NS, 'polygon')
            p.setAttribute('points', g.pkt.map((q) => `${q.x},${q.y}`).join(' '))
            p.setAttribute('class', `dok-obj-ramka dok-obj-${o.rodzaj}${o.id === a ? ' aktywna' : ''}${o.id === w ? ' wskazana' : ''}`)
            grupa.appendChild(p)
            if (t === 'numery' && widac(g)) {
                const gr = document.createElementNS(NS, 'g')
                gr.setAttribute('class', `dok-obj-znak${o.id === a ? ' aktywna' : ''}${o.id === w ? ' wskazana' : ''}`)
                const kx = Math.max(g.minX, g.pole.l + 11), ky = Math.max(g.minY, g.pole.t + 11)
                const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', String(kx)); c.setAttribute('cy', String(ky)); c.setAttribute('r', '10')
                const tx = document.createElementNS(NS, 'text'); tx.setAttribute('x', String(kx)); tx.setAttribute('y', String(ky)); tx.textContent = String(o.nr)
                gr.append(c, tx); grupa.appendChild(gr)
            }
        }
        if (t !== 'margines') return
        // notki: w każdej kolumnie od góry, możliwie na wysokości prostokąta, bez nachodzenia
        for (const bok of ['lewa', 'prawa'] as const) {
            const kol = kolumny.current[bok]; if (!kol) continue
            const kr = kol.getBoundingClientRect(), obr = ob.getBoundingClientRect()
            const kTop = kr.top - obr.top, kWys = kol.clientHeight
            const tu = l.filter((o) => strona(o) === bok && geo.has(o.id) && notki.current.get(o.id))
                .map((o) => ({ o, g: geo.get(o.id)!, n: notki.current.get(o.id)!, h: notki.current.get(o.id)!.offsetHeight }))
                .map((x) => ({ ...x, cel: (x.g.minY + x.g.maxY) / 2 - kTop - 14 }))
                .sort((p, q) => p.cel - q.cel)
            let dol = 0
            const gora: number[] = []
            for (const x of tu) { const y = Math.max(x.cel, dol, 0); gora.push(y); dol = y + x.h + ODSTEP }
            // za nisko – przesunięcie w górę od dołu kolumny
            let limit = kWys
            for (let i = tu.length - 1; i >= 0; i--) { gora[i] = Math.max(0, Math.min(gora[i], limit - tu[i].h)); limit = gora[i] - ODSTEP }
            tu.forEach((x, i) => {
                x.n.style.transform = `translateY(${Math.round(gora[i])}px)`
                const wid = widac(x.g)
                x.n.classList.toggle('poza', !wid)
                if (!wid) return
                // kreska: od krawędzi notki do najbliższego punktu prostokąta, kropka na końcu
                const ax = bok === 'prawa' ? kr.left - obr.left - 2 : kr.right - obr.left + 2
                const ay = kTop + gora[i] + 14
                const p = x.g.pole
                const tx = Math.min(Math.max(ax, x.g.minX, p.l), x.g.maxX, p.r), ty = Math.min(Math.max(ay, x.g.minY, p.t), x.g.maxY, p.b)
                const klasa = `dok-obj-kreska${x.o.id === a ? ' aktywna' : ''}${x.o.id === w ? ' wskazana' : ''}`
                const ln = document.createElementNS(NS, 'path')
                ln.setAttribute('d', `M${ax} ${ay}L${tx} ${ty}`); ln.setAttribute('class', klasa); el.appendChild(ln)
                const kr2 = document.createElementNS(NS, 'circle')
                kr2.setAttribute('cx', String(tx)); kr2.setAttribute('cy', String(ty)); kr2.setAttribute('r', '2.6'); kr2.setAttribute('class', `${klasa} kropka`); el.appendChild(kr2)
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [naroza, obszar, pelny, idPrzyciecia])

    // przerysowanie: ruch widoku (każda klatka animacji), zmiana rozmiaru, nowa strona
    React.useEffect(() => {
        const v = widz.current
        let klatka = 0
        const odswiez = () => { cancelAnimationFrame(klatka); klatka = requestAnimationFrame(uloz) }
        v?.addHandler('update-viewport', odswiez)
        v?.addHandler('open', odswiez)
        const ro = new ResizeObserver(odswiez)
        if (obszar.current) ro.observe(obszar.current)
        odswiez()
        return () => { cancelAnimationFrame(klatka); v?.removeHandler('update-viewport', odswiez); v?.removeHandler('open', odswiez); ro.disconnect() }
    }, [widz, obszar, uloz, wersja])
    React.useLayoutEffect(() => { uloz() }, [uloz, lista, tryb, aktywne, wskazane])

    // trafienie w prostokąt (najmniejszy pod kursorem) i przybliżenie do objaśnienia – dla przeglądarki
    React.useEffect(() => {
        api.current = {
            trafienie: (x, y) => {
                const v = widz.current, ti = v?.world.getItemAt(0), P = osd.current?.Point
                if (!v || !ti || !P || stan.current.tryb === 'ukryj') return null
                const s = ti.getContentSize()
                const ip = ti.viewportToImageCoordinates(v.viewport.pointFromPixel(new P(x, y), true))
                const px = (ip.x / s.x) * 100, py = (ip.y / s.y) * 100
                const pod = stan.current.lista.filter((o) => px >= o.x && px <= o.x + o.w && py >= o.y && py <= o.y + o.h).sort((a, b) => a.w * a.h - b.w * b.h)
                return pod[0]?.id ?? null
            },
            pokaz: (id) => {
                const v = widz.current, ti = v?.world.getItemAt(0), R = osd.current?.Rect
                const o = stan.current.lista.find((x) => x.id === id)
                if (!v || !ti || !R || !o) return
                const s = ti.getContentSize()
                const w = (o.w / 100) * s.x, h = (o.h / 100) * s.y, zapas = 0.15 * Math.max(w, h)
                const r = ti.imageToViewportRectangle(new R((o.x / 100) * s.x - zapas, (o.y / 100) * s.y - zapas, w + 2 * zapas, h + 2 * zapas))
                // przybliżenie: tyle, żeby fragment się zmieścił, ale nie mniej niż cała strona i nie więcej niż 4×
                // (przybliżenie z w OpenSeadragonie = widoczna szerokość 1/z w jednostkach widoku)
                const c = v.viewport.getContainerSize(), z0 = v.viewport.getHomeZoom()
                const z = Math.max(z0, Math.min(z0 * 4, 1 / r.width, c.y / c.x / r.height))
                v.viewport.zoomTo(z)
                v.viewport.panTo(r.getCenter())
                v.viewport.applyConstraints()
            },
        }
        return () => { api.current = null }
    }, [api, widz, osd])

    // kursor „wskaż” nad prostokątem
    React.useEffect(() => {
        const el = pole.current
        if (!el) return
        const ruch = (e: PointerEvent) => {
            if (e.buttons) return
            const r = el.getBoundingClientRect()
            const id = api.current?.trafienie(e.clientX - r.left, e.clientY - r.top) ?? null
            el.classList.toggle('nad-objasnieniem', !!id)
            if (id !== stan.current.wskazane) ustawWskazane(id)
        }
        const wyjscie = () => { el.classList.remove('nad-objasnieniem'); if (stan.current.wskazane) ustawWskazane(null) }
        el.addEventListener('pointermove', ruch)
        el.addEventListener('pointerleave', wyjscie)
        return () => { el.removeEventListener('pointermove', ruch); el.removeEventListener('pointerleave', wyjscie) }
    }, [pole, api, ustawWskazane])

    const klik = (id: string) => {
        if (aktywne === id) return ustawAktywne(null)
        ustawAktywne(id)
        api.current?.pokaz(id)
    }
    const kolumna = (bok: 'lewa' | 'prawa') => (
        <div ref={(e) => { kolumny.current[bok] = e }} className={`dok-obj-kol dok-obj-${bok}`} style={{ gridArea: bok === 'lewa' ? 'lewy' : 'prawy' }}>
            {lista.filter((o) => strona(o) === bok).map((o) => (
                <Notka key={o.id} o={o} aktywna={aktywne === o.id} wskazana={wskazane === o.id} onKlik={() => klik(o.id)} onNad={(n) => ustawWskazane(n ? o.id : null)}
                    wezel={(e) => { if (e) notki.current.set(o.id, e); else notki.current.delete(o.id) }} />
            ))}
        </div>
    )
    return (
        <>
            {tryb === 'margines' && pelny && kolumna('lewa')}
            {tryb === 'margines' && kolumna('prawa')}
            {tryb === 'numery' && pelny && (
                <div className="dok-obj-kol dok-obj-lista-boczna" style={{ gridArea: 'prawy' }}>
                    <ListaObjasnien lista={lista} aktywne={aktywne} wskazane={wskazane} onKlik={klik} ustawWskazane={ustawWskazane} />
                </div>
            )}
            <svg ref={svg} className="dok-obj-svg" aria-hidden="true" />
        </>
    )
}

export function ListaObjasnien({ lista, aktywne, wskazane, onKlik, ustawWskazane }: {
    lista: ObjasnienieNaStronie[]
    aktywne: string | null
    wskazane: string | null
    onKlik: (id: string) => void
    ustawWskazane: (id: string | null) => void
}) {
    if (!lista.length) return null
    return (
        <div className="dok-obj-lista" role="list" aria-label="objaśnienia na tej stronie">
            {lista.map((o) => (
                <Notka key={o.id} role="listitem" o={o} pelna aktywna={aktywne === o.id} wskazana={wskazane === o.id} onKlik={() => onKlik(o.id)} onNad={(n) => ustawWskazane(n ? o.id : null)} />
            ))}
        </div>
    )
}
