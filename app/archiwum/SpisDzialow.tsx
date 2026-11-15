import * as React from 'react'
import { Link } from 'next-view-transitions'

export type Dzial = { klucz: string; nazwa: string; href: string; liczba: number }
const RZYMSKIE = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

/**
 * P7A-4 (JV-08): spis działów archiwum jak w katalogu kartkowym – numer, nazwa, kropki, liczba.
 * Kolejność jak w spisie treści: najpierw w dół lewą kolumną, potem prawą.
 * Zawsze pełny spis, także działy jeszcze puste (liczba 0, stonowane) – decyzja właściciela 15.11.2026.
 */
export default function SpisDzialow({ dzialy, wybrany }: { dzialy: Dzial[]; wybrany: string }) {
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
    return <nav aria-label="działy archiwum" className="spis-ramka">{lista}</nav>
}
