import type { Metadata } from 'next'
import { licznikiMiejsc, miejsca, poziomCzytelnika, RODZAJE_MIEJSC } from '@/lib/archiwum'
import { Strona, TytulStrony } from '../components/Uklad'
import MiejscaWidok, { type MiejsceNaLiscie } from '../components/MiejscaWidok'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'miejsca · odniepamieci.pl' }

export default async function Miejsca() {
    const poziom = await poziomCzytelnika()
    const lista = await miejsca(poziom)
    const liczniki = await licznikiMiejsc(poziom)
    const nazwaPo = new Map(lista.map((m) => [m.id, m.nazwa]))

    const dane: MiejsceNaLiscie[] = lista.map((m) => ({
        id: m.id,
        nazwa: m.nazwa,
        rodzaj: RODZAJE_MIEJSC[m.rodzaj] ?? m.rodzaj,
        inneNazwy: m.inneNazwy,
        nalezyDo: m.nalezyDo && nazwaPo.has(m.nalezyDo) ? { id: m.nalezyDo, nazwa: nazwaPo.get(m.nalezyDo)! } : null,
        wspolrzedne: m.wspolrzedne,
        przyblizone: m.przyblizone,
        opowiesci: liczniki.get(m.id)?.opowiesci ?? 0,
        tematy: liczniki.get(m.id)?.tematy ?? 0,
    }))

    return (
        <Strona>
            <TytulStrony>miejsca</TytulStrony>
            <MiejscaWidok miejsca={dane} />
        </Strona>
    )
}
