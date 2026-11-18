'use client'
// Panel osób (PK: w ramie panelu, klasy z app/keystatic/panel.css): lista z wyszukiwaniem, nowa osoba, jednorazowy import z GEDCOM (podgląd → zapis), eksport, ostrzeżenia.
// Plik GEDCOM jest czytany w przeglądarce i wysyłany tylko na serwer strony.
import * as React from 'react'
import { wyslij } from './wspolne'

type Skrot = { id: string; nazwa: string; imiona: string; nazwisko: string; plec: string; lata: string; miejsce: string; zyje: boolean; widocznosc: string; uwagi: number }
type Pods = {
    osoby: number; rodziny: number; zdarzenia: number; zrodla: number; cytaty: number; multimedia: number; zyjace: number; doSprawdzeniaZycia?: number; doSprawdzeniaZyciaOsoby?: { id: string; nazwa: string; lata: string; wiek: number; szacowany: boolean }[]; chrzty: number; chrzestni: number; chrzestniPowiazani: number; obrzadki: number
    datyNieodczytane: string[]; miejscaDopasowane: { tekst: string; miejsce: string; ile: number }[]; miejscaNiedopasowane: { tekst: string; ile: number }[]; imionaZDopiskami: number; slubyScalone: number; pominieteZnaczniki: string[]
}
type DoSprawdzenia = { id: string; nazwa: string; lata: string; wiek: number; szacowany: boolean; zyje: string }
type Dane = { osoby: Skrot[]; import: { data: string; plik: string; podsumowanie: Partial<Pods> } | null; ostrzezenia: { osoba: string; tekst: string }[]; doSprawdzeniaZycia?: DoSprawdzenia[] }

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
        if (r.ok) { ustawPods(r.j.podsumowanie as Pods); ustawZmarlych(new Set()); ustawMsg('') } else ustawMsg(r.j.blad ?? 'błąd')
    }
    const [zmarli, ustawZmarlych] = React.useState<Set<string>>(new Set())
    const przelaczZmarlego = (id: string) => ustawZmarlych((z) => { const n = new Set(z); if (n.has(id)) n.delete(id); else n.add(id); return n })
    const zapiszImport = async () => {
        if (!plik) return
        ustawPracuje(true)
        const r = await wyslij('/api/keystatic/osoby', { akcja: 'import', gedcom: plik.tekst, plik: plik.nazwa, potwierdzenie: potw, zmarli: [...zmarli] })
        ustawPracuje(false)
        if (r.ok) { ustawMsg(`Zapisano drzewo: ${(r.j.podsumowanie as Pods).osoby} osób.`); ustawPlik(null); ustawPods(null); wczytaj() } else ustawMsg(r.j.blad ?? 'błąd')
    }
    const dodaj = async (e: React.FormEvent) => {
        e.preventDefault()
        const r = await wyslij('/api/keystatic/osoby', { akcja: 'nowa', ...nowa })
        if (r.ok) location.href = `/keystatic/osoby/${r.j.id}`
        else ustawMsg(r.j.blad ?? 'błąd')
    }
    const oznaczZycie = async (ids: string[], zyje: 'tak' | 'nie', pytaj = false) => {
        if (!ids.length || (pytaj && !confirm(`Oznaczyć ${ids.length} ${ids.length === 1 ? 'osobę' : 'osób'} jako zmarłe?`))) return
        const r = await wyslij('/api/keystatic/osoby', { akcja: 'zyje', ids, zyje })
        if (!r.ok) ustawMsg(r.j.blad ?? 'błąd')
        wczytaj()
    }
    const ostrzWgOsob = React.useMemo(() => new Map((dane?.osoby ?? []).map((o) => [o.id, o])), [dane])

    return (
        <>
            <header className="pn-naglowek">
                <h1>osoby {dane && <span className="pn-szary">· {dane.osoby.length}</span>}</h1>
                <span className="pn-rzad">
                    <a className="pn-btn" href="/osoby" target="_blank" rel="noreferrer">na stronie ↗</a>
                    <a className="pn-btn" href="#import-gedcom">import GEDCOM</a>
                    <a className="pn-btn pn-btn-gl" href="#nowa-osoba">+ osoba</a>
                </span>
            </header>
            {msg && <p className="pn-kom" role="status">{msg}</p>}

            {dane && dane.osoby.length > 0 && (
                <section className="pn-karta" aria-label="lista osób">
                    <div className="pn-rzad">
                        <input type="search" className="pn-in pn-in-szukaj pn-rosnie" value={q} onChange={(e) => ustawQ(e.target.value)} placeholder="nazwisko, imię, wieś, rok…" aria-label="szukaj osoby" />
                        <span className="pn-maly" aria-live="polite">{lista.length} z {dane.osoby.length}</span>
                        {dane.ostrzezenia.length > 0 && <button type="button" className="pn-btn" aria-expanded={pokazOstrz} onClick={() => ustawPokazOstrz((x) => !x)}>do sprawdzenia: {dane.ostrzezenia.length}</button>}
                    </div>
                    {(dane.doSprawdzeniaZycia?.length ?? 0) > 0 && (
                        <div className="pn-ostrz">
                            <div className="pn-kol">
                                <div className="pn-naglowek">
                                    <b>czy te osoby jeszcze żyją? ({dane.doSprawdzeniaZycia!.length})</b>
                                    <button type="button" className="pn-btn pn-btn-maly" onClick={() => oznaczZycie(dane.doSprawdzeniaZycia!.filter((x) => x.zyje !== 'tak').map((x) => x.id), 'nie', true)}>wszystkie z listy: nie żyją</button>
                                </div>
                                <span className="pn-maly">Wg dat miałyby 95–104 lata, a w drzewie nie ma daty zgonu – dlatego na razie liczą się jako żyjące (dane tylko dla bliskich). Osoby, które miałyby 105 lat i więcej, strona uznaje za zmarłe sama.</span>
                                <div className="pn-wiersze pn-przewijane">
                                    {dane.doSprawdzeniaZycia!.map((x) => (
                                        <span key={x.id} className="pn-wiersz">
                                            <a href={`/keystatic/osoby/${x.id}`}>{x.nazwa}</a>
                                            <span className="pn-maly">{x.lata || '—'} · {x.szacowany ? 'ok. ' : ''}{x.wiek} lat{x.zyje === 'tak' ? ' · oznaczona: żyje' : ''}</span>
                                            <span className="pn-prawo pn-rzad">
                                                <button type="button" className="pn-btn pn-btn-maly" onClick={() => oznaczZycie([x.id], 'nie')}>nie żyje</button>
                                                {x.zyje !== 'tak' && <button type="button" className="pn-btn pn-btn-maly" onClick={() => oznaczZycie([x.id], 'tak')}>żyje</button>}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {pokazOstrz && (
                        <div className="pn-wiersze pn-przewijane">
                            {dane.ostrzezenia.map((w, i) => <span key={i} className="pn-wiersz"><a href={`/keystatic/osoby/${w.osoba}`}>{ostrzWgOsob.get(w.osoba)?.nazwa ?? w.osoba}</a> – {w.tekst}</span>)}
                        </div>
                    )}
                    <div className="pn-wiersze pn-lista-osob">
                        {lista.slice(0, 500).map((o) => (
                            <a key={o.id} href={`/keystatic/osoby/${o.id}`} className="pn-wiersz">
                                <b>{o.nazwisko || '—'}</b><span>{o.imiona}</span>
                                <span className="pn-maly">{o.lata}{o.miejsce && ` · ${o.miejsce}`}</span>
                                <span className="pn-prawo pn-rzad pn-maly">
                                    {o.zyje && <span>żyjąca</span>}
                                    <span>{WID[o.widocznosc]}</span>
                                    {o.uwagi > 0 && <span>uwagi: {o.uwagi}</span>}
                                </span>
                            </a>
                        ))}
                        {lista.length > 500 && <span className="pn-wiersz pn-maly">…i {lista.length - 500} więcej – zawęź wyszukiwanie</span>}
                    </div>
                </section>
            )}

            <form onSubmit={dodaj} className="pn-karta" id="nowa-osoba" aria-labelledby="nowa-osoba-t">
                <h2 id="nowa-osoba-t">nowa osoba</h2>
                <div className="pn-rzad">
                    <input className="pn-in pn-rosnie" value={nowa.imiona} onChange={(e) => ustawNowa({ ...nowa, imiona: e.target.value })} placeholder="imiona" aria-label="imiona" />
                    <input className="pn-in pn-rosnie" value={nowa.nazwisko} onChange={(e) => ustawNowa({ ...nowa, nazwisko: e.target.value })} placeholder="nazwisko" aria-label="nazwisko" />
                    <select className="pn-in" value={nowa.plec} onChange={(e) => ustawNowa({ ...nowa, plec: e.target.value })} aria-label="płeć"><option value="U">płeć…</option><option value="K">kobieta</option><option value="M">mężczyzna</option></select>
                    <button type="submit" className="pn-btn pn-btn-gl">dodaj</button>
                </div>
                <span className="pn-maly">Rodziców, małżonków i dzieci najwygodniej dodawać z karty osoby – od razu trafiają do rodziny.</span>
            </form>

            <section className="pn-karta" id="import-gedcom" aria-labelledby="import-t">
                <h2 id="import-t">przeprowadzka drzewa z Ancestry (GEDCOM)</h2>
                {dane?.import ? (
                    <p className="pn-bez-marginesu">Drzewo wczytane {new Date(dane.import.data).toLocaleString('pl-PL')}{dane.import.plik && ` z pliku „${dane.import.plik}”`}: {dane.import.podsumowanie.osoby} osób, {dane.import.podsumowanie.rodziny} rodzin, {dane.import.podsumowanie.zrodla} {dane.import.podsumowanie.zrodla === 1 ? 'źródło' : 'źródeł'}. Od tej pory drzewo zmieniasz tutaj; ponowny import jest zablokowany (zastąpiłby zmiany z panelu).</p>
                ) : (
                    <p className="pn-bez-marginesu">W Ancestry: <i>Drzewa → Ustawienia drzewa → Eksportuj drzewo</i>, pobierz plik .ged. Wybierz go tutaj – najpierw zobaczysz podsumowanie, zapis dopiero po zatwierdzeniu. Plik trafia tylko na serwer strony.</p>
                )}
                <label className="pn-btn pn-samo">{plik ? `plik: ${plik.nazwa}` : 'wybierz plik .ged'}<input type="file" accept=".ged,.gedcom,text/plain" hidden onChange={(e) => e.target.files?.[0] && wybierzPlik(e.target.files[0])} /></label>
                {pracuje && <span className="pn-szary" role="status">przetwarzam…</span>}
                {pods && (
                    <div className="pn-kol pn-ramka">
                        <b>podgląd importu (nic jeszcze nie zapisano)</b>
                        <span>{pods.osoby} osób ({pods.zyjace} prawdopodobnie żyjących – widocznych tylko dla bliskich) · {pods.rodziny} rodzin · {pods.zdarzenia} zdarzeń · {pods.zrodla} {pods.zrodla === 1 ? 'źródło' : 'źródeł'}, {pods.cytaty} cytowań · {pods.multimedia} opisów zdjęć i dokumentów (same pliki trzeba pobrać z Ancestry osobno)</span>
                        <span>chrzty: {pods.chrzty} · chrzestni: {pods.chrzestni}, w tym {pods.chrzestniPowiazani} połączonych z osobami z drzewa · obrządek rozpoznany w {pods.obrzadki} zdarzeniach · śluby zdublowane przy osobach scalone: {pods.slubyScalone}</span>
                        {(pods.doSprawdzeniaZyciaOsoby?.length ?? 0) > 0 && (
                            <div className="pn-ostrz">
                                <div className="pn-kol">
                                    <div className="pn-naglowek">
                                        <b>sprawdź, czy żyją: {pods.doSprawdzeniaZyciaOsoby!.length}</b>
                                        <span className="pn-rzad">
                                            <button type="button" className="pn-btn pn-btn-maly" onClick={() => ustawZmarlych(new Set(pods.doSprawdzeniaZyciaOsoby!.map((x) => x.id)))}>zaznacz wszystkie</button>
                                            <button type="button" className="pn-btn pn-btn-maly" onClick={() => ustawZmarlych(new Set())}>odznacz</button>
                                        </span>
                                    </div>
                                    <span className="pn-maly">Wg dat mają 95–104 lata, a w pliku nie ma daty zgonu – bez zaznaczenia zostaną zapisane jako żyjące (dane tylko dla bliskich). Zaznacz te, które nie żyją. Osoby, które miałyby 105 lat i więcej, strona uznaje za zmarłe sama.</span>
                                    <div className="pn-wiersze pn-przewijane">
                                        {pods.doSprawdzeniaZyciaOsoby!.map((x) => (
                                            <label key={x.id} className="pn-wiersz">
                                                <input type="checkbox" checked={zmarli.has(x.id)} onChange={() => przelaczZmarlego(x.id)} />
                                                <span>{x.nazwa}</span>
                                                <span className="pn-maly">{x.lata || '—'} · {x.szacowany ? 'ok. ' : ''}{x.wiek} lat</span>
                                                <span className="pn-prawo pn-maly">{zmarli.has(x.id) ? 'nie żyje' : 'żyje?'}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {pods.imionaZDopiskami > 0 && <span className="pn-ostrz">imiona lub nazwiska z dopiskami (np. cM z DNA): {pods.imionaZDopiskami} – trafią na listę „do sprawdzenia”</span>}
                        {pods.datyNieodczytane.length > 0 && <span className="pn-ostrz">daty nieodczytane ({pods.datyNieodczytane.length}, zostaną jako tekst): {pods.datyNieodczytane.slice(0, 12).join(' · ')}</span>}
                        <details><summary>miejsca dopasowane do miejscowości strony: {pods.miejscaDopasowane.length}</summary><div className="pn-kol pn-maly">{pods.miejscaDopasowane.map((m) => <span key={m.tekst}>{m.tekst} → <b>{m.miejsce}</b> ({m.ile})</span>)}</div></details>
                        <details><summary>miejsca bez dopasowania (zostaną jako tekst): {pods.miejscaNiedopasowane.length}</summary><div className="pn-kol pn-maly">{pods.miejscaNiedopasowane.slice(0, 200).map((m) => <span key={m.tekst}>{m.tekst} ({m.ile})</span>)}</div></details>
                        {pods.pominieteZnaczniki.length > 0 && <span className="pn-maly">pominięte pola Ancestry: {pods.pominieteZnaczniki.join(', ')}</span>}
                        {dane?.import && <label className="pn-rzad">Drzewo jest już wczytane. Żeby je zastąpić (obecne dane trafią do kosza; osoby dodane w panelu, np. z planów cmentarzy, zostaną), wpisz <b>ZASTĄP</b>: <input className="pn-in pn-waskie" value={potw} onChange={(e) => ustawPotw(e.target.value)} aria-label="potwierdzenie: ZASTĄP" /></label>}
                        <button type="button" onClick={zapiszImport} disabled={pracuje || (!!dane?.import && potw !== 'ZASTĄP')} className="pn-btn pn-btn-gl pn-samo">zapisz drzewo na stronie</button>
                    </div>
                )}
            </section>

            <section className="pn-karta" aria-labelledby="eksport-t">
                <h2 id="eksport-t">eksport GEDCOM</h2>
                <span>Całe drzewo w GEDCOM 5.5.1 – do Ancestry (każdy wgrany plik tworzy tam nowe drzewo) albo innego programu. Chrzestni w opisie chrztu („Paten/Godparents: …”), obrządek w polu wyznania.</span>
                <span className="pn-rzad">
                    <a className="pn-btn" href="/api/keystatic/osoby/eksport?zyjace=ukryte">pobierz bez danych osób żyjących</a>
                    <a className="pn-btn" href="/api/keystatic/osoby/eksport?zyjace=pelne">pobierz pełne</a>
                    <span className="pn-maly">samą rodzinę jednej osoby pobierzesz z jej karty</span>
                </span>
            </section>
        </>
    )
}
