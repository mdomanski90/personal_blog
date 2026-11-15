import { Link } from 'next-view-transitions'

export type Dzial = { klucz: string; nazwa: string; href: string; liczba: number }
const RZYMSKIE = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

/**
 * P7A-4 (JV-08): spis działów archiwum jak w katalogu kartkowym – numer, nazwa, kropki, liczba.
 * Puste działy są pomijane już przy budowaniu listy. Bez wybranego działu – pełny spis;
 * po wyborze – jeden wiersz „dział: …” i rozwijane „inne działy” (działa też bez JavaScriptu).
 */
export default function SpisDzialow({ dzialy, wybrany }: { dzialy: Dzial[]; wybrany: string }) {
    const lista = (
        <ul className="spis-dzialow">
            {dzialy.map((d, i) => (
                <li key={d.klucz}>
                    <Link href={d.href} aria-current={d.klucz === wybrany ? 'page' : undefined}>
                        <i aria-hidden="true">{RZYMSKIE[i] ?? i + 1}.</i>
                        <span className="sd-nazwa">{d.nazwa}</span>
                        <span className="sd-kropki" aria-hidden="true" />
                        <span className="sd-liczba">{d.liczba}</span>
                    </Link>
                </li>
            ))}
        </ul>
    )
    const akt = dzialy.find((d) => d.klucz === wybrany)
    if (!akt || wybrany === 'wszystkie') {
        return <nav aria-label="działy archiwum" className="spis-ramka">{lista}</nav>
    }
    const nr = RZYMSKIE[dzialy.indexOf(akt)] ?? ''
    return (
        <nav aria-label="działy archiwum" className="spis-zwiniety">
            <details>
                <summary>
                    <span className="sd-etykieta">dział</span>
                    <span className="sd-pastylka">{nr}. {akt.nazwa} · {akt.liczba}</span>
                    <span className="k-btn sd-inne">inne działy <span aria-hidden="true">▾</span></span>
                </summary>
                {lista}
            </details>
        </nav>
    )
}
