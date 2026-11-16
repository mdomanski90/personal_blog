import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { opowiesci, poziomCzytelnika } from '@/lib/archiwum'
import { Strona, TytulStrony } from '../components/Uklad'
import ZapowiedziWpisow from '../components/ZapowiedziWpisow'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'wpisy · odniepamieci.pl' }

export default async function Opowiesci() {
    const poziom = await poziomCzytelnika()
    const lista = await opowiesci(poziom)
    return (
        <Strona uklad="pelna">
            <TytulStrony><TytulDzialu dzial="wpisy" domyslny="wpisy" /></TytulStrony>
            <WstepDzialu dzial="wpisy" className="ot-drobne" />
            {/* uwagi 16.11: lista wpisów w układzie zapowiedzi ze strony głównej (wariant B) – wspólny komponent */}
            <ZapowiedziWpisow wpisy={lista} poziom={poziom} naglowek="h2" />
        </Strona>
    )
}
