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
 * Spis miejscowości pod mapą na stronie „miejsca” – wzorzec spisu działów (SpisDzialow, bez numeracji – decyzja 16.11).
 * Odbiór 16.11, wariant A2: jedna ramka na krainę; najpierw miejscowości należące wprost do krainy, potem gminy
 * jako podgrupy w tej samej ramce (nagłówek + wcięta lista), żeby było widać, że gmina należy do krainy.
 * Miejscowości bez krainy – ostatnia sekcja „inne miejscowości” z takim samym tytułem i tą samą regułą.
 */
export default function SpisMiejsc({ grupy, liczniki }: { grupy: GrupaMiejsc[]; liczniki: LicznikiMiejsc }) {
    const tylkoInne = grupy.length === 1 && !grupy[0].obszar
    return (
        <div className="spis-miejsc-grupy">
            {grupy.map((g) => {
                const nazwa = g.obszar?.nazwa ?? 'inne miejscowości'
                return (
                    <section key={g.obszar?.id ?? 'inne'} className="sekcja">
                        {!tylkoInne && (
                            <TytulSekcji>{g.obszar ? <Link href={`/miejsca/${g.obszar.id}`} className="tytul-sekcji-odn">{nazwa}</Link> : nazwa}</TytulSekcji>
                        )}
                        <SpisDzialow dzialy={pozycjeMiejsc(g.miejsca, liczniki)} wybrany="" numeracja={false} etykieta={`miejscowości: ${nazwa}`}
                            podgrupy={g.podgrupy.map((pg) => ({ klucz: pg.obszar.id, nazwa: pg.obszar.nazwa, href: `/miejsca/${pg.obszar.id}`, dzialy: pozycjeMiejsc(pg.miejsca, liczniki) }))} />
                    </section>
                )
            })}
        </div>
    )
}
