'use client'
// Pulpit panelu: co czeka, skróty, postęp planów, drzewo, treści, ostatnie zmiany, uwagi techniczne.
import * as React from 'react'
import { kiedy, odmiana, useDane } from './wspolne'

type Plan = { slug: string; tytul: string; widocznosc: string; zmieniono: string; geo: number; grobow: number; sprawdzone: number; zNapisem: number; zeZdjeciem: number }
type Pulpit = {
    zgloszenia: { czeka: number; nowe: number }
    plany: Plan[]
    osoby: { liczba: number; doSprawdzenia: number; zyjace: number; import: { data: string } | null }
    tresci: Record<string, { nazwa: string; n: number; szkice: number }>
    szkice: { razem: number; lista: string[] }
    oProjekcieSzkic: boolean
    zmiany: { opis: string; href: string | null; czas: string }[]
    uwagi: { tekst: string; ostrz: boolean; href: string }[]
    serwer: { commit: string | null; zbudowano: string | null }
}

const WID: Record<string, string> = { ja: 'tylko ja', bliscy: 'dla bliskich', publiczne: 'publiczny' }
const procent = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export default function Pulpit() {
    const { dane: d, blad } = useDane<Pulpit>('/api/keystatic/panel')
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
                            <a href="/keystatic/collection/posts" className="pn-kafel">
                                <span className="pn-liczba">{d.szkice.razem}</span>
                                <span>szkice (tylko ja)</span>
                                <span className="pn-maly">{d.szkice.lista.join(' · ') || 'brak'}</span>
                            </a>
                        </div>
                    </section>

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

                        <section className="pn-karta" aria-labelledby="tresci">
                            <div className="pn-naglowek"><h2 id="tresci" className="pn-tytul-karty">treści w Keystatic</h2><a href="/keystatic/collection/posts" className="pn-maly-link">otwórz →</a></div>
                            <div className="pn-dwie-kolumny">
                                {Object.entries(d.tresci).map(([k, t]) => (
                                    <a key={k} className="pn-btn pn-btn-rozlozony" href={`/keystatic/collection/${k}`}>
                                        {t.nazwa}<span className="pn-szary">{t.n}{t.szkice ? ` · ${t.szkice} szk.` : ''}</span>
                                    </a>
                                ))}
                                <a className="pn-btn pn-btn-rozlozony" href="/keystatic/singleton/oProjekcie">„o projekcie”{d.oProjekcieSzkic && <span className="pn-tag">szkic</span>}</a>
                                <a className="pn-btn pn-btn-rozlozony" href="/keystatic/plany/typy">typy na planach<span aria-hidden="true">→</span></a>
                            </div>
                        </section>

                        <section className="pn-karta" aria-labelledby="zmiany">
                            <h2 id="zmiany" className="pn-tytul-karty">ostatnie zmiany</h2>
                            <ul className="pn-lista">
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
