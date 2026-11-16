import * as React from 'react'
import { Link } from 'next-view-transitions'

/**
 * Siatka miniatur (wzorzec „siatka”, rejestr szablonów): obraz 4:3, tytuł, linia z rodzajem i datą.
 * Wspólna dla materiałów archiwum (ListaMaterialow) i planów (PH-23, „wszystkie plany”). Bez stylów inline – klasy .siatka-miniatur.
 */
export interface PozycjaSiatki { klucz: string; href: string; tytul: string; linia?: string; obraz?: React.ReactNode; znak?: string }

export default function SiatkaMiniatur({ pozycje, pusto = 'brak pozycji.' }: { pozycje: PozycjaSiatki[]; pusto?: string }) {
    if (!pozycje.length) return <p className="brak-danych">{pusto}</p>
    return (
        <ul className="siatka-miniatur">
            {pozycje.map((p) => (
                <li key={p.klucz} className="sm-pozycja">
                    <Link href={p.href} className="sm-odnosnik">
                        <div className="sm-obraz">{p.obraz ?? <span className="sm-znak" aria-hidden="true">{p.znak ?? '—'}</span>}</div>
                        <div className="sm-opis">
                            <span className="sm-tytul">{p.tytul}</span>
                            {p.linia && <span className="sm-linia">{p.linia}</span>}
                        </div>
                    </Link>
                </li>
            ))}
        </ul>
    )
}
