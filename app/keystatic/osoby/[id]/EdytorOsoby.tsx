'use client'
// Edytor osoby w panelu (PK: w ramie panelu, klasy z app/keystatic/panel.css): dane, zdarzenia (z obrządkiem i chrzestnymi), rodzina, źródła, notatki, ostrzeżenia.
import * as React from 'react'
import { formatujEdtf, czyPoprawnaEdtf } from '@/lib/edtf'
import { OBRZADKI, RODZAJE_ZDARZEN, ZDARZENIA_Z_OBRZADKIEM, adresAncestry, noweIdZdarzenia, sortujZdarzenia, tekstSprawdzeniaZycia, type Obrzadek, type Osoba, type RodzajZdarzenia, type Rodzina, type Zdarzenie, type Zrodlo } from '@/lib/osoby/model'
import { wyslij } from '../wspolne'

type Skrot = { id: string; nazwa: string; imiona: string; nazwisko: string; plec: string; lata: string; miejsce: string; zyje: boolean; widocznosc: string }
type Dane = {
    osoba: Osoba
    biogram?: boolean
    zyjeAuto: boolean
    widocznoscAuto?: 'publiczne' | 'bliscy' | 'ja'
    rodzice: { rodzina: Rodzina; maz: Skrot | null; zona: Skrot | null; rodzenstwo: Skrot[] }[]
    malzenstwa: { rodzina: Rodzina; malzonek: Skrot | null; dzieci: Skrot[] }[]
    osoby: Record<string, Skrot | null>
    zrodla: Record<string, Zrodlo>
    ostrzezenia: string[]
    /** PPL-11: lata od (szacowanego) roku urodzenia – „czy żyje?” liczone na bieżąco */
    wiek: number | null
    wiekSzacowany: boolean
    zParafii: Record<string, Obrzadek | null>
    wszystkie: Skrot[]
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')

function LinkOsoby({ o }: { o: Skrot | null | undefined }) {
    if (!o) return <span className="pn-maly">—</span>
    return <a href={`/keystatic/osoby/${o.id}`} className="pn-osoba">{o.nazwa} <span className="pn-maly">{o.lata}</span></a>
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
    if (!otwarte) return <button type="button" onClick={() => ustawOtwarte(true)} className="pn-btn pn-btn-maly pn-samo">+ {etykieta}</button>
    const czesci = q.trim().split(/\s+/)
    return (
        <div className="pn-kol pn-ramka">
            <div className="pn-rzad">
                <input autoFocus className="pn-in pn-rosnie" value={q} onChange={(e) => ustawQ(e.target.value)} placeholder={`${etykieta}: wpisz imię i nazwisko`} aria-label={etykieta} />
                <button type="button" onClick={() => { ustawOtwarte(false); ustawQ('') }} className="pn-btn" aria-label="zamknij">×</button>
            </div>
            {wyniki.length > 0 && (
                <div className="pn-wiersze">
                    {wyniki.map((o) => <button type="button" key={o.id} onClick={() => { onWybor(o.id); ustawOtwarte(false); ustawQ('') }} className="pn-wiersz pn-wiersz-btn">{o.nazwa} <span className="pn-maly">{o.lata} {o.miejsce}</span></button>)}
                </div>
            )}
            {onNowa && q.trim().length > 1 && (
                <button type="button" onClick={() => { onNowa(czesci.length > 1 ? czesci.slice(0, -1).join(' ') : czesci[0], czesci.length > 1 ? czesci[czesci.length - 1] : ''); ustawOtwarte(false); ustawQ('') }} className="pn-btn pn-samo">
                    + nowa osoba: <b>{q.trim()}</b> <span className="pn-maly">(ostatnie słowo = nazwisko)</span>
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
        <div className="pn-kol pn-ramka">
            <button type="button" className="pn-zdarzenie-nagl" aria-expanded={rozwin} onClick={() => ustawRozwin((x) => !x)}>
                <b>{z.rodzaj === 'inne' ? z.nazwa || 'zdarzenie' : RODZAJE_ZDARZEN[z.rodzaj]}</b>
                <span>{z.data ? formatujEdtf(z.data) : z.dataTekst ?? ''}</span>
                <span className="pn-maly">{z.miejsce}</span>
                {(ob || zParafii) && <span className={`pn-tag${ob ? '' : ' pn-tag-przypuszczenie'}`}><span className="pn-znak-koloru" style={{ background: (ob ?? OBRZADKI[zParafii!]).kolor } /* styl-dynamiczny: kolor obrządku z danych (lib/osoby/model.ts) */} aria-hidden="true" />{ob ? ob.nazwa : `${OBRZADKI[zParafii!].nazwa}? (z parafii)`}</span>}
                {z.chrzestni?.length ? <span className="pn-maly">chrzestni: {z.chrzestni.length}</span> : null}
                <span className="pn-prawo pn-maly" aria-hidden="true">{rozwin ? '▲' : '▼'}</span>
            </button>
            {rozwin && (
                <div className="pn-formularz">
                    <label className="pn-pole"><span>rodzaj</span>
                        <select value={z.rodzaj} onChange={(e) => zmien({ ...z, rodzaj: e.target.value as RodzajZdarzenia })} className="pn-in">{rodzajeDozwolone.map((r) => <option key={r} value={r}>{RODZAJE_ZDARZEN[r]}</option>)}</select></label>
                    {(z.rodzaj === 'inne' || z.nazwa) && <label className="pn-pole"><span>nazwa</span><input value={z.nazwa ?? ''} onChange={(e) => zmien({ ...z, nazwa: e.target.value || undefined })} className="pn-in" /></label>}
                    <label className="pn-pole"><span>data (np. 1862-03-05, 1862, 1862~, ../1900)</span>
                        <input value={z.data ?? ''} onChange={(e) => zmien({ ...z, data: e.target.value.trim() || undefined, ...(e.target.value ? { dataTekst: undefined } : {}) })} className="pn-in" aria-invalid={!dataOk} placeholder={z.dataTekst ? `z Ancestry: ${z.dataTekst}` : ''} />
                        <span className={dataOk ? 'pn-maly' : 'pn-maly pn-blad'}>{z.data ? (dataOk ? formatujEdtf(z.data) : 'nieczytelna data') : z.dataTekst ? `w Ancestry: „${z.dataTekst}”` : ''}</span></label>
                    <label className="pn-pole"><span>miejsce {z.miejsceId && '· połączone z miejscowością'}</span>
                        <input list="miejsca-strony" value={z.miejsce ?? ''} onChange={(e) => zmienMiejsce(e.target.value)} className="pn-in" /></label>
                    {ZDARZENIA_Z_OBRZADKIEM.includes(z.rodzaj) && (
                        <label className="pn-pole"><span>obrządek</span>
                            <select value={z.obrzadek ?? ''} onChange={(e) => zmien({ ...z, obrzadek: (e.target.value || undefined) as Obrzadek | undefined })} className="pn-in">
                                <option value="">{zParafii ? `z parafii: ${OBRZADKI[zParafii].nazwa}` : '— nie wiadomo'}</option>
                                {Object.entries(OBRZADKI).map(([k, v]) => <option key={k} value={k}>{v.nazwa}</option>)}
                            </select></label>
                    )}
                    {z.rodzaj === 'chrzest' && (
                        <div className="pn-kol pn-caly">
                            <span className="pn-maly">chrzestni</span>
                            {(z.chrzestni ?? []).map((c, i) => (
                                <div key={i} className="pn-rzad">
                                    <input value={c.tekst} onChange={(e) => zmien({ ...z, chrzestni: z.chrzestni!.map((x, j) => (j === i ? { ...x, tekst: e.target.value } : x)) })} className="pn-in pn-rosnie" aria-label="chrzestny" />
                                    {c.osoba ? <><LinkOsoby o={osoby[c.osoba] ?? wszystkie.find((x) => x.id === c.osoba)} /><button onClick={() => zmien({ ...z, chrzestni: z.chrzestni!.map((x, j) => (j === i ? { tekst: x.tekst } : x)) })} className="pn-btn pn-btn-maly">odłącz</button></>
                                        : <WyborOsoby wszystkie={wszystkie} bez={[]} etykieta="połącz z osobą" onWybor={(id) => zmien({ ...z, chrzestni: z.chrzestni!.map((x, j) => (j === i ? { ...x, osoba: id } : x)) })} />}
                                    <button onClick={() => zmien({ ...z, chrzestni: z.chrzestni!.filter((_, j) => j !== i) })} className="pn-btn pn-btn-maly" aria-label="usuń chrzestnego">×</button>
                                </div>
                            ))}
                            <button onClick={() => zmien({ ...z, chrzestni: [...(z.chrzestni ?? []), { tekst: '' }] })} className="pn-btn pn-btn-maly pn-samo">+ chrzestny</button>
                        </div>
                    )}
                    <label className="pn-pole pn-caly"><span>opis</span>
                        <textarea value={z.opis ?? ''} onChange={(e) => zmien({ ...z, opis: e.target.value || undefined })} rows={2} className="pn-in" /></label>
                    {z.cytaty?.length ? (
                        <div className="pn-kol pn-caly">
                            <span className="pn-maly">źródła</span>
                            {z.cytaty.map((c, i) => <Cytat key={i} c={c} zrodla={zrodla} usun={() => zmien({ ...z, cytaty: z.cytaty!.filter((_, j) => j !== i) })} />)}
                        </div>
                    ) : null}
                    <button type="button" onClick={usun} className="pn-btn pn-btn-maly pn-samo pn-blad">usuń zdarzenie</button>
                </div>
            )}
        </div>
    )
}

function Cytat({ c, zrodla, usun }: { c: NonNullable<Zdarzenie['cytaty']>[number]; zrodla: Record<string, Zrodlo>; usun: () => void }) {
    const z = c.zrodlo ? zrodla[c.zrodlo] : null
    const a = adresAncestry(c.apid)
    return (
        <span className="pn-rzad pn-maly">
            <span>{z?.tytul ?? 'źródło'}{c.strona && ` – ${c.strona}`}</span>
            {a && <a href={a} target="_blank" rel="noreferrer">rekord w Ancestry ↗</a>}
            {c.www && <a href={c.www} target="_blank" rel="noreferrer">link ↗</a>}
            <button type="button" onClick={usun} className="pn-btn pn-btn-maly" aria-label="usuń źródło">×</button>
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

    if (!dane || !o) return <p className="pn-szary" role="status">{msg || 'wczytuję…'}</p>
    const wszyscyBezMnie = dane.wszystkie
    const rodzajeOsoby = (Object.keys(RODZAJE_ZDARZEN) as RodzajZdarzenia[]).filter((r) => r !== 'slub' && r !== 'rozwod')
    const zyje = o.zyje === 'auto' ? dane.zyjeAuto : o.zyje === 'tak'
    const rodzina = dane.rodzice[0]
    // PPL-11: ostrzeżenie „czy żyje?” z bieżącego stanu formularza – znika od razu po „nie żyje” albo dodaniu zgonu
    const zycie = dane.wiek != null ? tekstSprawdzeniaZycia(o, dane.wiek, dane.wiekSzacowany) : null
    const pole = (etykieta: string, el: React.ReactElement, podp?: string, klasa = '') => {
        const idp = podp ? `podp-${etykieta.replace(/\W+/g, '-')}` : undefined
        return <label className={`pn-pole ${klasa}`.trim()}><span>{etykieta}</span>{idp ? React.cloneElement(el as React.ReactElement<{ 'aria-describedby'?: string }>, { 'aria-describedby': idp }) : el}{podp && <span id={idp} className="pn-podp">{podp}</span>}</label>
    }
    const wgrajZdjecie = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; e.target.value = ''
        if (!f) return
        const fd = new FormData(); fd.append('plik', f)
        const r = await fetch(`/api/keystatic/osoby/${id}/portret`, { method: 'POST', body: fd })
        const d = await r.json().catch(() => null)
        if (d?.plik) zmien({ portret: { ...(o.portret ?? {}), plik: d.plik } }); else ustawMsg(d?.blad ?? 'nie udało się wgrać zdjęcia')
    }

    return (
        <>
            <datalist id="miejsca-strony">{miejsca.map((m) => <option key={m.id} value={m.nazwa} />)}</datalist>
            <header className="pn-naglowek pn-naglowek-przyklejony">
                <span className="pn-kol pn-kol-wasko">
                    <a href="/keystatic/osoby" className="pn-maly">← osoby</a>
                    <h1>{`${o.imiona} ${o.nazwisko}`.trim() || 'bez imienia'} <span className="pn-szary">· {zyje ? 'żyjąca' : 'nie żyje'}</span></h1>
                </span>
                <span className="pn-rzad">
                    {msg && <span className={msg === 'zapisano' ? 'pn-maly pn-ok' : 'pn-maly pn-blad'} role="status">{msg}</span>}
                    {dane.biogram
                        ? <a href={`/keystatic/collection/biogramy/item/${id}`} className="pn-btn">biogram →</a>
                        : <button type="button" onClick={async () => { const r = await fetch(`/api/keystatic/osoby/${id}/biogram`, { method: 'POST' }); const d = await r.json().catch(() => null); if (d?.adres) location.href = d.adres; else ustawMsg(d?.blad ?? 'nie udało się założyć biogramu') }} className="pn-btn" title="biogram w Keystatic – pokaże się na karcie osoby">napisz biogram →</button>}
                    <a href={`/osoby/${id}`} target="_blank" rel="noreferrer" className="pn-btn">na stronie ↗</a>
                    <button type="button" onClick={zapisz} disabled={!brudne} className={brudne ? 'pn-btn pn-btn-gl' : 'pn-btn'}>{brudne ? 'zapisz (Ctrl+S)' : 'zapisane'}</button>
                </span>
            </header>

            {(dane.ostrzezenia.length > 0 || zycie) && (
                <div className="pn-ostrz">
                    <div className="pn-kol">
                        {zycie && (
                            <span className="pn-rzad">
                                <span>{zycie}</span>
                                <button type="button" onClick={() => zmien({ zyje: 'nie' })} className="pn-btn pn-btn-maly">nie żyje</button>
                                {o.zyje === 'auto' && <button type="button" onClick={() => zmien({ zyje: 'tak' })} className="pn-btn pn-btn-maly">żyje</button>}
                            </span>
                        )}
                        {dane.ostrzezenia.map((w, i) => <span key={i}>{w}</span>)}
                        {o.uwagi?.length ? <button type="button" onClick={() => zmien({ uwagi: [] })} className="pn-btn pn-btn-maly pn-samo">uwagi z importu sprawdzone – usuń</button> : null}
                    </div>
                </div>
            )}

            {/* PPL-11 (19.11): zdjęcie przy imieniu (miniatura po lewej), krótkie etykiety z objaśnieniem pod polem – pola w jednej linii */}
            <section className="pn-karta" aria-labelledby="dane-t">
                <h2 id="dane-t">dane osoby</h2>
                <div className="pn-osoba-dane">
                    <div className="pn-kol pn-osoba-zdjecie">
                        {o.portret
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={`/api/keystatic/osoby/${id}/portret?plik=${encodeURIComponent(o.portret.plik)}`} alt="zdjęcie osoby" className="pn-portret" />
                            : <span className="pn-portret pn-portret-brak pn-maly">brak zdjęcia</span>}
                        <label className="pn-btn pn-btn-maly" title="Zdjęcie pokaże się na karcie osoby po zapisaniu – tylko tym, którzy widzą kartę.">
                            {o.portret ? 'zmień zdjęcie' : 'dodaj zdjęcie'}
                            <input type="file" accept="image/*" hidden onChange={wgrajZdjecie} />
                        </label>
                        {o.portret && <button type="button" onClick={() => confirm('Odpiąć zdjęcie od osoby? (plik zostaje na serwerze)') && zmien({ portret: undefined })} className="pn-btn pn-btn-maly">odepnij</button>}
                    </div>
                    <div className="pn-formularz pn-formularz-4">
                        {pole('imiona', <input value={o.imiona} onChange={(e) => zmien({ imiona: e.target.value })} className="pn-in" />)}
                        {pole('nazwisko', <input value={o.nazwisko} onChange={(e) => zmien({ nazwisko: e.target.value })} className="pn-in" />)}
                        {pole('inne nazwiska', <input value={(o.inneNazwiska ?? []).join(', ')} onChange={(e) => zmien({ inneNazwiska: e.target.value.split(',').map((x) => x.trim()) })} onBlur={() => zmien({ inneNazwiska: (o.inneNazwiska ?? []).filter(Boolean) })} className="pn-in" />, 'panieńskie, z aktów; po przecinku')}
                        {pole('przydomek, pseudonim', <input value={o.przydomek ?? ''} placeholder="np. Sowa, Kowalka" onChange={(e) => zmien({ przydomek: e.target.value })} className="pn-in" />)}
                        {pole('inne zapisy imienia i nazwiska', <input value={(o.inneZapisy ?? []).join(', ')} placeholder="np. Joannes Testowski, Иван Тестовый" onChange={(e) => zmien({ inneZapisy: e.target.value.split(',').map((x) => x.trim()) })} onBlur={() => zmien({ inneZapisy: (o.inneZapisy ?? []).filter(Boolean) })} className="pn-in" />, 'z aktów, po łacinie, cyrylicą; po przecinku', 'pn-caly')}
                        {pole('płeć', <select value={o.plec} onChange={(e) => zmien({ plec: e.target.value as Osoba['plec'] })} className="pn-in"><option value="U">nie wiadomo</option><option value="K">kobieta</option><option value="M">mężczyzna</option></select>)}
                        {pole('żyje', <select value={o.zyje} onChange={(e) => zmien({ zyje: e.target.value as Osoba['zyje'] })} className="pn-in"><option value="auto">z dat ({dane.zyjeAuto ? 'żyjąca' : 'nie żyje'})</option><option value="tak">żyje</option><option value="nie">nie żyje</option></select>)}
                        {pole('widoczność karty', <select value={o.widocznosc} onChange={(e) => zmien({ widocznosc: e.target.value as Osoba['widocznosc'] })} className="pn-in"><option value="auto">auto ({(dane.widocznoscAuto ?? (zyje ? 'bliscy' : 'publiczne')) === 'publiczne' ? 'publiczna' : 'dla bliskich'}) – ur. 100+ lub zm. 25+ lat temu</option><option value="publiczne">publiczna</option><option value="bliscy">dla bliskich</option><option value="ja">tylko ja</option></select>, undefined, 'pn-pole-2')}
                        {pole('znaczniki', <input value={(o.znaczniki ?? []).join(', ')} onChange={(e) => zmien({ znaczniki: e.target.value.split(',').map((x) => x.trim()) })} onBlur={() => zmien({ znaczniki: (o.znaczniki ?? []).filter(Boolean) })} className="pn-in" />, 'po przecinku', 'pn-caly')}
                        {o.portret && <>
                            {pole('podpis zdjęcia', <input value={o.portret.podpis ?? ''} placeholder="np. ok. 1930, przed domem w Olszance" onChange={(e) => zmien({ portret: { ...o.portret!, podpis: e.target.value } })} className="pn-in" />, undefined, 'pn-pole-2')}
                            {pole('źródło zdjęcia', <input value={o.portret.zrodlo ?? ''} onChange={(e) => zmien({ portret: { ...o.portret!, zrodlo: e.target.value } })} className="pn-in" />, 'skąd zdjęcie, kto je udostępnił; widać po zapisaniu', 'pn-pole-2')}
                        </>}
                    </div>
                </div>
            </section>

            <section className="pn-karta" aria-labelledby="zdarzenia-t">
                <h2 id="zdarzenia-t">zdarzenia</h2>
                {sortujZdarzenia(o.zdarzenia).map((z) => (
                    <EdycjaZdarzenia key={z.id} z={z} miejsca={miejsca} zParafii={dane.zParafii[z.id]} wszystkie={wszyscyBezMnie} osoby={dane.osoby} zrodla={dane.zrodla} rodzajeDozwolone={rodzajeOsoby}
                        zmien={(n) => zmien({ zdarzenia: o.zdarzenia.map((x) => (x.id === z.id ? n : x)) })}
                        usun={() => confirm('Usunąć to zdarzenie?') && zmien({ zdarzenia: o.zdarzenia.filter((x) => x.id !== z.id) })} />
                ))}
                <div className="pn-rzad">
                    {(['urodzenie', 'chrzest', 'zgon', 'pogrzeb', 'zamieszkanie', 'inne'] as RodzajZdarzenia[]).map((r) => (
                        <button key={r} onClick={() => zmien({ zdarzenia: [...o.zdarzenia, { id: noweIdZdarzenia(), rodzaj: r }] })} className="pn-btn pn-btn-maly">+ {RODZAJE_ZDARZEN[r]}</button>
                    ))}
                </div>
            </section>

            <section className="pn-karta" aria-labelledby="rodzice-t">
                <h2 id="rodzice-t">rodzice</h2>
                {dane.rodzice.length === 0 && <span className="pn-maly">nie wpisano</span>}
                {dane.rodzice.map((r) => (
                    <div key={r.rodzina.id} className="pn-rzad">
                        <span className="pn-maly">ojciec</span><LinkOsoby o={r.maz} /><span className="pn-maly">matka</span><LinkOsoby o={r.zona} />
                        {r.rodzenstwo.length > 0 && <span className="pn-rzad pn-caly-wiersz"><span className="pn-maly">rodzeństwo:</span> {r.rodzenstwo.map((x) => <LinkOsoby key={x.id} o={x} />)}</span>}
                        <button type="button" onClick={() => confirm('Wypisać tę osobę z rodziny rodziców?') && relacja({ akcja: 'rozlacz', rodzina: r.rodzina.id, osoba: id })} className="pn-btn pn-btn-maly">odłącz od rodziców</button>
                    </div>
                ))}
                {(!rodzina || !rodzina.maz || !rodzina.zona) && (
                    <div className="pn-rzad pn-rzad-gora">
                        {(!rodzina || !rodzina.maz) && <WyborOsoby wszystkie={wszyscyBezMnie} bez={[id]} etykieta="ojciec" onWybor={(x) => relacja({ akcja: 'polacz', osoba: x, z: id, jako: 'rodzic' })} onNowa={(i, n) => nowaWRodzinie(i, n, 'rodzic', undefined, 'M')} />}
                        {(!rodzina || !rodzina.zona) && <WyborOsoby wszystkie={wszyscyBezMnie} bez={[id]} etykieta="matka" onWybor={(x) => relacja({ akcja: 'polacz', osoba: x, z: id, jako: 'rodzic' })} onNowa={(i, n) => nowaWRodzinie(i, n, 'rodzic', undefined, 'K')} />}
                    </div>
                )}
            </section>

            <section className="pn-karta" aria-labelledby="malzenstwa-t">
                <h2 id="malzenstwa-t">małżeństwa i dzieci</h2>
                {dane.malzenstwa.map((m) => {
                    const slub = m.rodzina.zdarzenia
                    return (
                        <div key={m.rodzina.id} className="pn-kol pn-ramka">
                            <div className="pn-rzad">
                                <span className="pn-maly">{o.plec === 'K' ? 'mąż' : o.plec === 'M' ? 'żona' : 'małżonek'}</span><LinkOsoby o={m.malzonek} />
                                {!m.malzonek && <WyborOsoby wszystkie={wszyscyBezMnie} bez={[id]} etykieta="małżonek" onWybor={(x) => relacja({ akcja: 'polacz', osoba: x, z: id, jako: 'malzonek' })} onNowa={(i, n) => nowaWRodzinie(i, n, 'malzonek', m.rodzina.id, o.plec === 'K' ? 'M' : o.plec === 'M' ? 'K' : 'U')} />}
                                <button type="button" onClick={() => confirm('Wypisać tę osobę z tego małżeństwa?') && relacja({ akcja: 'rozlacz', rodzina: m.rodzina.id, osoba: id })} className="pn-btn pn-btn-maly pn-prawo">odłącz</button>
                            </div>
                            {slub.map((z) => (
                                <EdycjaZdarzenia key={z.id} z={z} miejsca={miejsca} zParafii={dane.zParafii[z.id]} wszystkie={wszyscyBezMnie} osoby={dane.osoby} zrodla={dane.zrodla} rodzajeDozwolone={['slub', 'rozwod', 'inne']}
                                    zmien={(n) => { m.rodzina.zdarzenia = slub.map((x) => (x.id === z.id ? n : x)); ustawDane({ ...dane }) }}
                                    usun={() => confirm('Usunąć?') && zapiszRodzine({ ...m.rodzina, zdarzenia: slub.filter((x) => x.id !== z.id) })} />
                            ))}
                            <div className="pn-rzad">
                                {!slub.some((z) => z.rodzaj === 'slub') && <button type="button" onClick={() => zapiszRodzine({ ...m.rodzina, zdarzenia: [...slub, { id: noweIdZdarzenia(), rodzaj: 'slub' }] })} className="pn-btn pn-btn-maly">+ ślub</button>}
                                <button type="button" onClick={() => zapiszRodzine(m.rodzina)} className="pn-btn pn-btn-maly">zapisz ślub / rozwód</button>
                            </div>
                            <span className="pn-maly">dzieci</span>
                            <div className="pn-rzad">{m.dzieci.map((c) => <LinkOsoby key={c.id} o={c} />)}</div>
                            <WyborOsoby wszystkie={wszyscyBezMnie} bez={[id, ...m.dzieci.map((c) => c.id)]} etykieta="dziecko" onWybor={(x) => relacja({ akcja: 'polacz', osoba: x, z: id, jako: 'dziecko', rodzina: m.rodzina.id })} onNowa={(i, n) => nowaWRodzinie(i, n, 'dziecko', m.rodzina.id)} />
                        </div>
                    )
                })}
                <WyborOsoby wszystkie={wszyscyBezMnie} bez={[id]} etykieta="nowe małżeństwo" onWybor={(x) => relacja({ akcja: 'polacz', osoba: x, z: id, jako: 'malzonek' })} onNowa={(i, n) => nowaWRodzinie(i, n, 'malzonek', undefined, o.plec === 'K' ? 'M' : o.plec === 'M' ? 'K' : 'U')} />
            </section>

            <section className="pn-karta" aria-labelledby="notatki-t">
                <h2 id="notatki-t">notatki i pochodzenie informacji</h2>
                <textarea value={o.notatki ?? ''} onChange={(e) => zmien({ notatki: e.target.value || undefined })} rows={5} className="pn-in" aria-label="notatki" />
                <span className="pn-maly">Notatki osoby widzą na stronie tylko zalogowani bliscy.</span>
                {/* KRT-01 (P3): „zgłosił(a)” – podpis za zgodą, bez e-maila (adres z „@” nie zostanie zapisany); PPL-11: tu, nie w danych osoby */}
                <div className="pn-formularz">
                    {pole('zgłosił(a)', <input value={o.zglosil ?? ''} placeholder="np. Anna Nowak, Olszanka" pattern="[^@]*" title="Bez adresu e-mail – sam podpis." onChange={(e) => zmien({ zglosil: e.target.value })} className="pn-in" />, 'podpis za zgodą, bez e-maila – widać na karcie osoby')}
                </div>
            </section>

            {o.cytaty?.length ? (
                <section className="pn-karta" aria-labelledby="zrodla-t">
                    <h2 id="zrodla-t">źródła osoby</h2>
                    {o.cytaty.map((c, i) => <Cytat key={i} c={c} zrodla={dane.zrodla} usun={() => zmien({ cytaty: o.cytaty!.filter((_, j) => j !== i) })} />)}
                </section>
            ) : null}

            {o.multimedia?.length ? (
                <section className="pn-karta" aria-labelledby="multimedia-t">
                    <h2 id="multimedia-t">zdjęcia i dokumenty z Ancestry ({o.multimedia.length})</h2>
                    <span className="pn-maly">W pliku GEDCOM są tylko opisy – same pliki pobierz z Ancestry i dodaj w archiwum strony.</span>
                    {o.multimedia.map((m, i) => (
                        <details key={i}>
                            <summary>{m.tytul} <span className="pn-maly">{[m.data, m.miejsce].filter(Boolean).join(' · ')}</span></summary>
                            {m.opis && <p className="pn-akapit">{m.opis}</p>}
                            {m.transkrypcja && <p className="pn-akapit pn-transkrypcja">{m.transkrypcja}</p>}
                            <button type="button" onClick={() => zmien({ multimedia: o.multimedia!.filter((_, j) => j !== i) })} className="pn-btn pn-btn-maly">pobrane do archiwum – usuń z listy</button>
                        </details>
                    ))}
                </section>
            ) : null}

            <section className="pn-naglowek pn-stopka-osoby">
                <span className="pn-maly">identyfikator: {id}{o.gedcomId && ` · z Ancestry: ${o.gedcomId}`}{o.zmieniono && ` · zmieniono ${new Date(o.zmieniono).toLocaleString('pl-PL')}`}</span>
                <span className="pn-rzad pn-maly" title="krewni tej osoby (przodkowie i ich potomkowie) oraz ich małżonkowie">
                    GEDCOM tylko z rodziną tej osoby:
                    <a href={`/api/keystatic/osoby/eksport?rodzina=${id}&zyjace=ukryte`}>bez żyjących</a>
                    <a href={`/api/keystatic/osoby/eksport?rodzina=${id}&zyjace=pelne`}>pełny</a>
                </span>
                <button onClick={async () => { if (!confirm('Przenieść tę osobę do kosza? Zostanie wypisana z rodzin.')) return; await fetch(`/api/keystatic/osoby/${id}`, { method: 'DELETE' }); location.href = '/keystatic/osoby' }} className="pn-btn pn-btn-maly pn-blad">do kosza</button>
            </section>
        </>
    )
}
