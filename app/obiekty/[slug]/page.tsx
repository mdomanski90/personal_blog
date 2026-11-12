import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from 'next-view-transitions'
import { miejsca, obiekt, obiekty, materialyDla, powiazania, poziomCzytelnika, kontekstTresci, RODZAJE_OBIEKTOW } from '@/lib/archiwum'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml } from '@/lib/markdoc'
import { punktyMapy } from '@/lib/punkty-mapy'
import { tarczaObiektu } from '@/lib/tarcze'
import { Kreski, Metki, Sekcja, Strona, Tresc, TytulStrony, Wiersz } from '../../components/Uklad'
import Powiazania from '../../components/Powiazania'
import ListaMaterialow from '../../components/ListaMaterialow'
import MapaMiejscLeniwa from '../../components/MapaMiejscLeniwa'
import CopyLinkButton from '../../components/CopyLinkButton'
import PowrotDoMapy from '../../components/PowrotDoMapy'
import ListaPlanow from '../../components/plan/ListaPlanow'
import { planyDlaCzytelnika } from '@/lib/plany/serwer'

export const dynamic = 'force-dynamic'

type Parametry = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Parametry): Promise<Metadata> {
    const { slug } = await params
    const o = await obiekt(slug, await poziomCzytelnika())
    return { title: o ? `${o.nazwa} · odniepamieci.pl` : 'odniepamieci.pl' }
}

export default async function ObiektStrona({ params }: Parametry) {
    const { slug } = await params
    const poziom = await poziomCzytelnika()
    const o = await obiekt(slug, poziom)
    if (!o) notFound()
    const wszystkie = await miejsca(poziom)
    const wies = o.miejsce ? wszystkie.find((m) => m.id === o.miejsce) : undefined
    const punkty = o.wspolrzedne ? punktyMapy(wszystkie, await obiekty(poziom)) : []
    const rodzaj = RODZAJE_OBIEKTOW[o.rodzaj] ?? o.rodzaj
    const siec = await powiazania('obiekt', o.id, poziom)
    const mat = await materialyDla('obiekt', o.id, poziom)
    const planyObiektu = await planyDlaCzytelnika('obiekt', o.id)

    return (
        <Strona>
            <TytulStrony sciezka={[{ tekst: 'miejsca', href: '/miejsca' }, ...(wies ? [{ tekst: wies.nazwa, href: `/miejsca/${wies.id}` }] : [])]} akcje={<><PowrotDoMapy /><CopyLinkButton sciezka={`/obiekty/${o.id}`} /></>}>
                <span className="inline-flex items-center" style={{ gap: 10 }}>
                    <span style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: tarczaObiektu(o.rodzaj, rodzaj, 36, o.istnieje) }} />
                    {o.nazwa}
                </span>
            </TytulStrony>
            <div className="flex flex-wrap items-center gap-2">
                <Metki elementy={[rodzaj, o.czas ? formatujEdtf(o.czas) : null, o.istnieje ? null : 'nie istnieje', ...o.inneNazwy]} />
            </div>

            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))' }}>
                <div>
                    {wies && <Wiersz etykieta="miejscowość"><Link href={`/miejsca/${wies.id}`}>{wies.nazwa}</Link></Wiersz>}
                    {o.czas && <Wiersz etykieta="lata istnienia">{formatujEdtf(o.czas)}</Wiersz>}
                    <Wiersz etykieta="stan">{o.istnieje ? 'istnieje' : 'nie istnieje'}</Wiersz>
                    <Wiersz etykieta="współrzędne">
                        {o.wspolrzedne ? `${o.wspolrzedne[0]}, ${o.wspolrzedne[1]}${o.przyblizone ? ' (przybliżone)' : ''}` : <span className="text-gray-500">brak</span>}
                    </Wiersz>
                </div>
                {o.wspolrzedne && <MapaMiejscLeniwa punkty={punkty} srodek={o.wspolrzedne} przyblizenie={14} wysokosc={300} />}
            </div>

            <Tresc html={naHtml(o.opis, await kontekstTresci(poziom))} />

            {planyObiektu.length > 0 && (
                <Sekcja tytul="plan">
                    <ListaPlanow plany={planyObiektu} />
                </Sekcja>
            )}

            {mat.length > 0 && (
                <Sekcja tytul="materiały w archiwum">
                    <ListaMaterialow materialy={mat} />
                </Sekcja>
            )}

            {(siec.odnosniki.length > 0 || siec.wzmianki.length > 0) && <Kreski />}
            <Powiazania dane={siec} />
        </Strona>
    )
}
