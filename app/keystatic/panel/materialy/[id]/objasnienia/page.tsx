'use client'
import { obrysKsztaltu, poprawKsztalt, type Ksztalt } from '@/lib/objasnienia-widok'
import PolePowiazan, { CSS_POLA_POWIAZAN, type CelPowiazania } from '../../../../wspolne/PolePowiazan'
// Objaśnienia na skanach materiału: zaznaczanie fragmentu (Annotorious na OpenSeadragonie) i opis – odczyt, tłumaczenie,
// objaśnienie, pieczęć; powiązania z osobami, miejscami, tematami; kto opracował, weryfikacja w źródłach, widoczność.
// Zapis automatyczny (W3C Web Annotation w content/objasnienia/<id>.json).
import * as React from 'react'
import { useParams } from 'next/navigation'
import type OpenSeadragon from 'openseadragon'
import type { ImageAnnotation, OpenSeadragonAnnotator } from '@annotorious/openseadragon'
import '@annotorious/openseadragon/annotorious-openseadragon.css'
import { JEZYKI, RODZAJE_OBJASNIEN, type RodzajObjasnienia } from '@/lib/objasnienia-widok'
import { odmiana } from '../../../wspolne'

type Strona = { plik: string; podpis?: string; podglad: string }
type Obj = {
    id: string; strona: string; x: number; y: number; w: number; h: number; rodzaj: RodzajObjasnienia; tekst: string; jezyk?: string
    powiazania: string[]; opracowal: string; weryfikacja?: string; widocznosc: 'publiczne' | 'bliscy' | 'ja'; utworzono?: string; zmieniono?: string
    /** PH-01: wielokąt albo punkt w % strony */
    ksztalt?: Ksztalt
}
type Cel = CelPowiazania
type Dane = { id: string; nazwa: string; widocznosc: string; opracowal: string; strony: Strona[]; objasnienia: Obj[]; cele: Cel[]; uzycia?: Record<string, { slug: string; tytul: string; element: string }[]> }

