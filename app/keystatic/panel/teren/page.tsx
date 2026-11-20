'use client'
// P7b (TER-01): „z terenu – do przejrzenia” dla redakcji: skrzynka nowych miejsc z telefonów (redakcja robi z wpisu obiekt
// albo plan, albo go odrzuca – decyzja 19.11) oraz zmiany zapisane na planach przez współpracowników, z napisami „do decyzji”.
// P7c (TER-04): „utwórz obiekt…” – obiekt z wpisu jednym poleceniem (podgląd, „tylko ja”, operacja z „cofnij”).
import * as React from 'react'
import { NAZWA_CZYNNOSCI, type WpisDziennika } from '@/lib/teren/czynnosci'
import { nazwaRodzajuTerenu, opisBlisko, type MiejsceTerenu } from '@/lib/teren/miejsca'
import { useDane } from '../wspolne'
import { UtworzObiekt } from './UtworzObiekt'

type Miejsca = { redakcja: boolean; miejsca: MiejsceTerenu[] }
type Zmiany = { wpisy: (WpisDziennika & { plan: string; tytul: string })[]; doDecyzji: number }
const STAN = { nowe: 'nowe', opracowane: 'opracowane', odrzucone: 'odrzucone' }
const data = (c: string) => new Date(c).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })

export default function ZTerenu() {
    const m = useDane<Miejsca>('/api/keystatic/teren/miejsca'), z = useDane<Zmiany>('/api/keystatic/teren/zmiany')
    const [widok, ustawWidok] = React.useState<'nowe' | 'wszystkie'>('nowe')
    const [opis, ustawOpis] = React.useState<Record<string, string>>({})
    const [kom, ustawKom] = React.useState('')
    const [info, ustawInfo] = React.useState('')
    const akcja = async (adres: string, tresc: unknown, potem: () => void) => {
        const r = await fetch(adres, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tresc) }).catch(() => null)
        const j = await r?.json().catch(() => null)
        ustawKom(r?.ok ? '' : j?.blad ?? 'Nie udało się zapisać.'); if (r?.ok) potem()
    }
    const miejsca = (m.dane?.redakcja ? m.dane.miejsca : []).filter((x) => widok === 'wszystkie' || x.stan === 'nowe')
    const doDecyzji = (z.dane?.wpisy ?? []).filter((w) => w.wynik === 'do-decyzji' && !w.rozstrzygnieto)
    return (
        <>
            <header className="pn-kol pn-kol-wasko">
                <h1>z terenu</h1>
                <span className="pn-maly">Nowe miejsca i zmiany na planach zapisane telefonem. Nic z tej strony nie jest publiczne.</span>
            </header>
            {kom && <p className="pn-ostrz pn-bez-marginesu" role="alert"><span>{kom}</span></p>}
            <div aria-live="polite">{info && <p className="pn-info pn-bez-marginesu"><span>{info}</span></p>}</div>

            {m.dane?.redakcja && (
                <section className="pn-kol pn-kol-12" aria-labelledby="zt-miejsca">
                    <div className="pn-rzad">
                        <h2 id="zt-miejsca" className="pn-etyk">nowe miejsca</h2>
                        <div className="pn-seg" role="group" aria-label="które wpisy">
                            <button type="button" aria-pressed={widok === 'nowe'} onClick={() => ustawWidok('nowe')}>czekają</button>
                            <button type="button" aria-pressed={widok === 'wszystkie'} onClick={() => ustawWidok('wszystkie')}>wszystkie</button>
                        </div>
                    </div>
                    {miejsca.length === 0 && <span className="pn-szary">{widok === 'nowe' ? 'Nic nie czeka.' : 'Pusto.'}</span>}
                    {miejsca.map((x) => (
                        <article key={x.id} className="pn-karta" aria-label={x.nazwa || nazwaRodzajuTerenu(x.rodzaj)}>
                            <div className="pn-rzad"><span className="pn-tag">{nazwaRodzajuTerenu(x.rodzaj)}</span><span className="pn-tag">{STAN[x.stan]}</span><span className="pn-maly">{x.imie} · {data(x.czas)}</span></div>
                            <h3 className="pn-bez-marginesu">{x.nazwa || 'bez nazwy'}</h3>
                            {x.zdjecia.length > 0 && (
                                <div className="tr-zdjecia">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {x.zdjecia.map((f, i) => <a key={f.plik} className="tr-zdjecie" href={`/api/keystatic/teren/miejsca/${x.id}/plik/${f.plik}`} target="_blank" rel="noreferrer"><img src={`/api/keystatic/teren/miejsca/${x.id}/plik/${f.plik}`} alt={`zdjęcie ${i + 1} – otwórz w pełnym rozmiarze`} loading="lazy" /></a>)}
                                </div>
                            )}
                            {x.notatka && <p className="tr-napis">{x.notatka}</p>}
                            <dl className="pn-dl">
                                <dt>położenie</dt>
                                <dd>{x.lat !== undefined && x.lon !== undefined
                                    ? <><a href={`https://www.openstreetmap.org/?mlat=${x.lat}&mlon=${x.lon}#map=17/${x.lat}/${x.lon}`} target="_blank" rel="noreferrer">{x.lat.toFixed(5)}, {x.lon.toFixed(5)} – OpenStreetMap ↗</a>{x.dokl !== undefined && ` · dokładność ±${x.dokl} m`}</>
                                    : <span className="pn-szary">nie odczytano</span>}</dd>
                                {x.blisko && <><dt>najbliżej</dt><dd>{opisBlisko(x.blisko)}</dd></>}
                                {x.opis && <><dt>co powstało</dt><dd>{x.obiekt ? <a href={`/keystatic/collection/obiekty/item/${x.obiekt}`}>{x.opis}</a> : x.opis}</dd></>}
                            </dl>
                            {x.stan === 'nowe' ? (
                                <>
                                    <label className="pn-pole">co powstało z wpisu (np. „obiekt: krzyż w Testowie”)
                                        <input className="pn-in" value={opis[x.id] ?? ''} maxLength={300} onChange={(e) => ustawOpis((o) => ({ ...o, [x.id]: e.target.value }))} />
                                    </label>
                                    <div className="pn-rzad">
                                        <UtworzObiekt wpis={x} onGotowe={(t) => { ustawInfo(t); m.odswiez() }} />
                                        <a className="pn-btn" href="/keystatic/collection/obiekty/create" target="_blank" rel="noreferrer">+ nowy obiekt ręcznie ↗</a>
                                        <button type="button" className="pn-btn" onClick={() => akcja(`/api/keystatic/teren/miejsca/${x.id}`, { akcja: 'opracowane', opis: opis[x.id] ?? '' }, m.odswiez)}>opracowane ✓</button>
                                        <button type="button" className="pn-btn" onClick={() => akcja(`/api/keystatic/teren/miejsca/${x.id}`, { akcja: 'odrzuc' }, m.odswiez)}>odrzuć</button>
                                    </div>
                                </>
                            ) : (
                                <div className="pn-rzad">
                                    <button type="button" className="pn-btn" onClick={() => akcja(`/api/keystatic/teren/miejsca/${x.id}`, { akcja: 'przywroc' }, m.odswiez)}>z powrotem do nowych</button>
                                    <button type="button" className="pn-btn" onClick={() => { if (window.confirm('Usunąć wpis i jego zdjęcia na stałe?')) akcja(`/api/keystatic/teren/miejsca/${x.id}`, { akcja: 'usun' }, m.odswiez) }}>usuń na stałe</button>
                                </div>
                            )}
                        </article>
                    ))}
                </section>
            )}

            {z.dane && (
                <section className="pn-kol pn-kol-12" aria-labelledby="zt-zmiany">
                    <h2 id="zt-zmiany" className="pn-etyk">zmiany na planach</h2>
                    {doDecyzji.map((w) => (
                        <article key={w.id} className="pn-karta" aria-label={`napis do decyzji: ${w.tytul}, ${w.numer ?? 'grób bez numeru'}`}>
                            <div className="pn-rzad"><span className="pn-tag tr-czeka">do decyzji</span><a href={`/keystatic/plany/${w.plan}`}>{w.tytul}</a><span>{w.numer ?? 'grób bez numeru'}</span><span className="pn-maly">{w.imie} · {data(w.czas)}</span></div>
                            <span className="pn-maly">Napis zmieniono w panelu po tym, jak telefon pobrał plan. Plan ma teraz wersję z panelu.</span>
                            <div className="tr-wersje">
                                <div className="tr-wersja"><span className="pn-etyk">z terenu ({w.imie})</span><pre className="tr-napis">{w.napis || '(pusty)'}</pre><button type="button" className="pn-btn" onClick={() => akcja('/api/keystatic/teren/zmiany', { plan: w.plan, id: w.id, wybor: 'teren' }, z.odswiez)}>wpisz wersję z terenu</button></div>
                                <div className="tr-wersja"><span className="pn-etyk">w panelu (wtedy)</span><pre className="tr-napis">{w.bylo || '(pusty)'}</pre><button type="button" className="pn-btn" onClick={() => akcja('/api/keystatic/teren/zmiany', { plan: w.plan, id: w.id, wybor: 'redakcja' }, z.odswiez)}>zostaw to, co jest w planie</button></div>
                            </div>
                        </article>
                    ))}
                    {z.dane.wpisy.length === 0 && <span className="pn-szary">Jeszcze nic nie przyszło z terenu.</span>}
                    {z.dane.wpisy.length > 0 && (
                        <div className="pn-tabela-ramka">
                            <table className="pn-tabela">
                                <thead><tr><th scope="col">kiedy</th><th scope="col">kto</th><th scope="col">plan</th><th scope="col">grób</th><th scope="col">co</th></tr></thead>
                                <tbody>
                                    {z.dane.wpisy.map((w) => (
                                        <tr key={`${w.plan}-${w.id}`}>
                                            <td>{data(w.czas)}</td><td>{w.imie}</td><td><a href={`/keystatic/plany/${w.plan}`}>{w.tytul}</a></td><td>{w.numer ?? '—'}</td>
                                            <td>{NAZWA_CZYNNOSCI[w.rodzaj]}{w.wynik === 'do-decyzji' && (w.rozstrzygnieto ? ` – rozstrzygnięte (${w.rozstrzygnieto.wybor === 'teren' ? 'wersja z terenu' : 'wersja z panelu'})` : ' – do decyzji')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}
            {m.blad && !z.dane && <p className="pn-ostrz pn-bez-marginesu" role="alert"><span>{m.blad}</span></p>}
        </>
    )
}
