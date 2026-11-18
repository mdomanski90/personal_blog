'use client'
// Do opracowania (P6B, P6a): kolejka uwag jakości. Waga (błąd / brak / wskazówka – spis reguł w lib/panel/jakosc.ts, REGULY_JAKOSCI),
// „odłóż” na 7 albo 30 dni (potem wraca), „ignoruj trwale” z notatką, „przywróć”. Bez stylów w miejscu (zasada 5.1d).
import * as React from 'react'
import { odmiana } from '../wspolne'

type Stan = 'aktywne' | 'odlozone' | 'ignorowane'
type Waga = 'blad' | 'brak' | 'wskazowka'
type Uwaga = { id: string; kolekcja: string; rekord: string; tytul: string; regula: string; opis: string; wskazowka: string; edytuj: string; stan: Stan; notatka: string; waga?: Waga; do?: string }
type Regula = { nazwa: string; waga: Waga; zakres: string; uzasadnienie: string }
const API = '/api/keystatic/panel/jakosc'
const NAZWY: Record<string, string> = { plany: 'plany', miejsca: 'miejscowości', obiekty: 'obiekty', parafie: 'instytucje', materialy: 'materiały archiwalne', ksiegi: 'księgi', publikacje: 'publikacje', zbiory: 'zbiory', posts: 'wpisy', tematy: 'tematy', hasla: 'słownik', zespoly: 'zespoły', biogramy: 'biogramy', przekierowania: 'przekierowania adresów' }
const WAGI: Record<Waga, string> = { blad: 'błąd', brak: 'brak', wskazowka: 'wskazówka' }

