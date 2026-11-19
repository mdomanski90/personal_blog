'use client'
// P7a (KON-01): karta konta – role, uprawnienia z odstępstwami, zakres, urządzenia (klucze dostępu), ostatnie działania (plansza „Karta konta i role”).
import * as React from 'react'
import { useParams } from 'next/navigation'
import { kiedy, useDane } from '../../wspolne'
import { Okno } from '../../okno'
import { OknoLinku, WyborZakresu, dzien, nazwaUprawnienia, wyslij, type Krag, type Rola, type Uprawnienie, type Zakres, type Zaproszenie } from '../wspolne'

type Konto = { id: string; imie: string; email?: string; role: string[]; dodane: string[]; odebrane: string[]; zakres: Zakres; stan: 'zaproszony' | 'aktywny' | 'zablokowany'; utworzono: string; ostatnio?: string; zaproszenieDo: string | null; ty: boolean }
type Dane = { wersja: number; konto: Konto; zRol: string[]; role: Rola[]; uprawnienia: Uprawnienie[]; kregi: Krag[]; urzadzenia: { id: string; nazwa: string; od: string }[] | null; uwagaUrzadzen: string | null; dzialania: { opis: string; czas: string }[] }
const STAN = { aktywny: 'aktywne', zaproszony: 'zaproszony', zablokowany: 'zablokowane' } as const

