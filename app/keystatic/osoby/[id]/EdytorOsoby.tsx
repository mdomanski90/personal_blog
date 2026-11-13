'use client'
// Edytor osoby w panelu: dane, zdarzenia (z obrządkiem i chrzestnymi), rodzina, źródła, notatki, ostrzeżenia.
import * as React from 'react'
import { formatujEdtf, czyPoprawnaEdtf } from '@/lib/edtf'
import { OBRZADKI, RODZAJE_ZDARZEN, ZDARZENIA_Z_OBRZADKIEM, adresAncestry, noweIdZdarzenia, sortujZdarzenia, type Obrzadek, type Osoba, type RodzajZdarzenia, type Rodzina, type Zdarzenie, type Zrodlo } from '@/lib/osoby/model'
import { btn, pole, wyslij } from '../wspolne'

type Skrot = { id: string; nazwa: string; imiona: string; nazwisko: string; plec: string; lata: string; miejsce: string; zyje: boolean; widocznosc: string }
type Dane = {
    osoba: Osoba
    biogram?: boolean
    zyjeAuto: boolean
    rodzice: { rodzina: Rodzina; maz: Skrot | null; zona: Skrot | null; rodzenstwo: Skrot[] }[]
    malzenstwa: { rodzina: Rodzina; malzonek: Skrot | null; dzieci: Skrot[] }[]
    osoby: Record<string, Skrot | null>
    zrodla: Record<string, Zrodlo>
    ostrzezenia: string[]
    zParafii: Record<string, Obrzadek | null>
    wszystkie: Skrot[]
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
const sek: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #e7e2d8', paddingTop: 14 }
const maly: React.CSSProperties = { color: '#6b665c', fontSize: 12 }
const kolorPlci = (p?: string) => (p === 'K' ? '#f1d9e2' : p === 'M' ? '#d5e3f3' : '#e7e2d8')

function LinkOsoby({ o }: { o: Skrot | null | undefined }) {
    if (!o) return <span style={maly}>—</span>
    return <a href={`/keystatic/osoby/${o.id}`} style={{ background: kolorPlci(o.plec), padding: '1px 6px', borderRadius: 5, color: 'inherit', textDecoration: 'none' }}>{o.nazwa} <span style={maly}>{o.lata}</span></a>
}

/** Wybór osoby z drzewa (podpowiedzi) albo utworzenie nowej o wpisanym imieniu i nazwisku. */
function WyborOsoby({ wszystkie, bez, onWybor, onNowa, etykieta }: { wszystkie: Skrot[]; bez: string[]; onWybor: (id: string) => void; onNowa?: (imiona: string, nazwisko: string) => void; etykieta: string }) {
    const [q, ustawQ] = React.useState('')
    const [otwarte, ustawOtwarte] = React.useState(false)
    const wyniki = React.useMemo(() => {
        const t = norm(q.trim())
        if (t.length < 2) return []
        const slowa = t.split(/\s+/)
        return wszystkie.filter((o) => !bez.includes(o.id) && slowa.every((s) => norm(`${o.nazwa} ${o.lata} ${o.miejsce}`).includes(s))).slice(0, 8)
    }, [q, wszystkie, bez])
    if (!otwarte) return <button onClick={() => ustawOtwarte(true)} style={{ ...btn, height: 26, fontSize: 12, alignSelf: 'flex-start' }}>+ {etykieta}</button>
    const czesci = q.trim().split(/\s+/)
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, border: '1px solid #e7e2d8', borderRadius: 8, padding: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
                <input autoFocus value={q} onChange={(e) => ustawQ(e.target.value)} placeholder={`${etykieta}: wpisz imię i nazwisko`} style={{ ...pole, flex: 1 }} />
                <button onClick={() => { ustawOtwarte(false); ustawQ('') }} style={{ ...btn, height: 30 }} aria-label="zamknij">×</button>
            </div>
            {wyniki.map((o) => <button key={o.id} onClick={() => { onWybor(o.id); ustawOtwarte(false); ustawQ('') }} style={{ ...btn, textAlign: 'left', height: 'auto', padding: '4px 8px', background: 'none' }}>{o.nazwa} <span style={maly}>{o.lata} {o.miejsce}</span></button>)}
            {onNowa && q.trim().length > 1 && (
                <button onClick={() => { onNowa(czesci.length > 1 ? czesci.slice(0, -1).join(' ') : czesci[0], czesci.length > 1 ? czesci[czesci.length - 1] : ''); ustawOtwarte(false); ustawQ('') }} style={{ ...btn, textAlign: 'left', height: 'auto', padding: '4px 8px' }}>
                    + nowa osoba: <b>{q.trim()}</b> <span style={maly}>(ostatnie słowo = nazwisko)</span>
                </button>
            )}
        </div>
    )
}

