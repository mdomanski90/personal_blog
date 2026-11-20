'use client'

// Lista pochowanych na cmentarzu (z planu w wersji dla czytelnika): nazwisko i imię, lata, grób, razem w grobie,
// zdjęcie, karta w drzewie, „na planie”. Groby objęte progiem lat albo z osobami żyjącymi nie mają tu nazwisk.

import * as React from 'react'
import { type Element, type Plan } from '@/lib/plany/model'
import { numerKrotki, numeryPlanu } from '@/lib/plany/numeracja'
import { katalog, typGrobu, type UstawieniaPlanow } from '@/lib/plany/typy'
import type { OsobaNaPlanie } from '@/lib/plany/rodzina'
import PoleSzukania from '../PoleSzukania'
import { odmiana } from '@/lib/tekst'
import { liniaNazwyNapisu, napisObok } from '@/lib/plany/pochowani'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')

interface Wiersz { klucz: string; el: Element; nazwisko: string; imie: string; lata: string; zm: number | null; razem: string[]; idOsoby?: string; zNapisu: boolean; napisObok?: string | null }

/** „Jan Przykładowy”, „Maria Przykładowa z d. Testowa” → nazwisko i reszta */
function rozbij(nazwa: string): { nazwisko: string; imie: string } {
    const czysta = nazwa.replace(/\s+z\s+d(omu|\.)\s+.*$/i, '').trim()
    const t = czysta.split(/\s+/)
    if (t.length < 2) return { nazwisko: czysta, imie: nazwa.slice(czysta.length).trim() }
    const nazwisko = t[t.length - 1]
    return { nazwisko, imie: (t.slice(0, -1).join(' ') + nazwa.slice(czysta.length)).trim() }
}
const rok = (s?: string) => { const m = (s ?? '').match(/(1[5-9]|20)\d\d/); return m ? +m[0] : null }

