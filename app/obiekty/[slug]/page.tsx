import { odmiana } from '@/lib/tekst'
import { parafie } from '@/lib/archiwum'
import { brakiDoPomocy } from '@/lib/wspoltworz-dane'
import Zgloszenie from '../../components/Zgloszenie'
import { brakLubPrzekierowanie } from '@/lib/przekierowania'
import { zapiszOkres } from '@/lib/parafie-powiazania'
import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { miejsca, obiekt, obiekty, materialyDla, powiazania, poziomCzytelnika, kontekstTresci, RODZAJE_OBIEKTOW } from '@/lib/archiwum'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml, zajawka } from '@/lib/markdoc'
import { punktyMapy } from '@/lib/punkty-mapy'
import { dolaczPlany, planyNaMape } from '@/lib/plany/serwer'
import { tarczaObiektu } from '@/lib/tarcze'
import { PelnaSzerokosc, Sekcja, Strona, Tresc, maTekst } from '../../components/Uklad'
import { wystapieniaKarty } from '@/lib/plany/wystapienia'
import { Czesc, CzescJakCytowac, KrotkieMaterialy, LiniaKarty, WierszeWystapien, NaglowekKarty, Tabela, W, WCaly, ZAdresami, Zrodla, ZglosPoprawke, idCzesci, spisCzesci } from '../../components/Karta'
import { daneCytatu } from '@/lib/cytowanie'
import SpisTresci from '../../components/SpisTresci'
import { PrzyciskDrukuj } from '../../components/Druk'
import MapaKarty from '../../components/MapaKarty'
import Powiazania, { czesciPowiazan } from '../../components/Powiazania'
import MapaMiejscLeniwa from '../../components/MapaMiejscLeniwa'
import CopyLinkButton from '../../components/CopyLinkButton'
import ListaPlanow from '../../components/plan/ListaPlanow'
import { planDlaCzytelnika, planyDlaCzytelnika } from '@/lib/plany/serwer'
import { wczytajUstawienia } from '@/lib/plany/dane'
import WidokObiektu from '../../components/plan/WidokObiektu'
import { osobyPlanu } from '@/lib/plany/rodzina'
import OtworzWMapach from '../../components/OtworzWMapach'
import GaleriaZdjec from '../../components/GaleriaZdjec'
import { numerKat } from '@/lib/katalog/dane'
import { WierszNrKat } from '../../components/NrKat'

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
    if (!o) return brakLubPrzekierowanie('obiekty', slug)
    const wszystkie = await miejsca(poziom)
    const listaParafii = await parafie()
    const wies = o.miejsce ? wszystkie.find((m) => m.id === o.miejsce) : undefined
    // OBJ-06: pozostałe miejscowości obiektu (widoczne dla czytelnika), w kolejności z panelu
    const takzeW = o.miejsca.slice(1).map((id) => wszystkie.find((m) => m.id === id)).filter((m): m is NonNullable<typeof m> => !!m)
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
    // WSP-04: brak opisu – część „opis” z „pomóż uzupełnić” (dziś część znikała); decyzje redakcji jak w „współtwórz”
    const pomoc = await brakiDoPomocy('obiekty', o.id, maTekst(opisHtml) ? [] : ['bez-opisu'], o.bezWspoltworz)
    const lead = zajawka(o.opis, 240, ktx.rozwiaz)
    const foto = o.zdjecia[0]
    const podpisFoto = foto ? [foto.podpis, foto.data, foto.autor && `fot. ${foto.autor}`].filter(Boolean).join(' · ') : ''
    const mapa = o.wspolrzedne ? <MapaMiejscLeniwa punkty={punkty} planyGeo={planyGeo} srodek={o.wspolrzedne} przyblizenie={glowny ? 16 : 14} wysokosc="100%" /> : undefined
    const nrKat = numerKat('obiekt', o.id)
    const wyst = await wystapieniaKarty('obiekt', o.id)
    const jestPowiazane = mat.length > 0 || planyObiektu.length > 1 || wyst.plany.length > 0 || wyst.skany.length > 0
    const jestZrodla = o.zrodla.length > 0 || o.zdjecia.some((z) => z.autor || z.prawa)
    // JW-2: spis treści z części; drugiej mapy w wierszu „położenie” nie ma (JW-15) – mapa jest w pasku bocznym, gdy nie ma zdjęcia
    const spis = spisCzesci(['podstawowe', o.zdjecia.length > 1 && 'fotografie', (maTekst(opisHtml) || pomoc.has('bez-opisu')) && 'opis', jestPowiazane && 'powiązane', ...czesciPowiazan(siec), 'jak cytować', jestZrodla && 'źródła'])
    const tabelaPodstawowa = (
        <Tabela etykieta={`${o.nazwa} – dane`}>
            <Czesc tytul="podstawowe" />
            <WierszNrKat nr={nrKat} />
            <W e={takzeW.length ? 'miejscowości' : 'miejscowość'}>{wies && <LiniaKarty className="karta-linia-w" elementy={[[wies, ...takzeW].map((m) => ({ tekst: m.nazwa, href: `/miejsca/${m.id}` }))]} />}</W>
            <W e="parafia / urząd">{(o.instytucje?.length ?? 0) > 0 && (
                <span className="flex flex-col gap-1">
                    {(o.instytucje ?? []).map((rel, i) => {
                        const p = listaParafii.find((x) => x.id === rel.parafia)
                        if (!p) return null
                        return <span key={`${rel.parafia}-${i}`}>
                            <Link href={`/parafie/${p.id}`} className="odn">{p.nazwa}</Link>
                            <span className="ot-drobne"> · {zapiszOkres(rel.od, rel.do)}</span>
                            {rel.zrodlo && <span className="ot-drobne"> · źródło: <ZAdresami tekst={rel.zrodlo} /></span>}
                        </span>
                    })}
                </span>
            )}</W>
            <W e="rodzaj">{rodzaj}</W>
            <W e="lata istnienia">{o.czas ? formatujEdtf(o.czas) : null}</W>
            <W e="stan">{o.istnieje ? 'istnieje' : 'nie istnieje'}</W>
            <W e="inne nazwy">{o.inneNazwy.length ? o.inneNazwy.join(' · ') : null}</W>
            <W e="położenie">
                {o.wspolrzedne
                    ? <OtworzWMapach wspolrzedne={o.wspolrzedne} przyblizone={o.przyblizone} />
                    : <span className="text-[var(--tekst-opis)]">nieustalone</span>}
            </W>
            {o.zdjecia.length > 1 && <Czesc tytul="fotografie">{o.zdjecia.length}</Czesc>}
            {o.zdjecia.length > 1 && <WCaly><GaleriaZdjec zdjecia={o.zdjecia} tytul={o.nazwa} /></WCaly>}
        </Tabela>
    )
    const naglowek = (
        <NaglowekKarty
            sciezka={[]}
            tytul={<span className="tytul-z-tarcza"><span className="tytul-tarcza" dangerouslySetInnerHTML={{ __html: tarczaObiektu(o.rodzaj, rodzaj, 32, o.istnieje) }} />{o.nazwa}</span>}
            linia={[rodzaj, wies ? { tekst: wies.nazwa, href: `/miejsca/${wies.id}` } : null, o.czas ? formatujEdtf(o.czas) : null, o.istnieje ? 'istnieje' : 'nie istnieje']}
            lead={lead || undefined}
        />
    )
    // pasek boczny: zdjęcie (gdy jest), inaczej mapa położenia (bez planu – plan ma własną mapę w widoku obiektu)
    const bok = foto ? (
        <figure className="osoba-portret">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <a href={`${foto.plik}?w=1800`} target="_blank" rel="noopener" title="powiększ zdjęcie"><img src={`${foto.plik}?w=480`} alt={foto.podpis || o.nazwa} /></a>
            <figcaption>{podpisFoto}{o.zdjecia.length > 1 && <>{podpisFoto && ' · '}<a href={`#${idCzesci('fotografie')}`} className="odn">wszystkie ({o.zdjecia.length}) ↓</a></>}</figcaption>
        </figure>
    ) : mapa && !glowny ? <MapaKarty mapa={mapa} wysokosc={300} podpis="położenie" /> : undefined

    return (
        <Strona uklad="karta" nrKat={nrKat} sciezka={[{ tekst: 'miejsca', href: '/miejsca' }, ...(wies ? [{ tekst: wies.nazwa, href: `/miejsca/${wies.id}` }] : [])]} akcje={<><CopyLinkButton sciezka={`/obiekty/${o.id}`} /><PrzyciskDrukuj /></>} naglowek={naglowek} bok={bok} spis={<SpisTresci pozycje={spis} />}>
            {/* z planem (np. cmentarz): plan na całą szerokość z zakładkami, dane obok; bez planu – tabela w kolumnie */}
            {glowny ? <PelnaSzerokosc><WidokObiektu plan={glowny.plan} ustawienia={ustawienia} zalogowany={glowny.poziom === 'bliscy'} osoby={osobyGlownego} mapa={mapa} info={tabelaPodstawowa} /></PelnaSzerokosc> : tabelaPodstawowa}

            {maTekst(opisHtml) ? (
                <Sekcja tytul="opis" id={idCzesci('opis')}>
                    <Tresc html={opisHtml} />
                </Sekcja>
            ) : pomoc.has('bez-opisu') && (
                <Sekcja tytul="opis" id={idCzesci('opis')}>
                    {/* ten sam tekst co na karcie miejscowości (komentarz właściciela na makiecie 17.11) */}
                    <p className="tekst-opis">Opis tego obiektu jest w opracowaniu. Jeśli masz na ten temat wiedzę –{' '}
                        <Zgloszenie rodzaj="poprawka" wariant="link" etykieta="pomóż go uzupełnić" adres={`/obiekty/${o.id}`} tytul={`${o.nazwa} – opis`} brak="bez-opisu" zgoda
                            podpowiedz="Co wiesz o tym obiekcie – kiedy powstał, kto go postawił, co się z nim działo? Zdjęcia możesz wysłać mailem." />
                        . Wspólnie możemy tworzyć ten serwis.
                    </p>
                </Sekcja>
            )}

            {/* uwaga 16.11: „jak cytować” na każdej karcie, więc tabela jest zawsze */}
            {(
                <Tabela etykieta={`${o.nazwa} – powiązane i źródła`}>
                    {jestPowiazane && <Czesc tytul="powiązane" />}
                    <W e="materiały">{mat.length > 0 && <KrotkieMaterialy materialy={mat} />}</W>
                    <WierszeWystapien w={wyst} />
                    {planyObiektu.length > 1 && <><Czesc tytul="plany">{odmiana(planyObiektu.length, ['plan', 'plany', 'planów'])}</Czesc><WCaly><ListaPlanow plany={planyObiektu} /></WCaly></>}
                    <Powiazania dane={siec} />
                    <CzescJakCytowac plik={o.id} dane={daneCytatu({ tytul: o.nazwa, sciezka: `/obiekty/${o.id}`, nrKat, rodzaj: 'obiekt' })} />
                    <Zrodla pozycje={[
                        ...o.zrodla.map((z, i) => <ZAdresami key={`z${i}`} tekst={z} />),
                        ...o.zdjecia.filter((z) => z.autor || z.prawa).map((z, i) => <span key={`f${i}`}>fotografia{z.podpis ? ` „${z.podpis}”` : ''}{z.data ? `, ${z.data}` : ''}: {[z.autor, z.prawa].filter(Boolean).join(', ')}</span>),
                    ]} />
                </Tabela>
            )}

            <ZglosPoprawke adres={`/obiekty/${o.id}`} tytul={o.nazwa} pytanie="Coś się nie zgadza albo wiesz więcej o tym obiekcie?" />
        </Strona>
    )
}
