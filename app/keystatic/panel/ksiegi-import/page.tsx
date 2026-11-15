'use client'
import * as React from 'react'

type Parafia = { id: string; nazwa: string; wyznanie: string }
type Wpis = { id: string; nazwa: string; lata: string; przyklad: { url: string | null; etykieta: string }; parafia: string; parafiaNazwa: string; instytucjeDodatkowe: string[]; wyznania: string[]; tomy: number; stan: string; kolizje: string[] }
type Podglad = { wpisy: Wpis[]; uwagi: string[] }
type Wynik = { dodane: number; uzupelnione: number; pominiete: number; backup: string | null }

const API = '/api/keystatic/panel/ksiegi-import'

export default function ImportKsiag() {
    const [xlsx, ustawXlsx] = React.useState<File | null>(null)
    const [ksiegi, ustawKsiegi] = React.useState<File | null>(null)
    const [tomy, ustawTomy] = React.useState<File | null>(null)
    const [parafie, ustawParafie] = React.useState<Parafia[]>([])
    const [mapa, ustawMapa] = React.useState<Record<string, string>>({})
    const [podglad, ustawPodglad] = React.useState<Podglad | null>(null)
    const [tryb, ustawTryb] = React.useState<'pomin' | 'dopelnij'>('pomin')
    const [widocznosc, ustawWidocznosc] = React.useState<'ja' | 'bliscy' | 'publiczne'>('ja')
    const [zmienIstniejace, ustawZmienIstniejace] = React.useState(false)
    const [potwierdzPublikacje, ustawPotwierdzPublikacje] = React.useState(false)
    const [trwa, ustawTrwa] = React.useState(false)
    const [blad, ustawBlad] = React.useState('')
    const [wynik, ustawWynik] = React.useState<Wynik | null>(null)
    const [potwierdzDuplikaty, ustawPotwierdzDuplikaty] = React.useState(false)

    React.useEffect(() => {
        fetch(API, { cache: 'no-store' })
            .then((r) => { if (!r.ok) throw new Error('Nie udało się pobrać parafii.'); return r.json() })
            .then((d: { parafie: Parafia[] }) => ustawParafie(d.parafie))
            .catch((e) => ustawBlad(e.message))
    }, [])
    const zmianaPliku = (f: File | null, rodzaj: 'xlsx' | 'ksiegi' | 'tomy') => {
        if (rodzaj === 'xlsx') { ustawXlsx(f); if (f) { ustawKsiegi(null); ustawTomy(null) } }
        if (rodzaj === 'ksiegi') { ustawKsiegi(f); if (f) ustawXlsx(null) }
        if (rodzaj === 'tomy') { ustawTomy(f); if (f) ustawXlsx(null) }
        ustawPodglad(null); ustawWynik(null); ustawBlad(''); ustawMapa({}); ustawPotwierdzDuplikaty(false)
    }
    const formularz = (akcja: string) => {
        const f = new FormData()
        if (xlsx) f.append('xlsx', xlsx)
        else {
            if (ksiegi) f.append('ksiegi', ksiegi)
            if (tomy) f.append('tomy', tomy)
        }
        f.append('akcja', akcja)
        f.append('tryb', tryb)
        if (potwierdzDuplikaty) f.append('potwierdzDuplikaty', 'tak')
        f.append('widocznosc', widocznosc)
        if (zmienIstniejace) f.append('zmienIstniejace', 'tak')
        if (potwierdzPublikacje) f.append('potwierdzPublikacje', 'tak')
        f.append('parafieMap', JSON.stringify(mapa))
        return f
    }
    const wykonaj = async (akcja: 'podglad' | 'zapisz') => {
        if (!xlsx && !ksiegi) { ustawBlad('Wybierz XLSX lub CSV z księgami.'); return }
        if (akcja === 'zapisz') {
            if (!podglad) { ustawBlad('Najpierw sprawdź plik w podglądzie.'); return }
            if (podglad?.wpisy.some((w) => w.kolizje.length) && !potwierdzDuplikaty) { ustawBlad('Istnieją księgi z tymi samymi sygnaturami, ale innymi identyfikatorami. Dopasuj ID w arkuszu lub potwierdź możliwe duplikaty.'); return }
            if (widocznosc === 'publiczne' && !potwierdzPublikacje) { ustawBlad('Potwierdź świadomie publikację całej grupy.'); return }
            const wid = widocznosc === 'publiczne' ? 'PUBLICZNE — dla wszystkich' : widocznosc === 'bliscy' ? 'dla bliskich' : 'tylko ja'
            const stare = zmienIstniejace ? 'widoczność istniejących również się zmieni' : (tryb === 'pomin' ? 'istniejące zostaną pominięte' : 'istniejące zostaną tylko uzupełnione')
            if (!confirm(`Zapisać ${podglad.wpisy.length} ksiąg? Widoczność nowych: ${wid}; ${stare}.`)) return
        }
        ustawTrwa(true); ustawBlad(''); ustawWynik(null)
        try {
            const r = await fetch(API, { method: 'POST', body: formularz(akcja) })
            const d = await r.json()
            if (!r.ok) throw new Error(d.blad || `HTTP ${r.status}`)
            if (akcja === 'podglad') ustawPodglad(d as Podglad)
            else { ustawWynik(d as Wynik); ustawPodglad(null) }
        } catch (e) { ustawBlad(e instanceof Error ? e.message : 'Nie udało się wykonać importu.') }
        finally { ustawTrwa(false) }
    }
    const ustawParafieDla = (id: string, p: string) => {
        ustawMapa((m) => ({ ...m, [id]: p }))
        ustawWynik(null)
    }

    return <>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h1>import ksiąg metrykalnych</h1>
            <span className="pn-szary" style={{ fontSize: 12 }}>Zespoły i tomy · CSV / XLSX · zapis do Keystatic</span>
        </header>
        <section className="pn-karta" style={{ gap: 12 }}>
            <h2>1. wybierz dane</h2>
            <p className="pn-maly" style={{ margin: 0 }}>Wczytaj jeden XLSX z arkuszami „Zespoły” i „Tomy” albo dwa CSV: księgi i tomy. Arkusze dodatkowe są pomijane. Plik nie trafia do publicznego archiwum.</p>
            <label>plik XLSX
                <input className="pn-in" style={{ display: 'block', width: 'min(100%,560px)', padding: 8 }} type="file" accept=".xlsx" onChange={(e) => zmianaPliku(e.target.files?.[0] ?? null, 'xlsx')} />
            </label>
            <span className="pn-maly">— albo —</span>
            <label>księgi CSV (wymagany)
                <input className="pn-in" style={{ display: 'block', width: 'min(100%,560px)', padding: 8 }} type="file" accept=".csv,text/csv" onChange={(e) => zmianaPliku(e.target.files?.[0] ?? null, 'ksiegi')} />
            </label>
            <label>tomy CSV (opcjonalny, jeśli nie ma zweryfikowanych jednostek)
                <input className="pn-in" style={{ display: 'block', width: 'min(100%,560px)', padding: 8 }} type="file" accept=".csv,text/csv" onChange={(e) => zmianaPliku(e.target.files?.[0] ?? null, 'tomy')} />
            </label>
            <div className="pn-rzad"><button className="pn-btn" type="button" onClick={() => wykonaj('podglad')} disabled={trwa || (!xlsx && !ksiegi)}>{trwa ? 'sprawdzam…' : 'sprawdź plik i pokaż podgląd →'}</button></div>
        </section>
        {blad && <p className="pn-ostrz" role="alert" style={{ margin: 0 }}>{blad}</p>}
        {wynik && <section className="pn-karta" aria-live="polite">
            <h2>import zakończony</h2>
            <p style={{ margin: 0 }}>Nowe: <b>{wynik.dodane}</b> · uzupełnione: <b>{wynik.uzupelnione}</b> · pominięte: <b>{wynik.pominiete}</b>.</p>
            {wynik.backup && <p className="pn-maly" style={{ margin: 0 }}>Kopia poprzednich wersji: {wynik.backup}</p>}
            <a className="pn-btn" style={{ alignSelf: 'flex-start' }} href="/keystatic/collection/ksiegi">otwórz księgi w Keystatic →</a>
        </section>}
        {podglad && <section className="pn-karta" style={{ gap: 16 }}>
            <h2>2. podgląd i powiązanie z parafiami</h2>
            <p className="pn-maly" style={{ margin: 0 }}>Sprawdź okres, próbkę skanów i przypisanie parafii przed zapisem. Widoczność całej grupy wybierzesz niżej. Ręcznie uzupełnione dane istniejących ksiąg nie będą nadpisywane.</p>
            {podglad.uwagi.length > 0 && <div className="pn-kom" role="status" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {podglad.uwagi.map((u, i) => <span key={i}>{u}</span>)}
            </div>}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 850, fontSize: 12.5 }}>
                    <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--linia)' }}><th style={{ padding: 9 }}>księga</th><th>lata</th><th>podgląd jednostki</th><th>tomy</th><th>status</th><th style={{ minWidth: 250 }}>instytucja główna / powiązane</th></tr></thead>
                    <tbody>{podglad.wpisy.map((w) => <tr key={w.id} style={{ borderBottom: '1px solid var(--linia2)' }}>
                        <td style={{ padding: '10px 9px' }}><b>{w.nazwa}</b><br /><span className="pn-maly">{w.id}</span></td>
                        <td style={{ minWidth: 118, fontWeight: 600 }}>{w.lata}</td>
                        <td style={{ minWidth: 145 }}>{w.przyklad.url ? <a className="odn" href={w.przyklad.url} target="_blank" rel="noopener noreferrer">{w.przyklad.etykieta} ↗</a> : <span className="pn-maly">{w.przyklad.etykieta}</span>}</td>
                        <td>{w.tomy}</td><td>{w.stan === 'nowa' ? 'nowa' : 'już istnieje'}{w.kolizje.length > 0 && <div className="pn-ostrz" style={{ marginTop: 4 }}>Możliwy duplikat sygnatury! Istnieje: {w.kolizje.join(', ')}</div>}</td>
                        <td style={{ padding: '10px 0' }}>
                            <select className="pn-in" style={{ width: '100%' }} value={mapa[w.id] ?? w.parafia} onChange={(e) => ustawParafieDla(w.id, e.target.value)} aria-label={`Parafia dla ${w.nazwa}`}>
                                <option value="">— instytucja nieustalona —</option>
                                {parafie.map((p) => <option key={p.id} value={p.id}>{p.nazwa} ({p.wyznanie})</option>)}
                            </select>
                            {(w.instytucjeDodatkowe.length > 0 || w.wyznania.length > 0) && <div className="pn-maly" style={{ marginTop: 4 }}>
                                {w.instytucjeDodatkowe.length > 0 && <>Instytucje powiązane: {w.instytucjeDodatkowe.map((id) => parafie.find((p) => p.id === id)?.nazwa ?? id).join(' · ')}. </>}
                                {w.wyznania.length > 0 && <>Wyznania: {w.wyznania.join(', ')}.</>}
                            </div>}
                            {!w.parafia && <div className="pn-maly">z pliku: {w.parafiaNazwa || 'nie podano'}</div>}
                        </td>
                    </tr>)}</tbody>
                </table>
            </div>
            {parafie.length === 0 && <div className="pn-kom">W panelu nie ma jeszcze parafii/urzędów. Księgi z nieustalonym wytwórcą można zachować i uzupełnić później w Keystatic.</div>}
            {podglad.wpisy.some((w) => w.kolizje.length) && <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--ostrz)' }}><input type="checkbox" checked={potwierdzDuplikaty} onChange={(e) => ustawPotwierdzDuplikaty(e.target.checked)} />Rozumiem ryzyko duplikatów sygnatur: chcę mimo to utworzyć odrębne księgi. Bezpieczniej poprawić „ksiega_id” na istniejący identyfikator w arkuszu.</label>}
            <h2>3. bezpieczny zapis</h2>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>Jak potraktować księgi, które już istnieją?
                <select className="pn-in" value={tryb} onChange={(e) => ustawTryb(e.target.value as 'pomin' | 'dopelnij')} style={{ maxWidth: 500 }}>
                    <option value="pomin">pomiń istniejące (domyślnie)</option>
                    <option value="dopelnij">uzupełnij wyłącznie puste pola i brakujące tomy</option>
                </select>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 440 }}>
                    Widoczność CAŁEJ importowanej grupy nowych ksiąg
                    <select className="pn-in" value={widocznosc} onChange={(e) => { ustawWidocznosc(e.target.value as 'ja' | 'bliscy' | 'publiczne'); ustawPotwierdzPublikacje(false) }}>
                        <option value="ja">tylko ja (domyślnie)</option>
                        <option value="bliscy">dla bliskich</option>
                        <option value="publiczne">publiczne — dla wszystkich</option>
                    </select>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <input type="checkbox" checked={zmienIstniejace} onChange={(e) => ustawZmienIstniejace(e.target.checked)} />
                    Zastosuj tę widoczność również do ksiąg, które już istnieją. Pozostałe uzupełnione informacje zachowaj.
                </label>
                {widocznosc === 'publiczne' && <label className="pn-ostrz" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <input type="checkbox" checked={potwierdzPublikacje} onChange={(e) => ustawPotwierdzPublikacje(e.target.checked)} />
                    Potwierdzam, że sprawdziłem księgi i chcę opublikować całą wybraną grupę, tak by była widoczna dla wszystkich odwiedzających.
                </label>}
            </div>
            <p className="pn-maly" style={{ margin: 0 }}>Import nie usuwa tomów ani innych rekordów. Przed uzupełnieniem istniejących ksiąg zapisuje kopię ich YAML na serwerze. Dane pomocnicze (np. liczby skanów) trafią do uwag, ponieważ obecny edytor nie ma na nie osobnych pól.</p>
            <button type="button" className="pn-btn pn-btn-gl" onClick={() => wykonaj('zapisz')} disabled={trwa || (podglad.wpisy.some((w) => w.kolizje.length) && !potwierdzDuplikaty) || (widocznosc === 'publiczne' && !potwierdzPublikacje)} style={{ alignSelf: 'flex-start' }}>
                {trwa ? 'zapisuję…' : `importuj ${podglad.wpisy.length} ksiąg →`}
            </button>
        </section>}
    </>
}