function EdycjaZdarzenia({ z, zmien, usun, miejsca, zParafii, wszystkie, osoby, zrodla, rodzajeDozwolone }: {
    z: Zdarzenie; zmien: (z: Zdarzenie) => void; usun: () => void; miejsca: { id: string; nazwa: string }[]; zParafii?: Obrzadek | null
    wszystkie: Skrot[]; osoby: Record<string, Skrot | null>; zrodla: Record<string, Zrodlo>; rodzajeDozwolone: RodzajZdarzenia[]
}) {
    const [rozwin, ustawRozwin] = React.useState(!z.data && !z.miejsce)
    const dataOk = !z.data || czyPoprawnaEdtf(z.data)
    const zmienMiejsce = (t: string) => {
        const m = miejsca.find((x) => norm(x.nazwa) === norm(t.split(',')[0].trim()))
        zmien({ ...z, miejsce: t || undefined, miejsceId: m?.id })
    }
    const ob = z.obrzadek ? OBRZADKI[z.obrzadek] : null
    return (
        <div style={{ border: '1px solid #e7e2d8', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => ustawRozwin((x) => !x)}>
                <b>{z.rodzaj === 'inne' ? z.nazwa || 'zdarzenie' : RODZAJE_ZDARZEN[z.rodzaj]}</b>
                <span>{z.data ? formatujEdtf(z.data) : z.dataTekst ?? ''}</span>
                <span style={maly}>{z.miejsce}</span>
                {(ob || zParafii) && <span style={{ fontSize: 11, padding: '0 5px', borderRadius: 4, color: '#fff', background: (ob ?? OBRZADKI[zParafii!]).kolor, opacity: ob ? 1 : 0.6 }}>{ob ? ob.nazwa : `${OBRZADKI[zParafii!].nazwa}? (z parafii)`}</span>}
                {z.chrzestni?.length ? <span style={maly}>chrzestni: {z.chrzestni.length}</span> : null}
                <span style={{ flex: 1 }} /><span style={maly}>{rozwin ? '▲' : '▼'}</span>
            </div>
            {rozwin && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={maly}>rodzaj</span>
                        <select value={z.rodzaj} onChange={(e) => zmien({ ...z, rodzaj: e.target.value as RodzajZdarzenia })} style={pole}>{rodzajeDozwolone.map((r) => <option key={r} value={r}>{RODZAJE_ZDARZEN[r]}</option>)}</select></label>
                    {(z.rodzaj === 'inne' || z.nazwa) && <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={maly}>nazwa</span><input value={z.nazwa ?? ''} onChange={(e) => zmien({ ...z, nazwa: e.target.value || undefined })} style={pole} /></label>}
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={maly}>data (np. 1862-03-05, 1862, 1862~, ../1900)</span>
                        <input value={z.data ?? ''} onChange={(e) => zmien({ ...z, data: e.target.value.trim() || undefined, ...(e.target.value ? { dataTekst: undefined } : {}) })} style={{ ...pole, borderColor: dataOk ? '#d6d1c6' : '#dc2626' }} placeholder={z.dataTekst ? `z Ancestry: ${z.dataTekst}` : ''} />
                        <span style={{ ...maly, color: dataOk ? '#6b665c' : '#dc2626' }}>{z.data ? (dataOk ? formatujEdtf(z.data) : 'nieczytelna data') : z.dataTekst ? `w Ancestry: „${z.dataTekst}”` : ''}</span></label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={maly}>miejsce {z.miejsceId && '· połączone z miejscowością'}</span>
                        <input list="miejsca-strony" value={z.miejsce ?? ''} onChange={(e) => zmienMiejsce(e.target.value)} style={pole} /></label>
                    {ZDARZENIA_Z_OBRZADKIEM.includes(z.rodzaj) && (
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={maly}>obrządek</span>
                            <select value={z.obrzadek ?? ''} onChange={(e) => zmien({ ...z, obrzadek: (e.target.value || undefined) as Obrzadek | undefined })} style={pole}>
                                <option value="">{zParafii ? `z parafii: ${OBRZADKI[zParafii].nazwa}` : '— nie wiadomo'}</option>
                                {Object.entries(OBRZADKI).map(([k, v]) => <option key={k} value={k}>{v.nazwa}</option>)}
                            </select></label>
                    )}
                    {z.rodzaj === 'chrzest' && (
                        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={maly}>chrzestni</span>
                            {(z.chrzestni ?? []).map((c, i) => (
                                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input value={c.tekst} onChange={(e) => zmien({ ...z, chrzestni: z.chrzestni!.map((x, j) => (j === i ? { ...x, tekst: e.target.value } : x)) })} style={{ ...pole, flex: '1 1 200px' }} />
                                    {c.osoba ? <><LinkOsoby o={osoby[c.osoba] ?? wszystkie.find((x) => x.id === c.osoba)} /><button onClick={() => zmien({ ...z, chrzestni: z.chrzestni!.map((x, j) => (j === i ? { tekst: x.tekst } : x)) })} style={{ ...btn, height: 26, fontSize: 12 }}>odłącz</button></>
                                        : <WyborOsoby wszystkie={wszystkie} bez={[]} etykieta="połącz z osobą" onWybor={(id) => zmien({ ...z, chrzestni: z.chrzestni!.map((x, j) => (j === i ? { ...x, osoba: id } : x)) })} />}
                                    <button onClick={() => zmien({ ...z, chrzestni: z.chrzestni!.filter((_, j) => j !== i) })} style={{ ...btn, height: 26, fontSize: 12, background: 'none' }} aria-label="usuń chrzestnego">×</button>
                                </div>
                            ))}
                            <button onClick={() => zmien({ ...z, chrzestni: [...(z.chrzestni ?? []), { tekst: '' }] })} style={{ ...btn, height: 26, fontSize: 12, alignSelf: 'flex-start' }}>+ chrzestny</button>
                        </div>
                    )}
                    <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 2 }}><span style={maly}>opis</span>
                        <textarea value={z.opis ?? ''} onChange={(e) => zmien({ ...z, opis: e.target.value || undefined })} rows={2} style={{ ...pole, height: 'auto', padding: 6 }} /></label>
                    {z.cytaty?.length ? (
                        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={maly}>źródła</span>
                            {z.cytaty.map((c, i) => <Cytat key={i} c={c} zrodla={zrodla} usun={() => zmien({ ...z, cytaty: z.cytaty!.filter((_, j) => j !== i) })} />)}
                        </div>
                    ) : null}
                    <button onClick={usun} style={{ ...btn, height: 26, fontSize: 12, background: 'none', justifySelf: 'start', color: '#b91c1c' }}>usuń zdarzenie</button>
                </div>
            )}
        </div>
    )
}