export default function ListaPochowanych({ plan, ustawienia, osoby, naPlanie }: { plan: Plan; ustawienia: UstawieniaPlanow; osoby: Record<string, OsobaNaPlanie>; naPlanie: (id: string) => void }) {
    const typy = React.useMemo(() => katalog(ustawienia), [ustawienia])
    const numery = React.useMemo(() => numeryPlanu(plan), [plan])
    const [q, ustawQ] = React.useState('')
    const [od, ustawOd] = React.useState('')
    const [doRoku, ustawDo] = React.useState('')
    const [kwatera, ustawKwatera] = React.useState('')
    const [zeZdjeciem, ustawZeZdjeciem] = React.useState(false)
    const [zDrzewa, ustawZDrzewa] = React.useState(false)
    const [litera, ustawLitere] = React.useState('')

    const { wiersze, bezNapisu, ograniczone, kwatery } = React.useMemo(() => {
        const groby = plan.elementy.filter((e) => typGrobu(typy.get(e.typ)))
        const W: Wiersz[] = []
        let bez = 0, ogr = 0
        for (const e of groby) {
            // grób mieszany (20.11): ograniczony, ale z osobami spoza progu – te osoby są na liście
            if (e.ograniczony && !e.osoby?.length) { ogr++; continue }
            const L = (e.osoby ?? []).filter((o) => o.nazwa.trim())
            if (L.length) {
                L.forEach((o, i) => {
                    const r = rozbij(o.nazwa)
                    W.push({ klucz: `${e.id}-${i}`, el: e, ...r, lata: o.ur || o.zm ? `${o.ur ?? '?'} – ${o.zm ?? '?'}` : '', zm: rok(o.zm), razem: L.filter((x) => x !== o).map((x) => x.nazwa), idOsoby: o.id && osoby[o.id] ? o.id : undefined, zNapisu: false, napisObok: napisObok(e.napis, r.nazwisko) })
                })
            } else if (e.nazwa?.trim()) {
                W.push({ klucz: e.id, el: e, ...rozbij(e.nazwa.trim()), lata: '', zm: e.rokZgonu ?? null, razem: [], zNapisu: false })
            } else if (e.napis?.trim()) {
                const linia = liniaNazwyNapisu(e.napis) ?? e.napis.trim().split('\n')[0]
                W.push({ klucz: e.id, el: e, nazwisko: linia, imie: '', lata: '', zm: e.rokZgonu ?? null, razem: [], zNapisu: true })
            } else bez++
        }
        W.sort((a, b) => a.nazwisko.localeCompare(b.nazwisko, 'pl') || a.imie.localeCompare(b.imie, 'pl'))
        const kw = [...new Set(groby.map((e) => numery.get(e.id)?.kwatera).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, 'pl', { numeric: true }))
        return { wiersze: W, bezNapisu: bez, ograniczone: ogr, kwatery: kw }
    }, [plan, typy, numery, osoby])

    const litery = React.useMemo(() => [...new Set(wiersze.filter((w) => !w.zNapisu).map((w) => w.nazwisko[0]?.toLocaleUpperCase('pl')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pl')), [wiersze])
    const lista = React.useMemo(() => {
        const sl = norm(q.trim()).split(/\s+/).filter(Boolean)
        const a = od ? +od : null, b = doRoku ? +doRoku : null
        return wiersze.filter((w) => {
            if (litera && w.nazwisko[0]?.toLocaleUpperCase('pl') !== litera) return false
            if (kwatera && numery.get(w.el.id)?.kwatera !== kwatera) return false
            if (zeZdjeciem && !w.el.zdjecia?.length) return false
            if (zDrzewa && !w.idOsoby) return false
            if ((a || b) && (w.zm === null || (a && w.zm < a) || (b && w.zm > b))) return false
            if (sl.length) { const t = norm(`${w.nazwisko} ${w.imie} ${w.lata} ${w.razem.join(' ')} ${w.el.napis ?? ''}`); if (!sl.every((s) => t.includes(s))) return false }
            return true
        })
    }, [wiersze, q, od, doRoku, kwatera, zeZdjeciem, zDrzewa, litera, numery])
    const osob = wiersze.filter((w) => !w.zNapisu).length

    // etap 3 (JW): wygląd z klas i tokenów (.plan-lista…, .lista-pochowanych); wiersze jako bloki na telefonie – etap 5
    return (
        <div className="plan-lista">
            <p className="plan-lista-opis">
                {odmiana(osob, ['osoba', 'osoby', 'osób'])} z odczytanym napisem{bezNapisu ? ` · ${odmiana(bezNapisu, ['grób', 'groby', 'grobów'])} bez odczytanego napisu` : ''}{ograniczone ? ` · ${odmiana(ograniczone, ['grób', 'groby', 'grobów'])} z napisem dla bliskich` : ''}
            </p>
            <div className="plan-lista-filtry">
                <PoleSzukania value={q} onChange={ustawQ} onSubmit={() => {}} placeholder="nazwisko, imię, rok" className="plan-lista-szukaj" obszar="szukaj w liście pochowanych" />
                <label className="plan-lista-pole">zmarli w latach
                    <input inputMode="numeric" value={od} onChange={(e) => ustawOd(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="od" aria-label="zmarli od roku" className="plan-pole plan-pole-rok" />–
                    <input inputMode="numeric" value={doRoku} onChange={(e) => ustawDo(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="do" aria-label="zmarli do roku" className="plan-pole plan-pole-rok" />
                </label>
                {kwatery.length > 1 && (
                    <label className="plan-lista-pole">kwatera
                        <select value={kwatera} onChange={(e) => ustawKwatera(e.target.value)} className="plan-pole"><option value="">wszystkie</option>{kwatery.map((k) => <option key={k} value={k}>{k}</option>)}</select>
                    </label>
                )}
                <label className="plan-lista-pole"><input type="checkbox" checked={zeZdjeciem} onChange={(e) => ustawZeZdjeciem(e.target.checked)} /> ze zdjęciem</label>
                {Object.keys(osoby).length > 0 && <label className="plan-lista-pole"><input type="checkbox" checked={zDrzewa} onChange={(e) => ustawZDrzewa(e.target.checked)} /> z drzewa</label>}
            </div>
            {litery.length > 3 && (
                <nav aria-label="pierwsza litera nazwiska" className="plan-lista-litery">
                    {litery.map((l) => <button key={l} type="button" onClick={() => ustawLitere(litera === l ? '' : l)} aria-pressed={litera === l} className="lista-litera">{l}</button>)}
                </nav>
            )}
            <div className="lista-pochowanych">
                <table>
                    <thead><tr><th>nazwisko i imię</th><th>lata</th><th>grób</th><th>razem w grobie</th><th>zdjęcie</th><th>drzewo</th><th><span className="sr-only">plan</span></th></tr></thead>
                    <tbody>
                        {lista.map((w) => (
                            <tr key={w.klucz}>
                                <td data-e="nazwisko i imię">{w.zNapisu ? <><span>{w.nazwisko}</span> <span className="lista-cichy lista-drobne">z napisu</span></> : <><b>{w.nazwisko}</b> {w.imie}{w.napisObok && <span className="lista-cichy lista-drobne"> · na napisie: {w.napisObok}</span>}</>}{w.idOsoby && <a href={`/osoby/${w.idOsoby}`} className="odn lp-karta-waski">karta →</a>}</td>
                                <td data-e="lata" className="lista-nowrap">{w.lata}</td>
                                <td data-e="grób" className="lista-nowrap">{numerKrotki(numery.get(w.el.id)) || '—'}</td>
                                <td data-e="razem w grobie" className={`lista-cichy${w.razem.length ? '' : ' lp-razem-pusto'}`}>{w.razem.join(', ') || '—'}</td>
                                <td data-e="zdjęcie">{w.el.zdjecia?.length ? '✓' : ''}</td>
                                <td data-e="drzewo">{w.idOsoby ? <a href={`/osoby/${w.idOsoby}`} className="odn">karta →</a> : ''}</td>
                                <td className="lp-plan"><button type="button" onClick={() => naPlanie(w.el.id)} className="plan-panel-odn lista-nowrap">na planie →</button></td>
                            </tr>
                        ))}
                        {lista.length === 0 && <tr><td colSpan={7} className="lista-cichy">{wiersze.length ? (bezNapisu ? 'Nic nie znaleziono. To nie znaczy, że tej osoby tu nie pochowano – nie wszystkie napisy są już odczytane.' : 'Nic nie znaleziono.') : 'Napisy z nagrobków nie zostały jeszcze odczytane.'}</td></tr>}
                    </tbody>
                </table>
            </div>
            <p className="plan-lista-uwaga">Groby osób zmarłych w ciągu ostatnich {ustawienia.progLat} lat i groby z osobami żyjącymi na nagrobku nie mają tu nazwisk – ich napisy widzą tylko bliscy po zalogowaniu.</p>
        </div>
    )
}
