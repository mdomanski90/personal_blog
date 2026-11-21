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
import { obrazStrony } from '@/lib/pliki'
import WarstwaRekonstrukcji, { type DaneRekonstrukcji, type TrybWarstw } from './plan/WarstwaRekonstrukcji'
import OpisElementu from './plan/OpisElementu'
import PanelPlanu, { CalyPanelu, CzescPanelu, KartaElementu, LegendaNumerowana, WierszPanelu, WynikiSzukania, opisElementu } from './plan/PanelPlanu'
import { elementPod, naPlan } from '@/lib/plany/rekonstrukcja'
import { katalog } from '@/lib/plany/typy'
import { elementyLegendy } from '@/lib/plany/ph3'
import { szukajNaPlanie, znakObjasnienia } from '@/lib/plany/przegladarka'
import type { Element } from '@/lib/plany/model'
import { czasRuchu, useFokusPowrotu, useUwiezionyFokus } from '@/lib/ruch'
import { punktPozaProstokatem } from '@/lib/fokus'

export interface StronaPodgladu { adres: string; podpis?: string }

// strony z panelu mają pomniejszone kopie (?w=…) – wspólna funkcja w lib/pliki.ts (także dla stron serwerowych)
export { obrazStrony }

export function ileStron(n: number): string {
    if (n === 1) return '1 strona'
    const d = n % 10, s = n % 100
    return d >= 2 && d <= 4 && (s < 12 || s > 14) ? `${n} strony` : `${n} stron`
}

const KLUCZ_TRYBU = 'dok-objasnienia'
const MAKS_NA_MARGINESIE = 8

