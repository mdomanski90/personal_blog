import * as React from 'react'
import { Link } from 'next-view-transitions'
import type { GrupaMiejsc } from '@/lib/archiwum'
import SpisMiejscowosci, { type PozycjaSpisuMiejsc } from './SpisMiejscowosci'
import { TytulSekcji } from './Wzorce'

/** Spis miejscowości podzielony na krainy i gminy (pod mapą na stronie „miejsca”) – wiersze z licznikami (JW-12), tytuły grup jako tytuły sekcji. */
export default function SpisMiejsc({ grupy, liczniki }: { grupy: GrupaMiejsc[]; liczniki: Map<string, { wpisy?: number; obiekty?: number; materialy?: number }> }) {
    const tylkoInne = grupy.length === 1 && !grupy[0].obszar
    const pozycje = (m: { id: string; nazwa: string }[]): PozycjaSpisuMiejsc[] => m.map((x) => ({ id: x.id, nazwa: x.nazwa, ...(liczniki.get(x.id) ?? {}) }))
    return (
        <div className="spis-miejsc-grupy">
            {grupy.map((g) => (
                <section key={g.obszar?.id ?? 'inne'} className="sekcja">
                    {!tylkoInne && (
                        <TytulSekcji>{g.obszar ? <Link href={`/miejsca/${g.obszar.id}`} className="tytul-sekcji-odn">{g.obszar.nazwa}</Link> : 'inne'}</TytulSekcji>
                    )}
                    <SpisMiejscowosci pozycje={pozycje(g.miejsca)} />
                    {g.podgrupy.map((pg) => (
                        <div key={pg.obszar.id} className="spis-miejsc-podgrupa">
                            <h3 className="spis-miejsc-podtytul"><Link href={`/miejsca/${pg.obszar.id}`} className="tytul-sekcji-odn">{pg.obszar.nazwa}</Link></h3>
                            <SpisMiejscowosci pozycje={pozycje(pg.miejsca)} />
                        </div>
                    ))}
                </section>
            ))}
        </div>
    )
}
