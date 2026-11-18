'use client'
// P6a (PNL-10, ADM-10): historia wpisu Keystatic – poprzednie zapisy, różnica z bieżącą treścią, „przywróć tę wersję”
// (operacja do cofnięcia w „ostatnich operacjach”). Adres: ?adres=<adres edycji w Keystatic> albo ?plik=<ścieżka w content/>.
import * as React from 'react'
import { bajty, kiedy, odmiana, useDane, wyslijJson } from '../wspolne'
import { Okno } from '../okno'

type Wersja = { id: string; czas: string; bajty: number }
type Historia = { plik: string; nazwa: string; edycja: string | null; istnieje: boolean; wersje: Wersja[] }
type Wiersz = { t: '=' | '-' | '+'; s: string } | { t: '…'; n: number }
type Roznica = { roznica: Wiersz[]; bezZmian: boolean; usuniety: boolean }

function Roznice({ w }: { w: Wiersz[] }) {
    return (
        <div className="pn-diff" role="table" aria-label="różnica: bieżąca treść → wybrana wersja">
            {w.map((x, i) => x.t === '…'
                ? <div key={i} role="row" className="pn-diff-zw"><span role="cell">… {odmiana(x.n, ['wiersz bez zmian', 'wiersze bez zmian', 'wierszy bez zmian'])}</span></div>
                : <div key={i} role="row" className={x.t === '-' ? 'pn-diff-us' : x.t === '+' ? 'pn-diff-do' : undefined}>
                    <span role="cell" className="pn-diff-znak" aria-label={x.t === '-' ? 'usunięte' : x.t === '+' ? 'dodane' : 'bez zmian'}>{x.t === '=' ? ' ' : x.t === '-' ? '−' : '+'}</span>
                    <span role="cell">{x.t === '-' ? <del>{x.s || ' '}</del> : x.t === '+' ? <ins>{x.s || ' '}</ins> : x.s || ' '}</span>
                </div>)}
        </div>
    )
}

export default function HistoriaWpisu() {
    const [zapytanie, ustawZapytanie] = React.useState<string | null>(null)
    React.useEffect(() => { ustawZapytanie(window.location.search.slice(1)) }, [])
    const { dane: d, blad, odswiez } = useDane<Historia>(zapytanie === null ? '' : `/api/keystatic/panel/historia?${zapytanie}`)
    const [wybrana, ustawWybrana] = React.useState<string | null>(null)
    const [r, ustawR] = React.useState<Roznica | null>(null)
    const [okno, ustawOkno] = React.useState(false)
    const [kom, ustawKom] = React.useState('')
    const [bladAkcji, ustawBladAkcji] = React.useState('')
    const wersja = d?.wersje.find((w) => w.id === wybrana) ?? d?.wersje[0] ?? null

    React.useEffect(() => {
        if (!d || !wersja) { ustawR(null); return }
        let zywy = true
        fetch(`/api/keystatic/panel/historia?plik=${encodeURIComponent(d.plik)}&wersja=${encodeURIComponent(wersja.id)}`, { cache: 'no-store' })
            .then((x) => (x.ok ? x.json() : null)).then((j) => { if (zywy) ustawR(j) }).catch(() => {})
        return () => { zywy = false }
    }, [d, wersja])

    const przywroc = async () => {
        if (!d || !wersja) return
        ustawBladAkcji('')
        const b = await wyslijJson('/api/keystatic/panel/historia', 'POST', { plik: d.plik, wersja: wersja.id })
        ustawOkno(false)
        if (b) { ustawBladAkcji(b); return }
        ustawKom(`Przywrócono wersję z ${kiedy(wersja.czas)}. Poprzednia treść jest teraz na liście wersji.`)
        ustawWybrana(null); odswiez()
    }

    return (
        <>
            <header className="pn-naglowek">
                <div className="pn-kol pn-kol-wasko">
                    <h1>historia</h1>
                    <span className="pn-maly">{d ? d.nazwa : 'poprzednie zapisy wpisu'} · {odmiana(30, ['ostatnia', 'ostatnie', 'ostatnich'])} wersji na wpis</span>
                </div>
                {d?.edycja && <a className="pn-btn" href={d.edycja}>← wróć do edycji</a>}
            </header>
            {blad && <p className="pn-kom pn-bez-marginesu">{zapytanie ? blad : 'Otwórz historię z paska nad edycją wpisu.'}</p>}
            {bladAkcji && <p className="pn-kom pn-bez-marginesu" role="alert">{bladAkcji}</p>}
            {kom && <p className="pn-info pn-bez-marginesu" role="status">{kom} Przywrócenie możesz cofnąć w <a href="/keystatic/panel/operacje">ostatnich operacjach</a>.</p>}
            {d && !d.istnieje && <p className="pn-info pn-bez-marginesu">Tego wpisu teraz nie ma (usunięty) – sprawdź też kosz w „kopie i system”. Przywrócenie wersji utworzy go ponownie.</p>}
            {d && d.wersje.length === 0 && <p className="pn-szary pn-bez-marginesu">Brak poprzednich wersji – historia zaczyna się od pierwszego zapisu po wdrożeniu P6.</p>}
            {d && d.wersje.length > 0 && (
                <div className="pn-siatka pn-siatka-kolejka">
                    <section className="pn-karta" aria-labelledby="wersje">
                        <h2 id="wersje" className="pn-tytul-karty">wersje</h2>
                        <div className="pn-wiersze">
                            <div className="pn-wiersz"><b>bieżąca</b><span className="pn-szary pn-prawo">{d.istnieje ? 'zapisana' : 'brak'}</span></div>
                            {d.wersje.map((w) => (
                                <button key={w.id} type="button" className="pn-wiersz pn-wiersz-btn" aria-current={wersja?.id === w.id ? 'true' : undefined} onClick={() => ustawWybrana(w.id)}>
                                    <span>{kiedy(w.czas)}</span><span className="pn-szary pn-prawo">{bajty(w.bajty)}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                    <section className="pn-karta" aria-labelledby="zmiana">
                        <div className="pn-naglowek">
                            <h2 id="zmiana" className="pn-tytul-karty">co zmieni przywrócenie</h2>
                            {wersja && <span className="pn-maly">wersja z {kiedy(wersja.czas)}</span>}
                        </div>
                        {!r && <span className="pn-szary" role="status">wczytuję…</span>}
                        {r?.bezZmian && <span className="pn-szary">Ta wersja jest taka sama jak bieżąca.</span>}
                        {r && !r.bezZmian && <Roznice w={r.roznica} />}
                        <span className="pn-maly">Przekreślone zniknie, podbarwione wróci. Bieżąca treść trafi do historii.</span>
                        <div className="pn-rzad">
                            <button type="button" className="pn-btn pn-btn-gl" disabled={!r || r.bezZmian} onClick={() => ustawOkno(true)}>przywróć tę wersję</button>
                        </div>
                    </section>
                </div>
            )}
            <Okno otwarte={okno} tytul="przywrócić wersję?" onZamknij={() => ustawOkno(false)} stopka={<>
                <button type="button" className="pn-btn" onClick={() => ustawOkno(false)}>anuluj</button>
                <button type="button" className="pn-btn pn-btn-gl" onClick={przywroc}>przywróć</button>
            </>}>
                <p className="pn-bez-marginesu">{d?.nazwa}: treść wróci do stanu z {wersja ? kiedy(wersja.czas) : '—'}. Strona pokaże ją od razu. Bieżącą treść zachowam w historii, a przywrócenie da się cofnąć.</p>
            </Okno>
        </>
    )
}