export default function PrzegladarkaDokumentu({ strony, objasnienia = [], tytul, wysokosc = 'min(75vh, 720px)', pelnyNaStart = false, onZamknij, startStrona = 0, wariant = 'zwykly', naZmianeStrony, aktywneZ, naAktywne, panelTekstu, rekonstrukcja, elementZ, naElement }: {
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
    /** P7E-2: panel tekstu (np. zakładki transkrypcji z karty materiału) – na pełnym ekranie z boku skanu */
    panelTekstu?: React.ReactNode
    /** PH1: plan zrekonstruowany z tego materiału – warstwa nad skanem (skan / skan + rekonstrukcja / rekonstrukcja) */
    rekonstrukcja?: DaneRekonstrukcji
    /** PH4: element rekonstrukcji wybrany poza przeglądarką (zakładka „plan” w SkanZTekstem) i zgłaszanie wyboru na zewnątrz */
    elementZ?: string | null
    naElement?: (id: string | null) => void
}) {
    const ramka = React.useRef<HTMLDivElement>(null)
    const pole = React.useRef<HTMLDivElement>(null)
    const widz = React.useRef<OpenSeadragon.Viewer | null>(null)
    const osd = React.useRef<typeof OpenSeadragon | null>(null)
    const obszar = React.useRef<HTMLDivElement>(null)
    const warstwa = React.useRef<ApiWarstwy | null>(null)
    const [wersja, ustawWersje] = React.useState(0)
    // łatka 21.11 (telefon): proporcje bieżącej strony (wys./szer.) – na telefonie wysokość pola skanu z proporcji zamiast stałych 560 px
    const [proporcja, ustawProporcje] = React.useState<number | null>(null)
    const [aktywne, ustawAktywneW] = React.useState<string | null>(null)
    const naAktywneRef = React.useRef(naAktywne)
    naAktywneRef.current = naAktywne
    const ustawAktywne = React.useCallback((id: string | null) => { ustawAktywneW(id); naAktywneRef.current?.(id) }, [])
    const naStroneRef = React.useRef(naZmianeStrony)
    naStroneRef.current = naZmianeStrony
    const [menu, ustawMenu] = React.useState(false)
    const [wskazane, ustawWskazane] = React.useState<string | null>(null)
    const [wybranyTryb, ustawWybranyTryb] = React.useState<TrybObjasnien | null>(null)
    // null = domyślnie: na pełnym ekranie tekst z boku włączony, w karcie / we wpisie wyłączony
    const [transkrypcjaW, ustawTranskrypcje] = React.useState<boolean | null>(null)
    const [szerokosc, ustawSzerokosc] = React.useState(0)
    const aktywneRef = React.useRef(aktywne)
    aktywneRef.current = aktywne
    const [strona, ustawStrone] = React.useState(startStrona)
    const [skala, ustawSkale] = React.useState(100)
    const [obrot, ustawObrot] = React.useState(0)
    const [pelny, ustawPelny] = React.useState(pelnyNaStart)
    const pelnyRef = React.useRef(pelny)
    pelnyRef.current = pelny
    // 5A (scena 4): pełny ekran wchodzi wygaszeniem (globals.css .dok-pelny); po zamknięciu fokus wraca na przycisk,
    // którym go otwarto, a po kliknięciu w skan – na „pełny ekran ⤢” (okno otwarte od razu – DokumentyWTresci)
    // P1 (VIEW-01/03): pełny ekran to okno – fokus wchodzi na „zamknij”, krąży tylko w oknie, a Esc i kliknięcie poza obrazem zamykają
    useFokusPowrotu(pelny && !pelnyNaStart, {
        wejscie: () => ramka.current?.querySelector<HTMLElement>('button[aria-label="zamknij pełny ekran"]'),
        zapasowy: () => ramka.current?.querySelector<HTMLElement>('button[aria-label="pełny ekran"]'),
    })
    useUwiezionyFokus(pelny, ramka)
    React.useEffect(() => { if (pelnyNaStart) ramka.current?.querySelector<HTMLElement>('button[aria-label="zamknij pełny ekran"]')?.focus({ preventScroll: true }) }, [pelnyNaStart])
    const n = strony.length
    const [warstwy, ustawWarstwy] = React.useState<TrybWarstw>('skan')
    const [krycie, ustawKrycie] = React.useState(0.75)
    // PH2: wybrany element rekonstrukcji (karta pod skanem, podświetlenie objaśnienia z jego „podstawy”)
    const [element, ustawElementW] = React.useState<string | null>(null)
    const naElementRef = React.useRef(naElement)
    naElementRef.current = naElement
    const ustawElement = React.useCallback((id: string | null) => { ustawElementW(id); naElementRef.current?.(id) }, [])
    React.useEffect(() => { if (elementZ !== undefined) ustawElementW(elementZ) }, [elementZ])
    // PH4: szukanie w panelu rekonstrukcji
    const [szukajRek, ustawSzukajRek] = React.useState('')
    const rekRef = React.useRef({ rekonstrukcja, warstwy })
    rekRef.current = { rekonstrukcja, warstwy }
    // wejście z listy planów (#warstwa-rekonstrukcji): od razu skan z rekonstrukcją, na stronie podkładu
    React.useEffect(() => { if (rekonstrukcja && window.location.hash === '#warstwa-rekonstrukcji') ustawWarstwy('oba') }, [rekonstrukcja])
    React.useEffect(() => {
        if (!rekonstrukcja || warstwy === 'skan' || wersja === 0) return
        const v = widz.current
        if (v && v.currentPage() !== rekonstrukcja.podklad.strona && window.location.hash === '#warstwa-rekonstrukcji') v.goToPage(rekonstrukcja.podklad.strona)
        // tylko po pierwszym otwarciu skanu
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wersja === 0])

    const otworz = React.useCallback(() => {
        ustawPelny(true)
        ramka.current?.requestFullscreen?.().catch(() => {})
    }, [])
    const zamknij = React.useCallback(() => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        if (onZamknij) onZamknij()
        else ustawPelny(false)
    }, [onZamknij])
    const zamknijRef = React.useRef(zamknij)
    zamknijRef.current = zamknij

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
                // 5A (scena 7): wbudowane wygaszanie OpenSeadragon (bez odbicia) w czasie --ruch-wolny; 0 przy ograniczeniu ruchu
                animationTime: czasRuchu('wolny') / 1000,
                gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true, scrollToZoom: pelnyRef.current },
                gestureSettingsTouch: { clickToZoom: false, dblClickToZoom: true, pinchToZoom: true },
            })
            const odswiezSkale = () => {
                const vp = v.viewport
                if (vp) ustawSkale(Math.round((vp.getZoom(true) / vp.getHomeZoom()) * 100))
            }
            v.addHandler('zoom', odswiezSkale)
            v.addHandler('open', () => { odswiezSkale(); v.viewport.setRotation(0); ustawObrot(0); ustawWersje((x) => x + 1); const r = v.world.getItemAt(0)?.getContentSize(); if (r && r.x > 0) ustawProporcje(r.y / r.x) })
            v.addHandler('page', (e) => { const p = (e as unknown as { page: number }).page; ustawStrone(p); ustawAktywne(null); ustawElement(null); naStroneRef.current?.(p) })
            // krótkie kliknięcie (nie przeciągnięcie): w objaśnienie – pokazuje je; gdzie indziej – pełny ekran
            v.addHandler('canvas-click', (e) => {
                const ev = e as unknown as { quick: boolean; position: { x: number; y: number }; preventDefaultAction: boolean }
                if (!ev.quick) return
                const id = warstwa.current?.trafienie(ev.position.x, ev.position.y)
                if (id) { ev.preventDefaultAction = true; ustawElement(null); ustawAktywne(aktywneRef.current === id ? null : id); return }
                // PH2: klik w element rekonstrukcji (warstwa widoczna, strona podkładu) – karta elementu i podświetlenie odczytu
                const r = rekRef.current
                if (r.rekonstrukcja && r.warstwy !== 'skan' && v.currentPage() === r.rekonstrukcja.podklad.strona) {
                    const ti = v.world.getItemAt(0), sz = ti?.getContentSize()
                    if (ti && sz) {
                        const ip = ti.viewportToImageCoordinates(v.viewport.pointFromPixel(new OSD.Point(ev.position.x, ev.position.y), true))
                        const [px, py] = naPlan(r.rekonstrukcja.podklad, ip.x / sz.x, ip.y / sz.y)
                        const eid = elementPod(r.rekonstrukcja.plan, px, py, (x) => !r.rekonstrukcja!.plan.elementy.find((e) => e.id === x)?.ograniczony)
                        if (eid) {
                            ev.preventDefaultAction = true
                            ustawElement(eid)
                            const pod = r.rekonstrukcja.plan.elementy.find((e) => e.id === eid)?.podstawa?.find((q) => q.objasnienie)?.objasnienie
                            ustawAktywne(pod ?? null)
                            return
                        }
                    }
                }
                // P1 (VIEW-01): w pełnym ekranie puste tło poza obrazem zamyka okno (brzeg obrazu należy do obrazu)
                if (pelnyRef.current) {
                    const ti = v.world.getItemAt(0)
                    if (ti) {
                        const r = v.viewport.viewportToViewerElementRectangle(ti.getBounds(true))
                        if (punktPozaProstokatem({ x: r.x, y: r.y, w: r.width, h: r.height }, ev.position.x, ev.position.y)) { zamknijRef.current(); return }
                    }
                }
                ustawElement(null)
                if (aktywneRef.current) { ustawAktywne(null); return }
                if (!pelnyRef.current) otworz()
            })
            widz.current = v
        })
        return () => { zywy = false; widz.current?.destroy(); widz.current = null }
        // przeglądarka tworzona raz dla danego zestawu stron
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [strony.map((s) => s.adres).join('|')])

    // łatka 21.11 (telefon): po zmianie wysokości pola z proporcji strony – skan od nowa dopasowany (bez pustych pasów)
    React.useEffect(() => {
        if (!proporcja) return
        const t = window.setTimeout(() => widz.current?.viewport?.goHome(true), 60)
        return () => window.clearTimeout(t)
    }, [proporcja])
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
    // PH4: litery dla objaśnień, gdy plan rekonstrukcji ma numerowaną legendę (rekomendacja przyjęta 17.11)
    const litery = !!rekonstrukcja?.plan.elementy.some((e) => e.nrLegendy)
    const naStronie: ObjasnienieNaStronie[] = React.useMemo(() => objasnienia.filter((o) => o.strona === strona).map((o, i) => ({ ...o, nr: znakObjasnienia(i, litery) })), [objasnienia, strona, litery])
    const sa = objasnienia.length > 0
    // tryb: wybrany przez czytelnika albo automatycznie – margines, gdy mało notek i jest miejsce obok skanu
    // na wąskim ekranie nie ma miejsca na notki na marginesie – zawsze numery na skanie i lista pod nim
    const trybW: TrybObjasnien = szerokosc > 0 && szerokosc < 640 && wybranyTryb === 'margines' ? 'numery' : wybranyTryb ?? (naStronie.length <= MAKS_NA_MARGINESIE && szerokosc >= (pelny ? 900 : 640) ? 'margines' : 'numery')
    // PH4: materiał z rekonstrukcją – objaśnienia jako numery (litery) na skanie, lista w panelu / zakładce „objaśnienia” – bez notek na marginesie
    const tryb: TrybObjasnien = rekonstrukcja && !pelny && trybW === 'margines' ? 'numery' : trybW
    const efTryb: TrybObjasnien = naStronie.length ? tryb : 'ukryj'
    const doTranskrypcji = naStronie.filter((o) => o.rodzaj === 'odczyt' || o.rodzaj === 'tlumaczenie')
    const transkrypcja = transkrypcjaW ?? pelny
    // P7E-2: panel boczny na pełnym ekranie – tekst z karty materiału albo odczyty z objaśnień
    const maTekst = !!panelTekstu || doTranskrypcji.length > 0
    const bok = pelny && maTekst && transkrypcja
    const klikListy = (id: string) => { if (aktywne === id) return ustawAktywne(null); ustawAktywne(id); warstwa.current?.pokaz(id) }
    const uklad = bok ? 'sam' : efTryb === 'margines' || (efTryb === 'numery' && pelny) ? (pelny && efTryb === 'margines' ? 'obie' : 'prawa') : 'sam'

    const karta = wariant === 'karta' && !pelny
    // PH4: materiał z rekonstrukcją (bez tekstu obok) – ten sam panel co w przeglądarce planu zamiast notek na marginesie
    const zPanelem = !!rekonstrukcja && wariant === 'zwykly' && !pelny
    // zwarty pasek (jak w karcie): bez skali w %, dopasuj / obróć i transkrypcji – te są na pełnym ekranie
    const kompakt = karta || zPanelem
    // PH2: podświetlone elementy – wybrany element i elementy oparte na wybranym objaśnieniu
    const wyroznione = React.useMemo(() => {
        const z = new Set<string>()
        if (!rekonstrukcja) return z
        if (element) z.add(element)
        if (aktywne) for (const e of rekonstrukcja.plan.elementy) if (e.podstawa?.some((q) => q.objasnienie === aktywne)) z.add(e.id)
        return z
    }, [rekonstrukcja, element, aktywne])
    const el = rekonstrukcja && element ? rekonstrukcja.plan.elementy.find((e) => e.id === element) : undefined
    const typyRek = React.useMemo(() => (rekonstrukcja ? katalog(rekonstrukcja.ustawienia) : null), [rekonstrukcja])
    const objWlaczone = efTryb !== 'ukryj'
    const trybPokazu: TrybObjasnien = tryb === 'ukryj' ? (wybranyTrybPokazu.current ?? 'numery') : tryb

    // PH4: panel rekonstrukcji (szukanie, obiekty na planie, objaśnienia tej strony, wybrany obiekt) – PanelPlanu
    const wybierzElement = (e: Element) => {
        if (!rekonstrukcja) return
        ustawElement(e.id)
        const pod = e.podstawa?.find((q) => q.objasnienie)?.objasnienie
        ustawAktywne(pod ?? null)
        if (warstwy === 'skan') ustawWarstwy('oba')
        if (strona !== rekonstrukcja.podklad.strona) widz.current?.goToPage(rekonstrukcja.podklad.strona)
    }
    const trafieniaRek = rekonstrukcja ? szukajNaPlanie(rekonstrukcja.plan, szukajRek) : []
    const szukanieRek = szukajRek.trim().length >= 2
    const numerowaneRek = rekonstrukcja && typyRek ? elementyLegendy(rekonstrukcja.plan.elementy.filter((e) => typyRek.has(e.typ))) : []
    const tytulPanelu = el ? (el.nazwa?.split('\n').join(' ') || el.nazwaZrodlowa || typyRek?.get(el.typ)?.nazwa || 'obiekt') : szukanieRek ? 'szukaj na planie' : 'plan i objaśnienia'
    const zamknijPanel = el ? () => ustawElement(null) : szukanieRek ? () => ustawSzukajRek('') : undefined
    const panelRek = zPanelem && rekonstrukcja && typyRek ? (
        <PanelPlanu tytul={tytulPanelu} zamknij={zamknijPanel} szukaj={szukajRek} ustawSzukaj={(v) => { ustawSzukajRek(v); if (el) ustawElement(null) }}
            naSzukaj={() => { if (trafieniaRek[0]) wybierzElement(trafieniaRek[0]) }} podpowiedz="nazwa obiektu albo nazwa w źródle" etykieta="panel rekonstrukcji planu"
            opisPodpowiedzi={szukanieRek ? undefined : 'Szukaj obiektu rekonstrukcji po nazwie albo nazwie ze skanu.'}>
            {el ? (
                <KartaElementu key={el.id} el={el} typ={typyRek.get(el.typ)} naPodstawe={(oid) => { ustawAktywne(oid); warstwa.current?.pokaz(oid) }} />
            ) : szukanieRek ? (
                <WynikiSzukania wyniki={trafieniaRek} wybrany={element} wybierz={wybierzElement} opis={(e) => opisElementu(e, typyRek.get(e.typ))} pustoUwaga="Nic nie znaleziono." />
            ) : (
                <>
                    <LegendaNumerowana elementy={numerowaneRek} typy={typyRek} pokaz={wybierzElement} wybrany={element} />
                    <CzescPanelu tytul="objaśnienia tej strony">{naStronie.length ? `${naStronie.length}${n > 1 ? ` · strona ${strona + 1}` : ''}` : null}</CzescPanelu>
                    <CalyPanelu>
                        {naStronie.length
                            ? <ListaObjasnien lista={naStronie} aktywne={aktywne} wskazane={wskazane} onKlik={klikListy} ustawWskazane={ustawWskazane} />
                            : <p className="plan-panel-pusto">Na tej stronie nie ma objaśnień.</p>}
                    </CalyPanelu>
                    <CzescPanelu tytul="o planie" />
                    <WierszPanelu e="plan">{rekonstrukcja.plan.tytul}</WierszPanelu>
                    <WierszPanelu e="warstwy">{`przełącznik „skan / skan + plan / plan” nad obrazem${rekonstrukcja.podklad.strona > 0 ? ` (strona ${rekonstrukcja.podklad.strona + 1})` : ''}`}</WierszPanelu>
                    {litery && <WierszPanelu e="oznaczenia">liczby – obiekty z legendy planu, litery – objaśnienia skanu</WierszPanelu>}
                </>
            )}
        </PanelPlanu>
    ) : null

    if (zPanelem) return (
        <div ref={ramka} id="warstwa-rekonstrukcji" className="dok dok-z-panelem">
            <div className="dok-z-panelem-skan">
            {/* P7C-2 (JV-19): jeden pasek w karcie i na pełnym ekranie – ta sama kolejność i te same kontrolki;
                na pełnym ekranie dochodzą tytuł, skala w %, dopasuj, obróć i transkrypcja; na telefonie pasek u dołu, przyciski 44 px */}
            <div className="dok-pasek dok-pasek-karta" role="toolbar" aria-label="przeglądanie dokumentu">
                <span className="dok-pasek-lewa">
                    {pelny && <b className="dok-tytul">{tytul}</b>}
                    {n > 1 ? (
                        <span className="dok-grupa" role="group" aria-label="strony">
                            <button type="button" onClick={() => idz(-1)} disabled={strona === 0} aria-label="poprzednia strona">‹</button>
                            <span className="dok-stan" aria-live="polite" aria-label={`strona ${strona + 1} z ${n}`}>{strona + 1} / {n}</span>
                            <button type="button" onClick={() => idz(1)} disabled={strona >= n - 1} aria-label="następna strona">›</button>
                        </span>
                    ) : <span className="dok-stan-tekst">1 strona</span>}
                    <span className="dok-grupa dok-tylko-tel">
                        {pelny
                            ? <button type="button" onClick={zamknij} aria-label="zamknij pełny ekran">✕</button>
                            : <button type="button" onClick={otworz} aria-label="pełny ekran">⤢</button>}
                    </span>
                </span>
                <span className="dok-pasek-prawa">
                    {rekonstrukcja && (
                        <span className="dok-grupa" role="group" aria-label="warstwy: skan i rekonstrukcja planu">
                            {([['skan', 'skan'], ['oba', 'skan + plan'], ['rekonstrukcja', 'plan']] as const).map(([t, nazwa]) => (
                                <button key={t} type="button" aria-pressed={warstwy === t} disabled={strona !== rekonstrukcja.podklad.strona && t !== 'skan'}
                                    title={strona !== rekonstrukcja.podklad.strona ? `rekonstrukcja jest na stronie ${rekonstrukcja.podklad.strona + 1}` : undefined}
                                    onClick={() => ustawWarstwy(t)}>{nazwa}</button>
                            ))}
                            {warstwy === 'oba' && strona === rekonstrukcja.podklad.strona && (
                                <label className="dok-stan"><span className="sr-only">krycie rekonstrukcji</span>
                                    <input type="range" className="dok-suwak" min={0.1} max={1} step={0.05} value={krycie} onChange={(e) => ustawKrycie(+e.target.value)} aria-label="przenikanie: skan – rekonstrukcja" />
                                </label>
                            )}
                        </span>
                    )}
                    {sa && (
                        <span className="dok-grupa dok-grupa-menu" role="group" aria-label="objaśnienia na skanie">
                            <button type="button" aria-pressed={objWlaczone} disabled={!naStronie.length} title={naStronie.length ? (objWlaczone ? 'ukryj objaśnienia na skanie' : 'pokaż objaśnienia na skanie') : 'na tej stronie nie ma objaśnień'}
                                onClick={() => wybierzTryb(objWlaczone ? 'ukryj' : trybPokazu)}><span className="dok-etyk">objaśnienia </span><span className="dok-licznik">{naStronie.length}</span></button>
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
                    {!kompakt && maTekst && (
                        <span className="dok-grupa"><button type="button" aria-pressed={transkrypcja} onClick={() => ustawTranskrypcje(!transkrypcja)} aria-label="transkrypcja" title="transkrypcja tej strony"><span aria-hidden="true">¶</span><span className="dok-etyk"> transkrypcja</span></button></span>
                    )}
                    <span className="dok-grupa" role="group" aria-label="powiększenie">
                        <button type="button" onClick={() => przybliz(1 / 1.3)} aria-label="pomniejsz" title={`pomniejsz (${skala}%)`}>−</button>
                        {!kompakt && <span className="dok-stan dok-skala">{skala}%</span>}
                        <button type="button" onClick={() => przybliz(1.3)} aria-label="powiększ" title={`powiększ (${skala}%)`}>+</button>
                    </span>
                    {!kompakt && (
                        <span className="dok-grupa" role="group" aria-label="widok">
                            <button type="button" onClick={dopasuj} aria-label="dopasuj do okna" title="dopasuj do okna"><span aria-hidden="true">⊡</span><span className="dok-etyk"> dopasuj</span></button>
                            <button type="button" onClick={obroc} aria-label="obróć o 90°" title="obróć o 90°"><span aria-hidden="true">↻</span><span className="dok-etyk"> obróć</span></button>
                        </span>
                    )}
                    <span className="dok-grupa dok-tylko-pc">
                        {pelny
                            ? <button type="button" onClick={zamknij} aria-label="zamknij pełny ekran" title="zamknij (Esc)"><span className="dok-etyk">zamknij </span>✕</button>
                            : <button type="button" onClick={otworz} aria-label="pełny ekran" title="pełny ekran">⤢</button>}
                    </span>
                </span>
            </div>
            <div className={`dok-srodek${bok ? ' z-bokiem' : ''}`}>
            <div ref={obszar} className={`dok-obszar dok-uklad-${uklad}`}>
                <div ref={pole} className="dok-pole" style={{ gridArea: 'pole', '--wys-skanu': pelny ? undefined : wysokosc, '--proporcja-skanu': proporcja && !pelny ? String(Math.round(proporcja * 1000) / 1000) : undefined } as React.CSSProperties} aria-label={`skan: ${tytul}${n > 1 ? `, strona ${strona + 1} z ${n}` : ''}`} role="img" />
                {rekonstrukcja && <WarstwaRekonstrukcji widz={widz} osd={osd} wersja={wersja} strona={strona} dane={rekonstrukcja} tryb={warstwy} krycie={krycie} wyroznione={wyroznione} />}
                {sa && (
                    <ObjasnieniaSkanu widz={widz} osd={osd} pole={pole} obszar={obszar} lista={naStronie} tryb={bok && efTryb === 'margines' ? 'numery' : efTryb} pelny={pelny && !bok} aktywne={aktywne} wskazane={wskazane}
                        ustawAktywne={ustawAktywne} ustawWskazane={ustawWskazane} api={warstwa} wersja={wersja} />
                )}
            </div>
            {bok && (
                <div className="dok-bok" role="region" aria-label="tekst tej strony">
                    {panelTekstu ?? (
                        <div className="dok-transkrypcja dok-transkrypcja-bok">
                            {doTranskrypcji.map((o) => (
                                <p key={o.id} className={`dok-obj-${o.rodzaj}`}><span className="dok-obj-nr">{o.nr}</span> {o.rodzaj === 'tlumaczenie' && <span className="dok-transkrypcja-rodzaj">tłumaczenie: </span>}<TekstZrodla tekst={o.tekst} /></p>
                            ))}
                        </div>
                    )}
                </div>
            )}
            </div>
            </div>
            <div className="dok-z-panelem-bok">
                <div className="szt-pasek">
                    <b className="szt-jedna">{tytulPanelu}</b>
                    {zamknijPanel && <button type="button" className="plan-panel-x" onClick={zamknijPanel} aria-label="zamknij">×</button>}
                </div>
                <div className="dok-z-panelem-panel">{panelRek}</div>
            </div>
            {podpis && <div className="dok-dol dok-z-panelem-dol"><span className="dok-podpis">{podpis}</span></div>}
        </div>
    )

    return (
        <div ref={ramka} id={rekonstrukcja ? 'warstwa-rekonstrukcji' : undefined} className={`dok${pelny ? ' dok-pelny' : ''}${karta ? ' dok-karta' : ''}`}
            role={pelny ? 'dialog' : undefined} aria-modal={pelny ? true : undefined} aria-label={pelny ? `${tytul} – pełny ekran` : undefined}>
            {/* P7C-2 (JV-19): jeden pasek w karcie i na pełnym ekranie – ta sama kolejność i te same kontrolki;
                na pełnym ekranie dochodzą tytuł, skala w %, dopasuj, obróć i transkrypcja; na telefonie pasek u dołu, przyciski 44 px */}
            <div className="dok-pasek dok-pasek-karta" role="toolbar" aria-label="przeglądanie dokumentu">
                <span className="dok-pasek-lewa">
                    {pelny && <b className="dok-tytul">{tytul}</b>}
                    {n > 1 ? (
                        <span className="dok-grupa" role="group" aria-label="strony">
                            <button type="button" onClick={() => idz(-1)} disabled={strona === 0} aria-label="poprzednia strona">‹</button>
                            <span className="dok-stan" aria-live="polite" aria-label={`strona ${strona + 1} z ${n}`}>{strona + 1} / {n}</span>
                            <button type="button" onClick={() => idz(1)} disabled={strona >= n - 1} aria-label="następna strona">›</button>
                        </span>
                    ) : <span className="dok-stan-tekst">1 strona</span>}
                    <span className="dok-grupa dok-tylko-tel">
                        {pelny
                            ? <button type="button" onClick={zamknij} aria-label="zamknij pełny ekran">✕</button>
                            : <button type="button" onClick={otworz} aria-label="pełny ekran">⤢</button>}
                    </span>
                </span>
                <span className="dok-pasek-prawa">
                    {rekonstrukcja && (
                        <span className="dok-grupa" role="group" aria-label="warstwy: skan i rekonstrukcja planu">
                            {([['skan', 'skan'], ['oba', 'skan + plan'], ['rekonstrukcja', 'plan']] as const).map(([t, nazwa]) => (
                                <button key={t} type="button" aria-pressed={warstwy === t} disabled={strona !== rekonstrukcja.podklad.strona && t !== 'skan'}
                                    title={strona !== rekonstrukcja.podklad.strona ? `rekonstrukcja jest na stronie ${rekonstrukcja.podklad.strona + 1}` : undefined}
                                    onClick={() => ustawWarstwy(t)}>{nazwa}</button>
                            ))}
                            {warstwy === 'oba' && strona === rekonstrukcja.podklad.strona && (
                                <label className="dok-stan"><span className="sr-only">krycie rekonstrukcji</span>
                                    <input type="range" className="dok-suwak" min={0.1} max={1} step={0.05} value={krycie} onChange={(e) => ustawKrycie(+e.target.value)} aria-label="przenikanie: skan – rekonstrukcja" />
                                </label>
                            )}
                        </span>
                    )}
                    {sa && (
                        <span className="dok-grupa dok-grupa-menu" role="group" aria-label="objaśnienia na skanie">
                            <button type="button" aria-pressed={objWlaczone} disabled={!naStronie.length} title={naStronie.length ? (objWlaczone ? 'ukryj objaśnienia na skanie' : 'pokaż objaśnienia na skanie') : 'na tej stronie nie ma objaśnień'}
                                onClick={() => wybierzTryb(objWlaczone ? 'ukryj' : trybPokazu)}><span className="dok-etyk">objaśnienia </span><span className="dok-licznik">{naStronie.length}</span></button>
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
                    {!kompakt && maTekst && (
                        <span className="dok-grupa"><button type="button" aria-pressed={transkrypcja} onClick={() => ustawTranskrypcje(!transkrypcja)} aria-label="transkrypcja" title="transkrypcja tej strony"><span aria-hidden="true">¶</span><span className="dok-etyk"> transkrypcja</span></button></span>
                    )}
                    <span className="dok-grupa" role="group" aria-label="powiększenie">
                        <button type="button" onClick={() => przybliz(1 / 1.3)} aria-label="pomniejsz" title={`pomniejsz (${skala}%)`}>−</button>
                        {!kompakt && <span className="dok-stan dok-skala">{skala}%</span>}
                        <button type="button" onClick={() => przybliz(1.3)} aria-label="powiększ" title={`powiększ (${skala}%)`}>+</button>
                    </span>
                    {!kompakt && (
                        <span className="dok-grupa" role="group" aria-label="widok">
                            <button type="button" onClick={dopasuj} aria-label="dopasuj do okna" title="dopasuj do okna"><span aria-hidden="true">⊡</span><span className="dok-etyk"> dopasuj</span></button>
                            <button type="button" onClick={obroc} aria-label="obróć o 90°" title="obróć o 90°"><span aria-hidden="true">↻</span><span className="dok-etyk"> obróć</span></button>
                        </span>
                    )}
                    <span className="dok-grupa dok-tylko-pc">
                        {pelny
                            ? <button type="button" onClick={zamknij} aria-label="zamknij pełny ekran" title="zamknij (Esc)"><span className="dok-etyk">zamknij </span>✕</button>
                            : <button type="button" onClick={otworz} aria-label="pełny ekran" title="pełny ekran">⤢</button>}
                    </span>
                </span>
            </div>
            <div className={`dok-srodek${bok ? ' z-bokiem' : ''}`}>
            <div ref={obszar} className={`dok-obszar dok-uklad-${uklad}`}>
                <div ref={pole} className="dok-pole" style={{ gridArea: 'pole', '--wys-skanu': pelny ? undefined : wysokosc, '--proporcja-skanu': proporcja && !pelny ? String(Math.round(proporcja * 1000) / 1000) : undefined } as React.CSSProperties} aria-label={`skan: ${tytul}${n > 1 ? `, strona ${strona + 1} z ${n}` : ''}`} role="img" />
                {rekonstrukcja && <WarstwaRekonstrukcji widz={widz} osd={osd} wersja={wersja} strona={strona} dane={rekonstrukcja} tryb={warstwy} krycie={krycie} wyroznione={wyroznione} />}
                {sa && (
                    <ObjasnieniaSkanu widz={widz} osd={osd} pole={pole} obszar={obszar} lista={naStronie} tryb={bok && efTryb === 'margines' ? 'numery' : efTryb} pelny={pelny && !bok} aktywne={aktywne} wskazane={wskazane}
                        ustawAktywne={ustawAktywne} ustawWskazane={ustawWskazane} api={warstwa} wersja={wersja} />
                )}
            </div>
            {bok && (
                <div className="dok-bok" role="region" aria-label="tekst tej strony">
                    {panelTekstu ?? (
                        <div className="dok-transkrypcja dok-transkrypcja-bok">
                            {doTranskrypcji.map((o) => (
                                <p key={o.id} className={`dok-obj-${o.rodzaj}`}><span className="dok-obj-nr">{o.nr}</span> {o.rodzaj === 'tlumaczenie' && <span className="dok-transkrypcja-rodzaj">tłumaczenie: </span>}<TekstZrodla tekst={o.tekst} /></p>
                            ))}
                        </div>
                    )}
                </div>
            )}
            </div>
            {/* PH4: w karcie materiału z tekstem obok wybrany obiekt pokazuje zakładka „plan” panelu (SkanZTekstem) */}
            {el && !(karta && naElement) && (
                <div className="dok-element" role="region" aria-label="element rekonstrukcji">
                    <div className="dok-element-glowa">
                        <b>{el.nazwa || el.nazwaZrodlowa || typyRek?.get(el.typ)?.nazwa || 'element'}</b>
                        <span className="dok-element-typ">{typyRek?.get(el.typ)?.nazwa}</span>
                        <button type="button" className="dok-element-x" onClick={() => ustawElement(null)} aria-label="zamknij opis elementu">×</button>
                    </div>
                    {el.opis && <p className="dok-element-opis">{el.opis}</p>}
                    <OpisElementu e={el} naPodstawe={(oid) => { ustawAktywne(oid); warstwa.current?.pokaz(oid) }} />
                </div>
            )}
            {efTryb === 'numery' && !pelny && !karta && <ListaObjasnien lista={naStronie} aktywne={aktywne} wskazane={wskazane} onKlik={klikListy} ustawWskazane={ustawWskazane} />}
            {transkrypcja && !karta && !pelny && doTranskrypcji.length > 0 && (
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
