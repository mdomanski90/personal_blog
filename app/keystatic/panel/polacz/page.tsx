'use client'
// P6b (PD-10): „połącz” – wzmianki bez odnośnika w opisach miejsc, tematów, obiektów, we wpisach, materiałach i biogramach.
// Lista z kontekstem (pogrubione słowo), zaznaczenie (domyślnie pierwsza wzmianka danej pozycji w każdym tekście), podgląd
// „było → będzie”, zapis jako operacja z kopią i „cofnij” (także później – w ostatnich operacjach).
import * as React from 'react'
import { odmiana, useDane } from '../wspolne'
import { Okno } from '../okno'
import type { DanePolacz } from '@/lib/panel/polacz-serwer'
import type { Wzmianka } from '@/lib/panel/polacz'

const API = '/api/keystatic/panel/polacz'
const RODZAJE: Record<string, string> = { miejsce: 'miejscowość', temat: 'temat', obiekt: 'obiekt', material: 'materiał', osoba: 'osoba', wpis: 'wpis' }
const norm = (s: string) => s.toLocaleLowerCase('pl-PL').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')

async function post<T>(url: string, body: unknown): Promise<{ ok: boolean; dane: T & { blad?: string } }> {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)
    if (!r) return { ok: false, dane: { blad: 'Brak połączenia z serwerem.' } as T & { blad?: string } }
    return { ok: r.ok, dane: await r.json().catch(() => ({ blad: `Błąd serwera ${r.status}` })) }
}

function Fragment({ w, nowy }: { w: Wzmianka; nowy?: boolean }) {
    return <span>{w.przed}{nowy ? <span className="pn-do">{w.nowy}</span> : <b>{w.slowo}</b>}{w.po}</span>
}

