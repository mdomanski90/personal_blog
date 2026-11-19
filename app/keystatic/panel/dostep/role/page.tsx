'use client'
// P7a (KON-01): role i uprawnienia – ustawienia domyślne ról; nazwy i opisy do zmiany (plansza „role i uprawnienia”).
import * as React from 'react'
import { useDane } from '../../wspolne'
import { nazwaUprawnienia, wyslij, type Rola, type Uprawnienie } from '../wspolne'

type Dane = { wersja: number; role: Rola[]; uprawnienia: Uprawnienie[] }

export default function Role() {
    const { dane, blad, odswiez } = useDane<Dane>('/api/keystatic/panel/konta')
    const [role, ustawRole] = React.useState<Rola[]>([])
    const [kom, ustawKom] = React.useState<{ tekst: string; blad?: boolean } | null>(null)
    React.useEffect(() => { if (dane) ustawRole(dane.role.map((r) => ({ ...r, uprawnienia: [...r.uprawnienia] }))) }, [dane])
    if (blad) return <p className="pn-ostrz pn-bez-marginesu" role="alert"><span>{blad}</span></p>
    if (!dane) return <span className="pn-szary">wczytuję…</span>
    const zmien = (klucz: string, f: (r: Rola) => Rola) => ustawRole((L) => L.map((r) => (r.klucz === klucz ? f(r) : r)))
    const zapisz = async () => {
        const { blad: b } = await wyslij({ akcja: 'role', wersja: dane.wersja, role: Object.fromEntries(role.map((r) => [r.klucz, { nazwa: r.nazwa, opis: r.opis, uprawnienia: r.uprawnienia }])) })
        ustawKom(b ? { tekst: b, blad: true } : { tekst: 'Zapisano. Zmiana dotyczy wszystkich osób z daną rolą – poza ich własnymi odstępstwami.' }); if (!b) odswiez()
    }
    return (
        <>
            <header className="pn-kol pn-kol-wasko">
                <a className="pn-maly-link" href="/keystatic/panel/dostep">konta ›</a>
                <h1>role i uprawnienia</h1>
                <span className="pn-maly">Ustawienia domyślne ról. Zmiana dotyczy wszystkich osób z tą rolą – poza ich własnymi odstępstwami (karta konta).</span>
            </header>
            {kom && <p className={`${kom.blad ? 'pn-ostrz' : 'pn-info'} pn-bez-marginesu`} role={kom.blad ? 'alert' : 'status'}><span>{kom.tekst}</span></p>}
            <section className="pn-karta" aria-label="uprawnienia ról">
                <div className="pn-tabela-ramka">
                    <table className="pn-tabela pn-tabela-szeroka">
                        <thead><tr><th scope="col">uprawnienie</th>{role.map((r) => <th key={r.klucz} scope="col" className="pn-srodek">{r.nazwa}</th>)}</tr></thead>
                        <tbody>
                            {dane.uprawnienia.map((u) => (
                                <tr key={u.klucz}>
                                    <th scope="row">{nazwaUprawnienia(u)}</th>
                                    {role.map((r) => {
                                        const staly = r.klucz === 'administrator' || u.klucz === 'administracja'
                                        return <td key={r.klucz} className="pn-srodek"><input type="checkbox" aria-label={`${u.nazwa} – ${r.nazwa}`} disabled={staly} checked={r.klucz === 'administrator' || (u.klucz !== 'administracja' && r.uprawnienia.includes(u.klucz))}
                                            onChange={() => zmien(r.klucz, (x) => ({ ...x, uprawnienia: x.uprawnienia.includes(u.klucz) ? x.uprawnienia.filter((y) => y !== u.klucz) : [...x.uprawnienia, u.klucz] }))} /></td>
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <span className="pn-maly">Administrator ma zawsze wszystko (nie da się mu odebrać – inaczej nikt nie odzyska dostępu); „konta, kopie, ustawienia” ma tylko on. „Tylko ja” w widoczności = osoby z rolą administratora.</span>
            </section>
            <section className="pn-karta" aria-labelledby="nazwy">
                <h2 id="nazwy" className="pn-etyk">nazwy i opisy ról</h2>
                <div className="pn-role-nazwy">
                    {role.map((r) => (
                        <React.Fragment key={r.klucz}>
                            <label className="pn-pole">nazwa<input className="pn-in" value={r.nazwa} maxLength={60} onChange={(e) => zmien(r.klucz, (x) => ({ ...x, nazwa: e.target.value }))} /></label>
                            <label className="pn-pole">opis roli „{r.nazwa}”<input className="pn-in" value={r.opis} maxLength={200} onChange={(e) => zmien(r.klucz, (x) => ({ ...x, opis: e.target.value }))} /></label>
                        </React.Fragment>
                    ))}
                </div>
                <div><button type="button" className="pn-btn pn-btn-gl" onClick={zapisz}>zapisz zmiany</button></div>
            </section>
        </>
    )
}
