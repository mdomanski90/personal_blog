import type { Metadata } from 'next'
import { brakLubPrzekierowanie } from '@/lib/przekierowania'
import { Link } from 'next-view-transitions'
import { nazwy, opowiesc, powiazania, poziomCzytelnika, kontekstTresci, materialy } from '@/lib/archiwum'
import { adresMiniatury, miniaturaWBoku } from '@/lib/zapowiedzi'
import { pozycjaKadru } from '@/lib/kadr'
import { naHtml, naglowkiZHtml, podzielWstawki } from '@/lib/markdoc'
import { PelnaSzerokosc, Strona, Tresc, TytulStrony } from '../../components/Uklad'
import Powiazania, { czesciPowiazan } from '../../components/Powiazania'
import { LiniaWpisu } from '../../components/MetkiWpisu'
import { daneCytatu } from '@/lib/cytowanie'
import { CzescJakCytowac, Tabela, ZglosPoprawke, spisCzesci } from '../../components/Karta'
import CopyLinkButton from '../../components/CopyLinkButton'
import SpisTresci from '../../components/SpisTresci'
import WstawkaMaterialu from '../../components/WstawkaMaterialu'
import { PrzyciskDrukuj } from '../../components/Druk'
import { numerKat } from '@/lib/katalog/dane'
import { LiniaNrKat } from '../../components/NrKat'
import { TytulSekcji } from '../../components/Wzorce'
import Zgloszenie from '../../components/Zgloszenie'

export const dynamic = 'force-dynamic'

type Parametry = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Parametry): Promise<Metadata> {
    const { slug } = await params
    const o = await opowiesc(slug, await poziomCzytelnika())
    return { title: o ? `${o.tytul} · odniepamieci.pl` : 'odniepamieci.pl', description: o?.zajawka }
}

/**
 * JW-2 (JW-08, JW-13, JW-15): wpis w układzie karty – kolumna tekstu 66 znaków, spis treści z nagłówków autora
 * + „jak cytować” w pasku bocznym; materiały ze skanem osadzone w treści pokazują ten sam widok co karta materiału
 * (SkanZTekstem) na pełnej szerokości, a spis wraca po nich; jedno „kopiuj link” (w pasku akcji).
 */
export default async function OpowiescStrona({ params }: Parametry) {
    const { slug } = await params
    const poziom = await poziomCzytelnika()
    const o = await opowiesc(slug, poziom)
    if (!o) return brakLubPrzekierowanie('wpisy', slug)
    const n = await nazwy(poziom)
    const siec = await powiazania('wpis', o.id, poziom)
    const nrKat = numerKat('wpis', o.id)
    const html = naHtml(o.tresc, await kontekstTresci(poziom))
    const odcinki = podzielWstawki(html)
    const naglowki = naglowkiZHtml(html)
    // wpis bez nagłówków – bez spisu (decyzja 16.11)
    const dalej = spisCzesci([...czesciPowiazan({ odnosniki: siec.odnosniki, wzmianki: [] }), 'jak cytować'])
    const spis = naglowki.length ? [...naglowki, ...dalej] : []
    // makieta 17.11 (P1): miniatura wpisu (cover albo pierwszy materiał) w gnieździe „bok” – jak zdjęcie na karcie obiektu
    const mat = o.miniatura ? (await materialy(poziom)).find((m) => m.id === o.miniatura) : undefined
    const obraz = adresMiniatury(mat, 480)
    // uwaga 17.11 (wariant B): przy krótkim wstępie przed wstawką ze skanem miniatura byłaby dublem dokumentu – bez niej
    const bok = mat && obraz && miniaturaWBoku(odcinki) ? (
        <figure className="osoba-portret kadr-poziomy">
            <Link href={`/archiwum/${mat.id}`} tabIndex={-1} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={obraz} alt="" style={/* styl-dynamiczny: kadr miniatury z danych materiału */ { objectPosition: pozycjaKadru(mat.kadr) }} />
            </Link>
            <figcaption>{mat.nazwa} · <Link href={`/archiwum/${mat.id}`} className="odn">w archiwum →</Link></figcaption>
        </figure>
    ) : undefined

    const naglowek = (
        <>
            <TytulStrony bezOkruszkow>{o.tytul}</TytulStrony>
            <LiniaWpisu wpis={o} nazwy={n} />
            <LiniaNrKat nr={nrKat} />
            {/* makieta 17.11 (P2): zapowiedź redakcyjna pod metryczką – jak lead na kartach */}
            {o.zapowiedz && <div className="osoba-lead"><p className="m-0">{o.zapowiedz}</p></div>}
        </>
    )
    return (
        <Strona uklad="karta" nrKat={nrKat} sciezka={[{ tekst: 'wpisy', href: '/wpisy' }]} akcje={<><CopyLinkButton sciezka={`/wpisy/${o.id}`} /><PrzyciskDrukuj /></>} naglowek={naglowek} bok={bok} spis={spis.length ? <SpisTresci pozycje={spis} /> : undefined}>
            {odcinki.map((cz, i) => ('material' in cz
                ? <PelnaSzerokosc key={i}><WstawkaMaterialu id={cz.material} poziom={poziom} podpis={cz.podpis} strona={cz.strona} /></PelnaSzerokosc>
                : <article key={i} className="wpis-tresc"><Tresc html={cz.html} /></article>))}
            {/* uwaga 16.11: „jak cytować” jako część tabeli karty – jak na pozostałych kartach */}
            <Tabela etykieta={`${o.tytul} – jak cytować`}>
                <Powiazania dane={{ odnosniki: siec.odnosniki, wzmianki: [] }} />
                <CzescJakCytowac plik={o.id} dane={daneCytatu({ tytul: o.tytul, sciezka: `/wpisy/${o.id}`, nrKat, rodzaj: 'wpis', rok: o.data?.slice(0, 4) })} />
            </Tabela>
            {/* D-SG-14 / HOME-D-07 (etap R): autorskie zaproszenie pod wybranym wpisem – tylko gdy autor je wpisał (pole „Zaproszenie pod wpisem”) */}
            {o.zaproszenie && (
                <section className="glowna-pomoz wpis-zaproszenie" aria-labelledby="zaproszenie-t">
                    <div className="glowna-pomoz-wstep"><TytulSekcji id="zaproszenie-t">dopowiedz tę historię</TytulSekcji></div>
                    <div className="wpis-zaproszenie-tresc">
                        <p>{o.zaproszenie}</p>
                        <Zgloszenie rodzaj="wspomnienie" wariant="link" etykieta="opowiedz →" adres={`/wpisy/${o.id}`} tytul={`${o.tytul} – zaproszenie`} podpowiedz={o.zaproszenie} zgoda />
                    </div>
                </section>
            )}
            {/* tekst właściciela (komentarz na makiecie 17.11) */}
            <ZglosPoprawke adres={`/wpisy/${o.id}`} tytul={o.tytul} pytanie="Masz więcej informacji na ten temat albo znasz historię z innej perspektywy?" etykieta="napisz" dopisek="– wspólnie możemy tworzyć ten serwis." />
        </Strona>
    )
}
