import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { nazwy, opowiesci, poziomCzytelnika } from '@/lib/archiwum'
import { Strona, TytulStrony } from '../components/Uklad'
import ListaOpowiesci from '../components/ListaOpowiesci'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'wpisy · odniepamieci.pl' }

export default async function Opowiesci() {
    const poziom = await poziomCzytelnika()
    const lista = await opowiesci(poziom)
    const { miejsca } = await nazwy(poziom)
    return (
        <Strona>
            <TytulStrony><TytulDzialu dzial="wpisy" domyslny="wpisy" /></TytulStrony>
            <WstepDzialu dzial="wpisy" className="ot-drobne" />
            <ListaOpowiesci opowiesci={lista} nazwyMiejsc={miejsca} />
        </Strona>
    )
}
