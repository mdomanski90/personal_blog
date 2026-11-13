'use client'

// Lista pochowanych na cmentarzu (z planu w wersji dla czytelnika): nazwisko i imię, lata, grób, razem w grobie,
// zdjęcie, karta w drzewie, „na planie”. Groby objęte progiem lat albo z osobami żyjącymi nie mają tu nazwisk.

import * as React from 'react'
import { numeracja, type Element, type Plan } from '@/lib/plany/model'
import { katalog, typGrobu, type UstawieniaPlanow } from '@/lib/plany/typy'
import type { OsobaNaPlanie } from '@/lib/plany/rodzina'
import PoleSzukania from '../PoleSzukania'
import { numerKrotki } from './PlanInteraktywny'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
const pole = 'border border-[#d6d1c6] dark:border-[#4b5563] bg-transparent text-current rounded-[7px]'

interface Wiersz { klucz: string; el: Element; nazwisko: string; imie: string; lata: string; zm: number | null; razem: string[]; idOsoby?: string; zNapisu: boolean }

/** „Jan Przykładowy”, „Maria Przykładowa z d. Testowa” → nazwisko i reszta */
function rozbij(nazwa: string): { nazwisko: string; imie: string } {
    const czysta = nazwa.replace(/\s+z\s+d(omu|\.)\s+.*$/i, '').trim()
    const t = czysta.split(/\s+/)
    if (t.length < 2) return { nazwisko: czysta, imie: nazwa.slice(czysta.length).trim() }
    const nazwisko = t[t.length - 1]
    return { nazwisko, imie: (t.slice(0, -1).join(' ') + nazwa.slice(czysta.length)).trim() }
}
const odm = (n: number, f: [string, string, string]) => `${n} ${n === 1 ? f[0] : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? f[1] : f[2]}`
const rok = (s?: string) => { const m = (s ?? '').match(/(1[5-9]|20)\d\d/); return m ? +m[0] : null }

