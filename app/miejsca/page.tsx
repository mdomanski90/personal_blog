import type { Metadata } from 'next'
import { miejsca, poziomCzytelnika } from '@/lib/archiwum'
import { Strona, TytulStrony } from '../components/Uklad'
import MiejscaWidok from '../components/MiejscaWidok'
import SiatkaMiejsc from '../components/SiatkaMiejsc'
import type { PunktMapy } from '../components/Mapa'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'miejsca · odniepamieci.pl' }

export default async function Miejsca() {
    const poziom = await poziomCzytelnika()
    const lista = await miejsca(poziom)

    const punkty: PunktMapy[] = lista
        .filter((m) => m.wspolrzedne)
        .map((m) => ({ id: m.id, nazwa: m.nazwa, lat: m.wspolrzedne![0], lng: m.wspolrzedne![1], przyblizone: m.przyblizone, href: `/miejsca/${m.id}` }))

    return (
        <Strona>
            <TytulStrony>miejsca</TytulStrony>
            <MiejscaWidok punkty={punkty} wszystkich={lista.length} />
            <SiatkaMiejsc miejsca={lista.map((m) => ({ id: m.id, nazwa: m.nazwa }))} />
        </Strona>
    )
}
