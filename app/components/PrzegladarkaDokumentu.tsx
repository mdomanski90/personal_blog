'use client'

// Przeglądarka skanów dokumentu (OpenSeadragon): strony ‹ ›, miniatury, przybliżanie (przyciski, dwa palce,
// kółko na pełnym ekranie), obrót, dopasowanie. Kliknięcie w skan – pełny ekran; Esc albo ✕ zamyka.
// Objaśnienia (odczyt, tłumaczenie, objaśnienie, pieczęć): na marginesie z kreską do miejsca na skanie (do 8 na stronie)
// albo numerki + lista; „transkrypcja” – sam tekst odczytów strony; „ukryj” – sam skan.
// Wariant „karta” (karta materiału, obok panelu z tekstem – SkanZTekstem): zwarty pasek [‹ 1/2 ›] [objaśnienia N | ▾] [− +] [⤢],
// bez listy objaśnień i miniatur pod skanem (są w panelu obok); zmiana strony i wybrane objaśnienie zgłaszane na zewnątrz.

import * as React from 'react'
import type OpenSeadragon from 'openseadragon'
import type { ObjasnienieWidoku } from '@/lib/objasnienia-widok'
import ObjasnieniaSkanu, { ListaObjasnien, TekstZrodla, type ApiWarstwy, type ObjasnienieNaStronie, type TrybObjasnien } from './ObjasnieniaSkanu'

export interface StronaPodgladu { adres: string; podpis?: string }

// strony z panelu mają pomniejszone kopie (?w=…), stary pojedynczy plik – tylko oryginał
const zKopiami = (a: string) => a.startsWith('/pliki/strony/')
export const obrazStrony = (a: string, w: 160 | 480 | 1200 | 2400) => (zKopiami(a) ? `${a}?w=${w}` : a)

export function ileStron(n: number): string {
    if (n === 1) return '1 strona'
    const d = n % 10, s = n % 100
    return d >= 2 && d <= 4 && (s < 12 || s > 14) ? `${n} strony` : `${n} stron`
}

const KLUCZ_TRYBU = 'dok-objasnienia'
const MAKS_NA_MARGINESIE = 8

