'use client'
// P5 (REL-07): raport ksiąg – ile ksiąg pokazuje katalog, a ile karty miejscowości i parafii; różnice i uwagi do danych.
// Te same reguły co widoki (lib/ksiegi-raport.ts). Tylko odczyt – poza kartą „uwagi tomów” (P7c łatka 20.11: operacja z podglądem i „cofnij”).
import * as React from 'react'
import { odmiana, useDane } from '../wspolne'
import type { RaportKsiag } from '@/lib/ksiegi-raport'
import type { PodgladPorzadku } from '@/lib/panel/porzadek-tomow'

const KS = (id: string) => `/keystatic/collection/ksiegi/item/${encodeURIComponent(id)}`
/** sama forma słowa po liczbie (1 księga, 2 księgi, 5 ksiąg) */
const forma = (n: number, f: [string, string, string]) => odmiana(n, f).replace(/^\d+ /, '')

export default function RaportKsiagPanel() {
    const { dane: r, blad } = useDane<RaportKsiag>('/api/keystatic/panel/raport-ksiag')
    const [tylkoRoznice, ustawTylko] = React.useState(false)
    const miejsca = (r?.miejsca ?? []).filter((m) => !tylkoRoznice || m.katalog !== m.karta)
    const instytucje = (r?.instytucje ?? []).filter((i) => !tylkoRoznice || i.katalog !== i.karta)
    const roznic = (r?.miejsca ?? []).filter((m) => m.katalog !== m.karta).length + (r?.instytucje ?? []).filter((i) => i.katalog !== i.karta).length
    const bledy = (r?.uwagi ?? []).filter((u) => u.rodzaj === 'blad'), doSprawdzenia = (r?.uwagi ?? []).filter((u) => u.rodzaj === 'do-sprawdzenia')
    return (
        <>
            <header className="pn-naglowek">
                <div className="pn-kol pn-kol-wasko">
                    <h1>raport ksiąg</h1>
                    <span className="pn-maly">Ile ksiąg widać w katalogu, a ile na kartach miejscowości i parafii – te same reguły co strona. Liczone ze wszystkich ksiąg (także „tylko ja”); kolumna „publicznie” – co widzi czytelnik.</span>
                </div>
                <a className="pn-btn" href="/keystatic/panel/lista/ksiegi">lista ksiąg →</a>
            </header>
            {blad && <p className="pn-kom pn-bez-marginesu">{blad}</p>}
            {!r && !blad && <span className="pn-szary">liczę…</span>}
            <PorzadekTomow />
            {r && <>
                <div className="pn-kafle">
                    <div className="pn-kafel"><span className="pn-liczba">{r.ksiag}</span><span className="pn-maly">{forma(r.ksiag, ['księga', 'księgi', 'ksiąg'])}, w tym publicznie: {r.publicznych}</span></div>
                    <div className="pn-kafel"><span className="pn-liczba">{roznic}</span><span className="pn-maly">{forma(roznic, ['różnica', 'różnice', 'różnic'])} między widokami</span></div>
                    <div className="pn-kafel"><span className="pn-liczba">{bledy.length}</span><span className="pn-maly">{forma(bledy.length, ['błąd', 'błędy', 'błędów'])} w danych</span></div>
                    <div className="pn-kafel"><span className="pn-liczba">{doSprawdzenia.length}</span><span className="pn-maly">{forma(doSprawdzenia.length, ['uwaga', 'uwagi', 'uwag'])} do sprawdzenia</span></div>
                </div>
                <label className="pn-rzad"><input type="checkbox" checked={tylkoRoznice} onChange={(e) => ustawTylko(e.target.checked)} /> pokaż tylko różnice</label>
                <section className="pn-karta" aria-labelledby="r-miejsca">
                    <h2 id="r-miejsca">miejscowości ({miejsca.length})</h2>
                    {miejsca.length === 0 ? <span className="pn-szary">{tylkoRoznice ? 'Katalog i karty miejscowości pokazują te same księgi.' : 'Żadna księga nie jest przypisana do miejscowości.'}</span> : (
                        <div className="pn-tabela-ramka">
                            <table className="pn-tabela">
                                <thead><tr><th scope="col">miejscowość</th><th scope="col">katalog</th><th scope="col">karta miejscowości</th><th scope="col">publicznie</th><th scope="col">tylko w katalogu</th></tr></thead>
                                <tbody>{miejsca.map((m) => (
                                    <tr key={m.id}>
                                        <td><a href={`/miejsca/${m.id}`}>{m.nazwa}</a></td><td>{m.katalog}</td>
                                        <td>{m.karta}{m.karta !== m.katalog && <span className="pn-ostrz-tekst"> · różnica {m.katalog - m.karta}</span>}</td>
                                        <td>{m.publiczne}</td>
                                        <td>{m.brakNaKarcie.length ? m.brakNaKarcie.map((k, i) => <React.Fragment key={k.id}>{i > 0 && ', '}<a href={KS(k.id)}>{k.nazwa}</a></React.Fragment>) : <span className="pn-szary">—</span>}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                </section>
                <section className="pn-karta" aria-labelledby="r-instytucje">
                    <h2 id="r-instytucje">parafie i urzędy ({instytucje.length})</h2>
                    {instytucje.length === 0 ? <span className="pn-szary">{tylkoRoznice ? 'Katalog „wg parafii” i karty parafii pokazują te same księgi.' : 'Brak ksiąg przypisanych do instytucji.'}</span> : (
                        <div className="pn-tabela-ramka">
                            <table className="pn-tabela">
                                <thead><tr><th scope="col">instytucja</th><th scope="col">katalog „wg parafii”</th><th scope="col">karta parafii</th><th scope="col">publicznie</th></tr></thead>
                                <tbody>{instytucje.map((i) => (
                                    <tr key={i.id}><td><a href={`/parafie/${i.id}`}>{i.nazwa}</a></td><td>{i.katalog}</td><td>{i.karta}{i.karta !== i.katalog && <span className="pn-ostrz-tekst"> · różnica {i.katalog - i.karta}</span>}</td><td>{i.publiczne}</td></tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                </section>
                <div className="pn-siatka">
                    <section className="pn-karta" aria-labelledby="r-bledy">
                        <h2 id="r-bledy">błędy w danych ({bledy.length})</h2>
                        {bledy.length === 0 ? <span className="pn-szary">Brak – wszystkie relacje prowadzą do istniejących pozycji.</span> : <ul className="pn-lista">{bledy.map((u, i) => <li key={i}><span>{u.tekst}</span>{u.ksiega && <a className="pn-btn pn-btn-maly" href={KS(u.ksiega)}>popraw</a>}</li>)}</ul>}
                    </section>
                    <section className="pn-karta" aria-labelledby="r-spr">
                        <h2 id="r-spr">do sprawdzenia ({doSprawdzenia.length})</h2>
                        {doSprawdzenia.length === 0 ? <span className="pn-szary">Nic.</span> : <ul className="pn-lista pn-przewijane">{doSprawdzenia.map((u, i) => <li key={i}><span>{u.tekst}</span>{u.ksiega && <a className="pn-btn pn-btn-maly" href={KS(u.ksiega)}>otwórz</a>}</li>)}</ul>}
                        {r.bezMiejscowosci.length > 0 && <span className="pn-maly">Bez żadnej miejscowości w katalogu: {odmiana(r.bezMiejscowosci.length, ['księga', 'księgi', 'ksiąg'])} ({r.bezMiejscowosci.slice(0, 8).map((k) => k.nazwa).join(', ')}{r.bezMiejscowosci.length > 8 ? '…' : ''}).</span>}
                    </section>
                </div>
            </>}
        </>
    )
}

/** P7c łatka (20.11): uwagi tomów z wierszami „Tytuł jednostki / Liczba skanów / Status linku / Źródło” – porządek jedną operacją. */
function PorzadekTomow() {
    const { dane: p, odswiez } = useDane<PodgladPorzadku>('/api/keystatic/panel/porzadek-tomow')
    const [stan, ustawStan] = React.useState<'' | 'pytanie' | 'zapis'>('')
    const [wynik, ustawWynik] = React.useState<{ operacja: string | null; ksiag: number; tomow: number } | null>(null)
    const [blad, ustawBlad] = React.useState('')
    if (!p || (p.ksiag === 0 && !wynik)) return null
    const zapisz = async () => {
        ustawStan('zapis'); ustawBlad('')
        const r = await fetch('/api/keystatic/panel/porzadek-tomow', { method: 'POST' }).catch(() => null)
        const j = r ? await r.json().catch(() => null) : null
        if (!r?.ok || !j) { ustawBlad(j?.blad ?? 'Nie udało się zapisać – nic nie zmieniono.'); ustawStan(''); return }
        ustawWynik(j); ustawStan(''); odswiez()
    }
    const pr = p.przeniesione
    return (
        <section className="pn-karta" aria-labelledby="r-tomy">
            <h2 id="r-tomy">uwagi tomów do uporządkowania</h2>
            {wynik ? (
                <p className="pn-kom pn-ok pn-bez-marginesu" role="status">Uporządkowano {odmiana(wynik.tomow, ['tom', 'tomy', 'tomów'])} w {odmiana(wynik.ksiag, ['księdze', 'księgach', 'księgach'])}. {wynik.operacja && <a href="/keystatic/panel/operacje">cofnij w „operacje” →</a>}</p>
            ) : <>
                <span className="pn-maly">W polu „Uwagi” {odmiana(p.tomow, ['tomu', 'tomów', 'tomów'])} ({odmiana(p.ksiag, ['księga', 'księgi', 'ksiąg'])}) są wiersze „Tytuł jednostki”, „Liczba skanów”, „Status linku”, „Źródło” – na stronie idą jednym ciągiem.</span>
                <ul className="pn-lista-bez-znakow pn-maly">
                    <li>do pola „Oryginalny tytuł jednostki”: {pr.tytul}</li>
                    <li>do pola „Liczba skanów”: {pr.skany}</li>
                    <li>do notatki roboczej księgi (tylko panel): status linku {pr.status}, inny adres źródła {pr.zrodla}</li>
                    <li>adres równy skanom lub stronie zespołu – usunięty jako powtórzenie</li>
                </ul>
                {p.sprzecznosci.length > 0 && <details className="pn-maly"><summary>zostają w uwagach – sprzeczne z polem ({p.sprzecznosci.length})</summary><ul className="pn-lista-bez-znakow">{p.sprzecznosci.slice(0, 50).map((x, i) => <li key={i}>{x}</li>)}</ul></details>}
                <details className="pn-maly"><summary>księgi ({p.pozycje.length})</summary><ul className="pn-lista-bez-znakow">{p.pozycje.map((x) => <li key={x.id}><a href={KS(x.id)}>{x.nazwa}</a> – {odmiana(x.tomow, ['tom', 'tomy', 'tomów'])}</li>)}</ul></details>
                {blad && <p className="pn-kom pn-bez-marginesu" role="alert">{blad}</p>}
                <div className="pn-rzad">
                    {stan === '' && <button type="button" className="pn-btn" onClick={() => ustawStan('pytanie')}>uporządkuj…</button>}
                    {stan !== '' && <>
                        <span className="pn-maly">Zmienić {odmiana(p.ksiag, ['księgę', 'księgi', 'ksiąg'])}? Przed zapisem powstają kopie, cofnięcie w „operacje”.</span>
                        <button type="button" className="pn-btn pn-btn-gl" disabled={stan === 'zapis'} onClick={zapisz}>{stan === 'zapis' ? 'zapisuję…' : 'tak, uporządkuj'}</button>
                        <button type="button" className="pn-btn" disabled={stan === 'zapis'} onClick={() => ustawStan('')}>anuluj</button>
                    </>}
                </div>
            </>}
        </section>
    )
}
