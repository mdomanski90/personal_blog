import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { nazwy, opowiesc, poziomCzytelnika, RODZAJE_OPOWIESCI } from '@/lib/archiwum'
import { naHtml } from '@/lib/markdoc'
import { Metki, Strona, Tresc, TytulStrony, dataZDniem } from '../../components/Uklad'
import CopyLinkButton from '../../components/CopyLinkButton'

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

    return (
        <Strona>
            <article className="flex flex-col" style={{ gap: 'calc(1rem * var(--font-scale, 1))' }}>
                <TytulStrony sciezka={[{ tekst: 'wpisy', href: '/wpisy' }]}>{o.tytul}</TytulStrony>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Metki
                        elementy={[
                            dataZDniem(o.data),
                            RODZAJE_OPOWIESCI[o.rodzaj] ?? o.rodzaj,
                            ...o.miejsca.filter((id) => n.miejsca.has(id)).map((id) => ({ tekst: n.miejsca.get(id), href: `/miejsca/${id}` })),
                            ...o.tematy.filter((id) => n.tematy.has(id)).map((id) => ({ tekst: n.tematy.get(id), href: `/tematy/${id}` })),
                        ]}
                    />
                    <CopyLinkButton sciezka={`/wpisy/${o.id}`} />
                </div>
                <Tresc html={naHtml(o.tresc)} />
            </article>
        </Strona>
    )
}
