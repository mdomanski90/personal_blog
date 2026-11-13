'use client'
// Panel osób: lista z wyszukiwaniem, nowa osoba, jednorazowy import z GEDCOM (podgląd → zapis), eksport, ostrzeżenia.
// Plik GEDCOM jest czytany w przeglądarce i wysyłany tylko na serwer strony.
import * as React from 'react'
import { btn, pole, wyslij } from './wspolne'

type Skrot = { id: string; nazwa: string; imiona: string; nazwisko: string; plec: string; lata: string; miejsce: string; zyje: boolean; widocznosc: string; uwagi: number }
type Pods = {
    osoby: number; rodziny: number; zdarzenia: number; zrodla: number; cytaty: number; multimedia: number; zyjace: number; chrzty: number; chrzestni: number; chrzestniPowiazani: number; obrzadki: number
    datyNieodczytane: string[]; miejscaDopasowane: { tekst: string; miejsce: string; ile: number }[]; miejscaNiedopasowane: { tekst: string; ile: number }[]; imionaZDopiskami: number; slubyScalone: number; pominieteZnaczniki: string[]
}
type Dane = { osoby: Skrot[]; import: { data: string; plik: string; podsumowanie: Partial<Pods> } | null; ostrzezenia: { osoba: string; tekst: string }[] }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
const WID: Record<string, string> = { publiczne: 'publiczna', bliscy: 'dla bliskich', ja: 'tylko ja' }