const KLUCZ_AUTORA = 'pn-objasnienia-opracowal'
const noweId = () => `o-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const zaokr = (n: number) => Math.round(n * 1000) / 1000

export default function ObjasnieniaMaterialu() {
    const id = useParams<{ id: string }>()?.id ?? ''
    const api = `/api/keystatic/materialy/${id}/objasnienia`
    const [dane, ustawDane] = React.useState<Dane | null>(null)
    const [lista, ustawListe] = React.useState<Obj[]>([])
    const [strona, ustawStrone] = React.useState(0)
    const [wybrane, ustawWybrane] = React.useState<string | null>(null)
    const [rysuje, ustawRysuje] = React.useState(false)
    // PH-01: prostokąt i wielokąt – rdzeń Annotorious; punkt – własne kliknięcie (bez wtyczki, decyzja PH0 A1)
    const [narzedzie, ustawNarzedzie] = React.useState<'prostokat' | 'wielokat' | 'punkt'>('prostokat')
    const narzRef = React.useRef(narzedzie)
    narzRef.current = narzedzie
    const rysujeRef = React.useRef(rysuje)
    rysujeRef.current = rysuje
    const [stanZapisu, ustawStanZapisu] = React.useState<'' | 'zapisuję…' | 'zapisano' | string>('')
    const [kom, ustawKom] = React.useState('')
    const pole = React.useRef<HTMLDivElement>(null)
    const widz = React.useRef<OpenSeadragon.Viewer | null>(null)
    const anno = React.useRef<OpenSeadragonAnnotator<ImageAnnotation, ImageAnnotation> | null>(null)
    const listaRef = React.useRef(lista)
    listaRef.current = lista
    const stronaRef = React.useRef(strona)
    stronaRef.current = strona
    const wersja = React.useRef(0)

    React.useEffect(() => {
        fetch(api, { cache: 'no-store' }).then(async (r) => {
            const j = await r.json().catch(() => ({}))
            if (!r.ok) { ustawKom(j.blad ?? (r.status === 401 ? 'Brak hasła panelu – odśwież stronę.' : 'Nie udało się wczytać.')); return }
            ustawDane(j)
            ustawListe(j.objasnienia)
        })
    }, [api])

    // zapis automatyczny (po chwili od ostatniej zmiany)
    const zapisz = React.useCallback(async (l: Obj[]) => {
        ustawStanZapisu('zapisuję…')
        const r = await fetch(api, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ objasnienia: l }) }).catch(() => null)
        const j = r ? await r.json().catch(() => ({})) : {}
        ustawStanZapisu(r?.ok ? 'zapisano' : `nie zapisano: ${j.blad ?? (r ? r.status : 'brak połączenia')}`)
    }, [api])
    const zmien = React.useCallback((f: (l: Obj[]) => Obj[]) => {
        ustawListe((l) => f(l))
        wersja.current++
        ustawStanZapisu('zapisuję…')
    }, [])
    React.useEffect(() => {
        if (!dane || !wersja.current) return
        const t = window.setTimeout(() => zapisz(listaRef.current), 700)
        return () => window.clearTimeout(t)
    }, [lista, dane, zapisz])
    React.useEffect(() => {
        const przed = (e: BeforeUnloadEvent) => { if (stanZapisu === 'zapisuję…') e.preventDefault() }
        window.addEventListener('beforeunload', przed)
        return () => window.removeEventListener('beforeunload', przed)
    }, [stanZapisu])

    // procenty strony ↔ piksele wczytanego obrazu
    const rozmiar = () => widz.current?.world.getItemAt(0)?.getContentSize()
    const naAnno = React.useCallback((o: Obj): ImageAnnotation | null => {
        const s = rozmiar(); if (!s) return null
        const x = (o.x / 100) * s.x, y = (o.y / 100) * s.y, w = (o.w / 100) * s.x, h = (o.h / 100) * s.y
        if (o.ksztalt?.k === 'w') {
            const points = o.ksztalt.p.map(([px, py]) => [(px / 100) * s.x, (py / 100) * s.y])
            return { id: o.id, bodies: [], target: { annotation: o.id, selector: { type: 'POLYGON', geometry: { points, bounds: { minX: x, minY: y, maxX: x + w, maxY: y + h } } } } } as unknown as ImageAnnotation
        }
        return { id: o.id, bodies: [], target: { annotation: o.id, selector: { type: 'RECTANGLE', geometry: { x, y, w, h, bounds: { minX: x, minY: y, maxX: x + w, maxY: y + h } } } } } as unknown as ImageAnnotation
    }, [])
    const zAnno = (a: ImageAnnotation): { x: number; y: number; w: number; h: number; ksztalt?: Ksztalt } | null => {
        const s = rozmiar(); const b = a.target.selector.geometry.bounds
        if (!s) return null
        const sel = a.target.selector as unknown as { type: string; geometry: { points?: [number, number][] } }
        if (sel.type === 'POLYGON' && sel.geometry.points && sel.geometry.points.length >= 3) {
            const k = poprawKsztalt({ k: 'w', p: sel.geometry.points.map(([px, py]) => [zaokr(Math.min(100, Math.max(0, (px / s.x) * 100))), zaokr(Math.min(100, Math.max(0, (py / s.y) * 100)))]) })
            if (k) return { ...obrysKsztaltu(k), ksztalt: k }
        }
        const x = Math.max(0, b.minX), y = Math.max(0, b.minY), x2 = Math.min(s.x, b.maxX), y2 = Math.min(s.y, b.maxY)
        return { x: zaokr((x / s.x) * 100), y: zaokr((y / s.y) * 100), w: zaokr(((x2 - x) / s.x) * 100), h: zaokr(((y2 - y) / s.y) * 100) }
    }
    const pokazStrone = React.useCallback(() => {
        const a = anno.current, d = dane
        if (!a || !d) return
        const plik = d.strony[stronaRef.current]?.plik
        a.setAnnotations(listaRef.current.filter((o) => o.strona === plik).map(naAnno).filter((x): x is ImageAnnotation => !!x), true)
    }, [dane, naAnno])

    // przeglądarka + Annotorious
    React.useEffect(() => {
        if (!dane?.strony.length || !pole.current) return
        let zywy = true
        Promise.all([import('openseadragon'), import('@annotorious/openseadragon')]).then(([{ default: OSD }, { createOSDAnnotator }]) => {
            if (!zywy || !pole.current) return
            const v = OSD({
                element: pole.current,
                tileSources: dane.strony.map((s) => ({ type: 'image', url: `${s.podglad}&w=2400` })) as unknown as OpenSeadragon.Options['tileSources'],
                sequenceMode: true,
                showNavigationControl: false,
                showSequenceControl: false,
                visibilityRatio: 0.5,
                minZoomImageRatio: 0.5,
                maxZoomPixelRatio: 4,
                animationTime: 0.3,
                gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: false, scrollToZoom: true },
            })
            const a = createOSDAnnotator<ImageAnnotation, ImageAnnotation>(v, {
                drawingEnabled: false,
                drawingMode: 'drag',
                disableUndoRedoKeys: true,
                userSelectAction: 'EDIT' as never,
                style: { fill: '#4c3cc4', fillOpacity: 0.08, stroke: '#4c3cc4', strokeOpacity: 0.95, strokeWidth: 2 },
            })
            a.setDrawingTool('rectangle')
            // punkt: krótkie kliknięcie na skanie przy włączonym narzędziu „punkt”
            v.addHandler('canvas-click', (e) => {
                const ev = e as unknown as { quick: boolean; position: { x: number; y: number }; preventDefaultAction: boolean }
                if (!ev.quick || !rysujeRef.current || narzRef.current !== 'punkt') return
                ev.preventDefaultAction = true
                const ti = v.world.getItemAt(0), s = ti?.getContentSize()
                if (!ti || !s) return
                const ip = ti.viewportToImageCoordinates(v.viewport.pointFromPixel(new OSD.Point(ev.position.x, ev.position.y), true))
                const k = poprawKsztalt({ k: 'p', x: zaokr((ip.x / s.x) * 100), y: zaokr((ip.y / s.y) * 100) })
                if (k) dodajNowe({ ...obrysKsztaltu(k), ksztalt: k })
            })
            a.on('createAnnotation', (x) => {
                const g = zAnno(x)
                a.removeAnnotation(x.id)
                if (!g || g.w <= 0 || g.h <= 0) { a.setDrawingEnabled(false); ustawRysuje(false); return }
                dodajNowe(g)
            })
            a.on('updateAnnotation', (x) => {
                const g = zAnno(x); if (!g) return
                // punkt pokazany jako mały prostokąt – po przesunięciu zostaje punktem (środek obrysu)
                zmien((l) => l.map((o) => {
                    if (o.id !== x.id) return o
                    if (o.ksztalt?.k === 'p') { const k = poprawKsztalt({ k: 'p', x: zaokr(g.x + g.w / 2), y: zaokr(g.y + g.h / 2) }); return k ? { ...o, ...obrysKsztaltu(k), ksztalt: k } : o }
                    const { ksztalt: _k, ...bez } = o
                    return g.ksztalt ? { ...o, ...g } : { ...bez, ...g }
                }))
            })
            a.on('deleteAnnotation', (x) => zmien((l) => l.filter((o) => o.id !== x.id)))
            a.on('selectionChanged', (s) => { if (s[0]) ustawWybrane(s[0].id) })
            // nowe objaśnienie z zaznaczenia (prostokąt, wielokąt) albo z kliknięcia (punkt)
            function dodajNowe(g: { x: number; y: number; w: number; h: number; ksztalt?: Ksztalt }) {
                if (!a || !dane) return
                a.setDrawingEnabled(false); ustawRysuje(false)
                const plik = dane.strony[stronaRef.current]?.plik
                if (!plik) return
                const nid = noweId()
                let autor = dane.opracowal
                try { autor = localStorage.getItem(KLUCZ_AUTORA) || autor } catch { /* bez pamięci */ }
                const poprzednie = listaRef.current.filter((o) => o.strona === plik).at(-1)
                const o: Obj = { id: nid, strona: plik, ...g, rodzaj: poprzednie?.rodzaj ?? 'odczyt', tekst: '', ...(poprzednie?.jezyk ? { jezyk: poprzednie.jezyk } : {}), powiazania: [], opracowal: autor, widocznosc: 'publiczne' }
                zmien((l) => [...l, o])
                const na = naAnno(o)
                if (na) { a.addAnnotation(na); a.setSelected(nid, true) }
                ustawWybrane(nid)
                window.setTimeout(() => document.getElementById('obj-tekst')?.focus(), 50)
            }
            v.addHandler('open', () => pokazStrone())
            v.addHandler('page', (e) => { ustawStrone((e as unknown as { page: number }).page); ustawWybrane(null) })
            widz.current = v
            anno.current = a
        })
        return () => { zywy = false; anno.current?.destroy(); anno.current = null; widz.current?.destroy(); widz.current = null }
        // przeglądarka tworzona raz dla zestawu stron
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dane?.strony.map((s) => s.plik).join('|')])
    React.useEffect(() => { pokazStrone() }, [pokazStrone])

    const zaznaczaj = () => {
        const a = anno.current; if (!a) return
        const nowy = !rysuje
        a.setDrawingEnabled(nowy && narzedzie !== 'punkt')
        ustawRysuje(nowy)
    }
    const wybierzNarzedzie = (n: 'prostokat' | 'wielokat' | 'punkt') => {
        const a = anno.current
        ustawNarzedzie(n)
        if (n !== 'punkt') a?.setDrawingTool(n === 'wielokat' ? 'polygon' : 'rectangle')
        a?.setDrawingEnabled(rysuje && n !== 'punkt')
    }
    const wybierz = (oid: string) => {
        ustawWybrane(oid)
        anno.current?.setSelected(oid, true)
        anno.current?.fitBoundsWithConstraints(oid, { padding: 80 } as never)
    }
    const usun = (oid: string) => {
        if (!confirm('Usunąć to objaśnienie?')) return
        anno.current?.removeAnnotation(oid)
        zmien((l) => l.filter((o) => o.id !== oid))
        ustawWybrane(null)
    }
    const ustaw = (oid: string, zmiany: Partial<Obj>) => zmien((l) => l.map((o) => (o.id === oid ? { ...o, ...zmiany } : o)))

    if (!dane) return <>{kom ? <div className="pn-kom">{kom}</div> : <span className="pn-szary">wczytuję…</span>}</>
    const plik = dane.strony[strona]?.plik
    const naStronie = lista.filter((o) => o.strona === plik).sort((a, b) => (Math.abs(a.y - b.y) < Math.min(a.h, b.h) / 2 ? a.x - b.x : a.y - b.y))
    const w = lista.find((o) => o.id === wybrane) ?? null
    const ileNa = (p: string) => lista.filter((o) => o.strona === p).length

    return (
        <>
            <div className="pn-rzad" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <a href={`/keystatic/panel/materialy/${dane.id}`} className="pn-maly">← strony skanów</a>
                    <h1>{dane.nazwa}</h1>
                    <span className="pn-maly">objaśnienia na skanach · {odmiana(lista.length, ['objaśnienie', 'objaśnienia', 'objaśnień'])}{stanZapisu ? ` · ${stanZapisu}` : ''}</span>
                </div>
                <span className="pn-rzad">
                    <a className="pn-btn" href={`/archiwum/${dane.id}`} target="_blank" rel="noreferrer">na stronie ↗</a>
                    <a className="pn-btn" href={`/archiwum/${dane.id}/objasnienia.json`} target="_blank" rel="noreferrer">W3C JSON ↗</a>
                </span>
            </div>
            {stanZapisu.startsWith('nie zapisano') && <div className="pn-kom">{stanZapisu}</div>}

            {!dane.strony.length ? (
                <div className="pn-info">Ten materiał nie ma jeszcze stron skanu. <a href={`/keystatic/panel/materialy/${dane.id}`}>Dodaj strony →</a> (objaśnienia rysuje się na stronach z panelu).</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 380px)', gap: 16, alignItems: 'start' }}>
                    <section className="pn-karta" style={{ padding: 12, gap: 10 }}>
                        <div className="pn-rzad" style={{ justifyContent: 'space-between' }}>
                            <span className="pn-rzad">
                                <button className="pn-btn" onClick={() => widz.current?.goToPage(Math.max(0, strona - 1))} disabled={strona === 0} aria-label="poprzednia strona">‹</button>
                                <b>s. {strona + 1} / {dane.strony.length}</b>
                                <button className="pn-btn" onClick={() => widz.current?.goToPage(Math.min(dane.strony.length - 1, strona + 1))} disabled={strona >= dane.strony.length - 1} aria-label="następna strona">›</button>
                                {dane.strony[strona]?.podpis && <span className="pn-maly">{dane.strony[strona].podpis}</span>}
                            </span>
                            <span className="pn-rzad" role="group" aria-label="kształt zaznaczenia">
                                {([['prostokat', 'prostokąt'], ['wielokat', 'wielokąt'], ['punkt', 'punkt']] as const).map(([n, t]) => <button key={n} className={`pn-btn${narzedzie === n ? ' pn-btn-gl' : ''}`} aria-pressed={narzedzie === n} onClick={() => wybierzNarzedzie(n)}>{t}</button>)}
                            </span>
                            <button className={`pn-btn${rysuje ? ' pn-btn-gl' : ''}`} onClick={zaznaczaj}>{rysuje ? `${narzedzie === 'prostokat' ? 'przeciągnij' : narzedzie === 'wielokat' ? 'klikaj wierzchołki, dwuklik kończy' : 'kliknij miejsce'} na skanie… (anuluj)` : '＋ zaznacz fragment'}</button>
                        </div>
                        <div ref={pole} style={{ height: '72vh', minHeight: 420, border: '1px solid var(--linia)', borderRadius: 8, background: 'var(--tlo2)', cursor: rysuje ? 'crosshair' : 'grab' }} />
                        <span className="pn-maly">Kółko – przybliżanie, przeciąganie – przesuwanie. Wybierz kształt i „＋ zaznacz fragment”: prostokąt – przeciągnij wokół wyrazu, linijki, pieczęci; wielokąt – klikaj wierzchołki (np. wzdłuż rzeki), dwuklik kończy; punkt – kliknij miejsce (np. studnia). Kliknięty kształt można przesunąć i zmienić; punkt pokazuje się jako mały kwadrat.</span>
                        {dane.strony.length > 1 && (
                            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: 2 }}>
                                {dane.strony.map((s, i) => (
                                    <button key={s.plik} onClick={() => widz.current?.goToPage(i)} aria-current={i === strona} title={`s. ${i + 1}${s.podpis ? ` – ${s.podpis}` : ''}`}
                                        style={{ flex: '0 0 auto', position: 'relative', width: 56, height: 72, padding: 0, border: '1px solid var(--linia)', borderRadius: 4, overflow: 'hidden', background: 'var(--karta)', cursor: 'pointer', outline: i === strona ? '2px solid var(--tekst)' : undefined, outlineOffset: 1 }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={s.podglad} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                        {ileNa(s.plik) > 0 && <span className="pn-licznik" style={{ position: 'absolute', right: 2, bottom: 2 }}>{ileNa(s.plik)}</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    <section style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 12 }}>
                        <div className="pn-karta" style={{ padding: 12, gap: 6 }}>
                            <h2>na tej stronie</h2>
                            {!naStronie.length && <span className="pn-maly">Brak objaśnień. Zaznacz fragment skanu.</span>}
                            {naStronie.map((o, i) => (
                                <button key={o.id} className="pn-zgl" onClick={() => wybierz(o.id)} aria-current={o.id === wybrane} style={{ padding: '7px 9px', gap: 2, borderRadius: 6, border: '1px solid var(--linia2)' }}>
                                    <span className="pn-maly"><b style={{ color: 'var(--tekst)' }}>{i + 1}</b> · {RODZAJE_OBJASNIEN[o.rodzaj].nazwa}{o.widocznosc !== 'publiczne' ? ` · ${o.widocznosc === 'bliscy' ? 'dla bliskich' : 'tylko ja'}` : ''}</span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.tekst || <i className="pn-szary">bez tekstu</i>}</span>
                                </button>
                            ))}
                        </div>

                        {w && (
                            <div className="pn-karta" style={{ padding: 12, gap: 10 }}>
                                <div className="pn-rzad" style={{ justifyContent: 'space-between' }}>
                                    <h2>objaśnienie {naStronie.findIndex((o) => o.id === w.id) + 1}</h2>
                                    <button className="pn-btn" onClick={() => usun(w.id)}>usuń</button>
                                </div>
                                <div className="pn-seg" role="group" aria-label="rodzaj">
                                    {(Object.keys(RODZAJE_OBJASNIEN) as RodzajObjasnienia[]).map((r) => (
                                        <button key={r} aria-pressed={w.rodzaj === r} onClick={() => ustaw(w.id, { rodzaj: r, ...(r === 'tlumaczenie' && !w.jezyk ? { jezyk: 'pl' } : {}) })}>{RODZAJE_OBJASNIEN[r].nazwa}</button>
                                    ))}
                                </div>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span className="pn-maly">{RODZAJE_OBJASNIEN[w.rodzaj].nazwa} – {RODZAJE_OBJASNIEN[w.rodzaj].opis}</span>
                                    <textarea id="obj-tekst" className="pn-in" rows={5} value={w.tekst} onChange={(e) => ustaw(w.id, { tekst: e.target.value })} />
                                </label>
                                <label className="pn-rzad">
                                    <span className="pn-maly" style={{ minWidth: 60 }}>język</span>
                                    <select className="pn-in" value={w.jezyk ?? ''} onChange={(e) => ustaw(w.id, { jezyk: e.target.value || undefined })}>
                                        <option value="">—</option>
                                        {Object.entries(JEZYKI).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                                    </select>
                                </label>
                                {(dane.uzycia?.[w.id]?.length ?? 0) > 0 && (
                                    <span className="pn-maly">podstawa elementów planu: {dane.uzycia![w.id].map((u, i) => <React.Fragment key={`${u.slug}-${i}`}>{i > 0 && ' · '}<a href={`/keystatic/plany/${u.slug}`}>{u.tytul} – {u.element}</a></React.Fragment>)}</span>
                                )}
                                <style>{CSS_POLA_POWIAZAN}</style>
                                <PolePowiazan wartosc={w.powiazania} cele={dane.cele} zmien={(v) => ustaw(w.id, { powiazania: v })} idListy="obj-cele" />
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span className="pn-maly">opracował(a)</span>
                                    <input className="pn-in" value={w.opracowal} onChange={(e) => { ustaw(w.id, { opracowal: e.target.value }); try { localStorage.setItem(KLUCZ_AUTORA, e.target.value) } catch { /* bez pamięci */ } }} />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span className="pn-maly">weryfikacja w źródłach – skąd wiadomo, co potwierdza, co niepewne</span>
                                    <textarea className="pn-in" rows={3} value={w.weryfikacja ?? ''} onChange={(e) => ustaw(w.id, { weryfikacja: e.target.value })} />
                                </label>
                                <div className="pn-rzad">
                                    <span className="pn-maly" style={{ minWidth: 60 }}>widoczność</span>
                                    <div className="pn-seg" role="group" aria-label="widoczność">
                                        {([['publiczne', 'publiczne'], ['bliscy', 'dla bliskich'], ['ja', 'tylko ja']] as const).map(([k, n]) => (
                                            <button key={k} aria-pressed={w.widocznosc === k} onClick={() => ustaw(w.id, { widocznosc: k })}>{n}</button>
                                        ))}
                                    </div>
                                </div>
                                {dane.widocznosc !== 'publiczne' && <span className="pn-maly">Materiał jest „{dane.widocznosc === 'bliscy' ? 'dla bliskich' : 'tylko ja'}” – objaśnienia nie będą widoczne szerzej niż on.</span>}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </>
    )
}