function Cytat({ c, zrodla, usun }: { c: NonNullable<Zdarzenie['cytaty']>[number]; zrodla: Record<string, Zrodlo>; usun: () => void }) {
    const z = c.zrodlo ? zrodla[c.zrodlo] : null
    const a = adresAncestry(c.apid)
    return (
        <span style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span>{z?.tytul ?? 'źródło'}{c.strona && ` – ${c.strona}`}</span>
            {a && <a href={a} target="_blank" rel="noreferrer">rekord w Ancestry ↗</a>}
            {c.www && <a href={c.www} target="_blank" rel="noreferrer">link ↗</a>}
            <button onClick={usun} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#a39d91' }} aria-label="usuń źródło">×</button>
        </span>
    )
}

export default function EdytorOsoby({ id }: { id: string }) {
    const [dane, ustawDane] = React.useState<Dane | null>(null)
    const [o, ustawO] = React.useState<Osoba | null>(null)
    const [brudne, ustawBrudne] = React.useState(false)
    const [msg, ustawMsg] = React.useState('')
    const [miejsca, ustawMiejsca] = React.useState<{ id: string; nazwa: string }[]>([])

    const wczytaj = React.useCallback(async () => {
        const r = await fetch(`/api/keystatic/osoby/${id}`)
        if (!r.ok) { ustawMsg(r.status === 404 ? 'Nie ma takiej osoby.' : r.status === 401 ? 'Brak dostępu (hasło panelu).' : 'Nie udało się wczytać.'); return }
        const d = (await r.json()) as Dane
        ustawDane(d); ustawO(d.osoba); ustawBrudne(false)
    }, [id])
    React.useEffect(() => { wczytaj(); fetch('/api/keystatic/osoby').then((r) => r.json()).then((d) => ustawMiejsca(d.miejsca ?? [])).catch(() => {}) }, [wczytaj])

    const zmien = (zm: Partial<Osoba>) => { ustawO((x) => (x ? { ...x, ...zm } : x)); ustawBrudne(true) }
    const zapisz = React.useCallback(async () => {
        if (!o) return
        const r = await wyslij(`/api/keystatic/osoby/${id}`, { osoba: o }, 'PUT')
        if (r.ok) { ustawMsg('zapisano'); setTimeout(() => ustawMsg(''), 1500); await wczytaj() } else ustawMsg(r.j.blad ?? 'błąd zapisu')
    }, [o, id, wczytaj])
    React.useEffect(() => {
        const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); zapisz() } }
        const przed = (e: BeforeUnloadEvent) => { if (brudne) e.preventDefault() }
        window.addEventListener('keydown', k); window.addEventListener('beforeunload', przed)
        return () => { window.removeEventListener('keydown', k); window.removeEventListener('beforeunload', przed) }
    }, [zapisz, brudne])

    const relacja = async (cialo: Record<string, unknown>) => {
        if (brudne && !confirm('Masz niezapisane zmiany tej osoby. Zapisać je najpierw?')) return
        if (brudne) await zapisz()
        const r = await wyslij('/api/keystatic/osoby/rodzina', cialo)
        if (!r.ok) ustawMsg(r.j.blad ?? 'błąd')
        await wczytaj()
    }
    const nowaWRodzinie = async (imiona: string, nazwisko: string, jako: string, rodzina?: string, plec = 'U') => {
        if (brudne) await zapisz()
        const r = await wyslij('/api/keystatic/osoby', { akcja: 'nowa', imiona, nazwisko, plec, relacja: { do: id, jako, rodzina } })
        if (!r.ok) ustawMsg(r.j.blad ?? 'błąd')
        await wczytaj()
    }
    const zapiszRodzine = async (f: Rodzina) => {
        const r = await wyslij('/api/keystatic/osoby/rodzina', { akcja: 'zapisz', rodzina: f })
        if (!r.ok) ustawMsg(r.j.blad ?? 'błąd')
        await wczytaj()
    }

    if (!dane || !o) return <div style={{ padding: 30, fontFamily: 'var(--font-jetbrains), monospace' }}>{msg || 'wczytuję…'}</div>
    const wszyscyBezMnie = dane.wszystkie
    const rodzajeOsoby = (Object.keys(RODZAJE_ZDARZEN) as RodzajZdarzenia[]).filter((r) => r !== 'slub' && r !== 'rozwod')
    const zyje = o.zyje === 'auto' ? dane.zyjeAuto : o.zyje === 'tak'
    const rodzina = dane.rodzice[0]

    return (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 20px 80px', fontFamily: 'var(--font-jetbrains), monospace', display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14 }}>
            <datalist id="miejsca-strony">{miejsca.map((m) => <option key={m.id} value={m.nazwa} />)}</datalist>
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap', position: 'sticky', top: 0, background: 'var(--background, #fbfaf7)', padding: '8px 0', zIndex: 2, borderBottom: '1px solid #e7e2d8' }}>
                <a href="/keystatic/osoby">← osoby</a>
                <h1 style={{ fontSize: 20, margin: 0 }}>{`${o.imiona} ${o.nazwisko}`.trim() || 'bez imienia'}</h1>
                <span style={maly}>{zyje ? 'żyjąca' : 'nie żyje'}</span>
                <span style={{ flex: 1 }} />
                {msg && <span style={{ fontSize: 12, color: msg === 'zapisano' ? '#15803d' : '#b45309' }}>{msg}</span>}
                {dane.biogram
                    ? <a href={`/keystatic/collection/biogramy/item/${id}`} style={{ fontSize: 12 }}>biogram →</a>
                    : <button onClick={async () => { const r = await fetch(`/api/keystatic/osoby/${id}/biogram`, { method: 'POST' }); const d = await r.json().catch(() => null); if (d?.adres) location.href = d.adres; else ustawMsg(d?.blad ?? 'nie udało się założyć biogramu') }} style={{ ...btn, height: 26, fontSize: 12 }} title="biogram w Keystatic – pokaże się na karcie osoby">napisz biogram →</button>}
                <a href={`/osoby/${id}`} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>na stronie ↗</a>
                <button onClick={zapisz} disabled={!brudne} style={{ ...btn, background: brudne ? '#262420' : undefined, color: brudne ? '#fff' : undefined }}>{brudne ? 'zapisz (Ctrl+S)' : 'zapisane'}</button>
            </div>

            {dane.ostrzezenia.length > 0 && (
                <div style={{ background: '#fef3c7', borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dane.ostrzezenia.map((w, i) => <span key={i} style={{ fontSize: 13, color: '#78350f' }}>⚠ {w}</span>)}
                    {o.uwagi?.length ? <button onClick={() => zmien({ uwagi: [] })} style={{ ...btn, height: 24, fontSize: 12, alignSelf: 'flex-start' }}>uwagi z importu sprawdzone – usuń</button> : null}
                </div>
            )}

            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={maly}>imiona</span><input value={o.imiona} onChange={(e) => zmien({ imiona: e.target.value })} style={pole} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={maly}>nazwisko</span><input value={o.nazwisko} onChange={(e) => zmien({ nazwisko: e.target.value })} style={pole} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={maly}>inne nazwiska (panieńskie, z aktów; po przecinku)</span><input value={(o.inneNazwiska ?? []).join(', ')} onChange={(e) => zmien({ inneNazwiska: e.target.value.split(',').map((s) => s.trim()) })} onBlur={() => zmien({ inneNazwiska: (o.inneNazwiska ?? []).filter(Boolean) })} style={pole} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={maly}>płeć</span><select value={o.plec} onChange={(e) => zmien({ plec: e.target.value as Osoba['plec'] })} style={pole}><option value="U">nie wiadomo</option><option value="K">kobieta</option><option value="M">mężczyzna</option></select></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={maly}>żyje</span><select value={o.zyje} onChange={(e) => zmien({ zyje: e.target.value as Osoba['zyje'] })} style={pole}><option value="auto">z dat ({dane.zyjeAuto ? 'żyjąca' : 'nie żyje'})</option><option value="tak">żyje</option><option value="nie">nie żyje</option></select></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={maly}>widoczność karty</span><select value={o.widocznosc} onChange={(e) => zmien({ widocznosc: e.target.value as Osoba['widocznosc'] })} style={pole}><option value="auto">auto ({zyje ? 'dla bliskich' : 'publiczna'})</option><option value="publiczne">publiczna</option><option value="bliscy">dla bliskich</option><option value="ja">tylko ja</option></select></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, gridColumn: '1 / -1' }}><span style={maly}>znaczniki (po przecinku)</span><input value={(o.znaczniki ?? []).join(', ')} onChange={(e) => zmien({ znaczniki: e.target.value.split(',').map((s) => s.trim()) })} onBlur={() => zmien({ znaczniki: (o.znaczniki ?? []).filter(Boolean) })} style={pole} /></label>
            </section>

            <section style={sek}>
                <b>zdarzenia</b>
                {sortujZdarzenia(o.zdarzenia).map((z) => (
                    <EdycjaZdarzenia key={z.id} z={z} miejsca={miejsca} zParafii={dane.zParafii[z.id]} wszystkie={wszyscyBezMnie} osoby={dane.osoby} zrodla={dane.zrodla} rodzajeDozwolone={rodzajeOsoby}
                        zmien={(n) => zmien({ zdarzenia: o.zdarzenia.map((x) => (x.id === z.id ? n : x)) })}
                        usun={() => confirm('Usunąć to zdarzenie?') && zmien({ zdarzenia: o.zdarzenia.filter((x) => x.id !== z.id) })} />
                ))}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(['urodzenie', 'chrzest', 'zgon', 'pogrzeb', 'zamieszkanie', 'inne'] as RodzajZdarzenia[]).map((r) => (
                        <button key={r} onClick={() => zmien({ zdarzenia: [...o.zdarzenia, { id: noweIdZdarzenia(), rodzaj: r }] })} style={{ ...btn, height: 26, fontSize: 12 }}>+ {RODZAJE_ZDARZEN[r]}</button>
                    ))}
                </div>
            </section>

            <section style={sek}>
                <b>rodzice</b>
                {dane.rodzice.length === 0 && <span style={maly}>nie wpisano</span>}
                {dane.rodzice.map((r) => (
                    <div key={r.rodzina.id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                        <span style={maly}>ojciec</span><LinkOsoby o={r.maz} /><span style={maly}>matka</span><LinkOsoby o={r.zona} />
                        {r.rodzenstwo.length > 0 && <span style={{ ...maly, width: '100%' }}>rodzeństwo: {r.rodzenstwo.map((x) => <span key={x.id} style={{ marginRight: 6 }}><LinkOsoby o={x} /></span>)}</span>}
                        <button onClick={() => confirm('Wypisać tę osobę z rodziny rodziców?') && relacja({ akcja: 'rozlacz', rodzina: r.rodzina.id, osoba: id })} style={{ ...btn, height: 24, fontSize: 11, background: 'none' }}>odłącz od rodziców</button>
                    </div>
                ))}
                {(!rodzina || !rodzina.maz) && <WyborOsoby wszystkie={wszyscyBezMnie} bez={[id]} etykieta="ojciec" onWybor={(x) => relacja({ akcja: 'polacz', osoba: x, z: id, jako: 'rodzic' })} onNowa={(i, n) => nowaWRodzinie(i, n, 'rodzic', undefined, 'M')} />}
                {(!rodzina || !rodzina.zona) && <WyborOsoby wszystkie={wszyscyBezMnie} bez={[id]} etykieta="matka" onWybor={(x) => relacja({ akcja: 'polacz', osoba: x, z: id, jako: 'rodzic' })} onNowa={(i, n) => nowaWRodzinie(i, n, 'rodzic', undefined, 'K')} />}
            </section>

            <section style={sek}>
                <b>małżeństwa i dzieci</b>
                {dane.malzenstwa.map((m) => {
                    const slub = m.rodzina.zdarzenia
                    return (
                        <div key={m.rodzina.id} style={{ border: '1px solid #e7e2d8', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                                <span style={maly}>{o.plec === 'K' ? 'mąż' : o.plec === 'M' ? 'żona' : 'małżonek'}</span><LinkOsoby o={m.malzonek} />
                                {!m.malzonek && <WyborOsoby wszystkie={wszyscyBezMnie} bez={[id]} etykieta="małżonek" onWybor={(x) => relacja({ akcja: 'polacz', osoba: x, z: id, jako: 'malzonek' })} onNowa={(i, n) => nowaWRodzinie(i, n, 'malzonek', m.rodzina.id, o.plec === 'K' ? 'M' : o.plec === 'M' ? 'K' : 'U')} />}
                                <span style={{ flex: 1 }} />
                                <button onClick={() => confirm('Wypisać tę osobę z tego małżeństwa?') && relacja({ akcja: 'rozlacz', rodzina: m.rodzina.id, osoba: id })} style={{ ...btn, height: 24, fontSize: 11, background: 'none' }}>odłącz</button>
                            </div>
                            {slub.map((z) => (
                                <EdycjaZdarzenia key={z.id} z={z} miejsca={miejsca} zParafii={dane.zParafii[z.id]} wszystkie={wszyscyBezMnie} osoby={dane.osoby} zrodla={dane.zrodla} rodzajeDozwolone={['slub', 'rozwod', 'inne']}
                                    zmien={(n) => { m.rodzina.zdarzenia = slub.map((x) => (x.id === z.id ? n : x)); ustawDane({ ...dane }) }}
                                    usun={() => confirm('Usunąć?') && zapiszRodzine({ ...m.rodzina, zdarzenia: slub.filter((x) => x.id !== z.id) })} />
                            ))}
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {!slub.some((z) => z.rodzaj === 'slub') && <button onClick={() => zapiszRodzine({ ...m.rodzina, zdarzenia: [...slub, { id: noweIdZdarzenia(), rodzaj: 'slub' }] })} style={{ ...btn, height: 26, fontSize: 12 }}>+ ślub</button>}
                                <button onClick={() => zapiszRodzine(m.rodzina)} style={{ ...btn, height: 26, fontSize: 12 }}>zapisz ślub / rozwód</button>
                            </div>
                            <span style={maly}>dzieci</span>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{m.dzieci.map((c) => <LinkOsoby key={c.id} o={c} />)}</div>
                            <WyborOsoby wszystkie={wszyscyBezMnie} bez={[id, ...m.dzieci.map((c) => c.id)]} etykieta="dziecko" onWybor={(x) => relacja({ akcja: 'polacz', osoba: x, z: id, jako: 'dziecko', rodzina: m.rodzina.id })} onNowa={(i, n) => nowaWRodzinie(i, n, 'dziecko', m.rodzina.id)} />
                        </div>
                    )
                })}
                <WyborOsoby wszystkie={wszyscyBezMnie} bez={[id]} etykieta="nowe małżeństwo" onWybor={(x) => relacja({ akcja: 'polacz', osoba: x, z: id, jako: 'malzonek' })} onNowa={(i, n) => nowaWRodzinie(i, n, 'malzonek', undefined, o.plec === 'K' ? 'M' : o.plec === 'M' ? 'K' : 'U')} />
            </section>

            <section style={sek}>
                <b>notatki</b>
                <textarea value={o.notatki ?? ''} onChange={(e) => zmien({ notatki: e.target.value || undefined })} rows={5} style={{ ...pole, height: 'auto', padding: 8 }} />
                <span style={maly}>Notatki osoby widzą na stronie tylko zalogowani bliscy.</span>
            </section>

            {o.cytaty?.length ? (
                <section style={sek}>
                    <b>źródła osoby</b>
                    {o.cytaty.map((c, i) => <Cytat key={i} c={c} zrodla={dane.zrodla} usun={() => zmien({ cytaty: o.cytaty!.filter((_, j) => j !== i) })} />)}
                </section>
            ) : null}

            {o.multimedia?.length ? (
                <section style={sek}>
                    <b>zdjęcia i dokumenty z Ancestry ({o.multimedia.length})</b>
                    <span style={maly}>W pliku GEDCOM są tylko opisy – same pliki pobierz z Ancestry i dodaj w archiwum strony.</span>
                    {o.multimedia.map((m, i) => (
                        <details key={i} style={{ fontSize: 13 }}>
                            <summary>{m.tytul} <span style={maly}>{[m.data, m.miejsce].filter(Boolean).join(' · ')}</span></summary>
                            {m.opis && <p style={{ margin: '4px 0' }}>{m.opis}</p>}
                            {m.transkrypcja && <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap', color: '#3b3731' }}>{m.transkrypcja}</p>}
                            <button onClick={() => zmien({ multimedia: o.multimedia!.filter((_, j) => j !== i) })} style={{ ...btn, height: 24, fontSize: 11 }}>pobrane do archiwum – usuń z listy</button>
                        </details>
                    ))}
                </section>
            ) : null}

            <section style={{ ...sek, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <span style={maly}>identyfikator: {id}{o.gedcomId && ` · z Ancestry: ${o.gedcomId}`}{o.zmieniono && ` · zmieniono ${new Date(o.zmieniono).toLocaleString('pl-PL')}`}</span>
                <span style={{ ...maly, display: 'inline-flex', gap: 8, alignItems: 'center' }} title="krewni tej osoby (przodkowie i ich potomkowie) oraz ich małżonkowie">
                    GEDCOM tylko z rodziną tej osoby:
                    <a href={`/api/keystatic/osoby/eksport?rodzina=${id}&zyjace=ukryte`}>bez żyjących</a>
                    <a href={`/api/keystatic/osoby/eksport?rodzina=${id}&zyjace=pelne`}>pełny</a>
                </span>
                <button onClick={async () => { if (!confirm('Przenieść tę osobę do kosza? Zostanie wypisana z rodzin.')) return; await fetch(`/api/keystatic/osoby/${id}`, { method: 'DELETE' }); location.href = '/keystatic/osoby' }} style={{ ...btn, height: 26, fontSize: 12, background: 'none', color: '#b91c1c' }}>do kosza</button>
            </section>
        </div>
    )
}
