import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { licznikiMiejsc, materialy, miejsca, miejscaWedlugObszarow, obiekty, OBSZARY, poziomCzytelnika } from '@/lib/archiwum'
import { punktyMapy } from '@/lib/punkty-mapy'
import { dolaczPlany, planyNaMape } from '@/lib/plany/serwer'
import { Strona, TytulStrony } from '../components/Uklad'
import { obokMiejsc } from '../components/TytulyDzialow'
import MapaMiejscLeniwa from '../components/MapaMiejscLeniwa'
import SpisMiejsc from '../components/SpisMiejsc'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'miejsca · odniepamieci.pl' }

export default async function Miejsca() {
    const poziom = await poziomCzytelnika()
    const lista = await miejsca(poziom)
    const ob = await obiekty(poziom)
    const punkty = await dolaczPlany(punktyMapy(lista, ob))
    const planyGeo = await planyNaMape()
    const miejscowosci = lista.filter((m) => !OBSZARY.includes(m.rodzaj))
    const bez = miejscowosci.filter((m) => !m.wspolrzedne).length
    // liczniki do spisu (JW-12): wpisy, obiekty w terenie, materiały – tylko widoczne dla czytelnika
    const l = await licznikiMiejsc(poziom)
    const liczniki = new Map<string, { wpisy?: number; obiekty?: number; materialy?: number }>()
    for (const [id, x] of l) liczniki.set(id, { wpisy: x.opowiesci })
    for (const o of ob) for (const id of o.miejsca) liczniki.set(id, { ...liczniki.get(id), obiekty: (liczniki.get(id)?.obiekty ?? 0) + 1 })
    for (const m of await materialy(poziom)) for (const id of m.miejsca) liczniki.set(id, { ...liczniki.get(id), materialy: (liczniki.get(id)?.materialy ?? 0) + 1 })

    return (
        <Strona uklad="pelna">
            <TytulStrony obok={obokMiejsc('/miejsca')}><TytulDzialu dzial="miejsca" domyslny="miejsca" /></TytulStrony>
            <WstepDzialu dzial="miejsca" className="ot-drobne wstep-dzialu-tekst" />
            <div className="flex flex-col gap-2">
                <MapaMiejscLeniwa punkty={punkty} planyGeo={planyGeo} granice zapamietaj="mapa-miejsca" />
                {bez > 0 && (
                    <p className="text-[var(--tekst-etykieta)] lowercase tekst-etykieta-maly">
                        {bez === miejscowosci.length ? 'żadna miejscowość nie ma jeszcze współrzędnych.' : `${bez} z ${miejscowosci.length} miejscowości nie ma jeszcze współrzędnych.`}
                    </p>
                )}
            </div>
            <SpisMiejsc grupy={await miejscaWedlugObszarow(poziom)} liczniki={liczniki} />
        </Strona>
    )
}
