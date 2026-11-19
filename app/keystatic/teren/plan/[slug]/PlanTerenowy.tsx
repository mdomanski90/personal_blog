'use client'
// P7b (TER-01): plan w terenie. Lekki widok zamiast pełnego edytora: rysunek planu, położenie z telefonu, wybór grobu
// dotknięciem i pojedyncze czynności (zdjęcie, napis, notatka, „sprawdzony” dla redakcji) wysyłane do
// /api/keystatic/plany/<slug>/teren. Plan w telefonie aktualizuje ta sama czysta funkcja co na serwerze (lib/teren/czynnosci.ts).
import * as React from 'react'
import Link from 'next/link'
import { Camera, Check, ChevronLeft, ChevronRight, LocateFixed, Maximize, Minus, Plus } from 'lucide-react'
import { RysunekPlanu, Wzory, kadr } from '@/app/components/plan/Rysunek'
import { geoNaPlan, jednostka, punktyElementu, skalaZGeo, srodek, type Element, type Pkt, type Plan } from '@/lib/plany/model'
import { kolejnoDoPracy, numerTekst, numeryPlanu } from '@/lib/plany/numeracja'
import { etapElementu } from '@/lib/plany/statusy'
import { katalog, typGrobu, type UstawieniaPlanow } from '@/lib/plany/typy'
import { zastosujCzynnosc, type Czynnosc, type WpisDziennika } from '@/lib/teren/czynnosci'
import { BRAK_SIECI, Blad, nowyId, useTeren } from '../../wspolne'

type Dane = { plan: Plan; ustawienia: UstawieniaPlanow; sprawdzony: boolean }
type Filtr = '' | 'bezZdjecia' | 'niesprawdzone' | 'bezNapisu'
const FILTRY: [Filtr, string][] = [['', 'wszystkie'], ['bezZdjecia', 'bez zdjęcia'], ['niesprawdzone', 'niesprawdzone'], ['bezNapisu', 'bez napisu']]
type Vb = [number, number, number, number]

