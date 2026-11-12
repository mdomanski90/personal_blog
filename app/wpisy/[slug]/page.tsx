import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { nazwy, opowiesc, powiazania, poziomCzytelnika, kontekstTresci } from '@/lib/archiwum'
import { naHtml } from '@/lib/markdoc'
import { Kreski, Strona, Tresc, TytulStrony } from '../../components/Uklad'
import Powiazania from '../../components/Powiazania'
import MetkiWpisu from '../../components/MetkiWpisu'

export const dynamic = 'force-dynamic'

type Parametry = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Parametry): Promise<Metadata> {
    const { slug } = await params
    const o = await opowiesc(slug, await poziomCzytelnika())
    return { title: o ? `${o.tytul} · odniepamieci.pl` : 'odniepamieci.pl', description: o?.zajawka }
}

export default async function OpowiescStrona({ params }: Parametry) {
    const { slug } = await params
    const poziom = await poziomCzytelnika()
    const o = await opowiesc(slug, poziom)
    if (!o) notFound()
    const n = await nazwy(poziom)
    const siec = await powiazania('wpis', o.id, poziom)

    return (
        <Strona>
            <article className="flex flex-col" style={{ gap: 'calc(1rem * var(--font-scale, 1))' }}>
                <TytulStrony sciezka={[{ tekst: 'wpisy', href: '/wpisy' }]}>{o.tytul}</TytulStrony>
                <MetkiWpisu wpis={o} nazwy={n} />
                <Tresc html={naHtml(o.tresc, await kontekstTresci(poziom))} />
            </article>
            {siec.odnosniki.length > 0 && <Kreski />}
            <Powiazania dane={{ odnosniki: siec.odnosniki, wzmianki: [] }} />
        </Strona>
    )
}
