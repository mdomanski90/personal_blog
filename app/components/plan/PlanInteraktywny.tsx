'use client'

// Plan obiektu na stronie: przybliżanie, wyszukiwanie nazwisk, podpowiedź po najechaniu, karta grobu z boku planu
// (napis z nagrobka, weryfikacja w źródłach, zdjęcia, poprzedni/następny), groby rodziny z drzewa,
// legenda z przełącznikami, eksport do PNG i druk (PDF), informacja albo prośba czytelnika.

import * as React from 'react'
import { doSzukania, numeracja, punktyElementu, srodek, jednostka, type Element, type Numer, type Plan } from '@/lib/plany/model'
import { katalog, GRUPY, typGrobu, type TypElementu, type UstawieniaPlanow } from '@/lib/plany/typy'
import type { OsobaNaPlanie, KrewnyNaPlanie } from '@/lib/plany/rodzina'
import { kadr, Podzialka, RysunekPlanu, Wzory } from './Rysunek'
import { Probka, WzoryProbek } from './Probka'
import PoleSzukania from '../PoleSzukania'

type VB = [number, number, number, number]

const przycisk = 'border border-[#d6d1c6] dark:border-[#4b5563] bg-[#fdfcf9] dark:bg-[#111827] text-current'
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
export const numerTekst = (n?: Numer) => (n ? `${n.kwatera ? `kwatera ${n.kwatera} · ` : ''}rząd ${n.rzad} · miejsce ${n.miejsce}` : '')
export const numerKrotki = (n?: Numer) => (n ? `${n.kwatera ? n.kwatera + '/' : ''}${n.rzad}/${n.miejsce}` : '')