export default function PlanTerenowy({ slug }: { slug: string }) {
    const adres = `/api/keystatic/plany/${slug}/teren`
    const { dane, blad } = useTeren<Dane>(adres)
    const [plan, ustawPlan] = React.useState<Plan | null>(null)
    const [vb, ustawVb] = React.useState<Vb | null>(null)
    const [wybrany, ustawWybrany] = React.useState<string | null>(null)
    const [filtr, ustawFiltr] = React.useState<Filtr>('')
    const [pozycja, ustawPozycje] = React.useState<{ lat: number; lon: number; acc: number } | null>(null)
    const [kom, ustawKom] = React.useState('')
    const [pisze, ustawPisze] = React.useState<null | 'napis' | 'notatka'>(null)
    const [tekst, ustawTekst] = React.useState('')
    const [wTrakcie, ustawWTrakcie] = React.useState(false)
    const zmienVb = (f: (v: Vb) => Vb) => ustawVb((v) => (v ? f(v) : v))
    const svg = React.useRef<SVGSVGElement>(null)
    const dotyk = React.useRef(new Map<number, { x: number; y: number }>())
    const ruch = React.useRef<{ przesunieto: boolean; odleglosc: number } | null>(null)
    const prefix = React.useId().replace(/:/g, '')

    React.useEffect(() => {
        if (!dane) return
        const p = { ...dane.plan, obrot: 0 }
        ustawPlan(p); ustawVb(kadr(p))
    }, [dane])
    // położenie z telefonu na planie
    React.useEffect(() => {
        if (!('geolocation' in navigator)) { ustawKom('Ten telefon nie podaje położenia.'); return }
        const id = navigator.geolocation.watchPosition(
            (p) => ustawPozycje({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }),
            () => ustawKom('Nie mam zgody na położenie – włącz ją w ustawieniach przeglądarki. Bez niej nadal możesz wybierać groby dotknięciem.'),
            { enableHighAccuracy: true, maximumAge: 5000 })
        return () => navigator.geolocation.clearWatch(id)
    }, [])

    const typy = React.useMemo(() => katalog(dane?.ustawienia), [dane])
    const numery = React.useMemo(() => (plan ? numeryPlanu(plan) : new Map()), [plan])
    const groby = React.useMemo(() => (plan ? kolejnoDoPracy(plan, typy) : []), [plan, typy])
    const g2p = React.useMemo(() => (plan && plan.geo.length >= 2 ? geoNaPlan(plan.geo) : null), [plan])
    const skala = plan ? plan.skala ?? skalaZGeo(plan.geo) : null
    if (blad) return <div className="tr-glowna"><Blad tekst={blad} /><div className="pn-rzad"><Link className="pn-btn" href="/keystatic/teren">← plany</Link></div></div>
    if (!plan || !vb || !dane) return <div className="tr-glowna"><span className="pn-szary">wczytuję plan…</span></div>

    const u = jednostka(plan), r = Math.max(vb[2], vb[3]) / 60
    const ja: Pkt | null = pozycja && g2p ? g2p(pozycja.lat, pozycja.lon) : null
    const naPlanie = !!ja && ja[0] >= -plan.szer && ja[0] <= plan.szer * 2 && ja[1] >= -plan.wys && ja[1] <= plan.wys * 2
    const e = wybrany ? plan.elementy.find((x) => x.id === wybrany) ?? null : null
    const pasuje = (x: Element, f: Filtr) => (f === 'bezZdjecia' ? !x.zdjecia?.length : f === 'niesprawdzone' ? etapElementu(x) !== 'sprawdzony' || !!x.zTerenu : f === 'bezNapisu' ? !x.napis?.trim() && !x.ograniczony : true)
    const pokaz = (x: Element) => { const [a, b] = srodek(x.g); zmienVb(([, , w, h]) => [a - w / 2, b - h / 2, w, h]) }
    const wybierz = (x: Element) => { ustawWybrany(x.id); ustawPisze(null); ustawKom('') }
    const lupa = (k: number) => zmienVb(([x, y, w, h]) => { const nw = Math.min(Math.max(w * k, u * 6), plan.szer * 4), nh = (h * nw) / w; return [x + (w - nw) / 2, y + (h - nh) / 2, nw, nh] })
    const najblizszy = () => {
        if (!ja) return
        let n: Element | null = null, d = Infinity
        for (const x of groby) { const [a, b] = srodek(x.g), o = Math.hypot(a - ja[0], b - ja[1]); if (o < d) { d = o; n = x } }
        if (n) { wybierz(n); pokaz(n) }
    }
    const nastepny = (krok: 1 | -1) => {
        const L = filtr ? groby.filter((x) => pasuje(x, filtr)) : groby
        if (!L.length) { ustawKom('Żaden grób nie pasuje do wybranego filtra.'); return }
        const i = wybrany ? L.findIndex((x) => x.id === wybrany) : -1
        const n = L[(i + krok + L.length) % L.length] ?? L[0]
        wybierz(n); pokaz(n)
    }

    // ---------- czynności ----------
    const wyslij = async (cz: Czynnosc, plik?: File) => {
        ustawWTrakcie(true); ustawKom(plik ? 'wysyłam zdjęcie…' : 'zapisuję…')
        try {
            let tresc: BodyInit, naglowki: HeadersInit | undefined
            if (plik) { const fd = new FormData(); fd.append('plik', plik); for (const [k, v] of Object.entries(cz)) if (k !== 'plik' && v !== undefined) fd.append(k, String(v)); tresc = fd }
            else { tresc = JSON.stringify(cz); naglowki = { 'Content-Type': 'application/json' } }
            const odp = await fetch(adres, { method: 'POST', headers: naglowki, body: tresc })
            const j = (await odp.json().catch(() => null)) as { wpis?: WpisDziennika; blad?: string } | null
            if (!odp.ok || !j?.wpis) { ustawKom(j?.blad ?? BRAK_SIECI); return false }
            if (j.wpis.wynik === 'do-decyzji') { ustawKom('W tym czasie redakcja poprawiła ten napis. Obie wersje zostały zachowane – wybierze redakcja.'); return true }
            // ten sam plan co na serwerze: czynność nałożona tą samą funkcją
            const pelna: Czynnosc = cz.rodzaj === 'zdjecie' ? { ...cz, plik: j.wpis.plik ?? cz.plik } : cz
            const w = zastosujCzynnosc(plan, pelna, { id: j.wpis.kto, imie: j.wpis.imie, pelne: dane.sprawdzony }, dane.ustawienia)
            if ('plan' in w) ustawPlan(w.plan)
            ustawKom(cz.rodzaj === 'zdjecie' ? 'Zdjęcie zapisane.' : cz.rodzaj === 'napis' ? 'Napis zapisany.' : cz.rodzaj === 'notatka' ? 'Notatka zapisana.' : 'Oznaczono jako sprawdzony.')
            return true
        } catch { ustawKom(BRAK_SIECI); return false } finally { ustawWTrakcie(false) }
    }
    const zdjecie = (f: File) => e && wyslij({ id: nowyId(), rodzaj: 'zdjecie', grob: e.id, plik: 'zdjecie.jpg', ...(pozycja ? { lat: +pozycja.lat.toFixed(6), lon: +pozycja.lon.toFixed(6) } : {}), data: new Date().toISOString().slice(0, 19) }, f)
    const zapiszTekst = async () => {
        if (!e || !pisze) return
        const ok = pisze === 'napis'
            ? await wyslij({ id: nowyId(), rodzaj: 'napis', grob: e.id, napis: tekst, ...(e.ograniczony ? {} : { podstawa: e.napis ?? '' }) })
            : await wyslij({ id: nowyId(), rodzaj: 'notatka', grob: e.id, tekst })
        if (ok) ustawPisze(null)
    }

    // ---------- przesuwanie i powiększanie ----------
    const naPlan = (x: number, y: number): Pkt => { const m = svg.current!.getScreenCTM()!.inverse(); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f] }
    const onDown = (ev: React.PointerEvent<SVGSVGElement>) => {
        ev.currentTarget.setPointerCapture(ev.pointerId)
        dotyk.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
        const P = [...dotyk.current.values()]
        ruch.current = { przesunieto: ruch.current?.przesunieto ?? false, odleglosc: P.length === 2 ? Math.hypot(P[0].x - P[1].x, P[0].y - P[1].y) : 0 }
    }
    const onMove = (ev: React.PointerEvent<SVGSVGElement>) => {
        const przed = dotyk.current.get(ev.pointerId)
        if (!przed || !ruch.current) return
        const dx = ev.clientX - przed.x, dy = ev.clientY - przed.y
        dotyk.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
        const P = [...dotyk.current.values()]
        if (P.length === 2) {
            const o = Math.hypot(P[0].x - P[1].x, P[0].y - P[1].y)
            if (ruch.current.odleglosc > 0 && o > 0) lupa(ruch.current.odleglosc / o)
            ruch.current = { przesunieto: true, odleglosc: o }
            return
        }
        if (!ruch.current.przesunieto && Math.hypot(dx, dy) < 4) { dotyk.current.set(ev.pointerId, przed); return }
        ruch.current.przesunieto = true
        const [a, b] = naPlan(0, 0), [c, d] = naPlan(dx, dy)
        zmienVb(([x, y, w, h]) => [x - (c - a), y - (d - b), w, h])
    }
    const onUp = (ev: React.PointerEvent<SVGSVGElement>) => {
        const byl = dotyk.current.delete(ev.pointerId)
        if (dotyk.current.size > 0 || !byl) return
        const stuk = !ruch.current?.przesunieto
        ruch.current = null
        if (!stuk) return
        const id = (ev.target as globalThis.Element).closest?.('[data-id]')?.getAttribute('data-id')
        const x = id ? plan.elementy.find((q) => q.id === id) : null
        if (x && typGrobu(typy.get(x.typ))) wybierz(x)
    }

    const nr = e ? numery.get(e.id) : null
    const info = [
        pozycja ? (naPlanie ? `±${Math.round(pozycja.acc)} m` : g2p ? 'jesteś poza planem' : 'plan bez punktów położenia') : 'szukam położenia…',
        e ? (nr ? numerTekst(nr) : 'grób bez numeru') : 'dotknij grobu',
        ...(e ? [e.zdjecia?.length ? `${e.zdjecia.length} zdj.` : 'bez zdjęcia', etapElementu(e) === 'sprawdzony' && !e.zTerenu ? 'sprawdzony' : e.zTerenu ? 'czeka na sprawdzenie' : 'niesprawdzony'] : []),
    ].join(' · ')
    const obrys = (x: Element) => punktyElementu(x.g).map((q) => q.join(',')).join(' ')

    return (
        <>
            <div className="tr-plan-gora">
                <Link className="pn-btn pn-btn-maly" href="/keystatic/teren">← plany</Link>
                <h1>{plan.tytul}</h1>
            </div>
            <div className="tr-rysunek">
                <svg ref={svg} viewBox={vb.join(' ')} role="img" aria-label={`plan: ${plan.tytul}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
                    <defs><Wzory prefix={prefix} u={u} /></defs>
                    <RysunekPlanu plan={plan} o={{ prefix, typy, numery, edycja: true, podklady: plan.podklady.filter((p) => p.plik && !p.material).map((p) => ({ p, adres: `/api/keystatic/plany/${slug}/plik/${p.plik}` })) }} />
                    {filtr && groby.filter((x) => pasuje(x, filtr)).map((x) => <polygon key={x.id} points={obrys(x)} className="tr-kolejny" pointerEvents="none" />)}
                    {e && <polygon points={obrys(e)} className="tr-wybrany" pointerEvents="none" />}
                    {ja && naPlanie && <g pointerEvents="none">
                        {skala && pozycja && <circle cx={ja[0]} cy={ja[1]} r={pozycja.acc / skala} className="tr-ja-dokl" />}
                        <circle cx={ja[0]} cy={ja[1]} r={r * 0.9} className="tr-ja" />
                    </g>}
                </svg>
                <div className="tr-lupa">
                    <button type="button" aria-label="powiększ" onClick={() => lupa(0.7)}><Plus aria-hidden /></button>
                    <button type="button" aria-label="pomniejsz" onClick={() => lupa(1.4)}><Minus aria-hidden /></button>
                    <button type="button" aria-label="cały plan" onClick={() => ustawVb(kadr(plan))}><Maximize aria-hidden /></button>
                </div>
            </div>
            <section className="tr-arkusz" aria-label="grób i czynności">
                <div className="tr-arkusz-info">{info}</div>
                {kom && <div className="tr-kom" role="status">{kom}</div>}
                {e && !!e.zdjecia?.length && (
                    <div className="tr-miniatury">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {e.zdjecia.slice(-6).map((z) => <img key={z.plik} src={`/api/keystatic/plany/${slug}/plik/${z.plik}`} alt="zdjęcie tego grobu" loading="lazy" />)}
                    </div>
                )}
                {pisze && e ? (
                    <div className="pn-kol">
                        <label className="tr-pole">{pisze === 'napis' ? 'napis z nagrobka – przepisz dosłownie, wiersz po wierszu' : 'notatka dla redakcji'}
                            <textarea className="pn-in" rows={pisze === 'napis' ? 5 : 3} value={tekst} onChange={(x) => ustawTekst(x.target.value)} autoFocus />
                        </label>
                        {pisze === 'napis' && e.ograniczony && <span className="pn-maly">Napis na tym grobie widzi tylko redakcja – jeśli go przepiszesz, redakcja porówna obie wersje.</span>}
                        <div className="pn-rzad">
                            <button type="button" className="pn-btn pn-btn-gl" disabled={wTrakcie || (pisze === 'notatka' && !tekst.trim())} onClick={zapiszTekst}>zapisz</button>
                            <button type="button" className="pn-btn" onClick={() => ustawPisze(null)}>anuluj</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="pn-rzad">
                            <button type="button" className="pn-btn" disabled={!naPlanie} onClick={() => ja && zmienVb(([, , w, h]) => [ja[0] - w / 2, ja[1] - h / 2, w, h])}><LocateFixed aria-hidden />do mnie</button>
                            <button type="button" className="pn-btn" disabled={!naPlanie} onClick={najblizszy}>najbliższy</button>
                            <label className="pn-btn" aria-disabled={!e || wTrakcie}><Camera aria-hidden />zdjęcie
                                <input className="tr-ukryty" type="file" accept="image/*" capture="environment" disabled={!e || wTrakcie} onChange={(x) => { const f = x.target.files?.[0]; x.target.value = ''; if (f) zdjecie(f) }} />
                            </label>
                            <button type="button" className="pn-btn" disabled={!e} onClick={() => { ustawTekst(e?.napis ?? ''); ustawPisze('napis') }}>napis</button>
                            <button type="button" className="pn-btn" disabled={!e} onClick={() => { ustawTekst(''); ustawPisze('notatka') }}>notatka</button>
                            {dane.sprawdzony && <button type="button" className="pn-btn" disabled={!e || wTrakcie} onClick={() => e && wyslij({ id: nowyId(), rodzaj: 'sprawdzony', grob: e.id })}><Check aria-hidden />sprawdzony</button>}
                            <button type="button" className="pn-btn" aria-label="poprzedni grób" onClick={() => nastepny(-1)}><ChevronLeft aria-hidden /></button>
                            <button type="button" className="pn-btn" onClick={() => nastepny(1)}>następny<ChevronRight aria-hidden /></button>
                        </div>
                        <div className="pn-rzad pn-maly">
                            <span id={`${prefix}-kol`}>kolejne:</span>
                            <span className="pn-seg" role="group" aria-labelledby={`${prefix}-kol`}>{FILTRY.map(([f, t]) => <button key={f} type="button" aria-pressed={filtr === f} onClick={() => ustawFiltr(f)}>{t}</button>)}</span>
                        </div>
                        {e && !e.ograniczony && e.napis?.trim() && <pre className="tr-napis">{e.napis}</pre>}
                    </>
                )}
            </section>
        </>
    )
}
