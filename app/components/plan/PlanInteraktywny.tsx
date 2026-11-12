'use client'

// Plan obiektu na stronie: przybliżanie, legenda z przełącznikami, wyszukiwanie nazwisk, karta elementu,
// eksport do PNG i druk (PDF), prośba o usunięcie.

import * as React from 'react'
import { doSzukania, numeracja, punktyElementu, srodek, jednostka, type Element, type Plan } from '@/lib/plany/model'
import { katalog, GRUPY, type TypElementu, type UstawieniaPlanow } from '@/lib/plany/typy'
import { kadr, Podzialka, RysunekPlanu, Wzory } from './Rysunek'
import { Probka, WzoryProbek } from './Probka'

type VB = [number, number, number, number]

const przycisk = 'border border-[#d1d5db] dark:border-[#4b5563] bg-white dark:bg-[#111827] text-current'
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')

export default function PlanInteraktywny({ plan, ustawienia, zalogowany, maly = false }: { plan: Plan; ustawienia: UstawieniaPlanow; zalogowany: boolean; maly?: boolean }) {
    const typy = React.useMemo(() => katalog(ustawienia), [ustawienia])
    const ukryteTypy = React.useMemo(() => new Set(ustawienia.ukryteTypy), [ustawienia])
    const prefix = `pl-${plan.slug}`
    const u = jednostka(plan)
    const pelny = React.useMemo(() => kadr(plan), [plan])
    const [vb, ustawVb] = React.useState<VB>(pelny)
    const [wylaczone, ustawWylaczone] = React.useState<Set<string>>(new Set())
    const [wybrany, ustawWybrany] = React.useState<string | null>(null)
    const [szukaj, ustawSzukaj] = React.useState('')
    const [podklad, ustawPodklad] = React.useState(false)
    const svgRef = React.useRef<SVGSVGElement>(null)
    const numery = React.useMemo(() => numeracja(plan, typy), [plan, typy])

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
    const el = wybrany ? plan.elementy.find((e) => e.id === wybrany) ?? null : null

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

    const pointerDown = (e: React.PointerEvent) => {
        const r = ruch.current
        r.wsk.set(e.pointerId, [e.clientX, e.clientY])
        ;(e.currentTarget as globalThis.Element).setPointerCapture(e.pointerId)
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
        if (!r.wsk.has(e.pointerId)) return
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

    const pokazElement = (e: Element) => {
        ustawWybrany(e.id)
        const pts = punktyElementu(e.g), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
        const w = Math.max(u * 14, (Math.max(...xs) - Math.min(...xs)) * 4), [cx, cy] = srodek(e.g)
        const h = (w * pelny[3]) / pelny[2]
        if (plan.obrot) { ustawVb(pelny); return }
        ustawVb([cx - w / 2, cy - h / 2, w, h])
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

    const pokaz = React.useCallback((e: Element) => !wylaczone.has(e.typ), [wylaczone])
    const podkladyDoPokazania = podklad ? plan.podklady.map((p) => ({ p, adres: `/plany/${plan.slug}/podklad/${p.plik}` })) : undefined
    const wysokosc = maly ? 'min(60vh, 420px)' : 'min(78vh, 760px)'

    return (
        <div className="plan-do-druku flex flex-col" style={{ gap: 12 }}>
            <WzoryProbek prefix={`${prefix}-sw`} />
            {!maly && (
                <div className="plan-bez-druku flex flex-wrap items-center" style={{ gap: 8 }}>
                    <input type="search" value={szukaj} onChange={(e) => ustawSzukaj(e.target.value)} placeholder="szukaj nazwiska na planie" aria-label="szukaj nazwiska na planie"
                        className={`${przycisk} rounded-[7px]`} style={{ height: 28, padding: '0 10px', minWidth: 220, flex: '1 1 220px', maxWidth: 360, font: 'inherit', fontSize: 14 }} />
                    {szukaj.trim().length >= 2 && <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: 13 }}>{trafienia.length ? `znaleziono: ${trafienia.length}` : 'nic nie znaleziono'}</span>}
                    <span style={{ flex: 1 }} />
                    {plan.podklady.length > 0 && <label className="inline-flex items-center" style={{ gap: 6, fontSize: 13 }}><input type="checkbox" checked={podklad} onChange={(e) => ustawPodklad(e.target.checked)} /> podkład</label>}
                    <button type="button" onClick={doPng} className={`${przycisk} rounded-[7px]`} style={{ height: 28, padding: '0 10px', fontSize: 13 }}>pobierz PNG</button>
                    <button type="button" onClick={drukuj} className={`${przycisk} rounded-[7px]`} style={{ height: 28, padding: '0 10px', fontSize: 13 }}>drukuj / PDF</button>
                </div>
            )}
            {trafienia.length > 0 && (
                <div className="plan-bez-druku flex flex-wrap" style={{ gap: 6 }}>
                    {trafienia.slice(0, 12).map((e) => {
                        const n = numery.get(e.id)
                        return <button key={e.id} type="button" onClick={() => pokazElement(e)} className={`${przycisk} rounded-[7px]`} style={{ height: 28, padding: '0 8px', fontSize: 13 }}>
                            {(e.osoby?.[0]?.nazwa || e.nazwa || (e.opis ?? '').slice(0, 28) || typy.get(e.typ)?.nazwa)}{n ? ` · ${n.kwatera ? n.kwatera + '/' : ''}${n.rzad}/${n.miejsce}` : ''}
                        </button>
                    })}
                </div>
            )}
            <div className={maly ? 'flex flex-col' : 'grid'} style={maly ? { gap: 12 } : { gap: 16, gridTemplateColumns: 'minmax(0,1fr)', alignItems: 'start' }}>
                <div className="plan-ramka" style={{ height: wysokosc }}>
                    <svg ref={svgRef} viewBox={vb.join(' ')} preserveAspectRatio="xMidYMid meet" role="img" aria-label={plan.tytul}
                        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} style={{ cursor: 'grab' }}>
                        <defs><Wzory prefix={prefix} u={u} /></defs>
                        <rect x={pelny[0] - pelny[2]} y={pelny[1] - pelny[3]} width={pelny[2] * 3} height={pelny[3] * 3} style={{ fill: 'var(--pl-papier)' }} />
                        <RysunekPlanu plan={plan} o={{ prefix, typy, ukryteTypy, pokaz, wyroznione, wybrane: wybrany ? new Set([wybrany]) : undefined, numery, podklady: podkladyDoPokazania }} />
                        <Podzialka plan={plan} kadr={pelny} />
                    </svg>
                    <div className="plan-bez-druku" style={{ position: 'absolute', right: 10, top: 10, display: 'flex', flexDirection: 'column' }}>
                        {[['+', () => zoom(1 / 1.4), 'przybliż'], ['−', () => zoom(1.4), 'oddal'], ['⤢', () => ustawVb(pelny), 'cały plan']].map(([t, f, l], i) => (
                            <button key={i} type="button" aria-label={l as string} onClick={f as () => void} className={przycisk} style={{ width: 32, height: 32, fontSize: 16, marginTop: i ? -1 : 0, borderRadius: i === 0 ? '7px 7px 0 0' : i === 2 ? '0 0 7px 7px' : 0 }}>{t as string}</button>
                        ))}
                    </div>
                    {!maly && <div className="plan-bez-druku text-gray-500" style={{ position: 'absolute', left: 10, bottom: 8, fontSize: 11 }}>przeciągnij, żeby przesunąć · Ctrl + kółko albo dwa palce przybliżają</div>}
                </div>
                {el && <Karta el={el} plan={plan} typ={typy.get(el.typ)} numer={numery.get(el.id)} progLat={ustawienia.progLat} zalogowany={zalogowany} zamknij={() => ustawWybrany(null)} />}
                <Legenda uzyte={uzyte} prefix={`${prefix}-sw`} wylaczone={wylaczone} przelacz={(id) => ustawWylaczone((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })} wszystkie={() => ustawWylaczone(new Set())} />
            </div>
        </div>
    )
}

