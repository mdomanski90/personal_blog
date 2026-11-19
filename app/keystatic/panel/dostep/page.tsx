'use client'
// P7a (KON-01): konta i dostęp – lista kont, zaproszenie (link + kod QR), hasło „dla bliskich” (plansze „Administrator – lista kont”, „Zaproszenie”).
import * as React from 'react'
import { kiedy, useDane } from '../wspolne'
import { Okno } from '../okno'
import { OknoLinku, WyborZakresu, dzien, wyslij, type Krag, type Rola, type Uprawnienie, type Zakres, type Zaproszenie } from './wspolne'

type Konto = { id: string; imie: string; email: string | null; role: string[]; odstepstwa: number; zakres: string; ostatnio: string | null; stan: 'zaproszony' | 'aktywny' | 'zablokowany'; zaproszenieDo: string | null; zablokowano: string | null; ty: boolean }
type Dane = { wersja: number; konta: Konto[]; role: Rola[]; uprawnienia: Uprawnienie[]; kregi: Krag[]; bliscy: { wlaczone: boolean }; usluga: { wlaczona: boolean; kluczApi: boolean } }
const STAN = { aktywny: 'aktywne', zaproszony: 'zaproszony', zablokowany: 'zablokowane' } as const
const POLECENIE_HASLA = "npm run haslo -- 'nowe hasło' && sudo systemctl restart blog"

function Zapros({ dane, otwarte, onZamknij, onGotowe }: { dane: Dane; otwarte: boolean; onZamknij: () => void; onGotowe: (z: Zaproszenie) => void }) {
    const role = dane.role.filter((r) => r.klucz !== 'administrator')
    const dzialy = dane.uprawnienia.filter((u) => u.dzial)
    const [imie, ustawImie] = React.useState('')
    const [email, ustawEmail] = React.useState('')
    const [rola, ustawRole] = React.useState('redaktor')
    const zRoli = React.useMemo(() => new Set(dane.role.find((r) => r.klucz === rola)?.uprawnienia ?? []), [dane.role, rola])
    const [wybraneDzialy, ustawDzialy] = React.useState<Set<string>>(new Set())
    const [zakres, ustawZakres] = React.useState<Zakres>({ kregi: [], miejsca: [] })
    const [dni, ustawDni] = React.useState(7)
    const [blad, ustawBlad] = React.useState('')
    const [trwa, ustawTrwa] = React.useState(false)
    React.useEffect(() => { ustawDzialy(new Set(dzialy.filter((d) => zRoli.has(d.klucz)).map((d) => d.klucz))) }, [zRoli]) // eslint-disable-line react-hooks/exhaustive-deps
    React.useEffect(() => { if (otwarte) { ustawImie(''); ustawEmail(''); ustawBlad(''); ustawZakres({ kregi: [], miejsca: [] }) } }, [otwarte])
    const maDzialy = dzialy.some((d) => zRoli.has(d.klucz))
    const utworz = async () => {
        ustawTrwa(true); ustawBlad('')
        const dodane = dzialy.filter((d) => wybraneDzialy.has(d.klucz) && !zRoli.has(d.klucz)).map((d) => d.klucz)
        const odebrane = dzialy.filter((d) => !wybraneDzialy.has(d.klucz) && zRoli.has(d.klucz)).map((d) => d.klucz)
        const { wynik, blad: b } = await wyslij<Zaproszenie>({ akcja: 'zapros', wersja: dane.wersja, imie, email, role: [rola], dodane, odebrane, zakres, dni })
        ustawTrwa(false)
        if (b || !wynik) { ustawBlad(b ?? 'Nie udało się utworzyć zaproszenia.'); return }
        onGotowe(wynik)
    }
    return (
        <Okno otwarte={otwarte} tytul="zaproś osobę" onZamknij={onZamknij} stopka={<>
            <button type="button" className="pn-btn" onClick={onZamknij}>anuluj</button>
            <button type="button" className="pn-btn pn-btn-gl" disabled={trwa || imie.trim().length < 2} onClick={utworz}>{trwa ? 'tworzę…' : 'utwórz zaproszenie'}</button>
        </>}>
            <div className="pn-form-kol">
                <label className="pn-pole">imię i nazwisko<input className="pn-in" value={imie} onChange={(e) => ustawImie(e.target.value)} autoComplete="off" /></label>
                <label className="pn-pole">e-mail (opcjonalnie)<input className="pn-in" type="email" value={email} onChange={(e) => ustawEmail(e.target.value)} autoComplete="off" />
                    <span className="pn-podp">Tylko do Twojej wiadomości i do odzyskania klucza – strona sama nic nie wysyła.</span></label>
                <label className="pn-pole">rola
                    <select className="pn-in" value={rola} onChange={(e) => ustawRole(e.target.value)}>{role.map((r) => <option key={r.klucz} value={r.klucz}>{r.nazwa}</option>)}</select>
                    <span className="pn-podp">{dane.role.find((r) => r.klucz === rola)?.opis}</span></label>
                {maDzialy && <>
                    <span className="pn-etyk">działy (z roli „{dane.role.find((r) => r.klucz === rola)?.nazwa}”, można zmienić)</span>
                    <div className="pn-pastylki" role="group" aria-label="działy">
                        {dzialy.map((d) => <button key={d.klucz} type="button" className="pn-pastylka" aria-pressed={wybraneDzialy.has(d.klucz)}
                            onClick={() => ustawDzialy((s) => { const n = new Set(s); if (n.has(d.klucz)) n.delete(d.klucz); else n.add(d.klucz); return n })}>{d.nazwa.replace(' – rysowanie i opis', '')}</button>)}
                    </div>
                    <span className="pn-etyk">zakres miejscowości</span>
                    <WyborZakresu zakres={zakres} kregi={dane.kregi} onZmiana={ustawZakres} />
                </>}
                <label className="pn-pole">link ważny
                    <select className="pn-in" value={dni} onChange={(e) => ustawDni(Number(e.target.value))}>{[1, 3, 7, 14, 30].map((n) => <option key={n} value={n}>{n === 1 ? '1 dzień' : `${n} dni`}</option>)}</select></label>
                {blad && <p className="pn-ostrz pn-bez-marginesu" role="alert"><span>{blad}</span></p>}
            </div>
        </Okno>
    )
}

