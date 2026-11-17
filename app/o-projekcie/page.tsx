import type { Metadata } from 'next'
import { adresKontaktowy, oProjekcie, poziomCzytelnika, kontekstTresci } from '@/lib/archiwum'
import { naHtml } from '@/lib/markdoc'
import { Sekcja, Strona, Tresc, TytulStrony } from '../components/Uklad'
import EmailLink from '../components/EmailLink'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'o projekcie · odniepamieci.pl' }

export default async function OProjekcie() {
    const tresc = await oProjekcie()
    const kontekst = await kontekstTresci(await poziomCzytelnika())
    const email = await adresKontaktowy()
    return (
        <Strona>
            <TytulStrony>o projekcie</TytulStrony>
            <Tresc html={naHtml(tresc, kontekst)} pusta={null} />
            <Sekcja tytul="kontakt">
                {/* etap R: rozmiar treści z klasy (bez stylu inline); adres z ustawień, ten sam co w „współtwórz” */}
                <p className="tekst-tresc">
                    <EmailLink u={email.u} d={email.d} />
                </p>
            </Sekcja>
        </Strona>
    )
}