export default function Osoby() {
    const [dane, ustaw] = React.useState<Dane | null>(null)
    const [msg, ustawMsg] = React.useState('')
    const [q, ustawQ] = React.useState('')
    const [nowa, ustawNowa] = React.useState({ imiona: '', nazwisko: '', plec: 'U' })
    const [plik, ustawPlik] = React.useState<{ nazwa: string; tekst: string } | null>(null)
    const [pods, ustawPods] = React.useState<Pods | null>(null)
    const [potw, ustawPotw] = React.useState('')
    const [pracuje, ustawPracuje] = React.useState(false)
    const [pokazOstrz, ustawPokazOstrz] = React.useState(false)

    const wczytaj = React.useCallback(() => {
        fetch('/api/keystatic/osoby').then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then(ustaw)
            .catch((s) => ustawMsg(s === 401 ? 'Brak dostępu – panel osób działa tylko za hasłem panelu (nginx).' : 'Nie udało się wczytać osób.'))
    }, [])
    React.useEffect(() => { wczytaj() }, [wczytaj])

    const lista = React.useMemo(() => {
        if (!dane) return []
        const t = norm(q.trim())
        if (!t) return dane.osoby
        const slowa = t.split(/\s+/)
        return dane.osoby.filter((o) => { const h = norm(`${o.imiona} ${o.nazwisko} ${o.lata} ${o.miejsce} ${o.id}`); return slowa.every((s) => h.includes(s)) })
    }, [dane, q])

    const wybierzPlik = async (f: File) => {
        ustawPods(null); ustawMsg(`czytam ${f.name}…`)
        const tekst = await f.text()
        ustawPlik({ nazwa: f.name, tekst })
        ustawPracuje(true)
        const r = await wyslij('/api/keystatic/osoby', { akcja: 'podglad', gedcom: tekst })
        ustawPracuje(false)
        if (r.ok) { ustawPods(r.j.podsumowanie as Pods); ustawMsg('') } else ustawMsg(r.j.blad ?? 'błąd')
    }
    const zapiszImport = async () => {
        if (!plik) return
        ustawPracuje(true)
        const r = await wyslij('/api/keystatic/osoby', { akcja: 'import', gedcom: plik.tekst, plik: plik.nazwa, potwierdzenie: potw })
        ustawPracuje(false)
        if (r.ok) { ustawMsg(`Zapisano drzewo: ${(r.j.podsumowanie as Pods).osoby} osób.`); ustawPlik(null); ustawPods(null); wczytaj() } else ustawMsg(r.j.blad ?? 'błąd')
    }
    const dodaj = async (e: React.FormEvent) => {
        e.preventDefault()
        const r = await wyslij('/api/keystatic/osoby', { akcja: 'nowa', ...nowa })
        if (r.ok) location.href = `/keystatic/osoby/${r.j.id}`
        else ustawMsg(r.j.blad ?? 'błąd')
    }
    const ostrzWgOsob = React.useMemo(() => new Map((dane?.osoby ?? []).map((o) => [o.id, o])), [dane])

    return (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px 60px', fontFamily: 'var(--font-jetbrains), monospace', display: 'flex', flexDirection: 'column', gap: 18, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 }}>
                <h1 style={{ fontSize: 22, margin: 0 }}>osoby {dane && <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 400 }}>· {dane.osoby.length}</span>}</h1>
                <span style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}><a href="/keystatic/panel">← panel</a><a href="/osoby" target="_blank" rel="noreferrer">na stronie ↗</a><a href="/keystatic/plany">plany →</a><a href="/keystatic">panel treści →</a></span>
            </div>
            {msg && <p style={{ margin: 0, padding: '8px 10px', borderRadius: 7, background: '#fef3c7', color: '#78350f' }}>{msg}</p>}

            {dane && dane.osoby.length > 0 && (
                <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <input value={q} onChange={(e) => ustawQ(e.target.value)} placeholder="szukaj: nazwisko, imię, wieś, rok…" style={{ ...pole, flex: '1 1 280px' }} autoFocus />
                        <span style={{ color: '#6b7280', fontSize: 12 }}>{lista.length} z {dane.osoby.length}</span>
                        {dane.ostrzezenia.length > 0 && <button onClick={() => ustawPokazOstrz((x) => !x)} style={{ ...btn, background: '#fef3c7' }}>do sprawdzenia: {dane.ostrzezenia.length}</button>}
                    </div>
                    {pokazOstrz && (
                        <div style={{ border: '1px solid #fcd34d', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 320, overflow: 'auto' }}>
                            {dane.ostrzezenia.map((w, i) => <span key={i} style={{ fontSize: 13 }}><a href={`/keystatic/osoby/${w.osoba}`}>{ostrzWgOsob.get(w.osoba)?.nazwa ?? w.osoba}</a> – {w.tekst}</span>)}
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '60vh', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                        {lista.slice(0, 500).map((o) => (
                            <a key={o.id} href={`/keystatic/osoby/${o.id}`} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '5px 10px', borderBottom: '1px solid #f0eee9', color: 'inherit', textDecoration: 'none' }}>
                                <span style={{ width: 8, height: 8, borderRadius: 4, flex: 'none', background: o.plec === 'K' ? '#e9a8bd' : o.plec === 'M' ? '#8fb3dc' : '#c8c8c8' }} />
                                <b style={{ fontWeight: 700 }}>{o.nazwisko || '—'}</b><span>{o.imiona}</span>
                                <span style={{ color: '#6b7280', fontSize: 12 }}>{o.lata}{o.miejsce && ` · ${o.miejsce}`}</span>
                                <span style={{ flex: 1 }} />
                                {o.zyje && <span style={{ fontSize: 11, color: '#6b7280' }}>żyjąca</span>}
                                <span style={{ fontSize: 11, color: '#6b7280' }}>{WID[o.widocznosc]}</span>
                                {o.uwagi > 0 && <span style={{ fontSize: 11, color: '#92400e' }}>⚠ {o.uwagi}</span>}
                            </a>
                        ))}
                        {lista.length > 500 && <span style={{ padding: 8, color: '#6b7280', fontSize: 12 }}>…i {lista.length - 500} więcej – zawęź wyszukiwanie</span>}
                    </div>
                </section>
            )}

            <form onSubmit={dodaj} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <b style={{ width: '100%' }}>nowa osoba</b>
                <input value={nowa.imiona} onChange={(e) => ustawNowa({ ...nowa, imiona: e.target.value })} placeholder="imiona" style={{ ...pole, flex: '1 1 160px' }} />
                <input value={nowa.nazwisko} onChange={(e) => ustawNowa({ ...nowa, nazwisko: e.target.value })} placeholder="nazwisko" style={{ ...pole, flex: '1 1 160px' }} />
                <select value={nowa.plec} onChange={(e) => ustawNowa({ ...nowa, plec: e.target.value })} style={pole}><option value="U">płeć…</option><option value="K">kobieta</option><option value="M">mężczyzna</option></select>
                <button type="submit" style={btn}>dodaj</button>
                <span style={{ color: '#6b7280', fontSize: 12, width: '100%' }}>Rodziców, małżonków i dzieci najwygodniej dodawać z karty osoby – od razu trafiają do rodziny.</span>
            </form>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #e5e7eb', paddingTop: 14 }}>
                <b>przeprowadzka drzewa z Ancestry (GEDCOM)</b>
                {dane?.import ? (
                    <p style={{ margin: 0, color: '#374151' }}>Drzewo wczytane {new Date(dane.import.data).toLocaleString('pl-PL')}{dane.import.plik && ` z pliku „${dane.import.plik}”`}: {dane.import.podsumowanie.osoby} osób, {dane.import.podsumowanie.rodziny} rodzin, {dane.import.podsumowanie.zrodla} {dane.import.podsumowanie.zrodla === 1 ? 'źródło' : 'źródeł'}. Od tej pory drzewo zmieniasz tutaj; ponowny import jest zablokowany (zastąpiłby zmiany z panelu).</p>
                ) : (
                    <p style={{ margin: 0, color: '#374151' }}>W Ancestry: <i>Drzewa → Ustawienia drzewa → Eksportuj drzewo</i>, pobierz plik .ged. Wybierz go tutaj – najpierw zobaczysz podsumowanie, zapis dopiero po zatwierdzeniu. Plik trafia tylko na serwer strony.</p>
                )}
                <label style={{ ...btn, display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start' }}>{plik ? `plik: ${plik.nazwa}` : 'wybierz plik .ged'}<input type="file" accept=".ged,.gedcom,text/plain" hidden onChange={(e) => e.target.files?.[0] && wybierzPlik(e.target.files[0])} /></label>
                {pracuje && <span style={{ color: '#6b7280' }}>przetwarzam…</span>}
                {pods && (
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <b>podgląd importu (nic jeszcze nie zapisano)</b>
                        <span>{pods.osoby} osób ({pods.zyjace} prawdopodobnie żyjących – widocznych tylko dla bliskich) · {pods.rodziny} rodzin · {pods.zdarzenia} zdarzeń · {pods.zrodla} {pods.zrodla === 1 ? 'źródło' : 'źródeł'}, {pods.cytaty} cytowań · {pods.multimedia} opisów zdjęć i dokumentów (same pliki trzeba pobrać z Ancestry osobno)</span>
                        <span>chrzty: {pods.chrzty} · chrzestni: {pods.chrzestni}, w tym {pods.chrzestniPowiazani} połączonych z osobami z drzewa · obrządek rozpoznany w {pods.obrzadki} zdarzeniach · śluby zdublowane przy osobach scalone: {pods.slubyScalone}</span>
                        {pods.imionaZDopiskami > 0 && <span style={{ color: '#92400e' }}>imiona lub nazwiska z dopiskami (np. cM z DNA): {pods.imionaZDopiskami} – trafią na listę „do sprawdzenia”</span>}
                        {pods.datyNieodczytane.length > 0 && <span style={{ color: '#92400e' }}>daty nieodczytane ({pods.datyNieodczytane.length}, zostaną jako tekst): {pods.datyNieodczytane.slice(0, 12).join(' · ')}</span>}
                        <details><summary>miejsca dopasowane do miejscowości strony: {pods.miejscaDopasowane.length}</summary><div style={{ fontSize: 12, display: 'flex', flexDirection: 'column' }}>{pods.miejscaDopasowane.map((m) => <span key={m.tekst}>{m.tekst} → <b>{m.miejsce}</b> ({m.ile})</span>)}</div></details>
                        <details><summary>miejsca bez dopasowania (zostaną jako tekst): {pods.miejscaNiedopasowane.length}</summary><div style={{ fontSize: 12, display: 'flex', flexDirection: 'column' }}>{pods.miejscaNiedopasowane.slice(0, 200).map((m) => <span key={m.tekst}>{m.tekst} ({m.ile})</span>)}</div></details>
                        {pods.pominieteZnaczniki.length > 0 && <span style={{ fontSize: 12, color: '#6b7280' }}>pominięte pola Ancestry: {pods.pominieteZnaczniki.join(', ')}</span>}
                        {dane?.import && <label style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>Drzewo jest już wczytane. Żeby je zastąpić (obecne dane trafią do kosza), wpisz <b>ZASTĄP</b>: <input value={potw} onChange={(e) => ustawPotw(e.target.value)} style={{ ...pole, width: 120 }} /></label>}
                        <button onClick={zapiszImport} disabled={pracuje || (!!dane?.import && potw !== 'ZASTĄP')} style={{ ...btn, alignSelf: 'flex-start', background: '#1f2937', color: '#fff', border: 'none' }}>zapisz drzewo na stronie</button>
                    </div>
                )}
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #e5e7eb', paddingTop: 14 }}>
                <b>eksport GEDCOM</b>
                <span style={{ color: '#374151' }}>Całe drzewo w GEDCOM 5.5.1 – do Ancestry (każdy wgrany plik tworzy tam nowe drzewo) albo innego programu. Chrzestni w opisie chrztu („Paten/Godparents: …”), obrządek w polu wyznania.</span>
                <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <a href="/api/keystatic/osoby/eksport?zyjace=ukryte" style={{ ...btn, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>pobierz bez danych osób żyjących</a>
                    <a href="/api/keystatic/osoby/eksport?zyjace=pelne" style={{ ...btn, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>pobierz pełne</a>
                </span>
            </section>
        </div>
    )
}
