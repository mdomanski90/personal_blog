import type { Metadata } from 'next'
import { miejsca, miejscaWedlugObszarow, obiekty, OBSZARY, poziomCzytelnika } from '@/lib/archiwum'
import { punktyMapy } from '@/lib/punkty-mapy'
import { Strona, TytulStrony } from '../components/Uklad'
import MapaMiejscLeniwa from '../components/MapaMiejscLeniwa'
import LegendaMapy from '../components/LegendaMapy'
import SpisMiejsc from '../components/SpisMiejsc'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'miejsca · odniepamieci.pl' }

export default async function Miejsca() {
    const poziom = await poziomCzytelnika()
    const lista = await miejsca(poziom)
    const ob = await obiekty(poziom)
    const punkty = punktyMapy(lista, ob)
    const miejscowosci = lista.filter((m) => !OBSZARY.includes(m.rodzaj))
    const bez = miejscowosci.filter((m) => !m.wspolrzedne).length

    return (
        <Strona>
            <TytulStrony>miejsca</TytulStrony>
            <div className="flex flex-col" style={{ gap: 8 }}>
                <MapaMiejscLeniwa punkty={punkty} granice zapamietaj="mapa-miejsca" />
                {bez > 0 && (
                    <p className="text-gray-500 lowercase" style={{ fontSize: 13 }}>
                        {bez === miejscowosci.length ? 'żadna miejscowość nie ma jeszcze współrzędnych.' : `${bez} z ${miejscowosci.length} miejscowości nie ma jeszcze współrzędnych.`}
                    </p>
                )}
                <LegendaMapy rodzajeObiektow={[...new Set(ob.filter((o) => o.wspolrzedne).map((o) => o.rodzaj))]} />
            </div>
            <SpisMiejsc grupy={await miejscaWedlugObszarow(poziom)} />
        </Strona>
    )
}
