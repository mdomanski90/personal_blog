import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { nazwy, opowiesciDlaTematu, powiazania, poziomCzytelnika, rozwiazOdnosniki, RODZAJE_TEMATOW, temat } from '@/lib/archiwum'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml } from '@/lib/markdoc'
import { Kreski, Metki, Sekcja, Strona, Tresc, TytulStrony } from '../../components/Uklad'
import ListaOpowiesci from '../../components/ListaOpowiesci'
import CopyLinkButton from '../../components/CopyLinkButton'
import Powiazania from '../../components/Powiazania'

export const dynamic = 'force-dynamic'

type Parametry = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Parametry): Promise<Metadata> {
    const { slug } = await params
    const t = await temat(slug, await poziomCzytelnika())
    return { title: t ? `${t.nazwa} · tematy · odniepamieci.pl` : 'odniepamieci.pl' }
}

export default async function TematStrona({ params }: Parametry) {
    const { slug } = await params
    const poziom = await poziomCzytelnika()
    const t = await temat(slug, poziom)
    if (!t) notFound()
    const n = await nazwy(poziom)
    const opow = await opowiesciDlaTematu(t.id, poziom)
    const miejscaTematu = t.miejsca.filter((id) => n.miejsca.has(id))
    const siec = await powiazania('temat', t.id, poziom)

    return (
        <Strona>
            <TytulStrony sciezka={[{ tekst: 'tematy', href: '/tematy' }]}>{t.nazwa}</TytulStrony>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Metki elementy={[RODZAJE_TEMATOW[t.rodzaj] ?? t.rodzaj, t.czas ? formatujEdtf(t.czas) : null, ...t.inneNazwy]} />
                <CopyLinkButton sciezka={`/tematy/${t.id}`} />
            </div>

            <Tresc html={naHtml(t.opis, await rozwiazOdnosniki(poziom))} pusta="opis tematu nie został jeszcze dodany." />

            {miejscaTematu.length > 0 && (
                <Sekcja tytul="miejsca">
                    <Metki elementy={miejscaTematu.map((id) => ({ tekst: n.miejsca.get(id), href: `/miejsca/${id}` }))} />
                </Sekcja>
            )}

            {opow.length > 0 && (
                <>
                    <Kreski />
                    <Sekcja tytul="wpisy">
                        <ListaOpowiesci opowiesci={opow} nazwyMiejsc={n.miejsca} />
                    </Sekcja>
                </>
            )}

            {(siec.odnosniki.length > 0 || siec.wzmianki.length > 0) && <Kreski />}
            <Powiazania dane={siec} />
        </Strona>
    )
}