export default function Polacz() {
    const { dane: d, blad, odswiez } = useDane<DanePolacz>(API)
    const [zazn, ustawZazn] = React.useState<Set<string>>(new Set())
    const [q, ustawQ] = React.useState('')
    const [rodzaj, ustawRodzaj] = React.useState('')
    const [podglad, ustawPodglad] = React.useState(false)
    const [trwa, ustawTrwa] = React.useState(false)
    const [kom, ustawKom] = React.useState<{ tekst: string; operacja?: string | null; blad?: boolean } | null>(null)

    // po każdym wczytaniu: zaznaczone pierwsze wzmianki (jak dawny skrypt „npm run wzmianki -- --polacz”)
    React.useEffect(() => { if (d) ustawZazn(new Set(d.wzmianki.filter((w) => w.pierwsza).map((w) => w.klucz))) }, [d])

    const widoczne = React.useMemo(() => {
        if (!d) return []
        const s = norm(q.trim())
        return d.wzmianki.filter((w) => (!rodzaj || w.cel.rodzaj === rodzaj) && (!s || norm(`${w.cel.nazwa} ${w.zrodlo.nazwa} ${w.slowo}`).includes(s)))
    }, [d, q, rodzaj])
    const grupy = React.useMemo(() => {
        const m = new Map<string, Wzmianka[]>()
        for (const w of widoczne) m.set(w.plik, [...(m.get(w.plik) ?? []), w])
        return [...m.values()]
    }, [widoczne])
    const wybrane = d?.wzmianki.filter((w) => zazn.has(w.klucz)) ?? []
    const rodzajeCelow = [...new Set(d?.wzmianki.map((w) => w.cel.rodzaj) ?? [])]
    const przelacz = (k: string) => ustawZazn((z) => { const n = new Set(z); if (n.has(k)) n.delete(k); else n.add(k); return n })
    const ustawWidoczne = (wl: boolean) => ustawZazn((z) => { const n = new Set(z); for (const w of widoczne) if (wl) n.add(w.klucz); else n.delete(w.klucz); return n })
    const zamknij = React.useCallback(() => ustawPodglad(false), [])
    const zapisz = async () => {
        ustawTrwa(true)
        const r = await post<{ id: string | null; zapisane: number; teksty: number }>(API, { klucze: wybrane.map((w) => w.klucz) })
        ustawTrwa(false); ustawPodglad(false)
        if (r.ok) ustawKom({ tekst: `Wstawiono ${odmiana(r.dane.zapisane, ['odnośnik', 'odnośniki', 'odnośników'])} w ${odmiana(r.dane.teksty, ['tekście', 'tekstach', 'tekstach'])}.`, operacja: r.dane.id })
        else ustawKom({ tekst: r.dane.blad ?? 'Nie udało się zapisać.', blad: true })
        odswiez()
    }
    const cofnij = async (id: string) => {
        ustawTrwa(true)
        const r = await post<{ zapisane: number }>('/api/keystatic/panel/operacje', { akcja: 'cofnij', id })
        ustawTrwa(false)
        ustawKom(r.ok ? { tekst: `Cofnięto: ${odmiana(r.dane.zapisane, ['tekst wrócił', 'teksty wróciły', 'tekstów wróciło'])} do poprzedniego stanu.` } : { tekst: r.dane.blad ?? 'Nie udało się cofnąć.', blad: true })
        odswiez()
    }
    const plikiWybranych = new Set(wybrane.map((w) => w.plik)).size

    return (
        <>
            <header className="pn-naglowek">
                <div className="pn-kol pn-kol-wasko">
                    <h1>połącz wzmianki {d && <span className="pn-szary">· {d.wzmianki.length}</span>}</h1>
                    <span className="pn-maly">Nazwy miejscowości, obiektów, tematów i osób, które padają w tekstach bez odnośnika. Zaznacz, które zamienić na odnośnik [[…]] – przed zapisem zobaczysz każdą zmianę, po zapisie możesz cofnąć.</span>
                </div>
            </header>
            {blad && <p className="pn-kom pn-bez-marginesu">{blad}</p>}
            {kom && <div className={kom.blad ? 'pn-ostrz' : 'pn-info'} role={kom.blad ? 'alert' : 'status'}>
                <span className="pn-rzad pn-rosnie"><span className="pn-rosnie">{kom.tekst}</span>{kom.operacja && <button type="button" className="pn-btn pn-btn-maly" disabled={trwa} onClick={() => cofnij(kom.operacja!)}>cofnij</button>}</span>
            </div>}
            {d && d.wzmianki.length > 0 && <div className="pn-rzad">
                <input className="pn-in pn-in-szukaj pn-rosnie pn-waskie-500" type="search" placeholder="szukaj nazwy albo tekstu…" aria-label="szukaj we wzmiankach" value={q} onChange={(e) => ustawQ(e.target.value)} />
                <select className="pn-in" aria-label="rodzaj pozycji" value={rodzaj} onChange={(e) => ustawRodzaj(e.target.value)}>
                    <option value="">wszystkie rodzaje</option>
                    {rodzajeCelow.map((r) => <option key={r} value={r}>{RODZAJE[r] ?? r}</option>)}
                </select>
                <button type="button" className="pn-btn pn-btn-maly" onClick={() => ustawWidoczne(true)}>zaznacz widoczne</button>
                <button type="button" className="pn-btn pn-btn-maly" onClick={() => ustawWidoczne(false)}>odznacz widoczne</button>
            </div>}
            {wybrane.length > 0 && (
                <div className="pn-pasek-akcji" role="region" aria-label="połącz zaznaczone">
                    <b>zaznaczono {wybrane.length}</b>
                    <span className="pn-szary">w {odmiana(plikiWybranych, ['tekście', 'tekstach', 'tekstach'])}</span>
                    {/* bez disabled w trakcie – przycisk zachowuje fokus, okno zwraca go po zamknięciu (zasada 5.3) */}
                    <button type="button" className="pn-btn pn-btn-gl" onClick={() => ustawPodglad(true)}>podgląd zmian…</button>
                    <button type="button" className="pn-btn" onClick={() => ustawZazn(new Set())}>odznacz wszystko</button>
                </div>
            )}
            <section className="pn-karta" aria-label="wzmianki bez odnośnika">
                {!d && !blad && <span className="pn-szary">szukam wzmianek…</span>}
                {d && d.wzmianki.length === 0 && <span className="pn-szary">Brak wzmianek bez odnośnika w {odmiana(d.teksty, ['tekście', 'tekstach', 'tekstach'])}.</span>}
                {d && d.wzmianki.length > 0 && <>
                    <span className="pn-maly" role="status">{widoczne.length === d.wzmianki.length ? odmiana(d.wzmianki.length, ['wzmianka', 'wzmianki', 'wzmianek']) : `${widoczne.length} z ${d.wzmianki.length} wzmianek`}</span>
                    <div className="pn-tabela-ramka">
                        <table className="pn-tabela pn-polacz">
                            <thead><tr><th scope="col" className="pn-kol-zazn"><span className="pn-ukryte">zaznacz</span></th><th scope="col">fragment tekstu</th><th scope="col">odnośnik do</th></tr></thead>
                            {grupy.map((g) => (
                                <tbody key={g.map((w) => w.klucz).join('|')}>
                                    <tr className="pn-polacz-tekst"><th scope="rowgroup" colSpan={3}>{RODZAJE[g[0].zrodlo.rodzaj] ?? g[0].zrodlo.rodzaj} „{g[0].zrodlo.nazwa}” <span className="pn-szary">· {g[0].plik}</span></th></tr>
                                    {g.map((w) => (
                                        <tr key={w.klucz} aria-selected={zazn.has(w.klucz)}>
                                            <td className="pn-kol-zazn"><input type="checkbox" checked={zazn.has(w.klucz)} onChange={() => przelacz(w.klucz)} aria-label={`połącz „${w.slowo}” z: ${w.cel.nazwa}`} /></td>
                                            <td><Fragment w={w} /></td>
                                            <td>{w.cel.nazwa} <span className="pn-szary">· {RODZAJE[w.cel.rodzaj] ?? w.cel.rodzaj}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            ))}
                        </table>
                    </div>
                </>}
            </section>
            <Okno otwarte={podglad} tytul="podgląd zmian" onZamknij={zamknij} stopka={<>
                <button type="button" className="pn-btn" onClick={zamknij}>anuluj</button>
                <button type="button" className="pn-btn pn-btn-gl" disabled={trwa || !wybrane.length} onClick={zapisz}>{trwa ? 'zapisuję…' : `wstaw odnośniki (${wybrane.length})`}</button>
            </>}>
                <div className="pn-kol">
                    <span>Zmieni się: <b>{odmiana(plikiWybranych, ['tekst', 'teksty', 'tekstów'])}</b>, {odmiana(wybrane.length, ['nowy odnośnik', 'nowe odnośniki', 'nowych odnośników'])}. Na stronie słowa staną się odnośnikami, a pozycje dostaną odnośnik zwrotny zamiast „wzmianki”.</span>
                    <div className="pn-tabela-ramka">
                        <table className="pn-tabela">
                            <thead><tr><th scope="col">było</th><th scope="col">będzie</th></tr></thead>
                            <tbody>{wybrane.slice(0, 50).map((w) => <tr key={w.klucz}><td><Fragment w={w} /></td><td><Fragment w={w} nowy /></td></tr>)}</tbody>
                        </table>
                    </div>
                    {wybrane.length > 50 && <span className="pn-maly">…i {wybrane.length - 50} więcej.</span>}
                    <span className="pn-maly">Zapis to jedna operacja z kopią – po zapisie przycisk „cofnij” przywróci poprzedni stan (także później, w ostatnich operacjach).</span>
                </div>
            </Okno>
        </>
    )
}
