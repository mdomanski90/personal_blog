'use client'
// Kopie zapasowe (stan), eksport, ustawienia strony, stan serwera, kosz.
import * as React from 'react'
import { bajty, kiedy, useDane, wyslijJson } from '../wspolne'

type System = {
    serwer: {
        dziala: number; node: string; commit: string | null; zbudowano: string | null
        dysk: { wolne: number; calosc: number } | null; pamiec: { wolna: number; calosc: number }
        archiwum: { bajty: number; pliki: number; ucieto: boolean }; restart: boolean; kopia: string | null; logowanieBliskich: boolean
    }
    kosz: { rodzaj: 'plan' | 'osoba' | 'rodzina' | 'import'; plik: string; nazwa: string; czas: string }[]
    omeka: { nazwa: string; bajty: number; czas: string }[]
    plany: { slug: string; tytul: string }[]
}
const RODZ = { plan: 'plan', osoba: 'osoba', rodzina: 'rodzina', import: 'kopia sprzed importu' }

function czasDzialania(s: number) {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
    return d ? `${d} d ${h} h` : h ? `${h} h ${m} min` : `${m} min`
}

async function pobierzPlan(slug: string) {
    const r = await fetch(`/api/keystatic/plany/${slug}`, { cache: 'no-store' })
    if (!r.ok) return alert('Nie udało się pobrać planu.')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(await r.json(), null, 1)], { type: 'application/json' }))
    a.download = `${slug}.plan.json`
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

function Prog() {
    const [ust, ustawUst] = React.useState<{ progLat: number } & Record<string, unknown> | null>(null)
    const [prog, ustawProg] = React.useState('')
    const [kom, ustawKom] = React.useState('')
    React.useEffect(() => { fetch('/api/keystatic/plany/ustawienia').then((r) => r.json()).then((u) => { ustawUst(u); ustawProg(String(u.progLat)) }).catch(() => {}) }, [])
    const zapisz = async () => {
        if (!ust) return
        const b = await wyslijJson('/api/keystatic/plany/ustawienia', 'PUT', { ...ust, progLat: +prog })
        ustawKom(b ?? 'Zapisano.')
        if (!b) ustawUst({ ...ust, progLat: +prog })
    }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="prog" className="pn-etyk">groby zmarłych w ostatnich … latach – napis i zdjęcia tylko dla bliskich</label>
            <div className="pn-rzad">
                <input id="prog" className="pn-in" type="number" min={0} max={150} value={prog} onChange={(e) => ustawProg(e.target.value)} style={{ width: 100 }} disabled={!ust} />
                <button type="button" className="pn-btn" disabled={!ust || +prog === ust.progLat} onClick={zapisz}>zapisz</button>
                {kom && <span className="pn-maly" role="status">{kom}</span>}
            </div>
        </div>
    )
}