function Legenda({ uzyte, prefix, wylaczone, przelacz, wszystkie }: { uzyte: { t: TypElementu; n: number }[]; prefix: string; wylaczone: Set<string>; przelacz: (id: string) => void; wszystkie: () => void }) {
    if (!uzyte.length) return null
    return (
        <div className="flex flex-col" style={{ gap: 6 }}>
            <div className="flex items-baseline" style={{ gap: 12 }}>
                <span className="text-gray-500 uppercase" style={{ fontSize: 11, letterSpacing: '0.08em' }}>legenda</span>
                {wylaczone.size > 0 && <button type="button" onClick={wszystkie} className="plan-bez-druku text-blue-700 dark:text-blue-400" style={{ fontSize: 12, background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>pokaż wszystko</button>}
                <span className="plan-bez-druku text-gray-500" style={{ fontSize: 11 }}>kliknij, żeby ukryć albo pokazać</span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(13rem, 1fr))', gap: '4px 16px' }}>
                {uzyte.map(({ t, n }) => (
                    <button key={t.id} type="button" onClick={() => przelacz(t.id)} aria-pressed={!wylaczone.has(t.id)} className="flex items-center text-left text-current" style={{ gap: 9, fontSize: 13, opacity: wylaczone.has(t.id) ? 0.38 : 1, minHeight: 24, background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }}>
                        <Probka typ={t} prefix={prefix} />
                        <span>{t.nazwa.replace(/ \(.*\)$/, '')}{n > 1 && <span className="text-gray-500"> · {n}</span>}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}

function Karta({ el, plan, typ, numer, progLat, zalogowany, zamknij }: { el: Element; plan: Plan; typ?: TypElementu; numer?: { kwatera: string; rzad: number; miejsce: number }; progLat: number; zalogowany: boolean; zamknij: () => void }) {
    const [prosba, ustawProsbe] = React.useState<'zamknieta' | 'otwarta' | 'wyslana' | 'blad'>('zamknieta')
    const [tresc, ustawTresc] = React.useState('')
    const [kontakt, ustawKontakt] = React.useState('')
    React.useEffect(() => { ustawProsbe('zamknieta'); ustawTresc(''); ustawKontakt('') }, [el.id])
    const wyslij = async () => {
        const r = await fetch('/api/plany/zgloszenie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: plan.slug, element: el.id, tresc, kontakt }) }).catch(() => null)
        ustawProsbe(r?.ok ? 'wyslana' : 'blad')
    }
    const naglowek = numer ? `${numer.kwatera ? `kwatera ${numer.kwatera} · ` : ''}rząd ${numer.rzad} · miejsce ${numer.miejsce}` : typ?.nazwa
    const pole = { font: 'inherit', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 7, padding: '6px 8px', background: 'transparent', color: 'inherit', width: '100%' } as const
    return (
        <div className="plan-bez-druku border border-[#d1d5db] dark:border-[#4b5563] rounded-[8px] bg-white dark:bg-[#111827]" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
            <div className="flex items-start justify-between" style={{ gap: 12 }}>
                <div className="flex flex-col" style={{ gap: 2 }}>
                    <span className="text-gray-500" style={{ fontSize: 12 }}>{naglowek}</span>
                    <b style={{ fontSize: 15 }}>{el.osoby?.map((o) => o.nazwa).join(', ') || el.nazwa || typ?.nazwa}</b>
                </div>
                <button type="button" onClick={zamknij} aria-label="zamknij" className="text-gray-500" style={{ fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
            {el.ograniczony ? (
                <p className="text-gray-600 dark:text-gray-400" style={{ margin: 0, lineHeight: 1.5 }}>
                    Napis, nazwiska i zdjęcia tego grobu są widoczne tylko dla bliskich (osoby zmarłe w ciągu ostatnich {progLat} lat albo na nagrobku są wymienione osoby żyjące).
                    {!zalogowany && <> <a href={`/zaloguj?wroc=${encodeURIComponent(`/plany/${plan.slug}`)}`} className="text-blue-700 dark:text-blue-400">Zaloguj się</a>.</>}
                </p>
            ) : (
                <>
                    {el.osoby && el.osoby.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>{el.osoby.map((o, i) => <li key={i}>{o.nazwa}{(o.ur || o.zm) && <span className="text-gray-500"> ({o.ur ?? '?'}–{o.zm ?? '?'})</span>}</li>)}</ul>
                    )}
                    {el.czas && <span><span className="text-gray-500">czas: </span>{el.czas}</span>}
                    {el.stan && el.stan !== 'istnieje' && <span className="text-gray-500">{el.stan === 'nie-istnieje' ? 'nie istnieje' : 'do sprawdzenia'}</span>}
                    {el.opis && <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{el.opis}</p>}
                    {el.zdjecia && el.zdjecia.length > 0 && (
                        <div className="flex flex-wrap" style={{ gap: 8 }}>
                            {el.zdjecia.map((z) => (
                                <a key={z.plik} href={`/plany/${plan.slug}/zdjecie/${z.plik}`} target="_blank" rel="noreferrer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`/plany/${plan.slug}/zdjecie/${z.plik}`} alt="zdjęcie nagrobka" style={{ height: 120, borderRadius: 6, display: 'block' }} loading="lazy" />
                                </a>
                            ))}
                        </div>
                    )}
                </>
            )}
            {typ?.grob && (
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 2 }}>
                    {prosba === 'zamknieta' && <button type="button" onClick={() => ustawProsbe('otwarta')} className="text-gray-600 dark:text-gray-400 underline" style={{ fontSize: 12 }}>zgłoś prośbę o usunięcie albo poprawkę</button>}
                    {prosba === 'otwarta' && (
                        <div className="flex flex-col" style={{ gap: 6 }}>
                            <textarea value={tresc} onChange={(e) => ustawTresc(e.target.value)} rows={3} maxLength={2000} placeholder="Czego dotyczy prośba? (np. jestem z rodziny i proszę o ukrycie napisu)" style={pole} />
                            <input value={kontakt} onChange={(e) => ustawKontakt(e.target.value)} maxLength={200} placeholder="kontakt do Ciebie (nieobowiązkowy, nie będzie pokazany)" style={pole} />
                            <div className="flex" style={{ gap: 8 }}>
                                <button type="button" onClick={wyslij} disabled={tresc.trim().length < 3} className="border border-[#d1d5db] dark:border-[#4b5563] rounded-[7px]" style={{ height: 28, padding: '0 10px', fontSize: 13 }}>wyślij</button>
                                <button type="button" onClick={() => ustawProsbe('zamknieta')} className="text-gray-500" style={{ fontSize: 13 }}>anuluj</button>
                            </div>
                        </div>
                    )}
                    {prosba === 'wyslana' && <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: 13 }}>Dziękuję – prośba trafiła do autora strony.</span>}
                    {prosba === 'blad' && <span style={{ fontSize: 13, color: '#b91c1c' }}>Nie udało się wysłać. Spróbuj za chwilę.</span>}
                </div>
            )}
        </div>
    )
}
