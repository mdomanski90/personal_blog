import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from 'next-view-transitions'
import { miejsca, obiekt, obiekty, materialyDla, powiazania, poziomCzytelnika, kontekstTresci, RODZAJE_OBIEKTOW } from '@/lib/archiwum'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml } from '@/lib/markdoc'
import { punktyMapy } from '@/lib/punkty-mapy'
import { dolaczPlany, planyNaMape } from '@/lib/plany/serwer'
import { tarczaObiektu } from '@/lib/tarcze'
import { Kreski, Metki, Sekcja, Strona, Tresc, TytulStrony, Wiersz } from '../../components/Uklad'
import Powiazania from '../../components/Powiazania'
import ListaMaterialow from '../../components/ListaMaterialow'
import MapaMiejscLeniwa from '../../components/MapaMiejscLeniwa'
import CopyLinkButton from '../../components/CopyLinkButton'
import PowrotDoMapy from '../../components/PowrotDoMapy'
import Zgloszenie from '../../components/Zgloszenie'
import ListaPlanow from '../../components/plan/ListaPlanow'
import { planDlaCzytelnika, planyDlaCzytelnika } from '@/lib/plany/serwer'
import { wczytajUstawienia } from '@/lib/plany/dane'
import WidokObiektu from '../../components/plan/WidokObiektu'
import { osobyPlanu } from '@/lib/plany/rodzina'
import OtworzWMapach from '../../components/OtworzWMapach'
import InfoZMapa from '../../components/InfoZMapa'
import GaleriaZdjec from '../../components/GaleriaZdjec'

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
    const punkty = o.wspolrzedne ? await dolaczPlany(punktyMapy(wszystkie, await obiekty(poziom))) : []
    const planyGeo = await planyNaMape()
    const rodzaj = RODZAJE_OBIEKTOW[o.rodzaj] ?? o.rodzaj
    const siec = await powiazania('obiekt', o.id, poziom)
    const mat = await materialyDla('obiekt', o.id, poziom)
    const planyObiektu = await planyDlaCzytelnika('obiekt', o.id)
    // pierwszy plan obiektu (w wersji dla czytelnika) pokazujemy zamiast punktu na mapie
    const glowny = planyObiektu.length ? await planDlaCzytelnika(planyObiektu[0].slug) : null
    const ustawienia = glowny ? await wczytajUstawienia() : undefined
    const osobyGlownego = glowny ? await osobyPlanu(glowny.plan, poziom) : undefined

    return (
        <Strona akcje={<><PowrotDoMapy /><CopyLinkButton sciezka={`/obiekty/${o.id}`} /></>}>
            <TytulStrony sciezka={[{ tekst: 'miejsca', href: '/miejsca' }, ...(wies ? [{ tekst: wies.nazwa, href: `/miejsca/${wies.id}` }] : [])]}>
                <span className="inline-flex items-center" style={{ gap: 10 }}>
                    <span style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: tarczaObiektu(o.rodzaj, rodzaj, 36, o.istnieje) }} />
                    {o.nazwa}
                </span>
            </TytulStrony>
            <div className="flex flex-wrap items-center gap-2">
                <Metki elementy={[rodzaj, o.czas ? formatujEdtf(o.czas) : null, o.istnieje ? null : 'nie istnieje', ...o.inneNazwy]} />
            </div>

            {(() => {
                const info = (
                    <div>
                        {wies && <Wiersz etykieta="miejscowość"><Link href={`/miejsca/${wies.id}`}>{wies.nazwa}</Link></Wiersz>}
                        {o.czas && <Wiersz etykieta="lata istnienia">{formatujEdtf(o.czas)}</Wiersz>}
                        <Wiersz etykieta="stan">{o.istnieje ? 'istnieje' : 'nie istnieje'}</Wiersz>
                        <Wiersz etykieta="położenie">
                            {o.wspolrzedne ? <OtworzWMapach wspolrzedne={o.wspolrzedne} przyblizone={o.przyblizone} /> : <span className="text-gray-500">brak</span>}
                        </Wiersz>
                        {o.zdjecia.length > 0 && <Wiersz etykieta="fotografie"><a href="#fotografie">{o.zdjecia.length}</a></Wiersz>}
                    </div>
                )
                const mapa = o.wspolrzedne ? <MapaMiejscLeniwa punkty={punkty} planyGeo={planyGeo} srodek={o.wspolrzedne} przyblizenie={glowny ? 16 : 14} wysokosc="100%" /> : undefined
                // z planem: plan na całą szerokość (zakładki plan · lista · mapa); bez planu: dane obok mapy z „rozszerz”
                if (glowny) return <WidokObiektu plan={glowny.plan} ustawienia={ustawienia} zalogowany={glowny.poziom === 'bliscy'} osoby={osobyGlownego} mapa={mapa} info={info} />
                return mapa ? <InfoZMapa info={info} mapa={mapa} wysokosc={300} /> : info
            })()}

            <Tresc html={naHtml(o.opis, await kontekstTresci(poziom))} />

            {o.zdjecia.length > 0 && (
                <Sekcja tytul="fotografie" id="fotografie">
                    <GaleriaZdjec zdjecia={o.zdjecia} tytul={o.nazwa} />
                </Sekcja>
            )}

            {planyObiektu.length > 1 && (
                <Sekcja tytul="plany">
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

            <div className="border-t border-[#e7e2d8] dark:border-[#374151] flex flex-wrap items-center" style={{ paddingTop: '1rem', gap: '0.6rem 1rem' }}>
                <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>Coś się nie zgadza albo wiesz więcej o tym miejscu?</span>
                <Zgloszenie rodzaj="poprawka" adres={`/obiekty/${o.id}`} tytul={o.nazwa} />
            </div>
        </Strona>
    )
}