export default function PlanInteraktywny({ plan, ustawienia, zalogowany, wysokosc = 'min(74vh, 700px)', osoby = {}, pokazGrob }: {
    plan: Plan
    ustawienia: UstawieniaPlanow
    zalogowany: boolean
    wysokosc?: string
    /** osoby z drzewa przypięte do grobów (tylko widoczne dla czytelnika) */
    osoby?: Record<string, OsobaNaPlanie>
    /** z zewnątrz (lista pochowanych): pokaż ten grób */
    pokazGrob?: { id: string; n: number } | null
}) {
    const typy = React.useMemo(() => katalog(ustawienia), [ustawienia])
    const ukryteTypy = React.useMemo(() => new Set(ustawienia.ukryteTypy), [ustawienia])
    const prefix = `pl-${plan.slug}`
    const u = jednostka(plan)
    const pelny = React.useMemo(() => kadr(plan), [plan])
    const [vb, ustawVb] = React.useState<VB>(pelny)
    const [wylaczone, ustawWylaczone] = React.useState<Set<string>>(new Set())
    const [wybrany, ustawWybrany] = React.useState<string | null>(null)
    const [rodzinaDla, ustawRodzinaDla] = React.useState<string | null>(null)
    const [szukaj, ustawSzukaj] = React.useState('')
    const [podklad, ustawPodklad] = React.useState(false)
    const [nad, ustawNad] = React.useState<{ tekst: string; x: number; y: number } | null>(null)
    const [foto, ustawFoto] = React.useState<number | null>(null)
    const svgRef = React.useRef<SVGSVGElement>(null)
    const ramkaRef = React.useRef<HTMLDivElement>(null)
    const numery = React.useMemo(() => numeracja(plan, typy), [plan, typy])
    const elementy = React.useMemo(() => new Map(plan.elementy.map((e) => [e.id, e])), [plan])

    // groby w kolejności kwatera → rząd → miejsce (poprzedni / następny)
    const kolejno = React.useMemo(() => plan.elementy.filter((e) => numery.has(e.id)).sort((a, b) => {
        const p = numery.get(a.id)!, q = numery.get(b.id)!
        return p.kwatera.localeCompare(q.kwatera, 'pl', { numeric: true }) || p.rzad - q.rzad || p.miejsce - q.miejsce
    }), [plan, numery])

    // legenda: tylko typy użyte na planie, w kolejności katalogu
    const uzyte = React.useMemo(() => {
        const ile = new Map<string, number>()
        for (const e of plan.elementy) if (typy.has(e.typ) && !ukryteTypy.has(e.typ)) ile.set(e.typ, (ile.get(e.typ) ?? 0) + 1)
        return [...typy.values()].filter((t) => ile.has(t.id) && t.rys !== 'napis').map((t) => ({ t, n: ile.get(t.id)! }))
            .sort((a, b) => GRUPY.indexOf(a.t.grupa) - GRUPY.indexOf(b.t.grupa))
    }, [plan, typy, ukryteTypy])

    const trafienia = React.useMemo(() => {
        const q = norm(szukaj.trim())
        if (q.length < 2) return [] as Element[]
        return plan.elementy.filter((e) => doSzukania(e).includes(q))
    }, [szukaj, plan])
    const wyroznione = React.useMemo(() => new Set(trafienia.map((e) => e.id)), [trafienia])
    // stan opracowania planu: ile grobów, ile z odczytanym napisem (pokazany nad planem)
    const stan = React.useMemo(() => {
        const groby = plan.elementy.filter((e) => typGrobu(typy.get(e.typ)))
        const odczytane = groby.filter((e) => e.osoby?.length || e.nazwa || e.napis).length
        const ograniczone = groby.filter((e) => e.ograniczony).length
        return { groby: groby.length, odczytane, ograniczone }
    }, [plan, typy])
    const odm = (n: number, f: [string, string, string]) => `${n} ${n === 1 ? f[0] : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? f[1] : f[2]}`
    const el = wybrany ? elementy.get(wybrany) ?? null : null

    // ---------- groby rodziny ----------
    const grobOsoby = React.useCallback((osobaId: string) => plan.elementy.find((e) => e.osoby?.some((o) => o.id === osobaId)) ?? null, [plan])
    const rodzinaGrobu = React.useCallback((elId: string) => {
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
    const zoom = React.useCallback((f: number, cx?: number, cy?: number) => {
        ustawVb(([x, y, w, h]) => {
            const nw = Math.min(pelny[2] * 1.3, Math.max(u * 6, w * f)), k = nw / w
            const px = cx ?? x + w / 2, py = cy ?? y + h / 2
            return [px - (px - x) * k, py - (py - y) * k, nw, h * k]
        })
    }, [pelny, u])
    const ruch = React.useRef<{ wsk: Map<number, [number, number]>; start?: { x: number; y: number; vb: VB }; pinch?: { d: number; vb: VB; c: [number, number] }; przesuniety: boolean }>({ wsk: new Map(), przesuniety: false })

    const opisElementu = (e: Element): string => {
        const t = typy.get(e.typ), n = numery.get(e.id)
        if (typGrobu(t)) {
            const kto = e.ograniczony ? 'grób – napis dla bliskich' : e.osoby?.map((o) => o.nazwa).filter(Boolean).join(', ') || e.nazwa || (e.napis ? e.napis.split('\n').find((l) => /\p{L}{3,}/u.test(l))?.trim() : '') || 'grób'
            return `${kto}${n ? ` · ${numerKrotki(n)}` : ''}`
        }
        return e.nazwa || t?.nazwa || ''
    }
    const pointerDown = (e: React.PointerEvent) => {
        const r = ruch.current
        r.wsk.set(e.pointerId, [e.clientX, e.clientY])
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
            const tekst = x ? opisElementu(x) : ''
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
            const id = (e.target as globalThis.Element).closest('[data-id]')?.getAttribute('data-id')
            ustawWybrany(id ?? null)
            if (!id) ustawRodzinaDla(null)
        }
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

    const pokazElement = React.useCallback((e: Element, zostawRodzine = false) => {
        ustawWybrany(e.id)
        if (!zostawRodzine) ustawRodzinaDla(null)
        if (plan.obrot) return
        const pts = punktyElementu(e.g), xs = pts.map((p) => p[0])
        const [cx, cy] = srodek(e.g)
        ustawVb(([x0, y0, w0, h0]) => {
            // przybliż, jeśli trzeba; nie oddalaj, gdy czytelnik już przybliżył
            const w = Math.min(w0, Math.max(u * 14, (Math.max(...xs) - Math.min(...xs)) * 4)), h = (w * h0) / w0
            const widac = cx > x0 + w0 * 0.1 && cx < x0 + w0 * 0.9 && cy > y0 + h0 * 0.1 && cy < y0 + h0 * 0.9
            return widac && w === w0 ? [x0, y0, w0, h0] : [cx - w / 2, cy - h / 2, w, h]
        })
    }, [plan.obrot, u])

    // link do grobu: ?grob=<id> – zaznacza grób i przybliża
    React.useEffect(() => {
        const id = new URLSearchParams(window.location.search).get('grob')
        const e = id ? elementy.get(id) : null
        if (e) pokazElement(e)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    React.useEffect(() => {
        const e = pokazGrob ? elementy.get(pokazGrob.id) : null
        if (e) pokazElement(e)
    }, [pokazGrob, elementy, pokazElement])

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
        tlo.style.fill = getComputedStyle(document.documentElement).getPropertyValue('--pl-papier') || '#f6f3ec'
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
    const drukuj = () => {
        ustawVb(pelny)
        document.body.classList.add('drukuj-plan')
        setTimeout(() => { window.print(); document.body.classList.remove('drukuj-plan') }, 100)
    }

    const pokaz = (e: Element) => !wylaczone.has(e.typ)
    const podkladyDoPokazania = podklad ? plan.podklady.map((p) => ({ p, adres: `/plany/${plan.slug}/podklad/${p.plik}` })) : undefined
    const cx = plan.szer / 2, cy = plan.wys / 2

    return (
        <div className="plan-do-druku flex flex-col" style={{ gap: 10 }}>
            <WzoryProbek prefix={`${prefix}-sw`} />
            {stan.groby > 0 && (
                <p className="plan-bez-druku text-gray-600 dark:text-gray-400" style={{ margin: 0, fontSize: 13 }}>
                    na planie {odm(stan.groby, ['grób', 'groby', 'grobów'])} · {stan.odczytane === 0 ? 'napisy nie zostały jeszcze odczytane' : `odczytane napisy: ${stan.odczytane}`}{stan.ograniczone ? ` · ${odm(stan.ograniczone, ['grób', 'groby', 'grobów'])} z napisem tylko dla bliskich` : ''}{stan.odczytane + stan.ograniczone < stan.groby ? ' – plan jest w opracowaniu' : ''}
                </p>
            )}
            <div className="plan-bez-druku flex flex-wrap items-center" style={{ gap: 8 }}>
                <PoleSzukania value={szukaj} onChange={ustawSzukaj} onSubmit={() => { if (trafienia[0]) pokazElement(trafienia[0]) }} placeholder="nazwisko, imię, rok – na tym planie" style={{ flex: '1 1 260px', maxWidth: 420 }} />
                {szukaj.trim().length >= 2 && <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: 13 }}>{trafienia.length ? `znaleziono: ${trafienia.length}` : stan.odczytane + stan.ograniczone < stan.groby ? 'nic nie znaleziono – to nie znaczy, że tej osoby tu nie pochowano: nie wszystkie napisy są już odczytane' : 'nic nie znaleziono'}</span>}
                <span style={{ flex: 1 }} />
                {plan.podklady.length > 0 && <label className="inline-flex items-center" style={{ gap: 6, fontSize: 13 }}><input type="checkbox" checked={podklad} onChange={(e) => ustawPodklad(e.target.checked)} /> podkład</label>}
                <button type="button" onClick={doPng} className={`${przycisk} rounded-[7px]`} style={{ height: 28, padding: '0 10px', fontSize: 13 }}>pobierz PNG</button>
                <button type="button" onClick={drukuj} className={`${przycisk} rounded-[7px]`} style={{ height: 28, padding: '0 10px', fontSize: 13 }}>drukuj / PDF</button>
            </div>
            {trafienia.length > 0 && (
                <div className="plan-bez-druku flex flex-wrap" style={{ gap: 6 }}>
                    {trafienia.slice(0, 16).map((e) => (
                        <button key={e.id} type="button" onClick={() => pokazElement(e)} aria-pressed={e.id === wybrany} className={`${przycisk} rounded-[7px] plan-traf`} style={{ height: 28, padding: '0 8px', fontSize: 13 }}>{opisElementu(e)}</button>
                    ))}
                    {trafienia.length > 16 && <span className="text-gray-500" style={{ fontSize: 13, alignSelf: 'center' }}>i {trafienia.length - 16} więcej – zawęź</span>}
                </div>
            )}
            <div className="plan-uklad" style={{ height: wysokosc }}>
                <div ref={ramkaRef} className="plan-ramka" onPointerLeave={() => ustawNad(null)}>
                    <svg ref={svgRef} viewBox={vb.join(' ')} preserveAspectRatio="xMidYMid meet" role="img" aria-label={plan.tytul}
                        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} style={{ cursor: 'grab' }}>
                        <defs><Wzory prefix={prefix} u={u} /></defs>
                        <rect x={pelny[0] - pelny[2]} y={pelny[1] - pelny[3]} width={pelny[2] * 3} height={pelny[3] * 3} style={{ fill: 'var(--pl-papier)' }} />
                        <RysunekPlanu plan={plan} o={{ prefix, typy, ukryteTypy, pokaz, wyroznione: rodzina ? undefined : wyroznione, wybrane: wybrany ? new Set([wybrany]) : undefined, numery, podklady: podkladyDoPokazania, rodzina: grobyRodziny }} />
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
                    <div className="plan-bez-druku" style={{ position: 'absolute', right: 10, top: 10, display: 'flex', flexDirection: 'column' }}>
                        {[['+', () => zoom(1 / 1.4), 'przybliż'], ['−', () => zoom(1.4), 'oddal'], ['⤢', () => ustawVb(pelny), 'cały plan']].map(([t, f, l], i) => (
                            <button key={i} type="button" aria-label={l as string} onClick={f as () => void} className={przycisk} style={{ width: 32, height: 32, fontSize: 16, marginTop: i ? -1 : 0, borderRadius: i === 0 ? '7px 7px 0 0' : i === 2 ? '0 0 7px 7px' : 0 }}>{t as string}</button>
                        ))}
                    </div>
                    {nad && <div className="plan-podpowiedz plan-bez-druku" style={{ left: nad.x + 14, top: nad.y + 14 }}>{nad.tekst}</div>}
                    <div className="plan-bez-druku text-gray-500" style={{ position: 'absolute', left: 10, bottom: 8, fontSize: 11 }}>najedź – nazwisko · kliknij – karta grobu · przeciągnij – przesuń · Ctrl + kółko – przybliż</div>
                </div>
                {rodzina && rodzinaDla ? (
                    <PanelRodziny rodzina={rodzina} numery={numery} zamknij={() => ustawRodzinaDla(null)} wybierz={(g) => pokazElement(g)} />
                ) : el ? (
                    <Karta key={el.id} el={el} plan={plan} typ={typy.get(el.typ)} numer={numery.get(el.id)} numery={numery} kolejno={kolejno} osoby={osoby} progLat={ustawienia.progLat} zalogowany={zalogowany}
                        zamknij={() => ustawWybrany(null)} idz={(g) => pokazElement(g)} pokazRodzine={() => ustawRodzinaDla(el.id)} rodzinaIle={rodzinaGrobu(el.id)} otworzFoto={ustawFoto} />
                ) : null}
            </div>
            <Legenda uzyte={uzyte} prefix={`${prefix}-sw`} wylaczone={wylaczone} rodzina={!!rodzina} przelacz={(id) => ustawWylaczone((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })} wszystkie={() => ustawWylaczone(new Set())} />
            {el && foto !== null && el.zdjecia?.[foto] && (
                <Galeria plan={plan} el={el} numer={numery.get(el.id)} i={foto} ustaw={ustawFoto} />
            )}
        </div>
    )
}

function Legenda({ uzyte, prefix, wylaczone, przelacz, wszystkie, rodzina }: { uzyte: { t: TypElementu; n: number }[]; prefix: string; wylaczone: Set<string>; przelacz: (id: string) => void; wszystkie: () => void; rodzina: boolean }) {
    if (!uzyte.length) return null
    return (
        // zwinięta – rozwija się po kliknięciu w „legenda”; przy ukrytych typach od razu widać „pokaż wszystko”
        <details className="plan-legenda flex flex-col" style={{ gap: 6 }}>
            <summary className="flex items-baseline" style={{ gap: 12 }}>
                <span className="plan-legenda-tytul">legenda</span>
                {wylaczone.size > 0 && <button type="button" onClick={(e) => { e.preventDefault(); wszystkie() }} className="plan-bez-druku text-[#4c3cc4] dark:text-[#a597ff]" style={{ fontSize: 12, background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>pokaż wszystko</button>}
            </summary>
            <span className="plan-bez-druku text-gray-500" style={{ fontSize: 11, marginTop: 6 }}>kliknij, żeby ukryć albo pokazać</span>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(13rem, 1fr))', gap: '4px 16px', marginTop: 6 }}>
                {uzyte.map(({ t, n }) => (
                    <button key={t.id} type="button" onClick={() => przelacz(t.id)} aria-pressed={!wylaczone.has(t.id)} className="flex items-center text-left text-current" style={{ gap: 9, fontSize: 13, opacity: wylaczone.has(t.id) ? 0.38 : 1, minHeight: 24, background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }}>
                        <Probka typ={t} prefix={prefix} />
                        <span>{t.nazwa.replace(/ \(.*\)$/, '')}{n > 1 && <span className="text-gray-500"> · {n}</span>}</span>
                    </button>
                ))}
                {rodzina && <span className="flex items-center" style={{ gap: 9, fontSize: 13 }}><span className="plan-rodzina-probka" aria-hidden="true" />grób rodziny</span>}
            </div>
        </details>
    )
}

type Rodzina = { wlasne: OsobaNaPlanie[]; krewni: (KrewnyNaPlanie & { grob: Element | null; wzgledem: string })[] }

function PanelRodziny({ rodzina, numery, zamknij, wybierz }: { rodzina: Rodzina; numery: Map<string, Numer>; zamknij: () => void; wybierz: (e: Element) => void }) {
    const naPlanie = rodzina.krewni.filter((k) => k.grob), poza = rodzina.krewni.filter((k) => !k.grob)
    return (
        <aside className="plan-karta plan-bez-druku" aria-label="rodzina na tym cmentarzu">
            <div className="plan-karta-glowa">
                <div className="flex items-start justify-between" style={{ gap: 12 }}>
                    <div className="flex flex-col" style={{ gap: 2 }}>
                        <span className="text-gray-500" style={{ fontSize: 12 }}>rodzina na tym cmentarzu</span>
                        <b style={{ fontSize: 15 }}>{rodzina.wlasne.map((o) => o.nazwa).join(', ')}</b>
                        <span className="text-gray-500" style={{ fontSize: 12 }}>wg drzewa – tylko osoby połączone z grobem</span>
                    </div>
                    <button type="button" onClick={zamknij} className="plan-karta-x" aria-label="wyłącz groby rodziny">×</button>
                </div>
            </div>
            <div className="plan-karta-tresc">
                {naPlanie.length === 0 && <p className="text-gray-600 dark:text-gray-400" style={{ margin: 0 }}>Nikt z rodziny nie jest jeszcze połączony z grobem na tym planie.</p>}
                {naPlanie.map((k) => (
                    <button key={k.id} type="button" className="plan-krewny" onClick={() => wybierz(k.grob!)}>
                        <span className="plan-rodzina-probka" aria-hidden="true" />
                        <span className="flex flex-col" style={{ gap: 1, minWidth: 0 }}><b>{k.nazwa}</b><span className="text-gray-500" style={{ fontSize: 12 }}>{k.relacja}{k.lata ? ` · ${k.lata}` : ''}{rodzina.wlasne.length > 1 ? ` · (${k.wzgledem})` : ''}</span></span>
                        <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{numerKrotki(numery.get(k.grob!.id))}</span>
                    </button>
                ))}
                {poza.length > 0 && (
                    <div className="flex flex-col" style={{ gap: 6, paddingTop: 12 }}>
                        <span className="plan-etyk">w drzewie, nie ma ich na tym planie</span>
                        {poza.map((k) => <span key={k.id} style={{ fontSize: 13 }}><a href={`/osoby/${k.id}`}>{k.nazwa}</a> <span className="text-gray-500">· {k.relacja}{k.lata ? ` · ${k.lata}` : ''}</span></span>)}
                        <span className="text-gray-500" style={{ fontSize: 12 }}>Wiesz, gdzie są pochowani? Napisz przez „dodaj informację” przy grobie.</span>
                    </div>
                )}
            </div>
        </aside>
    )
}

function Karta({ el, plan, typ, numer, numery, kolejno, osoby, progLat, zalogowany, zamknij, idz, pokazRodzine, rodzinaIle, otworzFoto }: {
    el: Element; plan: Plan; typ?: TypElementu; numer?: Numer; numery: Map<string, Numer>; kolejno: Element[]; osoby: Record<string, OsobaNaPlanie>
    progLat: number; zalogowany: boolean; zamknij: () => void; idz: (e: Element) => void; pokazRodzine: () => void; rodzinaIle: Rodzina; otworzFoto: (i: number) => void
}) {
    const [forma, ustawForme] = React.useState<null | 'informacja' | 'prosba'>(null)
    const [stanWysylki, ustawStanWysylki] = React.useState<'' | 'wyslana' | 'blad'>('')
    const [tresc, ustawTresc] = React.useState('')
    const [kontakt, ustawKontakt] = React.useState('')
    const [skopiowano, ustawSkopiowano] = React.useState(false)
    const wyslij = async () => {
        const r = await fetch('/api/plany/zgloszenie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: plan.slug, element: el.id, tresc, kontakt, rodzaj: forma }) }).catch(() => null)
        ustawStanWysylki(r?.ok ? 'wyslana' : 'blad')
        if (r?.ok) { ustawForme(null); ustawTresc(''); ustawKontakt('') }
    }
    const kopiuj = () => {
        const adres = `${location.origin}${location.pathname}?grob=${encodeURIComponent(el.id)}`
        navigator.clipboard?.writeText(adres).then(() => { ustawSkopiowano(true); setTimeout(() => ustawSkopiowano(false), 1500) }).catch(() => {})
    }
    const i = kolejno.findIndex((x) => x.id === el.id)
    const poprz = i > 0 ? kolejno[i - 1] : null, nast = i >= 0 && i < kolejno.length - 1 ? kolejno[i + 1] : null
    const etykietaSasiada = (x: Element | null) => {
        const n = x ? numery.get(x.id) : undefined
        if (!n || !numer) return ''
        return n.kwatera === numer.kwatera && n.rzad === numer.rzad ? `miejsce ${n.miejsce}` : `rząd ${n.rzad}${n.kwatera !== numer.kwatera ? ` (${n.kwatera || '—'})` : ''}`
    }
    const grob = typGrobu(typ)
    const naglowek = numer ? numerTekst(numer) : typ?.nazwa
    const ileGrobowRodziny = rodzinaIle.krewni.filter((k) => k.grob).length
    const pole: React.CSSProperties = { font: 'inherit', fontSize: 13, padding: '6px 8px', borderRadius: 7, border: '1px solid #d6d1c6', background: 'transparent', color: 'inherit' }

    return (
        <aside className="plan-karta plan-bez-druku" aria-label={grob ? 'karta grobu' : 'opis elementu'}>
            <div className="plan-karta-glowa">
                <div className="flex items-center justify-between" style={{ gap: 8 }}>
                    <span className="text-gray-500" style={{ fontSize: 12 }}>{naglowek}</span>
                    <button type="button" onClick={zamknij} className="plan-karta-x" aria-label="zamknij">×</button>
                </div>
                {(grob || poprz || nast) && (
                    <div className="flex items-center" style={{ gap: 6 }}>
                        {numer && <button type="button" className={`${przycisk} rounded-[7px]`} style={{ height: 26, padding: '0 8px', fontSize: 12 }} disabled={!poprz} onClick={() => poprz && idz(poprz)}>‹ {etykietaSasiada(poprz) || 'poprzedni'}</button>}
                        {numer && <button type="button" className={`${przycisk} rounded-[7px]`} style={{ height: 26, padding: '0 8px', fontSize: 12 }} disabled={!nast} onClick={() => nast && idz(nast)}>{etykietaSasiada(nast) || 'następny'} ›</button>}
                        <span style={{ flex: 1 }} />
                        <button type="button" className={`${przycisk} rounded-[7px]`} style={{ height: 26, padding: '0 8px', fontSize: 12 }} onClick={kopiuj}>{skopiowano ? 'skopiowano' : 'kopiuj link'}</button>
                    </div>
                )}
            </div>
            <div className="plan-karta-tresc">
                {el.ograniczony ? (
                    <p className="text-gray-600 dark:text-gray-400" style={{ margin: 0, lineHeight: 1.5 }}>
                        Napis, nazwiska i zdjęcia tego grobu są widoczne tylko dla bliskich (osoby zmarłe w ciągu ostatnich {progLat} lat albo na nagrobku są wymienione osoby żyjące).
                        {!zalogowany && <> <a href={`/zaloguj?wroc=${encodeURIComponent(typeof location !== 'undefined' ? location.pathname : `/plany/${plan.slug}`)}`}>Zaloguj się</a>.</>}
                    </p>
                ) : (
                    <>
                        {!grob && <b style={{ fontSize: 15 }}>{el.nazwa || typ?.nazwa}</b>}
                        {grob && (el.osoby?.length || el.nazwa) ? (
                            <section className="flex flex-col" style={{ gap: 8 }}>
                                <span className="plan-etyk">pochowani</span>
                                {(el.osoby ?? []).map((o, j) => {
                                    const z = o.id ? osoby[o.id] : undefined
                                    return (
                                        <div key={j} className="flex flex-col" style={{ gap: 1 }}>
                                            {z ? <a href={`/osoby/${o.id}`} style={{ fontWeight: 700, fontSize: 15 }}>{o.nazwa}</a> : <b style={{ fontSize: 15 }}>{o.nazwa}</b>}
                                            {(o.ur || o.zm || z?.zdanie) && <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: 12.5 }}>{[o.ur || o.zm ? `${o.ur ?? '?'} – ${o.zm ?? '?'}` : '', z?.zdanie].filter(Boolean).join(' · ')}</span>}
                                        </div>
                                    )
                                })}
                                {!el.osoby?.length && el.nazwa && <b style={{ fontSize: 15 }}>{el.nazwa}</b>}
                                {rodzinaIle.krewni.length > 0 && <button type="button" onClick={pokazRodzine} className="plan-btn-rodzina">pokaż groby rodziny{ileGrobowRodziny ? ` (${ileGrobowRodziny})` : ''}</button>}
                            </section>
                        ) : null}
                        {el.czas && <span><span className="text-gray-500">czas: </span>{el.czas}</span>}
                        {el.stan && el.stan !== 'istnieje' && <span className="text-gray-500">{el.stan === 'nie-istnieje' ? 'nie istnieje' : 'do sprawdzenia'}</span>}
                        {el.napis && (
                            <section className="flex flex-col" style={{ gap: 6 }}>
                                <div className="flex items-baseline justify-between"><span className="plan-etyk">napis na nagrobku</span><span className="text-gray-500" style={{ fontSize: 11 }}>transkrypcja dosłowna</span></div>
                                <pre className="plan-napis">{el.napis}</pre>
                            </section>
                        )}
                        {el.zrodla && (
                            <section className="flex flex-col" style={{ gap: 6 }}>
                                <span className="plan-etyk">weryfikacja w źródłach</span>
                                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.55, fontSize: 13 }}>{el.zrodla}</p>
                            </section>
                        )}
                        {el.opis && <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{el.opis}</p>}
                        {grob && !el.osoby?.length && !el.nazwa && !el.napis && <p className="text-gray-500" style={{ margin: 0 }}>Napis nie został jeszcze odczytany.</p>}
                        {el.zdjecia && el.zdjecia.length > 0 && (
                            <section className="flex flex-col" style={{ gap: 6 }}>
                                <span className="plan-etyk">zdjęcia</span>
                                <div className="flex flex-wrap" style={{ gap: 8 }}>
                                    {el.zdjecia.map((z, j) => (
                                        <button key={z.plik} type="button" onClick={() => otworzFoto(j)} aria-label={`powiększ zdjęcie ${j + 1}`} style={{ padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={`/plany/${plan.slug}/zdjecie/${z.plik}`} alt="" style={{ height: 84, borderRadius: 6, display: 'block' }} loading="lazy" />
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
                {grob && (
                    <div className="flex flex-col" style={{ gap: 6, borderTop: '1px solid #e7e2d8', paddingTop: 10, marginTop: 2 }}>
                        {stanWysylki === 'wyslana' && <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: 13 }}>Dziękuję – wiadomość trafiła do autora strony.</span>}
                        {stanWysylki === 'blad' && <span style={{ fontSize: 13, color: '#b91c1c' }}>Nie udało się wysłać. Spróbuj za chwilę.</span>}
                        {forma === null && <>
                            <button type="button" onClick={() => { ustawForme('informacja'); ustawStanWysylki('') }} className="plan-link" style={{ fontSize: 13 }}>znasz tę osobę albo masz zdjęcie? dodaj informację</button>
                            <button type="button" onClick={() => { ustawForme('prosba'); ustawStanWysylki('') }} className="plan-link text-gray-600 dark:text-gray-400" style={{ fontSize: 12 }}>poproś o usunięcie albo poprawkę</button>
                        </>}
                        {forma !== null && (
                            <div className="flex flex-col" style={{ gap: 6 }}>
                                <textarea value={tresc} onChange={(e) => ustawTresc(e.target.value)} rows={4} maxLength={2000} style={pole}
                                    placeholder={forma === 'informacja' ? 'Co wiesz o pochowanych? Daty, rodzina, poprawny odczyt napisu. Zdjęcie – napisz, jak możesz je przesłać.' : 'Czego dotyczy prośba? (np. jestem z rodziny i proszę o ukrycie napisu)'} />
                                <input value={kontakt} onChange={(e) => ustawKontakt(e.target.value)} maxLength={200} placeholder="kontakt do Ciebie (nieobowiązkowy, nie będzie pokazany)" style={pole} />
                                <div className="flex" style={{ gap: 8 }}>
                                    <button type="button" onClick={wyslij} disabled={tresc.trim().length < 3} className={`${przycisk} rounded-[7px]`} style={{ height: 28, padding: '0 10px', fontSize: 13 }}>wyślij</button>
                                    <button type="button" onClick={() => ustawForme(null)} className="border border-[#d6d1c6] dark:border-[#4b5563] rounded-[7px] text-current" style={{ height: 28, padding: '0 10px', fontSize: 13, background: 'transparent', cursor: 'pointer' }}>anuluj</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
    )
}

/** Zdjęcie nagrobka w powiększeniu, obok napis do porównania. Esc zamyka, strzałki przewijają. */
function Galeria({ plan, el, numer, i, ustaw }: { plan: Plan; el: Element; numer?: Numer; i: number; ustaw: (i: number | null) => void }) {
    const L = el.zdjecia ?? []
    React.useEffect(() => {
        const k = (e: KeyboardEvent) => {
            if (e.key === 'Escape') ustaw(null)
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
        <div className="plan-galeria" role="dialog" aria-label="zdjęcie nagrobka" onClick={(e) => { if (e.target === e.currentTarget) ustaw(null) }}>
            <div className="flex items-center" style={{ gap: 12, color: '#e8e6e1' }}>
                <span style={{ fontSize: 13 }}>{plan.tytul}{numer ? ` · ${numerTekst(numer)}` : ''}</span>
                <span style={{ flex: 1 }} />
                {L.length > 1 && <span style={{ fontSize: 12.5, color: '#a3a09a' }}>zdjęcie {i + 1} z {L.length}</span>}
                <button type="button" onClick={() => ustaw(null)} className="plan-galeria-btn">zamknij (Esc)</button>
            </div>
            <div className="plan-galeria-srodek">
                <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {i > 0 && <button type="button" aria-label="poprzednie zdjęcie" onClick={() => ustaw(i - 1)} className="plan-galeria-btn" style={{ position: 'absolute', left: 0, width: 44, height: 44, fontSize: 18 }}>‹</button>}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/plany/${plan.slug}/zdjecie/${z.plik}`} alt="zdjęcie nagrobka" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }} />
                    {i < L.length - 1 && <button type="button" aria-label="następne zdjęcie" onClick={() => ustaw(i + 1)} className="plan-galeria-btn" style={{ position: 'absolute', right: 0, width: 44, height: 44, fontSize: 18 }}>›</button>}
                </div>
                {(el.napis || z.data) && (
                    <aside className="plan-galeria-bok">
                        {el.napis && <><span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a3a09a' }}>napis – do porównania ze zdjęciem</span><pre className="plan-napis plan-napis-ciemny">{el.napis}</pre></>}
                        {z.data && <span style={{ fontSize: 12.5 }}><span style={{ color: '#a3a09a' }}>wykonane: </span>{new Date(z.data).toLocaleDateString('pl-PL')}</span>}
                    </aside>
                )}
            </div>
        </div>
    )
}
