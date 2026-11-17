'use client'

// PH-13 (PH4): plan historyczny / schemat – zakładka „lista obiektów” zamiast „listy pochowanych”: numer legendy, nazwa,
// nazwa w źródle, rodzaj, identyfikacja, karty, „na planie”. Bez tekstów o grobach i progu lat. Tekstowa alternatywa mapy (CEM-24).

import * as React from 'react'
import type { Plan } from '@/lib/plany/model'
import { katalog, type UstawieniaPlanow } from '@/lib/plany/typy'
import { obiektyListy, szukajNaPlanie } from '@/lib/plany/przegladarka'
import { IDENTYFIKACJE } from '@/lib/plany/podstawa'
import { odmiana } from '@/lib/tekst'
import PoleSzukania from '../PoleSzukania'

export default function ListaObiektowPlanu({ plan, ustawienia, naPlanie }: { plan: Plan; ustawienia: UstawieniaPlanow; naPlanie: (id: string) => void }) {
    const typy = React.useMemo(() => katalog(ustawienia), [ustawienia])
    const [q, ustawQ] = React.useState('')
    const wszystkie = React.useMemo(() => obiektyListy(plan, typy), [plan, typy])
    const lista = React.useMemo(() => {
        if (q.trim().length < 2) return wszystkie
        const ids = new Set(szukajNaPlanie(plan, q).map((e) => e.id))
        return wszystkie.filter((e) => ids.has(e.id))
    }, [q, plan, wszystkie])
    return (
        <div className="plan-lista">
            <p className="plan-lista-opis">{wszystkie.length ? `${odmiana(wszystkie.length, ['obiekt', 'obiekty', 'obiektów'])} z nazwą albo numerem legendy` : 'Na tym planie nie ma jeszcze opisanych obiektów.'}</p>
            <div className="plan-lista-filtry">
                <PoleSzukania value={q} onChange={ustawQ} onSubmit={() => {}} placeholder="nazwa obiektu albo nazwa w źródle" className="plan-lista-szukaj" obszar="szukaj w liście obiektów" />
            </div>
            <div className="lista-pochowanych">
                <table>
                    <thead><tr><th>nr</th><th>nazwa</th><th>w źródle</th><th>rodzaj</th><th>identyfikacja</th><th>karty</th><th><span className="sr-only">plan</span></th></tr></thead>
                    <tbody>
                        {lista.map((e) => (
                            <tr key={e.id}>
                                <td className="lista-nowrap">{e.nrLegendy ?? '—'}</td>
                                <td><b>{e.nazwa?.split('\n').join(' ') || e.nazwaZrodlowa || typy.get(e.typ)?.nazwa}</b></td>
                                <td className="lista-cichy">{e.nazwaZrodlowa && e.nazwaZrodlowa !== e.nazwa ? `„${e.nazwaZrodlowa}”` : '—'}</td>
                                <td className="lista-cichy">{typy.get(e.typ)?.nazwa.replace(/ \(.*\)$/, '')}</td>
                                <td>{e.identyfikacja && e.identyfikacja !== 'pewna' ? IDENTYFIKACJE[e.identyfikacja] : ''}</td>
                                <td>{(e.odnosniki ?? []).map((k, i) => <React.Fragment key={k.adres}>{i > 0 && ', '}<a href={k.adres} className="odn">{k.nazwa}</a></React.Fragment>)}</td>
                                <td><button type="button" onClick={() => naPlanie(e.id)} className="plan-panel-odn lista-nowrap">na planie →</button></td>
                            </tr>
                        ))}
                        {lista.length === 0 && wszystkie.length > 0 && <tr><td colSpan={7} className="lista-cichy">Nic nie znaleziono.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
