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
type Poz = { t: string; typ: string; href: string; d?: string }

const WID: Record<string, string> = { ja: 'tylko ja', bliscy: 'dla bliskich', publiczne: 'publiczny' }
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
const procent = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

function Szukaj() {
    const [indeks, ustawIndeks] = React.useState<Poz[] | null>(null)
    const [q, ustawQ] = React.useState('')
    const [akt, ustawAkt] = React.useState(0)
    const [otwarte, ustawOtwarte] = React.useState(false)
    const wczytaj = () => { if (!indeks) { ustawIndeks([]); fetch('/api/keystatic/panel?czesc=indeks').then((r) => r.json()).then(ustawIndeks).catch(() => {}) } }
    const wyniki = React.useMemo(() => {
        const sl = norm(q.trim()).split(/\s+/).filter(Boolean)
        if (!sl.length || !indeks) return []
        return indeks.filter((x) => { const t = norm(`${x.t} ${x.typ} ${x.d ?? ''}`); return sl.every((s) => t.includes(s)) }).slice(0, 12)
    }, [q, indeks])
    return (
        <div className="pn-szukaj">
            <label htmlFor="pn-q" className="pn-etyk">szukaj w panelu</label>
            <form role="search" className="pole-szukania" style={{ marginTop: 4, background: 'var(--karta)' }} onSubmit={(e) => { e.preventDefault(); if (wyniki[akt]) location.href = wyniki[akt].href }}>
            <button type="submit">szukaj</button>
            <input id="pn-q" type="search" style={{ height: 34 }} placeholder="osoba, plan, wpis, miejsce, materiał…" autoComplete="off"
                value={q} onFocus={() => { wczytaj(); ustawOtwarte(true) }} onBlur={() => window.setTimeout(() => ustawOtwarte(false), 150)}
                onChange={(e) => { ustawQ(e.target.value); ustawAkt(0); ustawOtwarte(true) }}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); ustawAkt((a) => Math.min(a + 1, wyniki.length - 1)) }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); ustawAkt((a) => Math.max(a - 1, 0)) }
                    else if (e.key === 'Escape') ustawOtwarte(false)
                }} />
            </form>
            {otwarte && q.trim() && (
                <div className="pn-wyniki" role="listbox">
                    {!wyniki.length && <span className="pn-maly" style={{ display: 'block', padding: '8px 12px' }}>{!indeks?.length ? 'wczytuję…' : 'nic nie znaleziono'}</span>}
                    {wyniki.map((w, i) => (
                        <a key={`${w.href}-${i}`} href={w.href} data-akt={i === akt} role="option" aria-selected={i === akt}>
                            <span>{w.t}</span><span className="pn-szary" style={{ whiteSpace: 'nowrap' }}>{w.typ}{w.d ? ` · ${w.d}` : ''}</span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function Pulpit() {
    const { dane: d, blad } = useDane<Pulpit>('/api/keystatic/panel')
    const [dzis, ustawDzis] = React.useState('')
    React.useEffect(() => { ustawDzis(new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) }, [])
    const niespr = d ? d.plany.reduce((a, p) => a + p.grobow - p.sprawdzone, 0) : 0
    const planNiespr = d?.plany.find((p) => p.grobow > p.sprawdzone)
    const ostatniPlan = d?.plany[0]

    return (
        <>
            <header className="pn-rzad" style={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <h1>pulpit</h1>
                    <span className="pn-szary" style={{ fontSize: 12.5 }}>{dzis}</span>
                </div>
                <Szukaj />
            </header>
            {blad && <p className="pn-kom" style={{ margin: 0 }}>{blad}</p>}
            {!d && !blad && <p className="pn-szary" style={{ margin: 0 }}>wczytuję…</p>}

            {d && (
                <>
                    <section aria-labelledby="czeka" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <h2 id="czeka" className="pn-etyk">czeka na Ciebie</h2>
                        <div className="pn-kafle">
                            <a href="/keystatic/panel/zgloszenia" className="pn-kafel">
                                <span className="pn-liczba" style={{ color: d.zgloszenia.czeka ? 'var(--ostrz)' : undefined }}>{d.zgloszenia.czeka}</span>
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
                            <a href="/keystatic" className="pn-kafel">
                                <span className="pn-liczba">{d.szkice.razem}</span>
                                <span>szkice (tylko ja)</span>
                                <span className="pn-maly">{d.szkice.lista.join(' · ') || 'brak'}</span>
                            </a>
                        </div>
                    </section>

                    <section aria-labelledby="szybko" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <h2 id="szybko" className="pn-etyk">szybko</h2>
                        <div className="pn-rzad">
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
                            <div className="pn-rzad" style={{ justifyContent: 'space-between' }}><h2 id="plany">plany</h2><a href="/keystatic/plany" style={{ fontSize: 12 }}>wszystkie →</a></div>
                            {d.plany.length === 0 && <p className="pn-szary" style={{ margin: 0 }}>Nie ma jeszcze planów.</p>}
                            {d.plany.slice(0, 4).map((p) => (
                                <div key={p.slug} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, border: '1px solid var(--linia2)', borderRadius: 7 }}>
                                    <div className="pn-rzad" style={{ justifyContent: 'space-between' }}>
                                        <b>{p.tytul}</b>
                                        <span className="pn-maly">{odmiana(p.grobow, ['grób', 'groby', 'grobów'])} · {WID[p.widocznosc] ?? p.widocznosc} · {kiedy(p.zmieniono)}</span>
                                    </div>
                                    {p.grobow > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(0,1fr) 72px', gap: '6px 10px', alignItems: 'center', fontSize: 12 }}>
                                            {([['sprawdzone', p.sprawdzone], ['z napisem', p.zNapisem], ['ze zdjęciem', p.zeZdjeciem]] as [string, number][]).map(([t, n]) => (
                                                <React.Fragment key={t}><span>{t}</span><div className="pn-pasek" role="img" aria-label={`${t}: ${procent(n, p.grobow)}%`}><div style={{ width: `${procent(n, p.grobow)}%` }} /></div><span style={{ textAlign: 'right' }}>{n} <span className="pn-szary">({procent(n, p.grobow)}%)</span></span></React.Fragment>
                                            ))}
                                        </div>
                                    )}
                                    {p.geo < 2 && <span style={{ fontSize: 12, color: 'var(--ostrz)' }}>brak punktów geo – plan nie pojawi się na mapie, tryb „w terenie” niedostępny</span>}
                                    <div className="pn-rzad">
                                        <a className="pn-btn" href={`/keystatic/plany/${p.slug}`}>edytuj</a>
                                        {p.widocznosc !== 'ja' && <a className="pn-btn" href={`/plany/${p.slug}`} target="_blank" rel="noreferrer">na stronie ↗</a>}
                                    </div>
                                </div>
                            ))}
                        </section>

                        <section className="pn-karta" aria-labelledby="osoby">
                            <div className="pn-rzad" style={{ justifyContent: 'space-between' }}><h2 id="osoby">osoby i drzewo</h2><a href="/keystatic/osoby" style={{ fontSize: 12 }}>lista →</a></div>
                            {d.osoby.liczba === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: '1px dashed var(--linia)', borderRadius: 7 }}>
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
                            <div className="pn-rzad" style={{ justifyContent: 'space-between' }}><h2 id="tresci">treści w Keystatic</h2><a href="/keystatic" style={{ fontSize: 12 }}>otwórz →</a></div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                                {Object.entries(d.tresci).map(([k, t]) => (
                                    <a key={k} className="pn-btn" href={`/keystatic/collection/${k}`} style={{ justifyContent: 'space-between', minHeight: 40 }}>
                                        {t.nazwa}<span className="pn-szary">{t.n}{t.szkice ? ` · ${t.szkice} szk.` : ''}</span>
                                    </a>
                                ))}
                                <a className="pn-btn" href="/keystatic/singleton/oProjekcie" style={{ justifyContent: 'space-between', minHeight: 40 }}>„o projekcie”{d.oProjekcieSzkic && <span style={{ color: 'var(--ostrz)' }}>szkic</span>}</a>
                                <a className="pn-btn" href="/keystatic/plany/typy" style={{ justifyContent: 'space-between', minHeight: 40 }}>typy na planach<span aria-hidden="true">→</span></a>
                            </div>
                        </section>

                        <section className="pn-karta" aria-labelledby="zmiany">
                            <h2 id="zmiany">ostatnie zmiany</h2>
                            <ul className="pn-lista">
                                {d.zmiany.map((z, i) => <li key={i}>{z.href ? <a href={z.href}>{z.opis}</a> : <span>{z.opis}</span>}<span className="pn-szary" style={{ whiteSpace: 'nowrap' }}>{kiedy(z.czas)}</span></li>)}
                                {d.zmiany.length === 0 && <li className="pn-szary">brak</li>}
                            </ul>
                            <span className="pn-maly">wg czasu zapisu plików w content/</span>
                        </section>
                    </div>

                    <section aria-labelledby="uwagi" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
