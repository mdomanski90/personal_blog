'use client'
import * as React from 'react'

type Parafia = { id: string; nazwa: string; wyznanie: string }
type Wpis = { id: string; nazwa: string; lata: string; przyklad: { url: string | null; etykieta: string }; parafia: string; parafiaNazwa: string; instytucjeDodatkowe: string[]; wyznania: string[]; tomy: number; stan: string; kolizje: string[] }
type Podglad = { wpisy: Wpis[]; uwagi: string[] }
type Wynik = { dodane: number; uzupelnione: number; pominiete: number; operacja: string | null }

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
        <header className="pn-kol pn-kol-wasko">
            <h1>import ksiąg metrykalnych</h1>
            <span className="pn-maly">Zespoły i tomy · CSV / XLSX · zapis do Keystatic jako jedna operacja – z kopią i przyciskiem „cofnij”</span>
        </header>
        <section className="pn-karta">
            <h2>1. wybierz dane</h2>
            <p className="pn-maly pn-bez-marginesu">Wczytaj jeden XLSX z arkuszami „Zespoły” i „Tomy” albo dwa CSV: księgi i tomy. Arkusze dodatkowe są pomijane; kolumny spoza formatu trafiają do uwag księgi lub tomu. Plik nie trafia do publicznego archiwum.</p>
            <label className="pn-pole">plik XLSX
                <input className="pn-in pn-plik" type="file" accept=".xlsx" onChange={(e) => zmianaPliku(e.target.files?.[0] ?? null, 'xlsx')} />
            </label>
            <span className="pn-maly">— albo —</span>
            <label className="pn-pole">księgi CSV (wymagany)
                <input className="pn-in pn-plik" type="file" accept=".csv,text/csv" onChange={(e) => zmianaPliku(e.target.files?.[0] ?? null, 'ksiegi')} />
            </label>
            <label className="pn-pole">tomy CSV (opcjonalny, jeśli nie ma zweryfikowanych jednostek)
                <input className="pn-in pn-plik" type="file" accept=".csv,text/csv" onChange={(e) => zmianaPliku(e.target.files?.[0] ?? null, 'tomy')} />
            </label>
            <div className="pn-rzad"><button className="pn-btn" type="button" onClick={() => wykonaj('podglad')} disabled={trwa || (!xlsx && !ksiegi)}>{trwa ? 'sprawdzam…' : 'sprawdź plik i pokaż podgląd →'}</button></div>
        </section>
        {blad && <p className="pn-ostrz pn-bez-marginesu" role="alert">{blad}</p>}
        {wynik && <section className="pn-karta" aria-live="polite">
            <h2>import zakończony</h2>
            <p className="pn-bez-marginesu">Nowe: <b>{wynik.dodane}</b> · uzupełnione: <b>{wynik.uzupelnione}</b> · pominięte: <b>{wynik.pominiete}</b>.</p>
            {wynik.operacja && <p className="pn-maly pn-bez-marginesu">Import da się cofnąć w <a href="/keystatic/panel/operacje">ostatnich operacjach</a> – nowe księgi znikną, uzupełnione wrócą do poprzedniej wersji.</p>}
            <a className="pn-btn pn-samo" href="/keystatic/panel/lista/ksiegi">otwórz listę ksiąg →</a>
        </section>}
        {podglad && <section className="pn-karta">
            <h2>2. podgląd i powiązanie z parafiami</h2>
            <p className="pn-maly pn-bez-marginesu">Sprawdź okres, próbkę skanów i przypisanie parafii przed zapisem. Widoczność całej grupy wybierzesz niżej. Ręcznie uzupełnione dane istniejących ksiąg nie będą nadpisywane.</p>
            {podglad.uwagi.length > 0 && <div className="pn-kom" role="status"><div className="pn-kol pn-kol-wasko">{podglad.uwagi.map((u, i) => <span key={i}>{u}</span>)}</div></div>}
            <div className="pn-tabela-ramka">
                <table className="pn-tabela pn-tabela-szeroka">
                    <thead><tr><th scope="col">księga</th><th scope="col">lata</th><th scope="col">podgląd jednostki</th><th scope="col">tomy</th><th scope="col">status</th><th scope="col">instytucja główna / powiązane</th></tr></thead>
                    <tbody>{podglad.wpisy.map((w) => <tr key={w.id}>
                        <td><b>{w.nazwa}</b><br /><span className="pn-maly">{w.id}</span></td>
                        <td className="pn-bez-zawijania"><b>{w.lata}</b></td>
                        <td>{w.przyklad.url ? <a href={w.przyklad.url} target="_blank" rel="noopener noreferrer">{w.przyklad.etykieta} ↗</a> : <span className="pn-maly">{w.przyklad.etykieta}</span>}</td>
                        <td>{w.tomy}</td>
                        <td>{w.stan === 'nowa' ? 'nowa' : 'już istnieje'}{w.kolizje.length > 0 && <div className="pn-ostrz">Możliwy duplikat sygnatury! Istnieje: {w.kolizje.join(', ')}</div>}</td>
                        <td>
                            <select className="pn-in pn-pelna" value={mapa[w.id] ?? w.parafia} onChange={(e) => ustawParafieDla(w.id, e.target.value)} aria-label={`Parafia dla ${w.nazwa}`}>
                                <option value="">— instytucja nieustalona —</option>
                                {parafie.map((p) => <option key={p.id} value={p.id}>{p.nazwa} ({p.wyznanie})</option>)}
                            </select>
                            {(w.instytucjeDodatkowe.length > 0 || w.wyznania.length > 0) && <div className="pn-maly">
                                {w.instytucjeDodatkowe.length > 0 && <>Instytucje powiązane: {w.instytucjeDodatkowe.map((id) => parafie.find((p) => p.id === id)?.nazwa ?? id).join(' · ')}. </>}
                                {w.wyznania.length > 0 && <>Wyznania: {w.wyznania.join(', ')}.</>}
                            </div>}
                            {!w.parafia && <div className="pn-maly">z pliku: {w.parafiaNazwa || 'nie podano'}</div>}
                        </td>
                    </tr>)}</tbody>
                </table>
            </div>
            {parafie.length === 0 && <div className="pn-kom">W panelu nie ma jeszcze parafii/urzędów. Księgi z nieustalonym wytwórcą można zachować i uzupełnić później w Keystatic.</div>}
            {podglad.wpisy.some((w) => w.kolizje.length) && <label className="pn-rzad pn-rzad-gora"><input type="checkbox" checked={potwierdzDuplikaty} onChange={(e) => ustawPotwierdzDuplikaty(e.target.checked)} /><span>Rozumiem ryzyko duplikatów sygnatur: chcę mimo to utworzyć odrębne księgi. Bezpieczniej poprawić „ksiega_id” na istniejący identyfikator w arkuszu.</span></label>}
            <h2>3. bezpieczny zapis</h2>
            <label className="pn-pole">Jak potraktować księgi, które już istnieją?
                <select className="pn-in pn-waskie-500" value={tryb} onChange={(e) => ustawTryb(e.target.value as 'pomin' | 'dopelnij')}>
                    <option value="pomin">pomiń istniejące (domyślnie)</option>
                    <option value="dopelnij">uzupełnij wyłącznie puste pola i brakujące tomy</option>
                </select>
            </label>
            <div className="pn-kol">
                <label className="pn-pole">Widoczność CAŁEJ importowanej grupy nowych ksiąg
                    <select className="pn-in pn-waskie-500" value={widocznosc} onChange={(e) => { ustawWidocznosc(e.target.value as 'ja' | 'bliscy' | 'publiczne'); ustawPotwierdzPublikacje(false) }}>
                        <option value="ja">tylko ja (domyślnie)</option>
                        <option value="bliscy">dla bliskich</option>
                        <option value="publiczne">publiczne — dla wszystkich</option>
                    </select>
                </label>
                <label className="pn-rzad pn-rzad-gora">
                    <input type="checkbox" checked={zmienIstniejace} onChange={(e) => ustawZmienIstniejace(e.target.checked)} />
                    <span>Zastosuj tę widoczność również do ksiąg, które już istnieją. Pozostałe uzupełnione informacje zachowaj.</span>
                </label>
                {widocznosc === 'publiczne' && <label className="pn-ostrz">
                    <input type="checkbox" checked={potwierdzPublikacje} onChange={(e) => ustawPotwierdzPublikacje(e.target.checked)} />
                    <span>Potwierdzam, że sprawdziłem księgi i chcę opublikować całą wybraną grupę, tak by była widoczna dla wszystkich odwiedzających.</span>
                </label>}
            </div>
            <p className="pn-maly pn-bez-marginesu">Import nie usuwa tomów ani innych rekordów. Kopia poprzednich wersji trafia do ostatnich operacji – stamtąd cofniesz cały import jednym przyciskiem. Dane pomocnicze (np. liczby skanów) trafią do uwag, ponieważ obecny edytor nie ma na nie osobnych pól.</p>
            <button type="button" className="pn-btn pn-btn-gl pn-samo" onClick={() => wykonaj('zapisz')} disabled={trwa || (podglad.wpisy.some((w) => w.kolizje.length) && !potwierdzDuplikaty) || (widocznosc === 'publiczne' && !potwierdzPublikacje)}>
                {trwa ? 'zapisuję…' : `importuj ${podglad.wpisy.length} ksiąg →`}
            </button>
        </section>}
    </>
}
