import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from 'next-view-transitions'
import { miejsca, obiekt, obiekty, materialyDla, powiazania, poziomCzytelnika, kontekstTresci, RODZAJE_OBIEKTOW } from '@/lib/archiwum'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml, zajawka } from '@/lib/markdoc'
import { punktyMapy } from '@/lib/punkty-mapy'
import { dolaczPlany, planyNaMape } from '@/lib/plany/serwer'
import { tarczaObiektu } from '@/lib/tarcze'
import { Strona, Tresc, maTekst } from '../../components/Uklad'
import { Czesc, KrotkieMaterialy, NaglowekKarty, Tabela, W, WCaly, ZAdresami, Zrodla, ZglosPoprawke } from '../../components/Karta'
import MapaKarty from '../../components/MapaKarty'
import Powiazania from '../../components/Powiazania'
import MapaMiejscLeniwa from '../../components/MapaMiejscLeniwa'
import CopyLinkButton from '../../components/CopyLinkButton'
import ListaPlanow from '../../components/plan/ListaPlanow'
import { planDlaCzytelnika, planyDlaCzytelnika } from '@/lib/plany/serwer'
import { wczytajUstawienia } from '@/lib/plany/dane'
import WidokObiektu from '../../components/plan/WidokObiektu'
import { osobyPlanu } from '@/lib/plany/rodzina'
import OtworzWMapach from '../../components/OtworzWMapach'
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

    const ktx = await kontekstTresci(poziom)
    const opisHtml = naHtml(o.opis, ktx)
    const lead = zajawka(o.opis, 240, ktx.rozwiaz)
    const foto = o.zdjecia[0]
    const podpisFoto = foto ? [foto.podpis, foto.data, foto.autor && `fot. ${foto.autor}`].filter(Boolean).join(' · ') : ''
    const mapa = o.wspolrzedne ? <MapaMiejscLeniwa punkty={punkty} planyGeo={planyGeo} srodek={o.wspolrzedne} przyblizenie={glowny ? 16 : 14} wysokosc="100%" /> : undefined
    const tabelaPodstawowa = (
        <Tabela etykieta={`${o.nazwa} – dane`}>
            <Czesc tytul="podstawowe" />
            <W e="miejscowość">{wies && <Link href={`/miejsca/${wies.id}`} className="odn">{wies.nazwa}</Link>}</W>
            <W e="rodzaj">{rodzaj}</W>
            <W e="lata istnienia">{o.czas ? formatujEdtf(o.czas) : null}</W>
            <W e="stan">{o.istnieje ? 'istnieje' : 'nie istnieje'}</W>
            <W e="inne nazwy">{o.inneNazwy.length ? o.inneNazwy.join(' · ') : null}</W>
            <W e="położenie">
                {o.wspolrzedne
                    ? (glowny || !mapa
                        ? <OtworzWMapach wspolrzedne={o.wspolrzedne} przyblizone={o.przyblizone} />
                        : <span className="karta-polozenie"><span><OtworzWMapach wspolrzedne={o.wspolrzedne} przyblizone={o.przyblizone} /></span><MapaKarty mapa={mapa} wysokosc={150} /></span>)
                    : <span className="text-gray-600 dark:text-gray-400">nieustalone</span>}
            </W>
            {o.zdjecia.length > 1 && <Czesc tytul="fotografie" id="fotografie">{o.zdjecia.length}</Czesc>}
            {o.zdjecia.length > 1 && <WCaly><GaleriaZdjec zdjecia={o.zdjecia} tytul={o.nazwa} /></WCaly>}
        </Tabela>
    )

    return (
        <Strona akcje={<><CopyLinkButton sciezka={`/obiekty/${o.id}`} /></>}>
            <NaglowekKarty
                sciezka={[{ tekst: 'miejsca', href: '/miejsca' }, ...(wies ? [{ tekst: wies.nazwa, href: `/miejsca/${wies.id}` }] : [])]}
                tytul={<span className="inline-flex items-center" style={{ gap: 10 }}><span style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: tarczaObiektu(o.rodzaj, rodzaj, 32, o.istnieje) }} />{o.nazwa}</span>}
                obraz={foto ? (
                    <figure className="osoba-portret">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <a href={`${foto.plik}?w=1800`} target="_blank" rel="noopener" title="powiększ zdjęcie"><img src={`${foto.plik}?w=480`} alt={foto.podpis || o.nazwa} /></a>
                        <figcaption>{podpisFoto}{o.zdjecia.length > 1 && <>{podpisFoto && ' · '}<a href="#fotografie" className="odn">wszystkie ({o.zdjecia.length}) ↓</a></>}</figcaption>
                    </figure>
                ) : undefined}
                linia={[rodzaj, wies ? { tekst: wies.nazwa, href: `/miejsca/${wies.id}` } : null, o.czas ? formatujEdtf(o.czas) : null, o.istnieje ? 'istnieje' : 'nie istnieje']}
                lead={lead ? <p style={{ margin: 0 }}>{lead}</p> : undefined}
            />

            {/* z planem (np. cmentarz): plan na całą szerokość z zakładkami, dane obok; bez planu – tabela z mapką */}
            {glowny ? <WidokObiektu plan={glowny.plan} ustawienia={ustawienia} zalogowany={glowny.poziom === 'bliscy'} osoby={osobyGlownego} mapa={mapa} info={tabelaPodstawowa} /> : tabelaPodstawowa}

            {maTekst(opisHtml) && (
                <section className="flex flex-col" style={{ gap: 10 }}>
                    <h2 className="font-bold lowercase" style={{ fontSize: 'calc(20px * var(--font-scale, 1))' }}>opis</h2>
                    <Tresc html={opisHtml} />
                </section>
            )}

            {(mat.length > 0 || planyObiektu.length > 1 || o.zrodla.length > 0 || o.zdjecia.some((z) => z.autor || z.prawa)) && (
                <Tabela etykieta={`${o.nazwa} – powiązane i źródła`}>
                    {(mat.length > 0 || planyObiektu.length > 1) && <Czesc tytul="powiązane" />}
                    <W e="materiały">{mat.length > 0 && <KrotkieMaterialy materialy={mat} />}</W>
                    <W e="plany">{planyObiektu.length > 1 && <ListaPlanow plany={planyObiektu} />}</W>
                    <Zrodla pozycje={[
                        ...o.zrodla.map((z, i) => <ZAdresami key={`z${i}`} tekst={z} />),
                        ...o.zdjecia.filter((z) => z.autor || z.prawa).map((z, i) => <span key={`f${i}`}>fotografia{z.podpis ? ` „${z.podpis}”` : ''}{z.data ? `, ${z.data}` : ''}: {[z.autor, z.prawa].filter(Boolean).join(', ')}</span>),
                    ]} />
                </Tabela>
            )}

            <Powiazania dane={siec} />

            <ZglosPoprawke adres={`/obiekty/${o.id}`} tytul={o.nazwa} pytanie="Coś się nie zgadza albo wiesz więcej o tym obiekcie?" />
        </Strona>
    )
}