export default function DoOpracowania() {
    const [lista, ustaw] = React.useState<Uwaga[]>([])
    const [reguly, ustawReguly] = React.useState<Record<string, Regula>>({})
    const [blad, ustawBlad] = React.useState('')
    const [laduje, ustawLaduje] = React.useState(true)
    const [zapisuje, ustawZapisuje] = React.useState(false)
    const [filtr, ustawFiltr] = React.useState<Stan | 'wszystkie'>('aktywne')
    const [wagi, ustawWagi] = React.useState<'bez-wskazowek' | Waga | 'wszystkie'>('bez-wskazowek')
    const [kolekcja, ustawKolekcje] = React.useState('')
    const [q, ustawQ] = React.useState('')
    const [id, ustawId] = React.useState('')
    const [notatka, ustawNotatke] = React.useState('')

    const odswiez = React.useCallback(async (keep = true) => {
        ustawBlad('')
        try {
            const r = await fetch(API, { cache: 'no-store' })
            if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'Brak dostępu do panelu. Sprawdź logowanie nginx.' : `Błąd serwera ${r.status}`)
            const j = await r.json() as Uwaga[]
            if (!Array.isArray(j)) throw new Error('Niepoprawna odpowiedź serwera')
            ustaw(j)
            if (!keep) ustawId('')
        } catch (e) { ustawBlad(e instanceof Error ? e.message : 'Nie udało się pobrać ostrzeżeń') }
        finally { ustawLaduje(false) }
    }, [])
    React.useEffect(() => { void odswiez() }, [odswiez])
    React.useEffect(() => { fetch(`${API}?reguly=1`).then((r) => (r.ok ? r.json() : {})).then(ustawReguly).catch(() => {}) }, [])

    const ile = (s: Stan) => lista.filter((x) => x.stan === s).length
    const kolekcje = [...new Set(lista.map((x) => x.kolekcja))].sort((a, b) => a.localeCompare(b, 'pl'))
    const pasujeWaga = (x: Uwaga) => wagi === 'wszystkie' || (wagi === 'bez-wskazowek' ? x.waga !== 'wskazowka' : x.waga === wagi)
    const wynik = lista.filter((x) => (filtr === 'wszystkie' || x.stan === filtr) && pasujeWaga(x) && (!kolekcja || x.kolekcja === kolekcja) &&
        (!q.trim() || `${x.tytul} ${x.opis} ${x.kolekcja}`.toLocaleLowerCase('pl').includes(q.trim().toLocaleLowerCase('pl'))))
    const schowaneWskazowki = wagi === 'bez-wskazowek' ? lista.filter((x) => (filtr === 'wszystkie' || x.stan === filtr) && x.waga === 'wskazowka').length : 0
    const wybor = wynik.find((x) => x.id === id) ?? wynik[0]
    const pos = wybor ? wynik.findIndex((x) => x.id === wybor.id) : -1
    React.useEffect(() => { ustawNotatke(wybor?.notatka ?? '') }, [wybor?.id, wybor?.notatka])
    const przejdz = (i: number) => { if (wynik[i]) ustawId(wynik[i].id) }
    const zmien = async (stan: Stan, dni?: number) => {
        if (!wybor || zapisuje) return
        ustawZapisuje(true); ustawBlad('')
        const nastepny = wynik[pos + 1]?.id ?? wynik[pos - 1]?.id ?? ''
        try {
            const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: wybor.id, stan, notatka, ...(dni ? { dni } : {}) }) })
            const j = await r.json() as { blad?: string }
            if (!r.ok) throw new Error(j.blad || `Błąd ${r.status}`)
            ustawId(nastepny)
            await odswiez()
        } catch (e) { ustawBlad(e instanceof Error ? e.message : 'Błąd zapisu') }
        finally { ustawZapisuje(false) }
    }
    const regula = wybor ? reguly[wybor.regula] : undefined

    return <>
        <header className="pn-naglowek">
            <div className="pn-kol pn-kol-wasko">
                <h1>do opracowania</h1>
                <span className="pn-maly">Wskazówki do kontroli – puste pole nie zawsze jest błędem. Nic nie uzupełnia się automatycznie.</span>
            </div>
            <button type="button" className="pn-btn" onClick={() => void odswiez()} disabled={zapisuje}>⟳ sprawdź ponownie</button>
        </header>
        <section className="pn-kafle" aria-label="podsumowanie ostrzeżeń">
            <div className="pn-kafel"><span className="pn-liczba">{ile('aktywne')}</span><span>do sprawdzenia</span></div>
            <div className="pn-kafel"><span className="pn-liczba">{ile('odlozone')}</span><span>odłożone</span></div>
            <div className="pn-kafel"><span className="pn-liczba">{ile('ignorowane')}</span><span>ignorowane</span></div>
        </section>
        {blad && <p className="pn-kom pn-bez-marginesu" role="alert">{blad}</p>}
        {laduje ? <p className="pn-szary pn-bez-marginesu" role="status">wczytuję…</p> : <>
            <div className="pn-formularz">
                <label className="pn-maly pn-kol">status
                    <select className="pn-in" value={filtr} onChange={(e) => { ustawFiltr(e.target.value as Stan | 'wszystkie'); ustawId('') }}>
                        <option value="aktywne">do sprawdzenia</option><option value="odlozone">odłożone</option><option value="ignorowane">ignorowane</option><option value="wszystkie">wszystkie</option>
                    </select></label>
                <label className="pn-maly pn-kol">waga
                    <select className="pn-in" value={wagi} onChange={(e) => { ustawWagi(e.target.value as typeof wagi); ustawId('') }}>
                        <option value="bez-wskazowek">błędy i braki</option><option value="blad">tylko błędy</option><option value="brak">tylko braki</option><option value="wskazowka">tylko wskazówki</option><option value="wszystkie">wszystko</option>
                    </select></label>
                <label className="pn-maly pn-kol">dział
                    <select className="pn-in" value={kolekcja} onChange={(e) => { ustawKolekcje(e.target.value); ustawId('') }}>
                        <option value="">wszystkie działy</option>{kolekcje.map((x) => <option key={x} value={x}>{NAZWY[x] ?? x}</option>)}
                    </select></label>
                <label className="pn-maly pn-kol">wyszukaj rekord
                    <input className="pn-in pn-in-szukaj" type="search" value={q} onChange={(e) => { ustawQ(e.target.value); ustawId('') }} placeholder="tytuł, rodzaj braku…" /></label>
            </div>
            {schowaneWskazowki > 0 && <p className="pn-maly pn-bez-marginesu">Schowane wskazówki: {schowaneWskazowki} – <button type="button" className="pn-link-btn" onClick={() => ustawWagi('wszystkie')}>pokaż</button>.</p>}
            <div className="pn-siatka pn-siatka-kolejka">
                <section className="pn-karta pn-kolejka" aria-labelledby="kolejka">
                    <div className="pn-naglowek"><h2 id="kolejka" className="pn-tytul-karty">kolejka</h2><span className="pn-szary">{odmiana(wynik.length, ['pozycja', 'pozycje', 'pozycji'])}</span></div>
                    {!wynik.length && <p className="pn-maly pn-bez-marginesu">Nie ma ostrzeżeń spełniających wybrane filtry.</p>}
                    {wynik.length > 0 && <ol className="pn-wiersze pn-lista-bez-znakow">{wynik.map((x, i) => <li key={x.id}>
                        <button type="button" onClick={() => ustawId(x.id)} aria-current={wybor?.id === x.id ? 'true' : undefined} className="pn-zgl">
                            <b className="pn-lamanie">{i + 1}. {x.tytul}</b>
                            <span className="pn-maly">{x.waga && x.waga !== 'brak' ? `${WAGI[x.waga]} · ` : ''}{NAZWY[x.kolekcja] ?? x.kolekcja} · {x.opis}</span>
                        </button>
                    </li>)}</ol>}
                </section>
                <section className="pn-karta" aria-label="szczegóły ostrzeżenia">
                    {wybor ? <>
                        <div className="pn-naglowek"><span className="pn-maly">{NAZWY[wybor.kolekcja] ?? wybor.kolekcja}{wybor.waga ? ` · ${WAGI[wybor.waga]}` : ''}</span><span className="pn-maly">{pos + 1} z {wynik.length}</span></div>
                        <h2 className="pn-tytul-uwagi">{wybor.tytul}</h2>
                        <p className="pn-bez-marginesu"><b>{wybor.opis}</b></p>
                        <p className="pn-maly pn-bez-marginesu">{wybor.wskazowka}</p>
                        {regula && <p className="pn-maly pn-bez-marginesu pn-szary">Reguła „{regula.nazwa}”: {regula.uzasadnienie}</p>}
                        {wybor.stan === 'odlozone' && wybor.do && <p className="pn-info pn-bez-marginesu">Odłożone – wróci do kolejki {new Date(wybor.do).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}.</p>}
                        <div className="pn-rzad"><a className="pn-btn pn-btn-gl" href={wybor.edytuj} target="_blank" rel="noreferrer">{wybor.kolekcja === 'plany' ? 'otwórz w edytorze planu ↗' : 'otwórz rekord w Keystatic ↗'}</a></div>
                        <label className="pn-maly pn-kol">notatka do decyzji (opcjonalnie)
                            <textarea className="pn-in" value={notatka} onChange={(e) => ustawNotatke(e.target.value)} rows={3} maxLength={800} placeholder="np. brak informacji w źródłach" /></label>
                        <div className="pn-rzad">
                            {wybor.stan !== 'aktywne' && <button className="pn-btn" type="button" disabled={zapisuje} onClick={() => void zmien('aktywne')}>przywróć do kolejki</button>}
                            {wybor.stan !== 'odlozone' && <>
                                <button className="pn-btn" type="button" disabled={zapisuje} onClick={() => void zmien('odlozone', 7)}>odłóż na 7 dni</button>
                                <button className="pn-btn" type="button" disabled={zapisuje} onClick={() => void zmien('odlozone', 30)}>odłóż na 30 dni</button>
                            </>}
                            {wybor.stan !== 'ignorowane' && <button className="pn-btn" type="button" disabled={zapisuje} onClick={() => void zmien('ignorowane')}>ignoruj trwale</button>}
                        </div>
                        <div className="pn-rzad pn-stopka-osoby pn-rozsuniete">
                            <button className="pn-btn" type="button" disabled={pos <= 0} onClick={() => przejdz(pos - 1)}>← poprzednie</button>
                            <button className="pn-btn" type="button" disabled={pos >= wynik.length - 1} onClick={() => przejdz(pos + 1)}>następne →</button>
                        </div>
                        <p className="pn-maly pn-bez-marginesu">Po zapisaniu poprawek w Keystatic kliknij „sprawdź ponownie”. Zniknie tylko ostrzeżenie, którego przyczyna została usunięta.</p>
                    </> : <p className="pn-maly pn-bez-marginesu">Brak wybranej pozycji.</p>}
                </section>
            </div>
            <details className="pn-karta pn-reguly">
                <summary><b>spis reguł</b> <span className="pn-szary">· {odmiana(Object.keys(reguly).length, ['reguła', 'reguły', 'reguł'])}</span></summary>
                <div className="pn-tabela-ramka">
                    <table className="pn-tabela">
                        <thead><tr><th scope="col">reguła</th><th scope="col">waga</th><th scope="col">zakres</th><th scope="col">dlaczego</th><th scope="col">teraz</th></tr></thead>
                        <tbody>{Object.entries(reguly).map(([k, r]) => <tr key={k}><td>{r.nazwa}</td><td>{WAGI[r.waga]}</td><td>{r.zakres}</td><td>{r.uzasadnienie}</td><td>{lista.filter((x) => x.regula === k && x.stan === 'aktywne').length}</td></tr>)}</tbody>
                    </table>
                </div>
            </details>
        </>}
    </>
}