export default function PrzegladarkaDokumentu({ strony, objasnienia = [], tytul, wysokosc = 'min(75vh, 720px)', pelnyNaStart = false, onZamknij, startStrona = 0, wariant = 'zwykly', naZmianeStrony, aktywneZ, naAktywne }: {
    strony: StronaPodgladu[]
    objasnienia?: ObjasnienieWidoku[]
    tytul: string
    wysokosc?: string
    /** otwarta od razu na pełnym ekranie (np. z wpisu) – zamknięcie wywołuje onZamknij */
    pelnyNaStart?: boolean
    onZamknij?: () => void
    startStrona?: number
    wariant?: 'zwykly' | 'karta'
    naZmianeStrony?: (strona: number) => void
    /** objaśnienie wybrane poza przeglądarką (np. w panelu tekstu) */
    aktywneZ?: string | null
    naAktywne?: (id: string | null) => void
}) {
    const ramka = React.useRef<HTMLDivElement>(null)
    const pole = React.useRef<HTMLDivElement>(null)
    const widz = React.useRef<OpenSeadragon.Viewer | null>(null)
    const osd = React.useRef<typeof OpenSeadragon | null>(null)
    const obszar = React.useRef<HTMLDivElement>(null)
    const warstwa = React.useRef<ApiWarstwy | null>(null)
    const [wersja, ustawWersje] = React.useState(0)
    const [aktywne, ustawAktywneW] = React.useState<string | null>(null)
    const naAktywneRef = React.useRef(naAktywne)
    naAktywneRef.current = naAktywne
    const ustawAktywne = React.useCallback((id: string | null) => { ustawAktywneW(id); naAktywneRef.current?.(id) }, [])
    const naStroneRef = React.useRef(naZmianeStrony)
    naStroneRef.current = naZmianeStrony
    const [menu, ustawMenu] = React.useState(false)
    const [wskazane, ustawWskazane] = React.useState<string | null>(null)
    const [wybranyTryb, ustawWybranyTryb] = React.useState<TrybObjasnien | null>(null)
    const [transkrypcja, ustawTranskrypcje] = React.useState(false)
    const [szerokosc, ustawSzerokosc] = React.useState(0)
    const aktywneRef = React.useRef(aktywne)
    aktywneRef.current = aktywne
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
            osd.current = OSD
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
            v.addHandler('open', () => { odswiezSkale(); v.viewport.setRotation(0); ustawObrot(0); ustawWersje((x) => x + 1) })
            v.addHandler('page', (e) => { const p = (e as unknown as { page: number }).page; ustawStrone(p); ustawAktywne(null); naStroneRef.current?.(p) })
            // krótkie kliknięcie (nie przeciągnięcie): w objaśnienie – pokazuje je; gdzie indziej – pełny ekran
            v.addHandler('canvas-click', (e) => {
                const ev = e as unknown as { quick: boolean; position: { x: number; y: number }; preventDefaultAction: boolean }
                if (!ev.quick) return
                const id = warstwa.current?.trafienie(ev.position.x, ev.position.y)
                if (id) { ev.preventDefaultAction = true; ustawAktywne(aktywneRef.current === id ? null : id); return }
                if (aktywneRef.current) { ustawAktywne(null); return }
                if (!pelnyRef.current) otworz()
            })
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

    // objaśnienie wybrane w panelu obok: podświetlenie i przybliżenie na skanie
    React.useEffect(() => {
        if (aktywneZ === undefined || aktywneZ === aktywneRef.current) return
        ustawAktywneW(aktywneZ)
        if (aktywneZ) warstwa.current?.pokaz(aktywneZ)
    }, [aktywneZ])

    React.useEffect(() => {
        try { const t = localStorage.getItem(KLUCZ_TRYBU); if (t === 'margines' || t === 'numery' || t === 'ukryj') ustawWybranyTryb(t) } catch { /* bez pamięci */ }
        const el = ramka.current
        if (!el) return
        const ro = new ResizeObserver(() => ustawSzerokosc(Math.round(el.clientWidth / 40) * 40))
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    const wybranyTrybPokazu = React.useRef<TrybObjasnien | null>(null)
    const wybierzTryb = (t: TrybObjasnien) => {
        if (t !== 'ukryj') wybranyTrybPokazu.current = t
        ustawWybranyTryb(t)
        try { localStorage.setItem(KLUCZ_TRYBU, t) } catch { /* bez pamięci */ }
    }

    const idz = (d: number) => { const v = widz.current; if (!v) return; const c = Math.min(n - 1, Math.max(0, v.currentPage() + d)); v.goToPage(c) }
    const naStrone = (i: number) => widz.current?.goToPage(i)
    const przybliz = (f: number) => { const vp = widz.current?.viewport; if (!vp) return; vp.zoomBy(f); vp.applyConstraints() }
    const obroc = () => { const vp = widz.current?.viewport; if (!vp) return; const r = (obrot + 90) % 360; vp.setRotation(r); ustawObrot(r) }
    const dopasuj = () => widz.current?.viewport.goHome()
    const podpis = strony[strona]?.podpis
    const naStronie: ObjasnienieNaStronie[] = React.useMemo(() => objasnienia.filter((o) => o.strona === strona).map((o, i) => ({ ...o, nr: i + 1 })), [objasnienia, strona])
    const sa = objasnienia.length > 0
    // tryb: wybrany przez czytelnika albo automatycznie – margines, gdy mało notek i jest miejsce obok skanu
    const tryb: TrybObjasnien = wybranyTryb ?? (naStronie.length <= MAKS_NA_MARGINESIE && szerokosc >= (pelny ? 900 : 640) ? 'margines' : 'numery')
    const efTryb: TrybObjasnien = naStronie.length ? tryb : 'ukryj'
    const doTranskrypcji = naStronie.filter((o) => o.rodzaj === 'odczyt' || o.rodzaj === 'tlumaczenie')
    const klikListy = (id: string) => { if (aktywne === id) return ustawAktywne(null); ustawAktywne(id); warstwa.current?.pokaz(id) }
    const uklad = efTryb === 'margines' || (efTryb === 'numery' && pelny) ? (pelny && efTryb === 'margines' ? 'obie' : 'prawa') : 'sam'

    const karta = wariant === 'karta' && !pelny
    const objWlaczone = efTryb !== 'ukryj'
    const trybPokazu: TrybObjasnien = tryb === 'ukryj' ? (wybranyTrybPokazu.current ?? 'numery') : tryb

    return (
        <div ref={ramka} className={`dok${pelny ? ' dok-pelny' : ''}${karta ? ' dok-karta' : ''}`}>
            {karta ? (
            <div className="dok-pasek dok-pasek-karta" role="toolbar" aria-label="przeglądanie dokumentu">
                {n > 1 ? (
                    <span className="dok-grupa" role="group" aria-label="strony">
                        <button type="button" onClick={() => idz(-1)} disabled={strona === 0} aria-label="poprzednia strona">‹</button>
                        <span className="dok-stan" aria-live="polite" aria-label={`strona ${strona + 1} z ${n}`}>{strona + 1} / {n}</span>
                        <button type="button" onClick={() => idz(1)} disabled={strona >= n - 1} aria-label="następna strona">›</button>
                    </span>
                ) : <span className="dok-stan-tekst">1 strona</span>}
                <span className="dok-pasek-prawa">
                    {sa && (
                        <span className="dok-grupa dok-grupa-menu" role="group" aria-label="objaśnienia na skanie">
                            <button type="button" aria-pressed={objWlaczone} disabled={!naStronie.length} title={naStronie.length ? (objWlaczone ? 'ukryj objaśnienia na skanie' : 'pokaż objaśnienia na skanie') : 'na tej stronie nie ma objaśnień'}
                                onClick={() => wybierzTryb(objWlaczone ? 'ukryj' : trybPokazu)}>objaśnienia <span className="dok-licznik">{naStronie.length}</span></button>
                            <button type="button" aria-haspopup="true" aria-expanded={menu} aria-label="sposób pokazywania objaśnień" onClick={() => ustawMenu((x) => !x)}>▾</button>
                            {menu && (
                                <span className="dok-menu" role="menu">
                                    {([['margines', 'na marginesie'], ['numery', 'numery na skanie']] as const).map(([t, nazwa]) => (
                                        <button key={t} type="button" role="menuitemradio" aria-checked={tryb === t} onClick={() => { wybierzTryb(t); ustawMenu(false) }}>{tryb === t ? '● ' : '○ '}{nazwa}</button>
                                    ))}
                                </span>
                            )}
                        </span>
                    )}
                    <span className="dok-grupa" role="group" aria-label="powiększenie">
                        <button type="button" onClick={() => przybliz(1 / 1.3)} aria-label="pomniejsz" title={`pomniejsz (${skala}%)`}>−</button>
                        <button type="button" onClick={() => przybliz(1.3)} aria-label="powiększ" title={`powiększ (${skala}%)`}>+</button>
                    </span>
                    <span className="dok-grupa"><button type="button" onClick={otworz} aria-label="pełny ekran" title="pełny ekran">⤢</button></span>
                </span>
            </div>
            ) : (
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
                {sa && (
                    <span className="dok-grupa" role="group" aria-label="objaśnienia">
                        {([['margines', 'na marginesie'], ['numery', 'numery'], ['ukryj', 'sam skan']] as const).map(([t, n]) => (
                            <button key={t} type="button" aria-pressed={tryb === t} onClick={() => wybierzTryb(t)}>{n}</button>
                        ))}
                        {doTranskrypcji.length > 0 && <button type="button" aria-pressed={transkrypcja} onClick={() => ustawTranskrypcje((x) => !x)}>transkrypcja</button>}
                    </span>
                )}
                <span className="dok-grupa">
                    <button type="button" onClick={dopasuj}>dopasuj</button>
                    <button type="button" onClick={obroc}>obróć</button>
                    {pelny
                        ? <button type="button" onClick={zamknij} aria-label="zamknij pełny ekran">zamknij ✕</button>
                        : <button type="button" onClick={otworz}>pełny ekran ⤢</button>}
                </span>
            </div>
            )}
            <div ref={obszar} className={`dok-obszar dok-uklad-${uklad}`}>
                <div ref={pole} className="dok-pole" style={{ gridArea: 'pole', ...(pelny ? {} : { height: wysokosc }) }} aria-label={`skan: ${tytul}${n > 1 ? `, strona ${strona + 1} z ${n}` : ''}`} role="img" />
                {sa && (
                    <ObjasnieniaSkanu widz={widz} osd={osd} pole={pole} obszar={obszar} lista={naStronie} tryb={efTryb} pelny={pelny} aktywne={aktywne} wskazane={wskazane}
                        ustawAktywne={ustawAktywne} ustawWskazane={ustawWskazane} api={warstwa} wersja={wersja} />
                )}
            </div>
            {efTryb === 'numery' && !pelny && !karta && <ListaObjasnien lista={naStronie} aktywne={aktywne} wskazane={wskazane} onKlik={klikListy} ustawWskazane={ustawWskazane} />}
            {transkrypcja && !karta && doTranskrypcji.length > 0 && (
                <div className="dok-transkrypcja" aria-label="transkrypcja tej strony">
                    {doTranskrypcji.map((o) => (
                        <p key={o.id} className={`dok-obj-${o.rodzaj}`}><span className="dok-obj-nr">{o.nr}</span> {o.rodzaj === 'tlumaczenie' && <span className="dok-transkrypcja-rodzaj">tłumaczenie: </span>}<TekstZrodla tekst={o.tekst} /></p>
                    ))}
                </div>
            )}
            {(podpis || n > 1) && !karta && (
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
