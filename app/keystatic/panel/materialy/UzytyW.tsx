// Łatka 21.11: „użyty w” – teksty, w których materiał jest wstawiony albo ma odnośnik [[…]]; nazwa prowadzi do edycji tekstu.
import * as React from 'react'
import type { UzycieMaterialu } from '@/lib/panel/uzyty-w'
import { odmiana } from '../wspolne'

const RODZAJ: Record<string, string> = { wpis: 'wpis', miejsce: 'miejsce', temat: 'temat', obiekt: 'obiekt', material: 'materiał', osoba: 'biogram', haslo: 'hasło' }

function jak(u: UzycieMaterialu): string {
    return [u.wstawiony && 'wstawiony we wpis', u.odnosnikow > 0 && odmiana(u.odnosnikow, ['odnośnik', 'odnośniki', 'odnośników'])].filter(Boolean).join(' · ')
}

export function UzytyW({ uzycia }: { uzycia?: UzycieMaterialu[] }) {
    if (!uzycia) return null
    if (!uzycia.length) return <p className="pn-maly pn-bez-marginesu">Nie jest jeszcze użyty w żadnym tekście – wstaw go we wpis albo dodaj odnośnik [[…]].</p>
    return (
        <section className="pn-uzyty" aria-labelledby="uzyty-w-t">
            <span id="uzyty-w-t" className="pn-maly">użyty w {odmiana(uzycia.length, ['tekście', 'tekstach', 'tekstach'])}:</span>
            <ul className="pn-uzyty-lista">
                {uzycia.map((u) => (
                    <li key={u.adres}>
                        <span className="pn-tag">{RODZAJ[u.rodzaj] ?? u.rodzaj}</span>
                        {u.edycja ? <a href={u.edycja} title="edytuj ten tekst">{u.nazwa}</a> : <span>{u.nazwa}</span>}
                        <span className="pn-maly">{jak(u)}</span>
                        <a href={u.adres} target="_blank" rel="noreferrer" className="pn-maly" aria-label={`${u.nazwa} – na stronie`}>na stronie ↗</a>
                    </li>
                ))}
            </ul>
        </section>
    )
}
