'use client'
// Pulpit panelu (P6a wg planszy + uwaga 18.11 22:26): „szybko” na górze, „wróć do pracy”, co czeka, postęp planów, drzewo, ostatnie zmiany, uwagi.
import * as React from 'react'
import { Pin, PinOff } from 'lucide-react'
import { kiedy, odmiana, useDane, wyslijJson } from './wspolne'

type Plan = { slug: string; tytul: string; widocznosc: string; zmieniono: string; geo: number; grobow: number; sprawdzone: number; zNapisem: number; zeZdjeciem: number }
type Pulpit = {
    zgloszenia: { czeka: number; nowe: number }
    plany: Plan[]
    osoby: { liczba: number; doSprawdzenia: number; zyjace: number; import: { data: string } | null }
    tresci: Record<string, { nazwa: string; n: number; szkice: number }>
    szkice: { razem: number; lista: string[]; pierwsza?: string }
    oProjekcieSzkic: boolean
    zmiany: { opis: string; href: string | null; czas: string }[]
    uwagi: { tekst: string; ostrz: boolean; href: string }[]
    serwer: { commit: string | null; zbudowano: string | null }
    praca: Praca
}
type PozPracy = { href: string; nazwa: string; czas?: string; miejsce?: string; strona?: string; zmiany?: string[]; grob?: string; rodzaj?: string; szkic?: boolean; liczba?: number | null }
type Praca = { ostatnie: PozPracy[]; przypiete: PozPracy[]; widoki: PozPracy[] }

/** Nazwa bez rodzaju z przodu („miejsce „Testowo”” → „Testowo”) – rodzaj stoi w linii opisu, jak na planszy. */
const bezRodzaju = (n: string) => n.replace(/^[^„]*„(.*)”$/, '$1')

