import type { Metadata } from 'next'
import { oProjekcie } from '@/lib/archiwum'
import { naHtml } from '@/lib/markdoc'
import { Sekcja, Strona, Tresc, TytulStrony } from '../components/Uklad'
import EmailLink from '../components/EmailLink'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'o projekcie · odniepamieci.pl' }

export default async function OProjekcie() {
    const tresc = await oProjekcie()
    return (
        <Strona>
            <TytulStrony>o projekcie</TytulStrony>
            <Tresc html={naHtml(tresc)} pusta={null} />
            <Sekcja tytul="kontakt">
                <p style={{ fontSize: 'var(--blog-font-size, 18px)' }}>
                    <EmailLink />
                </p>
            </Sekcja>
        </Strona>
    )
}