export default function ListaPochowanych({ plan, ustawienia, osoby, naPlanie }: { plan: Plan; ustawienia: UstawieniaPlanow; osoby: Record<string, OsobaNaPlanie>; naPlanie: (id: string) => void }) {
    const typy = React.useMemo(() => katalog(ustawienia), [ustawienia])
    const numery = React.useMemo(() => numeracja(plan, typy), [plan, typy])
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
            if (e.ograniczony) { ogr++; continue }
            const L = (e.osoby ?? []).filter((o) => o.nazwa.trim())
            if (L.length) {
                L.forEach((o, i) => {
                    const r = rozbij(o.nazwa)
                    W.push({ klucz: `${e.id}-${i}`, el: e, ...r, lata: o.ur || o.zm ? `${o.ur ?? '?'} – ${o.zm ?? '?'}` : '', zm: rok(o.zm), razem: L.filter((x) => x !== o).map((x) => x.nazwa), idOsoby: o.id && osoby[o.id] ? o.id : undefined, zNapisu: false })
                })
            } else if (e.nazwa?.trim()) {
                W.push({ klucz: e.id, el: e, ...rozbij(e.nazwa.trim()), lata: '', zm: e.rokZgonu ?? null, razem: [], zNapisu: false })
            } else if (e.napis?.trim()) {
                const linia = e.napis.split('\n').map((l) => l.trim()).find((l) => /\p{L}{3,}/u.test(l) && !/^(ś\.?\s*†?\s*p\.?|tu spoczywa|tu spoczywaj[ąa])/i.test(l)) ?? e.napis.trim().split('\n')[0]
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

    return (
        <div className="flex flex-col" style={{ gap: 12 }}>
            <p className="text-gray-600 dark:text-gray-400" style={{ margin: 0, fontSize: 13 }}>
                {odm(osob, ['osoba', 'osoby', 'osób'])} z odczytanym napisem{bezNapisu ? ` · ${odm(bezNapisu, ['grób', 'groby', 'grobów'])} bez odczytanego napisu` : ''}{ograniczone ? ` · ${odm(ograniczone, ['grób', 'groby', 'grobów'])} z napisem dla bliskich` : ''}
            </p>
            <div className="flex flex-wrap items-end" style={{ gap: 12 }}>
                <PoleSzukania value={q} onChange={ustawQ} onSubmit={() => {}} placeholder="nazwisko, imię, rok" style={{ flex: '1 1 240px', maxWidth: 380 }} />
                <label className="flex items-center" style={{ gap: 6, fontSize: 13 }}>zmarli w latach
                    <input inputMode="numeric" value={od} onChange={(e) => ustawOd(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="od" className={pole} style={{ width: 64, height: 28, padding: '0 8px', fontSize: 13 }} />–
                    <input inputMode="numeric" value={doRoku} onChange={(e) => ustawDo(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="do" className={pole} style={{ width: 64, height: 28, padding: '0 8px', fontSize: 13 }} />
                </label>
                {kwatery.length > 1 && (
                    <label className="flex items-center" style={{ gap: 6, fontSize: 13 }}>kwatera
                        <select value={kwatera} onChange={(e) => ustawKwatera(e.target.value)} className={pole} style={{ height: 28, padding: '0 6px', fontSize: 13 }}><option value="">wszystkie</option>{kwatery.map((k) => <option key={k} value={k}>{k}</option>)}</select>
                    </label>
                )}
                <label className="flex items-center" style={{ gap: 6, fontSize: 13 }}><input type="checkbox" checked={zeZdjeciem} onChange={(e) => ustawZeZdjeciem(e.target.checked)} /> ze zdjęciem</label>
                {Object.keys(osoby).length > 0 && <label className="flex items-center" style={{ gap: 6, fontSize: 13 }}><input type="checkbox" checked={zDrzewa} onChange={(e) => ustawZDrzewa(e.target.checked)} /> z drzewa</label>}
            </div>
            {litery.length > 3 && (
                <nav aria-label="pierwsza litera nazwiska" className="flex flex-wrap" style={{ gap: 2 }}>
                    {litery.map((l) => <button key={l} type="button" onClick={() => ustawLitere(litera === l ? '' : l)} aria-pressed={litera === l} className="lista-litera">{l}</button>)}
                </nav>
            )}
            <div style={{ overflowX: 'auto', border: '1px solid #e7e2d8', borderRadius: 8 }} className="lista-pochowanych">
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                    <thead><tr><th>nazwisko i imię</th><th>lata</th><th>grób</th><th>razem w grobie</th><th>zdjęcie</th><th>drzewo</th><th><span className="sr-only">plan</span></th></tr></thead>
                    <tbody>
                        {lista.map((w) => (
                            <tr key={w.klucz}>
                                <td>{w.zNapisu ? <><span>{w.nazwisko}</span> <span className="text-gray-500" style={{ fontSize: 11.5 }}>z napisu</span></> : <><b>{w.nazwisko}</b> {w.imie}</>}</td>
                                <td style={{ whiteSpace: 'nowrap' }}>{w.lata}</td>
                                <td style={{ whiteSpace: 'nowrap' }}>{numerKrotki(numery.get(w.el.id)) || '—'}</td>
                                <td className="text-gray-600 dark:text-gray-400">{w.razem.join(', ') || '—'}</td>
                                <td>{w.el.zdjecia?.length ? '✓' : ''}</td>
                                <td>{w.idOsoby ? <a href={`/osoby/${w.idOsoby}`}>karta →</a> : ''}</td>
                                <td><button type="button" onClick={() => naPlanie(w.el.id)} className="plan-link" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>na planie →</button></td>
                            </tr>
                        ))}
                        {lista.length === 0 && <tr><td colSpan={7} className="text-gray-500">{wiersze.length ? (bezNapisu ? 'Nic nie znaleziono. To nie znaczy, że tej osoby tu nie pochowano – nie wszystkie napisy są już odczytane.' : 'Nic nie znaleziono.') : 'Napisy z nagrobków nie zostały jeszcze odczytane.'}</td></tr>}
                    </tbody>
                </table>
            </div>
            <p className="text-gray-500" style={{ margin: 0, fontSize: 12 }}>Groby osób zmarłych w ciągu ostatnich {ustawienia.progLat} lat i groby z osobami żyjącymi na nagrobku nie mają tu nazwisk – ich napisy widzą tylko bliscy po zalogowaniu.</p>
        </div>
    )
}