/** P6a wg planszy (PDF 18.11, funkcja 2): „wróć do pracy” – ostatnio edytowane z przyciskami i przypięte (z zapisanymi widokami list). */
function WrocDoPracy({ praca, odswiez }: { praca: Praca; odswiez: () => void }) {
    const [blad, ustawBlad] = React.useState('')
    const [zarzadzaj, ustawZarzadzaj] = React.useState(false)
    const zmien = async (akcja: 'dodaj' | 'usun', lista: 'przypiete' | 'widoki', x: PozPracy) => {
        const b = await wyslijJson('/api/keystatic/panel/praca', 'POST', { akcja, lista, href: x.href, nazwa: x.nazwa })
        ustawBlad(b ?? '')
        if (!b) odswiez()
    }
    const przypiete = [...praca.przypiete.map((x) => ({ ...x, lista: 'przypiete' as const })), ...praca.widoki.map((x) => ({ ...x, lista: 'widoki' as const }))]
    return (
        <section aria-labelledby="praca" className="pn-kol pn-kol-12">
            <h2 id="praca" className="pn-etyk">wróć do pracy</h2>
            {blad && <p className="pn-kom pn-bez-marginesu" role="alert">{blad}</p>}
            <div className="pn-praca">
                <section className="pn-karta" aria-labelledby="praca-ostatnie">
                    <div className="pn-naglowek"><h3 id="praca-ostatnie" className="pn-tytul-karty">ostatnio edytowane przez Ciebie</h3><span className="pn-maly">wszystkie urządzenia</span></div>
                    {praca.ostatnie.length ? <div className="pn-wiersze">{praca.ostatnie.map((x) => (
                        <div key={x.href} className="pn-wiersz pn-praca-wiersz">
                            <span className="pn-kol pn-rosnie pn-bez-luki">
                                <span><a href={x.href}><b>{bezRodzaju(x.nazwa)}</b></a>{(() => {
                                    const opis = [x.rodzaj, x.grob ? `kwatera ${x.grob.split('/')[0]}, rząd ${x.grob.split('/')[1] ?? ''}` : x.miejsce, x.szkic ? 'tylko ja' : x.zmiany?.join(', ')].filter(Boolean).join(' · ')
                                    return opis ? <span className="pn-szary"> · {opis}</span> : null
                                })()}</span>
                            </span>
                            <span className="pn-praca-akcje">
                                <span className="pn-maly pn-bez-zawijania">{kiedy(x.czas)}</span>
                                {x.grob ? <a className="pn-btn pn-btn-gl pn-btn-maly" href={x.href}>wróć do grobu {x.grob}</a> : <a className="pn-btn pn-btn-maly" href={x.href}>edytuj</a>}
                                {!x.grob && x.strona && <a className="pn-btn pn-btn-maly" href={x.strona} target="_blank" rel="noreferrer">na stronie ↗</a>}
                            </span>
                        </div>
                    ))}</div> : <p className="pn-szary pn-bez-marginesu">Tu pojawi się to, nad czym ostatnio pracujesz – wpisy, plany z zaznaczonym grobem, osoby.</p>}
                </section>
                <section className="pn-karta" aria-labelledby="praca-przypiete">
                    <div className="pn-naglowek"><h3 id="praca-przypiete" className="pn-tytul-karty">przypięte</h3>
                        {przypiete.length > 0 && <button type="button" className="pn-link-btn pn-maly" aria-pressed={zarzadzaj} onClick={() => ustawZarzadzaj((z) => !z)}>{zarzadzaj ? 'gotowe' : 'zarządzaj'}</button>}</div>
                    {przypiete.length ? <div className="pn-wiersze">{przypiete.map((x) => (
                        <div key={`${x.lista}-${x.href}`} className="pn-wiersz pn-wiersz-op">
                            <Pin aria-hidden className="pn-ikona-mala" />
                            <a href={x.href} className="pn-rosnie">{x.lista === 'widoki' ? x.nazwa : bezRodzaju(x.nazwa)}</a>
                            <span className="pn-maly pn-bez-zawijania">{x.lista === 'widoki' ? `zapisany filtr${typeof x.liczba === 'number' ? ` · ${x.liczba}` : ''}` : x.rodzaj}</span>
                            {zarzadzaj && <button type="button" className="pn-ikona-btn" aria-label={`odepnij: ${x.nazwa}`} title="odepnij" onClick={() => zmien('usun', x.lista, x)}><PinOff aria-hidden /></button>}
                        </div>
                    ))}</div> : <p className="pn-maly pn-bez-marginesu">Przypnij wpis, osobę albo plan przyciskiem „przypnij” w pasku; na liście panelu ustaw filtry i „zapisz widok”.</p>}
                </section>
            </div>
        </section>
    )
}