export default function KartaKonta() {
    const id = useParams<{ id: string }>()?.id ?? ''
    const { dane, blad, odswiez } = useDane<Dane>(id ? `/api/keystatic/panel/konta?id=${encodeURIComponent(id)}` : '')
    const [role, ustawRole] = React.useState<string[]>([])
    const [ma, ustawMa] = React.useState<Set<string>>(new Set())
    const [zakres, ustawZakres] = React.useState<Zakres>({ kregi: [], miejsca: [] })
    const [kom, ustawKom] = React.useState<{ tekst: string; blad?: boolean } | null>(null)
    const [link, ustawLink] = React.useState<Zaproszenie | null>(null)
    const [usun, ustawUsun] = React.useState(false)
    const k = dane?.konto
    // uprawnienia z ról wybranych w formularzu (zmiana ról od razu zmienia kolumnę „z roli”)
    const zRoli = React.useMemo(() => new Set((dane?.role ?? []).filter((r) => r.klucz !== 'administrator' && role.includes(r.klucz)).flatMap((r) => r.uprawnienia)), [dane, role])
    React.useEffect(() => {
        if (!dane) return
        ustawRole(dane.konto.role); ustawZakres(dane.konto.zakres)
        const s = new Set(dane.zRol); for (const u of dane.konto.dodane) s.add(u); for (const u of dane.konto.odebrane) s.delete(u)
        ustawMa(s)
    }, [dane])
    if (blad) return <p className="pn-ostrz pn-bez-marginesu" role="alert"><span>{blad}</span></p>
    if (!dane || !k) return <span className="pn-szary">wczytuję…</span>
    const wiersze = dane.uprawnienia.filter((u) => u.klucz !== 'administracja')
    const akcja = async (dane2: Record<string, unknown>, ok: string) => {
        const { blad: b } = await wyslij({ id: k.id, wersja: dane.wersja, ...dane2 })
        ustawKom(b ? { tekst: b, blad: true } : { tekst: ok }); if (!b) odswiez()
        return !b
    }
    const zapisz = () => akcja({ akcja: 'zapisz', role, dodane: wiersze.filter((u) => ma.has(u.klucz) && !zRoli.has(u.klucz)).map((u) => u.klucz), odebrane: wiersze.filter((u) => !ma.has(u.klucz) && zRoli.has(u.klucz)).map((u) => u.klucz), zakres }, 'Zapisano. Zmiana działa od następnego kliknięcia tej osoby.')
    const nowyLink = async () => {
        const { wynik, blad: b } = await wyslij<Zaproszenie>({ akcja: 'nowy-link', id: k.id, wersja: dane.wersja })
        if (b || !wynik) ustawKom({ tekst: b ?? 'Nie udało się utworzyć linku.', blad: true }); else { ustawLink(wynik); odswiez() }
    }
    const przelaczRole = (r: string) => ustawRole((L) => (L.includes(r) ? L.filter((x) => x !== r) : [...L, r]))
    const imie = k.imie.split(' ')[0]
    return (
        <>
            <header className="pn-naglowek">
                <div className="pn-kol pn-kol-wasko">
                    <a className="pn-maly-link" href="/keystatic/panel/dostep">konta ›</a>
                    <h1>{k.imie}{k.ty ? ' (Ty)' : ''}</h1>
                    <span className="pn-maly">{[k.email, role.map((r) => dane.role.find((x) => x.klucz === r)?.nazwa ?? r).join(' + '), `${STAN[k.stan]}${k.stan === 'zaproszony' && k.zaproszenieDo ? ` · link do ${dzien(k.zaproszenieDo)}` : ''}`, `dodane ${dzien(k.utworzono)}`, `ostatnio ${kiedy(k.ostatnio)}`].filter(Boolean).join(' · ')}</span>
                </div>
                <div className="pn-rzad">
                    <button type="button" className="pn-btn" disabled={k.stan === 'zablokowany'} onClick={nowyLink}>nowy link do klucza</button>
                    <button type="button" className="pn-btn" onClick={() => akcja({ akcja: 'wyloguj' }, 'Wylogowano ze wszystkich urządzeń – przy następnym wejściu trzeba użyć klucza.')}>wyloguj ze wszystkich urządzeń</button>
                    {k.stan === 'zablokowany'
                        ? <button type="button" className="pn-btn" onClick={() => akcja({ akcja: 'odblokuj' }, 'Konto odblokowane.')}>odblokuj</button>
                        : <button type="button" className="pn-btn" onClick={() => akcja({ akcja: 'zablokuj' }, 'Konto zablokowane – dostęp odebrany od razu.')}>zablokuj</button>}
                </div>
            </header>
            {kom && <p className={`${kom.blad ? 'pn-ostrz' : 'pn-info'} pn-bez-marginesu`} role={kom.blad ? 'alert' : 'status'}><span>{kom.tekst}</span></p>}
            <div className="pn-konta-uklad">
                <section className="pn-karta" aria-labelledby="upr">
                    <h2 id="upr" className="pn-etyk">role i uprawnienia</h2>
                    <div className="pn-pastylki" role="group" aria-label="role konta">
                        {dane.role.map((r) => <button key={r.klucz} type="button" className="pn-pastylka" aria-pressed={role.includes(r.klucz)} title={r.opis} onClick={() => przelaczRole(r.klucz)}>{r.nazwa}</button>)}
                    </div>
                    <span className="pn-maly">Konto może mieć kilka ról. Rola „administrator” działa na żądanie: po ponownym użyciu klucza, najwyżej 30 minut. Zmiany tylko dla tej osoby są oznaczone; „przywróć z roli” cofa odstępstwa.</span>
                    <div className="pn-tabela-ramka">
                        <table className="pn-tabela pn-tabela-upr">
                            <thead><tr><th scope="col">uprawnienie</th><th scope="col" className="pn-srodek">z roli</th><th scope="col">{imie}</th></tr></thead>
                            <tbody>
                                {wiersze.map((u) => {
                                    const z = zRoli.has(u.klucz), m = ma.has(u.klucz)
                                    return (
                                        <tr key={u.klucz}>
                                            <th scope="row">{nazwaUprawnienia(u)}</th>
                                            <td className="pn-srodek">{z ? 'tak' : '—'}</td>
                                            <td>
                                                <input type="checkbox" checked={m} aria-label={`${u.nazwa} – ${imie}`} onChange={() => ustawMa((s) => { const n = new Set(s); if (n.has(u.klucz)) n.delete(u.klucz); else n.add(u.klucz); return n })} />
                                                {m && !z && <span className="pn-odst pn-odst-dodane">dodane</span>}
                                                {!m && z && <span className="pn-odst pn-odst-odebrane">odebrane</span>}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <span className="pn-etyk">zakres miejscowości</span>
                    <WyborZakresu zakres={zakres} kregi={dane.kregi} onZmiana={ustawZakres} />
                    <div className="pn-rzad">
                        <button type="button" className="pn-btn" onClick={() => ustawMa(new Set(zRoli))}>przywróć z roli</button>
                        <button type="button" className="pn-btn pn-btn-gl" onClick={zapisz}>zapisz zmiany</button>
                    </div>
                </section>
                <div className="pn-kol">
                    <section className="pn-karta" aria-labelledby="urz">
                        <h2 id="urz" className="pn-etyk">urządzenia (klucze dostępu)</h2>
                        {dane.uwagaUrzadzen && <span className="pn-maly">{dane.uwagaUrzadzen}</span>}
                        {dane.urzadzenia && dane.urzadzenia.length === 0 && <span className="pn-szary">Żadne urządzenie nie jest jeszcze połączone.</span>}
                        {dane.urzadzenia && dane.urzadzenia.length > 0 && (
                            <ul className="pn-lista">
                                {dane.urzadzenia.map((u) => <li key={u.id}><span>{u.nazwa}</span><span className="pn-rzad"><span className="pn-szary">od {dzien(u.od)}</span><button type="button" className="pn-btn pn-btn-maly" onClick={() => akcja({ akcja: 'usun-urzadzenie', urzadzenie: u.id }, 'Urządzenie odłączone.')}>odłącz</button></span></li>)}
                            </ul>
                        )}
                        <span className="pn-maly">Zgubiony telefon: „odłącz” to urządzenie i „wyloguj ze wszystkich urządzeń”, potem „nowy link do klucza”.</span>
                    </section>
                    <section className="pn-karta" aria-labelledby="dzi">
                        <h2 id="dzi" className="pn-etyk">ostatnie działania</h2>
                        {dane.dzialania.length === 0 ? <span className="pn-szary">Jeszcze nic – pojawią się tu zapisane zmiany tej osoby.</span>
                            : <ul className="pn-lista">{dane.dzialania.map((d, i) => <li key={i}><span>{d.opis}</span><span className="pn-szary pn-bez-zawijania">{kiedy(d.czas)}</span></li>)}</ul>}
                    </section>
                    <section className="pn-karta" aria-labelledby="usu">
                        <h2 id="usu" className="pn-etyk">usunięcie konta</h2>
                        <span className="pn-maly">Zmiany tej osoby zostają na stronie i w historii z jej podpisem (po usunięciu: „konto usunięte”).</span>
                        <div><button type="button" className="pn-btn" onClick={() => ustawUsun(true)}>usuń konto…</button></div>
                    </section>
                </div>
            </div>
            <OknoLinku z={link} tytul="nowy link do klucza" onZamknij={() => ustawLink(null)} />
            <Okno otwarte={usun} tytul="usunąć konto?" onZamknij={() => ustawUsun(false)} stopka={<>
                <button type="button" className="pn-btn" onClick={() => ustawUsun(false)}>anuluj</button>
                <button type="button" className="pn-btn pn-blad" onClick={async () => { ustawUsun(false); if (await akcja({ akcja: 'usun' }, 'Konto usunięte.')) location.assign('/keystatic/panel/dostep') }}>usuń konto „{k.imie}”</button>
            </>}>
                <span>Osoba „{k.imie}” straci dostęp od razu, a jej klucze dostępu zostaną usunięte z usługi logowania. Tego nie da się cofnąć – w razie potrzeby zaprosisz ją ponownie.</span>
            </Okno>
        </>
    )
}
