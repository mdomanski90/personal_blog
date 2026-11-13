'use client'
// Katalog typów planów: widoczność typów, własne typy (znak SVG/PNG, obszar, linia), próg lat dla grobów.
import * as React from 'react'
import { GRUPY, katalog, WZORY, type Rodzaj, type UstawieniaPlanow, type WlasnyTyp } from '@/lib/plany/typy'
import { Probka, WzoryProbek } from '@/app/components/plan/Probka'

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

export default function Typy() {
    const [u, ustawU] = React.useState<UstawieniaPlanow | null>(null)
    const [msg, ustawMsg] = React.useState('')
    const [nowy, ustawNowy] = React.useState<WlasnyTyp>({ id: '', nazwa: '', grupa: 'Własne typy', rodzaj: 'punkt' })
    React.useEffect(() => { fetch('/api/keystatic/plany/ustawienia').then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then(ustawU).catch(() => ustawMsg('Brak dostępu – katalog działa tylko za hasłem panelu.')) }, [])
    const zapisz = async (n: UstawieniaPlanow) => {
        ustawU(n)
        const r = await fetch('/api/keystatic/plany/ustawienia', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(n) })
        ustawMsg(r.ok ? 'zapisano' : 'błąd zapisu')
        window.setTimeout(() => ustawMsg(''), 2500)
    }
    if (!u) return <div style={{ padding: 24, fontFamily: 'monospace' }}>{msg || 'wczytuję…'}</div>
    const typy = katalog(u)
    const ukryte = new Set(u.ukryteTypy)
    const przelacz = (id: string) => zapisz({ ...u, ukryteTypy: ukryte.has(id) ? u.ukryteTypy.filter((x) => x !== id) : [...u.ukryteTypy, id] })
    const wgrajZnak = async (f: File) => {
        const fd = new FormData(); fd.append('plik', f)
        const r = await fetch('/api/keystatic/plany/ustawienia', { method: 'POST', body: fd })
        const j = await r.json()
        if (!r.ok) { ustawMsg(j.blad); return }
        ustawNowy((n) => ({ ...n, svg: j.svg, svgVb: j.svgVb, png: j.png }))
    }
    const dodaj = () => {
        if (!nowy.nazwa.trim()) { ustawMsg('Podaj nazwę typu.'); return }
        if (nowy.rodzaj === 'punkt' && !nowy.svg && !nowy.png) { ustawMsg('Dodaj plik znaku (SVG 24×24 albo PNG 96×96).'); return }
        const id = `wl-${slugify(nowy.nazwa)}-${Date.now().toString(36).slice(-4)}`
        zapisz({ ...u, wlasneTypy: [...u.wlasneTypy, { ...nowy, id }] })
        ustawNowy({ id: '', nazwa: '', grupa: 'Własne typy', rodzaj: 'punkt' })
    }
    const podglad = katalog({ ...u, wlasneTypy: [{ ...nowy, id: 'wl-podglad' }] }).get('wl-podglad')!
    const pole: React.CSSProperties = { font: 'inherit', fontSize: 14, height: 30, padding: '0 8px', border: '1px solid #d6d1c6', borderRadius: 7, background: 'transparent', color: 'inherit' }
    return (
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 20px 60px', fontFamily: 'var(--font-jetbrains), monospace', display: 'flex', flexDirection: 'column', gap: 18, fontSize: 14 }}>
            <WzoryProbek prefix="kt" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 }}>
                <h1 style={{ fontSize: 22, margin: 0 }}>katalog typów i znaków</h1>
                <a href="/keystatic/plany">← plany</a>
            </div>
            <p style={{ margin: 0, color: '#4f4a41', lineHeight: 1.6 }}>Typ ukryty znika z listy w edytorze, z planów i z legend – a już wprowadzone elementy tego typu zostają w danych i wrócą po włączeniu. {msg && <b style={{ color: '#15803d' }}>{msg}</b>}</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>groby osób zmarłych w ciągu ostatnich</span>
                <input type="number" min={0} max={150} value={u.progLat} onChange={(e) => ustawU({ ...u, progLat: +e.target.value })} onBlur={() => zapisz(u)} style={{ ...pole, width: 80 }} />
                <span>lat – napis, nazwiska i zdjęcia tylko dla bliskich</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px 28px' }}>
                {GRUPY.map((g) => {
                    const L = [...typy.values()].filter((t) => t.grupa === g)
                    if (!L.length) return null
                    return (
                        <div key={g} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6b665c' }}>{g}</div>
                            {L.map((t) => (
                                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: ukryte.has(t.id) ? 0.4 : 1 }}>
                                    <Probka typ={t} prefix="kt" />
                                    <span style={{ flex: 1, fontSize: 13 }}>{t.nazwa}</span>
                                    {t.wlasny && <button onClick={() => confirm(`Usunąć typ „${t.nazwa}”? Elementy tego typu przestaną się wyświetlać.`) && zapisz({ ...u, wlasneTypy: u.wlasneTypy.filter((w) => w.id !== t.id) })} style={{ ...pole, height: 22, fontSize: 11, cursor: 'pointer' }}>usuń</button>}
                                    <button role="switch" aria-checked={!ukryte.has(t.id)} onClick={() => przelacz(t.id)} title={ukryte.has(t.id) ? 'ukryty' : 'widoczny'}
                                        style={{ width: 30, height: 16, borderRadius: 8, border: 0, background: ukryte.has(t.id) ? '#d6d3cb' : '#2f6b4f', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                                        <i style={{ position: 'absolute', top: 2, left: ukryte.has(t.id) ? 2 : 16, width: 12, height: 12, borderRadius: 6, background: '#fff' }} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )
                })}
            </div>
            <section style={{ border: '1px dashed #c9c3b5', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <b>+ dodaj własny typ</b>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input placeholder="nazwa, np. kamień graniczny" value={nowy.nazwa} onChange={(e) => ustawNowy({ ...nowy, nazwa: e.target.value })} style={{ ...pole, flex: '1 1 240px' }} />
                    <select value={nowy.rodzaj} onChange={(e) => ustawNowy({ id: '', nazwa: nowy.nazwa, grupa: 'Własne typy', rodzaj: e.target.value as Rodzaj })} style={pole}><option value="punkt">znak (punkt)</option><option value="obszar">obszar</option><option value="linia">linia</option></select>
                </div>
                {nowy.rodzaj === 'punkt' && (
                    <label style={{ fontSize: 13, color: '#4f4a41', lineHeight: 1.5 }}>Plik SVG 24×24 z samą kreską (ok. 1,5 px, bez wypełnień – kolor nada strona i zadziała tryb ciemny) albo PNG 96×96 z przezroczystym tłem:<br />
                        <input type="file" accept=".svg,image/svg+xml,image/png" onChange={(e) => e.target.files?.[0] && wgrajZnak(e.target.files[0])} /></label>
                )}
                {nowy.rodzaj === 'obszar' && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <label>kolor tła <input type="color" value={nowy.tlo ?? '#e8e4d8'} onChange={(e) => ustawNowy({ ...nowy, tlo: e.target.value })} /></label>
                        <select value={nowy.wzor ?? ''} onChange={(e) => ustawNowy({ ...nowy, wzor: e.target.value || undefined })} style={pole}><option value="">bez wzoru</option>{Object.keys(WZORY).filter((k) => WZORY[k].rys).map((k) => <option key={k} value={k}>wzór: {k}</option>)}</select>
                    </div>
                )}
                {nowy.rodzaj === 'linia' && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <label>kolor <input type="color" value={nowy.linia?.kolor ?? '#6b665c'} onChange={(e) => ustawNowy({ ...nowy, linia: { kolor: e.target.value, grubosc: nowy.linia?.grubosc ?? 1, kreski: nowy.linia?.kreski ?? 'ciagla' } })} /></label>
                        <label>grubość <input type="number" min={0.2} max={10} step={0.2} value={nowy.linia?.grubosc ?? 1} onChange={(e) => ustawNowy({ ...nowy, linia: { kolor: nowy.linia?.kolor ?? '#6b665c', grubosc: +e.target.value, kreski: nowy.linia?.kreski ?? 'ciagla' } })} style={{ ...pole, width: 70 }} /></label>
                        <select value={nowy.linia?.kreski ?? 'ciagla'} onChange={(e) => ustawNowy({ ...nowy, linia: { kolor: nowy.linia?.kolor ?? '#6b665c', grubosc: nowy.linia?.grubosc ?? 1, kreski: e.target.value as 'ciagla' } })} style={pole}><option value="ciagla">ciągła</option><option value="przerywana">przerywana</option><option value="kropkowana">kropkowana</option></select>
                    </div>
                )}
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <span style={{ color: '#6b665c', fontSize: 12 }}>podgląd:</span>
                    {[18, 26, 40].map((s) => <span key={s} style={{ display: 'inline-flex', padding: 6, background: '#fbfaf7', borderRadius: 6 }}><Probka typ={podglad} prefix="kt" w={s * 1.4} h={s} /></span>)}
                    <span className="dark" style={{ display: 'inline-flex', padding: 6, background: '#1c1f24', borderRadius: 6 }}><Probka typ={podglad} prefix="kt" w={36} h={26} /></span>
                    <span style={{ flex: 1 }} />
                    <button onClick={dodaj} style={{ ...pole, cursor: 'pointer', background: '#f2f0eb' }}>dodaj typ</button>
                </div>
            </section>
        </div>
    )
}
