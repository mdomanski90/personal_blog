'use client'

// Etap 3 · przeglądarka planu: mapa (SVG – przybliżanie, przesuwanie, podpowiedź po najechaniu, klawiatura) i PanelPlanu
// (szukanie, stan pusty, karta wybranego, wyniki, groby rodziny) w jednej ramie apletu (PrzegladarkaPlanu – siatka
// „pasek mapy | pasek panelu / mapa | panel”). Kadr startowy z planu albo z grobów (CEM-07); ?grob= przy wyborze (CEM-13);
// znak „opisany” tylko z danych jawnych (CEM-09); plan historyczny / schemat bez interfejsu grobowego (PH-13).

import * as React from 'react'
import { punktyElementu, srodek, jednostka, type Element, type Numer, type Plan } from '@/lib/plany/model'
import { elementyLegendy } from '@/lib/plany/ph3'
import { numerKrotki, numerTekst, numeryPlanu } from '@/lib/plany/numeracja'
import { katalog, GRUPY, typGrobu, type UstawieniaPlanow } from '@/lib/plany/typy'
import type { OsobaNaPlanie, KrewnyNaPlanie } from '@/lib/plany/rodzina'
import { adresZGrobem, elementyKadruStartowego, napisyDoOdczytania, elementyNawigacji, interfejsPlanu, kwateryPlanu, opisany, przesunVB, ruchKlawisza, stanPlanu, szukajNaPlanie, type VB } from '@/lib/plany/przegladarka'
import { kadr, Podzialka, RysunekPlanu, Wzory } from './Rysunek'
import { WzoryProbek } from './Probka'
import PanelPlanu, { CalyPanelu, CzescPanelu, KartaElementu, KartaGrobu, LegendaNumerowana, LegendaTypow, PanelRodziny, WierszPanelu, WynikiSzukania, opisElementu, type Rodzina } from './PanelPlanu'
import { animuj, useFokusPowrotu } from '@/lib/ruch'
import { odmiana } from '@/lib/tekst'

export interface NarzedziaPlanu { png: () => void; drukuj: () => void }

