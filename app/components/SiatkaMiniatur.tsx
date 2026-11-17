import * as React from 'react'
import { Link } from 'next-view-transitions'

/**
 * Siatka miniatur (wzorzec „siatka”, rejestr szablonów): obraz 4:3, tytuł, linia z rodzajem i datą.
 * Wspólna dla materiałów archiwum (ListaMaterialow) i planów (PH-23, „wszystkie plany”). Bez stylów inline – klasy .siatka-miniatur.
 */
export interface PozycjaSiatki {
    klucz: string; href: string; tytul: string; linia?: string; obraz?: React.ReactNode; znak?: string
    /** WSP-01 (etap R): dół kafla poza odnośnikiem – np. etykieta braku i „uzupełnij” na stronie „współtwórz” */
    dol?: React.ReactNode
    /** SLW-01 (P2), wariant „fiszka”: wyjaśnienie w prawej połowie i źródło nad „czytaj dalej →” */
    opis?: string; zrodlo?: string
}
/** Fiszka-zaproszenie (słownik): duże „+”, podpis, zachęta i akcja; cała fiszka jest jednym odnośnikiem. */
export interface Zaproszenie { href: string; podpis: string; tekst: string; male: string; akcja: string }

export default function SiatkaMiniatur({ pozycje, pusto = 'brak pozycji.', wariant = 'miniatura', zaproszenie }: { pozycje: PozycjaSiatki[]; pusto?: string; wariant?: 'miniatura' | 'fiszka'; zaproszenie?: Zaproszenie }) {
    if (wariant === 'fiszka') return (
        <ul className="siatka-miniatur siatka-fiszek">
            {zaproszenie && (
                <li className="sm-pozycja sm-fiszka sm-zaproszenie">
                    <Link href={zaproszenie.href} className="sm-odnosnik sm-fiszka-odn">
                        <div className="sm-fiszka-haslo"><span className="sm-plus" aria-hidden="true">+</span><span className="sm-linia">{zaproszenie.podpis}</span></div>
                        <div className="sm-fiszka-tresc"><p className="sm-fiszka-znaczenie">{zaproszenie.tekst}</p><span className="sm-linia sm-fiszka-zrodlo">{zaproszenie.male}</span><span className="zapowiedz-dalej">{zaproszenie.akcja}</span></div>
                    </Link>
                </li>
            )}
            {pozycje.map((p) => (
                <li key={p.klucz} className="sm-pozycja sm-fiszka">
                    <Link href={p.href} className="sm-odnosnik sm-fiszka-odn">
                        <div className="sm-fiszka-haslo"><span className="sm-tytul">{p.tytul}</span>{p.linia && <span className="sm-linia">{p.linia}</span>}</div>
                        <div className="sm-fiszka-tresc">
                            <p className="sm-fiszka-znaczenie">{p.opis}</p>
                            {p.zrodlo && <span className="sm-linia sm-fiszka-zrodlo">źródło: {p.zrodlo}</span>}
                            <span className="zapowiedz-dalej">czytaj dalej →</span>
                        </div>
                    </Link>
                </li>
            ))}
        </ul>
    )
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
                    {p.dol && <div className="sm-dol">{p.dol}</div>}
                </li>
            ))}
        </ul>
    )
}