export default function Konta() {
    const { dane, blad, odswiez } = useDane<Dane>('/api/keystatic/panel/konta')
    const [szukaj, ustawSzukaj] = React.useState('')
    const [rola, ustawRole] = React.useState('')
    const [stan, ustawStan] = React.useState('')
    const [zapros, ustawZapros] = React.useState(false)
    const [gotowe, ustawGotowe] = React.useState<Zaproszenie | null>(null)
    const [skopiowano, ustawSkopiowano] = React.useState(false)
    const nazwaRoli = (k: string) => dane?.role.find((r) => r.klucz === k)?.nazwa ?? k
    const q = szukaj.trim().toLocaleLowerCase('pl')
    const L = (dane?.konta ?? []).filter((k) => (!q || k.imie.toLocaleLowerCase('pl').includes(q) || (k.email ?? '').toLowerCase().includes(q)) && (!rola || k.role.includes(rola)) && (!stan || k.stan === stan))
    return (
        <>
            <header className="pn-kol pn-kol-wasko">
                <h1>konta{dane && <span className="pn-szary"> · {dane.konta.length}</span>}</h1>
                <span className="pn-maly">Kto może wejść do panelu i na treści „dla bliskich”. Nowa osoba dostaje link albo kod QR i sama łączy swój telefon lub komputer (odcisk palca, twarz, PIN urządzenia) – bez haseł.</span>
            </header>
            {blad && <p className="pn-ostrz pn-bez-marginesu" role="alert"><span>{blad}</span></p>}
            {dane && !dane.usluga.wlaczona && <p className="pn-info pn-bez-marginesu" role="status"><span>Konta nie są jeszcze włączone na serwerze – panel chroni dziś jedno hasło serwera. Włączenie: <code className="pn-kod">npm run konta:przygotuj</code> (instrukcja: scripts/pocket-id/README.md).</span></p>}
            {dane && dane.usluga.wlaczona && !dane.usluga.kluczApi && <p className="pn-ostrz pn-bez-marginesu" role="status"><span>Brak klucza API usługi logowania – zaproszenia i lista urządzeń nie zadziałają (KONTA_KLUCZ_API w .env.local).</span></p>}
            <div className="pn-rzad">
                <a className="pn-btn" href="/keystatic/panel/dostep/role">role i uprawnienia</a>
                <button type="button" className="pn-btn pn-btn-gl" disabled={!dane?.usluga.wlaczona} onClick={() => ustawZapros(true)}>+ zaproś</button>
            </div>
            <div className="pn-rzad">
                <input className="pn-in pn-in-szukaj pn-rosnie" type="search" placeholder="szukaj: imię, e-mail…" aria-label="szukaj konta" value={szukaj} onChange={(e) => ustawSzukaj(e.target.value)} />
                <select className="pn-in" aria-label="rola" value={rola} onChange={(e) => ustawRole(e.target.value)}><option value="">rola: wszystkie</option>{dane?.role.map((r) => <option key={r.klucz} value={r.klucz}>{r.nazwa}</option>)}</select>
                <select className="pn-in" aria-label="stan" value={stan} onChange={(e) => ustawStan(e.target.value)}><option value="">stan: wszystkie</option>{Object.entries(STAN).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
            </div>
            <section className="pn-karta" aria-label="lista kont">
                {!dane && !blad && <span className="pn-szary">wczytuję…</span>}
                {dane && dane.konta.length === 0 && <span className="pn-szary">Nie ma jeszcze żadnego konta. Pierwszego administratora zakłada komenda na serwerze: <code className="pn-kod">npm run konta:administrator -- nazwa-użytkownika</code>.</span>}
                {dane && dane.konta.length > 0 && L.length === 0 && <span className="pn-szary">Żadne konto nie pasuje do filtrów.</span>}
                {L.length > 0 && (
                    <div className="pn-tabela-ramka">
                        <table className="pn-tabela">
                            <thead><tr><th scope="col">osoba</th><th scope="col">rola</th><th scope="col">zakres</th><th scope="col">ostatnio</th><th scope="col">stan</th></tr></thead>
                            <tbody>
                                {L.map((k) => (
                                    <tr key={k.id}>
                                        <td><a href={`/keystatic/panel/dostep/${encodeURIComponent(k.id)}`}>{k.imie}{k.ty ? ' (Ty)' : ''}</a><span className="pn-drugi-wiersz">{k.email ?? '—'}</span></td>
                                        <td>{k.role.map(nazwaRoli).join(' + ')}{k.odstepstwa > 0 && <span className="pn-tag pn-odst" title="zmiany tylko dla tej osoby">{k.odstepstwa > 0 ? `±${k.odstepstwa}` : ''}</span>}</td>
                                        <td>{k.zakres}</td>
                                        <td>{kiedy(k.ostatnio)}</td>
                                        <td><span className={`pn-stan pn-stan-${k.stan}`}>{STAN[k.stan]}{k.stan === 'zaproszony' && k.zaproszenieDo ? ` · link do ${dzien(k.zaproszenieDo)}` : ''}{k.stan === 'zablokowany' && k.zablokowano ? ` ${dzien(k.zablokowano)}` : ''}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
            <section className="pn-karta" aria-labelledby="bliscy">
                <h2 id="bliscy" className="pn-etyk">hasło „dla bliskich”</h2>
                <span>Wspólne hasło działa dalej obok kont (decyzja 19.11) – bliscy mogą wybrać: hasło albo własne konto z rolą „bliski”. <b>{dane ? (dane.bliscy.wlaczone ? 'włączone' : 'wyłączone') : '…'}</b> · sesja 180 dni</span>
                <details>
                    <summary>zmień hasło</summary>
                    <div className="pn-form-kol">
                        <span className="pn-maly">Na serwerze, w katalogu strony. Zmiana hasła wylogowuje wszystkich bliskich; hasło ma co najmniej 8 znaków; wyłączenie: npm run haslo -- --wylacz.</span>
                        <span className="pn-rzad"><code className="pn-kod">{POLECENIE_HASLA}</code><button type="button" className="pn-btn pn-btn-maly" onClick={() => { navigator.clipboard?.writeText(POLECENIE_HASLA).then(() => { ustawSkopiowano(true); window.setTimeout(() => ustawSkopiowano(false), 1500) }) }}>{skopiowano ? 'skopiowano' : 'kopiuj'}</button></span>
                    </div>
                </details>
            </section>
            {dane && <Zapros dane={dane} otwarte={zapros} onZamknij={() => ustawZapros(false)} onGotowe={(z) => { ustawZapros(false); ustawGotowe(z); odswiez() }} />}
            <OknoLinku z={gotowe} tytul="zaproszenie gotowe" onZamknij={() => ustawGotowe(null)} onKolejna={() => { ustawGotowe(null); ustawZapros(true) }} />
        </>
    )
}