export default function System() {
    const { dane: d, blad, odswiez } = useDane<System>('/api/keystatic/panel?czesc=system')
    const [kom, ustawKom] = React.useState('')
    const kosz = async (akcja: 'przywroc' | 'usun', k: System['kosz'][number]) => {
        if (akcja === 'usun' && !confirm(`Usunąć na stałe: ${RODZ[k.rodzaj]} „${k.nazwa}”? Tego nie da się cofnąć.`)) return
        const b = await wyslijJson('/api/keystatic/panel', 'POST', { akcja, rodzaj: k.rodzaj, plik: k.plik })
        ustawKom(b ?? (akcja === 'przywroc' ? `Przywrócono: ${k.nazwa}.${k.rodzaj === 'osoba' ? ' Powiązania rodzinne trzeba dodać ponownie na karcie osoby.' : ''}` : 'Usunięto na stałe.'))
        odswiez()
    }
    const s = d?.serwer
    return (
        <>
            <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <h1>kopie, eksport, ustawienia</h1>
                <span className="pn-szary" style={{ fontSize: 12.5 }}>dane zostają na Twoim serwerze; kopie i eksporty uruchamiasz Ty</span>
            </header>
            {blad && <p className="pn-kom" style={{ margin: 0 }}>{blad}</p>}
            {kom && <p className="pn-info" style={{ margin: 0 }} role="status">{kom}</p>}

            <section className="pn-karta" aria-labelledby="kopie" style={{ borderColor: s && !s.kopia ? 'var(--ostrz-linia)' : undefined }}>
                <div className="pn-rzad" style={{ justifyContent: 'space-between' }}>
                    <h2 id="kopie">kopie zapasowe</h2>
                    {s && <span className={s.kopia ? 'pn-info' : 'pn-ostrz'} style={{ padding: '4px 10px' }}>{s.kopia ? `ostatnia: ${kiedy(s.kopia)}` : 'brak kopii poza serwerem'}</span>}
                </div>
                <dl className="pn-dl">
                    <dt>co obejmie</dt><dd>treści (content/), pliki archiwum (pliki-archiwum/), bazy (data/)</dd>
                    <dt>dokąd</dt><dd>węzeł domowy – kopie zaszyfrowane (restic) na Ceph; serwer tylko udostępnia pliki do odczytu, nie może kopii skasować</dd>
                    <dt>stan</dt><dd>w przygotowaniu – po konfiguracji tu pojawi się czas ostatniej kopii i ostrzeżenie, gdy kopii długo nie będzie</dd>
                </dl>
                <span className="pn-maly">Zalecane przed importem drzewa z Ancestry.</span>
            </section>

            <div className="pn-siatka">
                <section className="pn-karta" aria-labelledby="eksport">
                    <h2 id="eksport">eksport</h2>
                    <ul className="pn-lista">
                        <li><span>drzewo GEDCOM 5.5.1 – bez żyjących<br /><span className="pn-maly">do Ancestry i innych programów</span></span><a className="pn-btn" href="/api/keystatic/osoby/eksport?zyjace=ukryte">pobierz</a></li>
                        <li><span>drzewo GEDCOM – pełne<br /><span className="pn-maly">z osobami żyjącymi – tylko dla Ciebie</span></span><a className="pn-btn" href="/api/keystatic/osoby/eksport?zyjace=pelne">pobierz</a></li>
                        {d?.plany.map((p) => <li key={p.slug}><span>plan „{p.tytul}”<br /><span className="pn-maly">.plan.json – do importu na liście planów</span></span><button type="button" className="pn-btn" onClick={() => pobierzPlan(p.slug)}>pobierz</button></li>)}
                        {d && d.omeka.length > 0 && <li style={{ flexDirection: 'column', gap: 8 }}>
                            <span>archiwum – CSV dla Omeka S<br /><span className="pn-maly">stan z ostatniego wdrożenia ({kiedy(d.omeka[0].czas)})</span></span>
                            <span className="pn-rzad">{d.omeka.map((f) => <a key={f.nazwa} className="pn-btn" href={`/api/keystatic/panel?czesc=omeka&plik=${encodeURIComponent(f.nazwa)}`}>{f.nazwa} <span className="pn-szary">{bajty(f.bajty)}</span></a>)}</span>
                        </li>}
                    </ul>
                </section>

                <section className="pn-karta" aria-labelledby="ustawienia">
                    <h2 id="ustawienia">ustawienia strony</h2>
                    <Prog />
                    <div className="pn-rzad"><a className="pn-btn" href="/keystatic/plany/typy">katalog typów na planach →</a></div>
                </section>

                <section className="pn-karta" aria-labelledby="serwer">
                    <h2 id="serwer">serwer</h2>
                    {s ? (
                        <dl className="pn-dl">
                            <dt>strona działa od</dt><dd>{czasDzialania(s.dziala)}</dd>
                            <dt>wersja kodu</dt><dd>{s.commit ?? '—'}{s.zbudowano ? ` · zbudowano ${new Date(s.zbudowano).toLocaleString('pl-PL')}` : ''}</dd>
                            <dt>dysk</dt><dd>{s.dysk ? `wolne ${bajty(s.dysk.wolne)} z ${bajty(s.dysk.calosc)} (${Math.round((s.dysk.wolne / s.dysk.calosc) * 100)}%)` : '—'}</dd>
                            <dt>pamięć</dt><dd>wolna {bajty(s.pamiec.wolna)} z {bajty(s.pamiec.calosc)}</dd>
                            <dt>pliki archiwum</dt><dd>{bajty(s.archiwum.bajty)} · {s.archiwum.pliki}{s.archiwum.ucieto ? '+' : ''} plików</dd>
                            <dt>system</dt><dd style={{ color: s.restart ? 'var(--ostrz)' : undefined }}>{s.restart ? 'czeka na restart (aktualizacje)' : 'bez oczekujących restartów'} · Node {s.node}</dd>
                        </dl>
                    ) : <span className="pn-szary">wczytuję…</span>}
                    <span className="pn-maly">Tylko podgląd. Wdrożenia i restart robisz z terminala – panel nie ma uprawnień do serwera.</span>
                </section>

                <section className="pn-karta" aria-labelledby="kosz">
                    <h2 id="kosz">kosz</h2>
                    <span className="pn-maly">Usunięte plany i osoby leżą tu, dopóki ich nie przywrócisz albo nie usuniesz na stałe.</span>
                    {d && d.kosz.length === 0 && <span className="pn-szary">pusty</span>}
                    <ul className="pn-lista">
                        {d?.kosz.slice(0, 50).map((k) => (
                            <li key={`${k.rodzaj}/${k.plik}`} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                <span><span className="pn-tag">{RODZ[k.rodzaj]}</span> {k.nazwa} <span className="pn-szary">· {kiedy(k.czas)}</span></span>
                                {k.rodzaj !== 'import' && <span className="pn-rzad" style={{ gap: 6 }}>
                                    <button type="button" className="pn-btn" onClick={() => kosz('przywroc', k)}>przywróć</button>
                                    <button type="button" className="pn-btn" onClick={() => kosz('usun', k)}>usuń</button>
                                </span>}
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </>
    )
}
