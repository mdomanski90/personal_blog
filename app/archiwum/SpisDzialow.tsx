'use client'

import * as React from 'react'
import { Link } from 'next-view-transitions'

export type Dzial = { klucz: string; nazwa: string; href: string; liczba: number }
const RZYMSKIE = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

/**
 * P7A-4 (JV-08): spis działów archiwum jak w katalogu kartkowym – numer, nazwa, kropki, liczba.
 * Kolejność jak w spisie treści: najpierw w dół lewą kolumną, potem prawą.
 * Zawsze pełny spis, także działy jeszcze puste (liczba 0, stonowane) – decyzja właściciela 15.11.2026.
 * P7C-1: gdy panel filtrów jest rozwinięty, spis zwija się do jednego wiersza (wybrany dział)
 * z przyciskiem „wszystkie działy” – samo zwijanie robi CSS (:has), przycisk tylko je odwraca.
 */
export default function SpisDzialow({ dzialy, wybrany }: { dzialy: Dzial[]; wybrany: string }) {
    const [pokaz, ustawPokaz] = React.useState(false)
    // po każdym otwarciu/zamknięciu panelu filtrów i po zmianie działu spis znów zwinięty
    React.useEffect(() => { ustawPokaz(false) }, [wybrany])
    React.useEffect(() => {
        const h = (e: Event) => { if ((e.target as Element)?.classList?.contains('k-filtry-ramka')) ustawPokaz(false) }
        document.addEventListener('toggle', h, true)
        return () => document.removeEventListener('toggle', h, true)
    }, [])
    const lista = (
        <ul className="spis-dzialow" style={{ ['--wiersze' as string]: Math.ceil(dzialy.length / 2) } as React.CSSProperties}>
            {dzialy.map((d, i) => (
                <li key={d.klucz}>
                    <Link href={d.href} aria-current={d.klucz === wybrany ? 'page' : undefined} className={d.liczba === 0 ? 'sd-pusty' : undefined}>
                        <i aria-hidden="true">{RZYMSKIE[i] ?? i + 1}.</i>
                        <span className="sd-nazwa">{d.nazwa}</span>
                        <span className="sd-kropki" aria-hidden="true" />
                        <span className="sd-liczba">{d.liczba}</span>
                    </Link>
                </li>
            ))}
        </ul>
    )
    return (
        <nav aria-label="działy archiwum" className={`spis-ramka${pokaz ? ' sd-pokaz' : ''}`}>
            {lista}
            <button type="button" className="k-btn k-btn--s lowercase sd-wiecej" aria-expanded={pokaz} onClick={() => ustawPokaz((v) => !v)}>
                {pokaz ? 'zwiń działy' : 'wszystkie działy'} <span aria-hidden="true">{pokaz ? '▴' : '▾'}</span>
            </button>
        </nav>
    )
}
