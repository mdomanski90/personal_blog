import * as React from 'react'
import { Link } from 'next-view-transitions'
import type { GrupaMiejsc } from '@/lib/archiwum'
import SpisDzialow, { type Dzial } from '../archiwum/SpisDzialow'
import { TytulSekcji } from './Wzorce'

export type LicznikiMiejsc = Map<string, { wpisy?: number; obiekty?: number; materialy?: number }>

/** Pozycje spisu działów dla miejscowości: liczba = wpisy + obiekty w terenie + materiały (tylko widoczne dla czytelnika). */
export function pozycjeMiejsc(m: { id: string; nazwa: string }[], liczniki: LicznikiMiejsc): Dzial[] {
    return m.map((x) => {
        const l = liczniki.get(x.id) ?? {}
        return { klucz: x.id, nazwa: x.nazwa, href: `/miejsca/${x.id}`, liczba: (l.wpisy ?? 0) + (l.obiekty ?? 0) + (l.materialy ?? 0) }
    })
}

/**
 * Spis miejscowości podzielony na krainy i gminy (pod mapą na stronie „miejsca”) – ten sam wzorzec co spis działów
 * archiwum (SpisDzialow, bez numeracji – decyzja 16.11); tytuły grup jako tytuły sekcji.
 */
export default function SpisMiejsc({ grupy, liczniki }: { grupy: GrupaMiejsc[]; liczniki: LicznikiMiejsc }) {
    const tylkoInne = grupy.length === 1 && !grupy[0].obszar
    return (
        <div className="spis-miejsc-grupy">
            {grupy.map((g) => (
                <section key={g.obszar?.id ?? 'inne'} className="sekcja">
                    {!tylkoInne && (
                        <TytulSekcji>{g.obszar ? <Link href={`/miejsca/${g.obszar.id}`} className="tytul-sekcji-odn">{g.obszar.nazwa}</Link> : 'inne'}</TytulSekcji>
                    )}
                    {g.miejsca.length > 0 && <SpisDzialow dzialy={pozycjeMiejsc(g.miejsca, liczniki)} wybrany="" numeracja={false} etykieta={`miejscowości: ${g.obszar?.nazwa ?? 'inne'}`} />}
                    {g.podgrupy.map((pg) => (
                        <div key={pg.obszar.id} className="spis-miejsc-podgrupa">
                            <TytulSekcji poziom={3}><Link href={`/miejsca/${pg.obszar.id}`} className="tytul-sekcji-odn">{pg.obszar.nazwa}</Link></TytulSekcji>
                            <SpisDzialow dzialy={pozycjeMiejsc(pg.miejsca, liczniki)} wybrany="" numeracja={false} etykieta={`miejscowości: ${pg.obszar.nazwa}`} />
                        </div>
                    ))}
                </section>
            ))}
        </div>
    )
}