export default function PlanInteraktywny({ plan, ustawienia, zalogowany, osoby = {}, pokazGrob, narzedzia, oPlanie }: {
    plan: Plan
    ustawienia: UstawieniaPlanow
    zalogowany: boolean
    /** osoby z drzewa przypięte do grobów (tylko widoczne dla czytelnika) */
    osoby?: Record<string, OsobaNaPlanie>
    /** z zewnątrz (lista pochowanych): pokaż ten grób */
    pokazGrob?: { id: string; n: number } | null
    /** narzędzia eksportu dla paska apletu (PNG, druk) */
    narzedzia?: React.Ref<NarzedziaPlanu>
    /** część „o planie” w stanie pustym panelu (opis, źródło rysunku – z serwera) */
    oPlanie?: React.ReactNode
}) {
    const typy = React.useMemo(() => katalog(ustawienia), [ustawienia])
    const ukryteTypy = React.useMemo(() => new Set(ustawienia.ukryteTypy), [ustawienia])
    const interfejs = interfejsPlanu(plan)
    const prefix = `pl-${plan.slug}`
    const u = jednostka(plan)
    const pelny = React.useMemo(() => kadr(plan), [plan])
    // CEM-07: kadr startowy – zapisany w planie (edytor, układ przed obrotem) albo groby i kwatery
    const startowy = React.useMemo<VB>(() => {
        if (plan.kadr) {
            const [x, y, w, h] = plan.kadr
            return kadr(plan, [{ id: 'kadr', typ: 'kadr', g: { k: 'w', p: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] } }])
        }
        return kadr(plan, elementyKadruStartowego(plan, typy))
    }, [plan, typy])
    const [vb, ustawVb] = React.useState<VB>(startowy)
    const [wylaczone, ustawWylaczone] = React.useState<Set<string>>(new Set())
    const [wybrany, ustawWybrany] = React.useState<string | null>(null)
    const [rodzinaDla, ustawRodzinaDla] = React.useState<string | null>(null)
    const [szukaj, ustawSzukaj] = React.useState('')
    // WSP-06: ?napisy=1 – panel z listą grobów ze zdjęciem bez odczytanego napisu
    const [trybNapisy, ustawTrybNapisy] = React.useState(false)
    const [podklad, ustawPodklad] = React.useState(false)
    const [nad, ustawNad] = React.useState<{ tekst: string; x: number; y: number } | null>(null)
    const [foto, ustawFoto] = React.useState<number | null>(null)
    const svgRef = React.useRef<SVGSVGElement>(null)
    const ramkaRef = React.useRef<HTMLDivElement>(null)
    const panelRef = React.useRef<HTMLDivElement>(null)
    // numery zapisane w planie i rozwiązane przy wydawaniu (dlaCzytelnika) – te same dla każdego czytelnika
    const numery = React.useMemo(() => numeryPlanu(plan), [plan])
    const elementy = React.useMemo(() => new Map(plan.elementy.map((e) => [e.id, e])), [plan])
    // ‹ › i strzałki: groby wg numerów; plan bez grobów – obiekty z nazwą / numerem legendy
    const kolejno = React.useMemo(() => elementyNawigacji(plan, typy, numery), [plan, typy, numery])

    // legenda: tylko typy użyte na planie, w kolejności katalogu
    const uzyte = React.useMemo(() => {
        const ile = new Map<string, number>()
        for (const e of plan.elementy) if (typy.has(e.typ) && !ukryteTypy.has(e.typ)) ile.set(e.typ, (ile.get(e.typ) ?? 0) + 1)
        return [...typy.values()].filter((t) => ile.has(t.id) && t.rys !== 'napis').map((t) => ({ t, n: ile.get(t.id)! }))
            .sort((a, b) => GRUPY.indexOf(a.t.grupa) - GRUPY.indexOf(b.t.grupa))
    }, [plan, typy, ukryteTypy])
    // PH-08: legenda numerowana – elementy z numerem (także „położenie nieznane”), w kolejności numerów
    const numerowane = React.useMemo(() => elementyLegendy(plan.elementy.filter((e) => typy.has(e.typ))), [plan, typy])
    const trafienia = React.useMemo(() => szukajNaPlanie(plan, szukaj), [szukaj, plan])
    const szukanie = szukaj.trim().length >= 2
    const wyroznione = React.useMemo(() => new Set(trafienia.map((e) => e.id)), [trafienia])
    // CEM-08/09: liczby pustego panelu i znak „opisany” – z planu dla czytelnika (dane jawne)
    const stan = React.useMemo(() => stanPlanu(plan, typy, new Set(Object.keys(osoby))), [plan, typy, osoby])
    const opisane = React.useMemo(() => new Set(plan.elementy.filter((e) => typGrobu(typy.get(e.typ)) && opisany(e)).map((e) => e.id)), [plan, typy])
    const kwatery = React.useMemo(() => kwateryPlanu(plan, typy, numery), [plan, typy, numery])
    const doOdczytania = React.useMemo(() => (interfejs.grobowy ? napisyDoOdczytania(plan, typy) : []), [plan, typy, interfejs.grobowy])
    const el = wybrany ? elementy.get(wybrany) ?? null : null

    // ---------- groby rodziny ----------
    const grobOsoby = React.useCallback((osobaId: string) => plan.elementy.find((e) => e.osoby?.some((o) => o.id === osobaId)) ?? null, [plan])
    const rodzinaGrobu = React.useCallback((elId: string): Rodzina => {
        const e = elementy.get(elId)
        const wlasne = (e?.osoby ?? []).map((o) => (o.id ? osoby[o.id] : undefined)).filter((x): x is OsobaNaPlanie => !!x)
        const krewni: (KrewnyNaPlanie & { grob: Element | null; wzgledem: string })[] = []
        for (const o of wlasne) for (const k of o.krewni) {
            if (krewni.some((x) => x.id === k.id) || wlasne.some((w) => w.id === k.id)) continue
            krewni.push({ ...k, grob: grobOsoby(k.id), wzgledem: o.nazwa })
        }
        return { wlasne, krewni }
    }, [elementy, osoby, grobOsoby])
    const rodzina = React.useMemo(() => (rodzinaDla ? rodzinaGrobu(rodzinaDla) : null), [rodzinaDla, rodzinaGrobu])
    const grobyRodziny = React.useMemo(() => (rodzina ? new Set(rodzina.krewni.flatMap((k) => (k.grob ? [k.grob.id] : []))) : undefined), [rodzina])

    // ---------- przybliżanie i przesuwanie ----------
    const punkt = (cx: number, cy: number): [number, number] => {
        const s = svgRef.current!, m = s.getScreenCTM()!.inverse(), p = s.createSVGPoint()
        p.x = cx; p.y = cy
        const q = p.matrixTransform(m)
        return [q.x, q.y]
    }
    // 5A (scena 6): przesunięcie widoku płynnie (--ruch-wolny) przy wyborze grobu i przyciskach +/−/⤢;
    // kółko, palce i przeciąganie – bez animacji (przerywają trwającą); przy ograniczeniu ruchu – od razu
    const vbRef = React.useRef(vb)
    vbRef.current = vb
    const przerwij = React.useRef<() => void>(() => {})
    React.useEffect(() => () => przerwij.current(), [])
    const plynnie = React.useCallback((cel: (v: VB) => VB) => {
        przerwij.current()
        const od = vbRef.current, doc = cel(od)
        if (od.every((v, i) => v === doc[i])) return
        przerwij.current = animuj('wolny', (p) => ustawVb(p >= 1 ? doc : od.map((v, i) => v + (doc[i] - v) * p) as VB))
    }, [])
    const zoom = React.useCallback((f: number, cx?: number, cy?: number, gladko = false) => {
        const cel = ([x, y, w, h]: VB): VB => {
            const nw = Math.min(pelny[2] * 1.3, Math.max(u * 6, w * f)), k = nw / w
            const px = cx ?? x + w / 2, py = cy ?? y + h / 2
            return [px - (px - x) * k, py - (py - y) * k, nw, h * k]
        }
        if (gladko) plynnie(cel)
        else { przerwij.current(); ustawVb(cel) }
    }, [pelny, u, plynnie])
    const ruch = React.useRef<{ wsk: Map<number, [number, number]>; start?: { x: number; y: number; vb: VB }; pinch?: { d: number; vb: VB; c: [number, number] }; przesuniety: boolean; cel?: string | null }>({ wsk: new Map(), przesuniety: false })

    const opis = (e: Element) => opisElementu(e, typy.get(e.typ), numery.get(e.id))
    const pointerDown = (e: React.PointerEvent) => {
        przerwij.current()
        const r = ruch.current
        r.wsk.set(e.pointerId, [e.clientX, e.clientY])
        // element pod kursorem zapamiętany przy naciśnięciu: po setPointerCapture zdarzenie pointerup ma za cel cały SVG,
        // nie kliknięty grób (odbiór 17.11: kliknięcie w grób nic nie robiło)
        r.cel = (e.target as globalThis.Element).closest('[data-id]')?.getAttribute('data-id') ?? null
        ;(e.currentTarget as globalThis.Element).setPointerCapture(e.pointerId)
        ustawNad(null)
        if (r.wsk.size === 2) {
            const [a, b] = [...r.wsk.values()]
            r.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, vb, c: punkt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) }
            r.start = undefined
        } else {
            r.start = { x: e.clientX, y: e.clientY, vb }
            r.przesuniety = false
        }
    }
    const pointerMove = (e: React.PointerEvent) => {
        const r = ruch.current
        if (!r.wsk.has(e.pointerId)) {
            // podpowiedź po najechaniu (mysz)
            if (e.pointerType !== 'mouse') return
            const id = (e.target as globalThis.Element).closest('[data-id]')?.getAttribute('data-id')
            const x = id ? elementy.get(id) : null
            const b = ramkaRef.current?.getBoundingClientRect()
            const tekst = x ? opis(x) : ''
            ustawNad(x && b && tekst ? { tekst, x: e.clientX - b.left, y: e.clientY - b.top } : null)
            return
        }
        r.wsk.set(e.pointerId, [e.clientX, e.clientY])
        const s = svgRef.current!
        const skala = vb[2] / s.clientWidth
        if (r.pinch && r.wsk.size >= 2) {
            const [a, b] = [...r.wsk.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1
            const f = Math.min(pelny[2] * 1.3 / r.pinch.vb[2], Math.max((u * 6) / r.pinch.vb[2], r.pinch.d / d))
            const [x, y, w, h] = r.pinch.vb, [cx, cy] = r.pinch.c
            ustawVb([cx - (cx - x) * f, cy - (cy - y) * f, w * f, h * f])
            r.przesuniety = true
            return
        }
        if (r.start) {
            const dx = e.clientX - r.start.x, dy = e.clientY - r.start.y
            if (Math.hypot(dx, dy) > 4) r.przesuniety = true
            if (r.przesuniety) ustawVb([r.start.vb[0] - dx * skala, r.start.vb[1] - dy * skala, r.start.vb[2], r.start.vb[3]])
        }
    }
    const pointerUp = (e: React.PointerEvent) => {
        const r = ruch.current
        r.wsk.delete(e.pointerId)
        if (r.wsk.size < 2) r.pinch = undefined
        if (r.start && !r.przesuniety) {
            const x = r.cel ? elementy.get(r.cel) : undefined
            // kliknięty element: karta w panelu i przybliżenie (jak wybór z listy / wyników); puste miejsce – zamyka kartę
            if (x) pokazElement(x)
            else { wybierz(null); ustawRodzinaDla(null) }
        }
        r.cel = null
        r.start = undefined
    }
    React.useEffect(() => {
        const s = svgRef.current
        if (!s) return
        const kolko = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return
            e.preventDefault()
            const [x, y] = punkt(e.clientX, e.clientY)
            zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, x, y)
        }
        s.addEventListener('wheel', kolko, { passive: false })
        return () => s.removeEventListener('wheel', kolko)
    }, [zoom])

    // CEM-13: wybór grobu podmienia adres (?grob=<id>) – link z paska przeglądarki prowadzi do tego grobu
    const wybierz = React.useCallback((id: string | null) => {
        ustawWybrany(id)
        if (typeof window !== 'undefined') window.history.replaceState(window.history.state, '', adresZGrobem(window.location.href, id))
    }, [])
    const pokazElement = React.useCallback((e: Element, zostawRodzine = false, gladko = true) => {
        wybierz(e.id)
        if (!zostawRodzine) ustawRodzinaDla(null)
        if (plan.obrot) return
        const pts = punktyElementu(e.g), xs = pts.map((p) => p[0])
        const [cx, cy] = srodek(e.g)
        const cel = ([x0, y0, w0, h0]: VB): VB => {
            // przybliż, jeśli trzeba; nie oddalaj, gdy czytelnik już przybliżył
            const w = Math.min(w0, Math.max(u * 14, (Math.max(...xs) - Math.min(...xs)) * 4)), h = (w * h0) / w0
            const widac = cx > x0 + w0 * 0.1 && cx < x0 + w0 * 0.9 && cy > y0 + h0 * 0.1 && cy < y0 + h0 * 0.9
            return widac && w === w0 ? [x0, y0, w0, h0] : [cx - w / 2, cy - h / 2, w, h]
        }
        if (gladko) plynnie(cel)
        else { przerwij.current(); ustawVb(cel) }
    }, [plan.obrot, u, plynnie, wybierz])
    /** kwatera z pustego panelu: kadr jej grobów */
    const pokazKwatere = (ids: string[]) => {
        const L = ids.map((id) => elementy.get(id)).filter((x): x is Element => !!x)
        if (L.length) plynnie(() => kadr(plan, L))
    }

    // link do grobu: ?grob=<id> – zaznacza grób i przybliża; ?szukaj= – z pola na karcie obiektu; ?napisy=1 – WSP-06
    React.useEffect(() => {
        const sp = new URLSearchParams(window.location.search)
        const q = sp.get('szukaj')?.slice(0, 100)
        if (q) ustawSzukaj(q)
        if (sp.get('napisy') === '1') ustawTrybNapisy(true)
        const id = sp.get('grob')
        const e = id ? elementy.get(id) : null
        // wejście na stronę z odnośnikiem do grobu – od razu (nic nie „wjeżdża” przy wejściu na stronę)
        if (e) pokazElement(e, false, false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const pierwszyPokaz = React.useRef(true)
    React.useEffect(() => {
        const e = pokazGrob ? elementy.get(pokazGrob.id) : null
        if (e) pokazElement(e, false, !pierwszyPokaz.current)
        pierwszyPokaz.current = false
    }, [pokazGrob, elementy, pokazElement])

    // CEM-24: klawiatura nad planem – ← ↑ / → ↓ poprzedni / następny, Enter – szczegóły w panelu, Shift + strzałki – przesunięcie
    const klawisz = (e: React.KeyboardEvent<SVGSVGElement>) => {
        const r = ruchKlawisza(e.key, e.shiftKey)
        if (!r) return
        e.preventDefault()
        if ('kolejny' in r) {
            if (!kolejno.length) return
            const i = el ? kolejno.findIndex((x) => x.id === el.id) : -1
            const nast = kolejno[i < 0 ? (r.kolejny > 0 ? 0 : kolejno.length - 1) : Math.min(kolejno.length - 1, Math.max(0, i + r.kolejny))]
            if (nast) pokazElement(nast)
        } else if ('szczegoly' in r) {
            // pierwszy przycisk albo odnośnik szczegółów (querySelector z listą zwraca też przodka – stąd osobno)
            panelRef.current?.querySelector<HTMLElement>('.plan-panel-tabela button:not(:disabled), .plan-panel-tabela a[href]')?.focus()
        } else if ('przesun' in r) plynnie((v) => przesunVB(v, r.przesun))
        else if ('zoom' in r) zoom(r.zoom, undefined, undefined, true)
        else plynnie(() => startowy)
    }

    // ---------- eksport ----------
    const doPng = async () => {
        const s = svgRef.current
        if (!s) return
        const kopia = s.cloneNode(true) as SVGSVGElement
        const oryg = s.querySelectorAll('*'), kop = kopia.querySelectorAll('*')
        oryg.forEach((o, i) => {
            const cs = getComputedStyle(o), k = kop[i] as SVGElement
            for (const w of ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-opacity', 'fill-opacity', 'opacity', 'font-family', 'font-size', 'font-style', 'font-weight', 'letter-spacing', 'paint-order', 'stop-color', 'stop-opacity', 'stroke-linecap', 'stroke-linejoin']) {
                const val = cs.getPropertyValue(w)
                if (val) k.style.setProperty(w, val)
            }
        })
        kopia.setAttribute('viewBox', pelny.join(' '))
        const W = 2400, H = Math.round((W * pelny[3]) / pelny[2])
        kopia.setAttribute('width', String(W)); kopia.setAttribute('height', String(H))
        kopia.querySelectorAll('image').forEach((im) => im.remove())
        const tlo = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        tlo.setAttribute('x', String(pelny[0])); tlo.setAttribute('y', String(pelny[1])); tlo.setAttribute('width', String(pelny[2])); tlo.setAttribute('height', String(pelny[3]))
        // tło PNG = papier planu z tokenu (w stylu „atrament” – jego papier)
        tlo.style.fill = getComputedStyle(ramkaRef.current ?? document.documentElement).getPropertyValue('--pl-papier') || 'white'
        kopia.insertBefore(tlo, kopia.firstChild)
        const xml = new XMLSerializer().serializeToString(kopia)
        const img = new Image()
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
        await img.decode()
        const c = document.createElement('canvas')
        c.width = W; c.height = H
        c.getContext('2d')!.drawImage(img, 0, 0, W, H)
        c.toBlob((b) => {
            if (!b) return
            const a = document.createElement('a')
            a.href = URL.createObjectURL(b)
            a.download = `${plan.slug}.png`
            a.click()
            setTimeout(() => URL.revokeObjectURL(a.href), 5000)
        }, 'image/png')
    }
    // JW-17: wydruk na wspólnym arkuszu druku; przed drukiem cały plan w kadrze
    const drukuj = () => {
        przerwij.current()
        ustawVb(pelny)
        setTimeout(() => window.print(), 100)
    }

    React.useImperativeHandle(narzedzia, () => ({ png: doPng, drukuj }))
    const pokaz = (e: Element) => !wylaczone.has(e.typ)
    const podkladyDoPokazania = podklad ? plan.podklady.map((p) => ({ p, adres: `/plany/${plan.slug}/podklad/${p.plik}` })) : undefined
    const cx = plan.szer / 2, cy = plan.wys / 2

    // ---------- panel: część i treść ----------
    const grobWybrany = el && typGrobu(typy.get(el.typ))
    const tytulCzesci = rodzina && rodzinaDla ? 'rodzina na tym cmentarzu'
        : el ? (grobWybrany ? `grób ${numerKrotki(numery.get(el.id)) || ''}`.trim() : el.nazwa?.split('\n').join(' ') || el.nazwaZrodlowa || typy.get(el.typ)?.nazwa || 'obiekt')
            : szukanie ? 'szukaj na planie' : trybNapisy ? 'napisy do odczytania' : interfejs.czescSzukania
    const zamknijPanel = rodzina && rodzinaDla ? () => ustawRodzinaDla(null) : el ? () => wybierz(null) : szukanie ? () => ustawSzukaj('') : trybNapisy ? () => ustawTrybNapisy(false) : undefined
    const nieWszystkoOdczytane = interfejs.grobowy && stan.bezOpisu > 0
    const pustoUwaga = nieWszystkoOdczytane ? 'Nic nie znaleziono – to nie znaczy, że tej osoby tu nie pochowano: nie wszystkie napisy są już odczytane.' : 'Nic nie znaleziono.'

    let tresc: React.ReactNode
    if (rodzina && rodzinaDla) tresc = <PanelRodziny rodzina={rodzina} numery={numery} wybierz={(g) => pokazElement(g, true)} />
    else if (el && grobWybrany) tresc = <KartaGrobu key={el.id} el={el} plan={plan} numer={numery.get(el.id)} numery={numery} kolejno={kolejno} osoby={osoby} zalogowany={zalogowany} idz={(g) => pokazElement(g)} pokazRodzine={() => ustawRodzinaDla(el.id)} rodzinaIle={rodzinaGrobu(el.id)} otworzFoto={ustawFoto} />
    else if (el) tresc = <KartaElementu key={el.id} el={el} typ={typy.get(el.typ)} numer={numery.get(el.id)} />
    else if (trybNapisy && !szukanie) tresc = (
        <>
            <CalyPanelu><p className="plan-panel-tekst">Groby ze zdjęciem nagrobka, z których nie odczytano jeszcze napisu. Wybierz grób, otwórz zdjęcie i napisz, co widać – przez „dodaj informację”.</p></CalyPanelu>
            <WynikiSzukania wyniki={doOdczytania} wybrany={wybrany} wybierz={(e) => pokazElement(e)} opis={(e) => opisElementu(e, typy.get(e.typ))} numery={numery} pustoUwaga="Wszystkie sfotografowane nagrobki mają już odczytany napis." />
        </>
    )
    else if (szukanie) tresc = <WynikiSzukania wyniki={trafienia} wybrany={wybrany} wybierz={(e) => pokazElement(e)} opis={(e) => opisElementu(e, typy.get(e.typ))} numery={numery} pustoUwaga={pustoUwaga} />
    else tresc = (
        <>
            <CzescPanelu tytul="na tym planie" />
            {interfejs.grobowy ? (
                <>
                    <WierszPanelu e="groby">{stan.groby > 0 ? String(stan.groby) : 'brak na rysunku'}</WierszPanelu>
                    <WierszPanelu e="opisane">{stan.groby > 0 ? `${stan.opisane}${stan.bezOpisu > 0 ? ` · plan w opracowaniu` : ''}` : null}</WierszPanelu>
                    <WierszPanelu e="do odczytania">{doOdczytania.length > 0 && <button type="button" className="plan-panel-odn" onClick={() => ustawTrybNapisy(true)}>{odmiana(doOdczytania.length, ['grób', 'groby', 'grobów'])} ze zdjęciem bez napisu – pomóż odczytać</button>}</WierszPanelu>
                    <WierszPanelu e="dla bliskich">{stan.dlaBliskich > 0 ? `${odmiana(stan.dlaBliskich, ['grób', 'groby', 'grobów'])} z napisem tylko dla bliskich` : null}</WierszPanelu>
                    <WierszPanelu e="w drzewie">{stan.wDrzewie > 0 ? `${odmiana(stan.wDrzewie, ['grób', 'groby', 'grobów'])} z osobami z drzewa` : null}</WierszPanelu>
                </>
            ) : (
                <>
                    <WierszPanelu e="obiekty">{String(kolejno.length)}</WierszPanelu>
                    <WierszPanelu e="w legendzie">{numerowane.length > 0 ? String(numerowane.length) : null}</WierszPanelu>
                </>
            )}
            {kwatery.length > 1 && (
                <>
                    <CzescPanelu tytul="kwatery">{odmiana(kwatery.length, ['kwatera', 'kwatery', 'kwater'])}</CzescPanelu>
                    <CalyPanelu><span className="plan-panel-przyciski">{kwatery.map((k) => <button key={k.nazwa} type="button" className="k-btn k-btn--s" onClick={() => pokazKwatere(k.ids)}>{k.nazwa}</button>)}</span></CalyPanelu>
                </>
            )}
            <LegendaNumerowana elementy={numerowane} typy={typy} pokaz={(e) => pokazElement(e)} wybrany={wybrany} />
            <LegendaTypow uzyte={uzyte} prefix={`${prefix}-sw`} wylaczone={wylaczone} rodzina={!!rodzina}
                przelacz={(id) => ustawWylaczone((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })} wszystkie={() => ustawWylaczone(new Set())} />
            {plan.podklady.length > 0 && (
                <CalyPanelu><label className="plan-panel-wybor"><input type="checkbox" checked={podklad} onChange={(e) => ustawPodklad(e.target.checked)} /> podkład pod rysunkiem</label></CalyPanelu>
            )}
            <CzescPanelu tytul="o planie" />
            {oPlanie}
            {interfejs.grobowy && numery.size > 0 && (
                <WierszPanelu e="numeracja">{`robocza, nie urzędowa${plan.zrodloNumeracji ? ` – ${plan.zrodloNumeracji}` : ''}`}</WierszPanelu>
            )}
            <WierszPanelu e="klawiatura">← → – poprzedni i następny{interfejs.grobowy ? ' grób' : ' obiekt'} · Enter – szczegóły · Shift + strzałki – przesuń · + − – przybliż · 0 – cały plan</WierszPanelu>
        </>
    )

    return (
        <>
            <div className="szt-pasek plan-panel-pasek">
                <b className="szt-jedna">{tytulCzesci}</b>
                {zamknijPanel && <button type="button" className="plan-panel-x" onClick={zamknijPanel} aria-label="zamknij">×</button>}
            </div>
            <div ref={ramkaRef} className={`plan-ramka plan-aplet-mapa${plan.styl === 'atrament' ? ' pl-styl-atrament' : ''}`} onPointerLeave={() => ustawNad(null)}>
                <WzoryProbek prefix={`${prefix}-sw`} />
                <svg ref={svgRef} viewBox={vb.join(' ')} preserveAspectRatio="xMidYMid meet" role="application" tabIndex={0}
                    aria-label={`${plan.tytul} – plan. ${interfejs.grobowy ? 'Strzałki: poprzedni i następny grób' : 'Strzałki: poprzedni i następny obiekt'}, Enter – szczegóły, plus i minus – przybliżenie.`}
                    aria-describedby={`${prefix}-wybrany`} onKeyDown={klawisz}
                    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
                    <defs><Wzory prefix={prefix} u={u} /></defs>
                    <rect x={pelny[0] - pelny[2]} y={pelny[1] - pelny[3]} width={pelny[2] * 3} height={pelny[3] * 3} className="pl-tlo" />
                    <RysunekPlanu plan={plan} o={{ prefix, typy, ukryteTypy, pokaz, wyroznione: rodzina ? undefined : wyroznione, wybrane: wybrany ? new Set([wybrany]) : undefined, numery, podklady: podkladyDoPokazania, rodzina: grobyRodziny, opisane: interfejs.grobowy ? opisane : undefined }} />
                    {rodzina && (
                        <g transform={plan.obrot ? `rotate(${plan.obrot} ${cx} ${cy})` : undefined} pointerEvents="none">
                            {rodzina.krewni.filter((k) => k.grob).map((k) => {
                                const [x, y] = srodek(k.grob!.g)
                                const px = vb[2] / (svgRef.current?.clientWidth || 800)
                                return <text key={k.id} x={x} y={y - px * 14} fontSize={px * 12.5} textAnchor="middle" transform={plan.obrot ? `rotate(${-plan.obrot} ${x} ${y})` : undefined} className="plan-rodzina-podpis">{k.relacja}</text>
                            })}
                        </g>
                    )}
                    <Podzialka plan={plan} kadr={pelny} />
                </svg>
                {/* stan dla czytnika ekranu: wybrany element po ruchu klawiszami */}
                <span id={`${prefix}-wybrany`} className="sr-only" aria-live="polite">{el ? `${opis(el)}${grobWybrany && numery.get(el.id) ? ` – ${numerTekst(numery.get(el.id))}` : ''}` : ''}</span>
                <div className="plan-kontrolki plan-bez-druku" role="group" aria-label="przybliżenie">
                    <button type="button" aria-label="przybliż" onClick={() => zoom(1 / 1.4, undefined, undefined, true)}>+</button>
                    <button type="button" aria-label="oddal" onClick={() => zoom(1.4, undefined, undefined, true)}>−</button>
                    <button type="button" aria-label="cały plan" onClick={() => plynnie(() => startowy)}>⤢</button>
                </div>
                {nad && <div className="plan-podpowiedz plan-bez-druku" style={/* styl-dynamiczny: położenie podpowiedzi przy kursorze */ { left: nad.x + 14, top: nad.y + 14 }}>{nad.tekst}</div>}
                <div className="plan-wskazowka plan-bez-druku">{interfejs.grobowy ? 'najedź – nazwisko · kliknij – karta grobu' : 'najedź – nazwa · kliknij – opis obiektu'} · przeciągnij – przesuń · Ctrl + kółko – przybliż</div>
            </div>
            <div ref={panelRef} className="plan-aplet-panel">
                <PanelPlanu tytul={tytulCzesci} zamknij={zamknijPanel} szukaj={szukaj} ustawSzukaj={(v) => { ustawSzukaj(v); if (el) wybierz(null) }} naSzukaj={() => { if (trafienia[0]) pokazElement(trafienia[0]) }}
                    podpowiedz={`${interfejs.podpowiedz} – na tym planie`} etykieta={interfejs.grobowy ? 'panel planu: groby' : 'panel planu: obiekty'}
                    opisPodpowiedzi={szukanie ? undefined : interfejs.grobowy ? (nieWszystkoOdczytane ? 'Nie wszystkie napisy są już odczytane – brak wyniku nie znaczy, że tej osoby tu nie pochowano.' : 'Szukaj po nazwisku, imieniu albo roku z napisu.') : 'Szukaj po nazwie obiektu albo nazwie w źródle.'}>
                    {tresc}
                </PanelPlanu>
            </div>
            {el && foto !== null && el.zdjecia?.[foto] && (
                <Galeria plan={plan} el={el} numer={numery.get(el.id)} i={foto} ustaw={ustawFoto} />
            )}
        </>
    )
}

/** Zdjęcie nagrobka w powiększeniu, obok napis do porównania. Esc zamyka, strzałki przewijają. */
function Galeria({ plan, el, numer, i, ustaw }: { plan: Plan; el: Element; numer?: Numer; i: number; ustaw: (i: number | null) => void }) {
    const L = el.zdjecia ?? []
    // 5A (scena 4): okno wchodzi wygaszeniem (globals.css), fokus na „zamknij”, po zamknięciu wraca na miniaturę
    const zamknijRef = React.useRef<HTMLButtonElement>(null)
    useFokusPowrotu(true, { wejscie: () => zamknijRef.current })
    React.useEffect(() => {
        const k = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.stopPropagation(); ustaw(null) }
            else if (e.key === 'ArrowRight' && i < L.length - 1) ustaw(i + 1)
            else if (e.key === 'ArrowLeft' && i > 0) ustaw(i - 1)
        }
        document.addEventListener('keydown', k)
        const o = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.removeEventListener('keydown', k); document.body.style.overflow = o }
    }, [i, L.length, ustaw])
    const z = L[i]
    return (
        <div className="plan-galeria" role="dialog" aria-modal="true" aria-label="zdjęcie nagrobka" onClick={(e) => { if (e.target === e.currentTarget) ustaw(null) }}>
            <div className="plan-galeria-glowa">
                <span>{plan.tytul}{numer ? ` · ${numerTekst(numer)}` : ''}</span>
                <span className="plan-panel-odstep" />
                {L.length > 1 && <span className="plan-galeria-opis">zdjęcie {i + 1} z {L.length}</span>}
                <button ref={zamknijRef} type="button" onClick={() => ustaw(null)} className="plan-galeria-btn">zamknij (Esc)</button>
            </div>
            <div className="plan-galeria-srodek">
                <div className="plan-galeria-obraz">
                    {i > 0 && <button type="button" aria-label="poprzednie zdjęcie" onClick={() => ustaw(i - 1)} className="plan-galeria-btn plan-galeria-strzalka plan-galeria-lewa">‹</button>}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/plany/${plan.slug}/zdjecie/${z.plik}`} alt="zdjęcie nagrobka" />
                    {i < L.length - 1 && <button type="button" aria-label="następne zdjęcie" onClick={() => ustaw(i + 1)} className="plan-galeria-btn plan-galeria-strzalka plan-galeria-prawa">›</button>}
                </div>
                {(el.napis || z.data) && (
                    <aside className="plan-galeria-bok">
                        {el.napis && <><span className="plan-galeria-etyk">napis – do porównania ze zdjęciem</span><pre className="plan-napis plan-napis-ciemny">{el.napis}</pre></>}
                        {z.data && <span className="plan-galeria-data"><span className="plan-galeria-opis">wykonane: </span>{new Date(z.data).toLocaleDateString('pl-PL')}</span>}
                    </aside>
                )}
            </div>
        </div>
    )
}