const WID: Record<string, string> = { ja: 'tylko ja', bliscy: 'dla bliskich', publiczne: 'publiczny' }
const procent = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export default function Pulpit() {
    const { dane: d, blad, odswiez } = useDane<Pulpit>('/api/keystatic/panel')
    const [dzis, ustawDzis] = React.useState('')
    React.useEffect(() => { ustawDzis(new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) }, [])
    const niespr = d ? d.plany.reduce((a, p) => a + p.grobow - p.sprawdzone, 0) : 0
    const planNiespr = d?.plany.find((p) => p.grobow > p.sprawdzone)
    const ostatniPlan = d?.plany[0]

    return (
        <>
            <header className="pn-kol pn-kol-wasko">
                <h1>pulpit</h1>
                <span className="pn-maly">{dzis}</span>
            </header>
            {blad && <p className="pn-kom pn-bez-marginesu">{blad}</p>}
            {!d && !blad && <p className="pn-szary pn-bez-marginesu" role="status">wczytuję…</p>}

            {d && (
                <>
                    <section aria-labelledby="szybko" className="pn-kol pn-kol-12">
                        <h2 id="szybko" className="pn-etyk">szybko</h2>
                        <div className="pn-rzad">
                            <a className="pn-btn pn-btn-gl" href="/keystatic/panel/do-opracowania">do opracowania →</a>
                            <a className="pn-btn" href="/keystatic/collection/posts/create">+ wpis</a>
                            <a className="pn-btn" href="/keystatic/collection/miejsca/create">+ miejsce</a>
                            <a className="pn-btn" href="/keystatic/collection/materialy/create">+ materiał do archiwum</a>
                            <a className="pn-btn" href="/keystatic/osoby">+ osoba</a>
                            <a className="pn-btn" href="/keystatic/plany">+ plan</a>
                            {ostatniPlan && <a className="pn-btn pn-btn-gl" href={`/keystatic/plany/${ostatniPlan.slug}`}>edytor: {ostatniPlan.tytul}</a>}
                        </div>
                    </section>

                    <WrocDoPracy praca={d.praca} odswiez={odswiez} />


                    <section aria-labelledby="czeka" className="pn-kol pn-kol-12">
                        <h2 id="czeka" className="pn-etyk">czeka na Ciebie</h2>
                        <div className="pn-kafle">
                            <a href="/keystatic/panel/zgloszenia" className="pn-kafel">
                                <span className="pn-liczba">{d.zgloszenia.czeka}</span>
                                <span>zgłoszenia czytelników</span>
                                <span className="pn-maly">{d.zgloszenia.nowe ? odmiana(d.zgloszenia.nowe, ['nowe', 'nowe', 'nowych']) : 'poprawki, nowe miejsca, prośby z planów'}</span>
                            </a>
                            {d.plany.length > 0 && (
                                <a href={planNiespr ? `/keystatic/plany/${planNiespr.slug}` : '/keystatic/plany'} className="pn-kafel">
                                    <span className="pn-liczba">{niespr}</span>
                                    <span>groby niesprawdzone</span>
                                    <span className="pn-maly">{planNiespr ? `najwięcej: ${planNiespr.tytul}` : 'wszystkie sprawdzone'}</span>
                                </a>
                            )}
                            {d.osoby.liczba > 0 && (
                                <a href="/keystatic/osoby" className="pn-kafel">
                                    <span className="pn-liczba">{d.osoby.doSprawdzenia}</span>
                                    <span>osoby do sprawdzenia</span>
                                    <span className="pn-maly">uwagi z importu i kontroli dat</span>
                                </a>
                            )}
                            <a href={`/keystatic/panel/lista/${d.szkice.pierwsza ?? 'posts'}?f.visibility=ja`} className="pn-kafel">
                                <span className="pn-liczba">{d.szkice.razem}</span>
                                <span>szkice (tylko ja)</span>
                                <span className="pn-maly">{d.szkice.lista.join(' · ') || 'brak'}</span>
                            </a>
                        </div>
                    </section>

                    <div className="pn-siatka">
                        <section className="pn-karta" aria-labelledby="plany">
                            <div className="pn-naglowek"><h2 id="plany" className="pn-tytul-karty">plany</h2><a href="/keystatic/plany" className="pn-maly-link">wszystkie →</a></div>
                            {d.plany.length === 0 && <p className="pn-szary pn-bez-marginesu">Nie ma jeszcze planów.</p>}
                            {d.plany.slice(0, 4).map((p) => (
                                <div key={p.slug} className="pn-kol pn-ramka">
                                    <div className="pn-naglowek">
                                        <b>{p.tytul}</b>
                                        <span className="pn-maly">{odmiana(p.grobow, ['grób', 'groby', 'grobów'])} · {WID[p.widocznosc] ?? p.widocznosc} · {kiedy(p.zmieniono)}</span>
                                    </div>
                                    {p.grobow > 0 && (
                                        <div className="pn-postep">
                                            {([['sprawdzone', p.sprawdzone], ['z napisem', p.zNapisem], ['ze zdjęciem', p.zeZdjeciem]] as [string, number][]).map(([t, n]) => (
                                                <React.Fragment key={t}><span>{t}</span><div className="pn-pasek" role="img" aria-label={`${t}: ${procent(n, p.grobow)}%`}><div style={{ width: `${procent(n, p.grobow)}%` } /* styl-dynamiczny: szerokość paska postępu z danych */} /></div><span className="pn-do-prawej">{n} <span className="pn-szary">({procent(n, p.grobow)}%)</span></span></React.Fragment>
                                            ))}
                                        </div>
                                    )}
                                    {p.geo < 2 && <span className="pn-ostrz pn-maly">brak punktów geo – plan nie pojawi się na mapie, tryb „w terenie” niedostępny</span>}
                                    <div className="pn-rzad">
                                        <a className="pn-btn" href={`/keystatic/plany/${p.slug}`}>edytuj</a>
                                        {p.widocznosc !== 'ja' && <a className="pn-btn" href={`/plany/${p.slug}`} target="_blank" rel="noreferrer">na stronie ↗</a>}
                                    </div>
                                </div>
                            ))}
                        </section>

                        <section className="pn-karta" aria-labelledby="osoby">
                            <div className="pn-naglowek"><h2 id="osoby" className="pn-tytul-karty">osoby i drzewo</h2><a href="/keystatic/osoby" className="pn-maly-link">lista →</a></div>
                            {d.osoby.liczba === 0 ? (
                                <div className="pn-kol pn-ramka">
                                    <b>drzewo nie jest jeszcze przeniesione</b>
                                    <span className="pn-maly">Import GEDCOM czeka na kopię zapasową poza serwerem. Po imporcie zobaczysz tu liczbę osób, osoby do sprawdzenia i powiązania z grobami.</span>
                                    <div className="pn-rzad"><a className="pn-btn" href="/keystatic/osoby">import GEDCOM</a><a className="pn-btn" href="/keystatic/panel/system">kopie zapasowe</a></div>
                                </div>
                            ) : (
                                <>
                                    <dl className="pn-dl">
                                        <dt>osoby</dt><dd>{d.osoby.liczba}</dd>
                                        <dt>żyjące (ukryte)</dt><dd>{d.osoby.zyjace}</dd>
                                        <dt>do sprawdzenia</dt><dd>{d.osoby.doSprawdzenia}</dd>
                                        <dt>import z GEDCOM</dt><dd>{d.osoby.import ? new Date(d.osoby.import.data).toLocaleDateString('pl-PL') : '—'}</dd>
                                    </dl>
                                    <div className="pn-rzad"><a className="pn-btn" href="/keystatic/osoby">+ osoba</a><a className="pn-btn" href="/keystatic/panel/system">eksport GEDCOM</a></div>
                                </>
                            )}
                        </section>

                        <section className="pn-karta" aria-labelledby="zmiany">
                            <h2 id="zmiany" className="pn-tytul-karty">ostatnie zmiany</h2>
                            <ul className="pn-lista pn-lista-zmian">
                                {d.zmiany.map((z, i) => <li key={i}>{z.href ? <a href={z.href}>{z.opis}</a> : <span>{z.opis}</span>}<span className="pn-szary pn-bez-zawijania">{kiedy(z.czas)}</span></li>)}
                                {d.zmiany.length === 0 && <li className="pn-szary">brak</li>}
                            </ul>
                            <span className="pn-maly">wg czasu zapisu plików w content/</span>
                        </section>
                    </div>

                    <section aria-labelledby="uwagi" className="pn-kol">
                        <h2 id="uwagi" className="pn-etyk">uwagi techniczne</h2>
                        <div className="pn-rzad">
                            {d.uwagi.map((u, i) => <a key={i} href={u.href} className={u.ostrz ? 'pn-ostrz' : 'pn-info'}>{u.tekst}</a>)}
                            <a href="/keystatic/panel/system" className="pn-info">wersja kodu: {d.serwer.commit ?? '—'}{d.serwer.zbudowano ? ` · zbudowano ${kiedy(d.serwer.zbudowano)}` : ''}</a>
                        </div>
                    </section>
                </>
            )}
        </>
    )
}
