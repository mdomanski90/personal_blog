import * as React from 'react'
import { Link } from 'next-view-transitions'
import { tarczaObiektu } from '@/lib/tarcze'

export type PozycjaObiektu = { id: string; nazwa: string; rodzaj: string; nazwaRodzaju: string; istnieje?: boolean; dopisek?: React.ReactNode }

/**
 * P7F-2 (OBJ-01, OBJ-04): jedna lista obiektów dla kart miejscowości, instytucji i innych – tarcza rodzaju + nazwa.
 * Rodzaj nie jest powtarzany tekstem (niesie go tarcza z opisem dla czytników ekranu), „nie istnieje” – słowem, nie kolorem.
 * Dopisek: krótka informacja zależna od kontekstu (np. okres przynależności do parafii).
 */
export default function ListaObiektow({ pozycje }: { pozycje: PozycjaObiektu[] }) {
    return (
        <ul className="lista-obiektow">
            {pozycje.map((o) => (
                <li key={o.id}>
                    <span className="lo-tarcza" aria-hidden="true" dangerouslySetInnerHTML={{ __html: tarczaObiektu(o.rodzaj, o.nazwaRodzaju, 24, o.istnieje !== false) }} />
                    <span className="lo-tresc">
                        <Link href={`/obiekty/${o.id}`} className="odn"><span className="sr-only">{o.nazwaRodzaju}: </span>{o.nazwa}</Link>
                        {(o.istnieje === false || o.dopisek) && <span className="lo-dopisek">{[o.istnieje === false ? 'nie istnieje' : null].filter(Boolean)}{o.istnieje === false && o.dopisek ? ' · ' : ''}{o.dopisek}</span>}
                    </span>
                </li>
            ))}
        </ul>
    )
}
