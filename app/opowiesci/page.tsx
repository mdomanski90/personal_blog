import type { Metadata } from 'next'
import { nazwy, opowiesci, poziomCzytelnika } from '@/lib/archiwum'
import { Strona, TytulStrony } from '../components/Uklad'
import ListaOpowiesci from '../components/ListaOpowiesci'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'opowieści · odniepamieci.pl' }

export default async function Opowiesci() {
    const poziom = await poziomCzytelnika()
    const lista = await opowiesci(poziom)
    const { miejsca } = await nazwy(poziom)
    return (
        <Strona>
            <TytulStrony>opowieści</TytulStrony>
            <ListaOpowiesci opowiesci={lista} nazwyMiejsc={miejsca} />
        </Strona>
    )
}
