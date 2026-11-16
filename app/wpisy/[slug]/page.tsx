import type { Metadata } from 'next'
import { brakLubPrzekierowanie } from '@/lib/przekierowania'
import { nazwy, opowiesc, powiazania, poziomCzytelnika, kontekstTresci } from '@/lib/archiwum'
import { naHtml, naglowkiZHtml, podzielWstawki } from '@/lib/markdoc'
import { PelnaSzerokosc, Strona, Tresc, TytulStrony } from '../../components/Uklad'
import Powiazania from '../../components/Powiazania'
import { LiniaWpisu } from '../../components/MetkiWpisu'
import JakCytowac from '../../components/JakCytowac'
import { ZglosPoprawke, idCzesci } from '../../components/Karta'
import CopyLinkButton from '../../components/CopyLinkButton'
import SpisTresci from '../../components/SpisTresci'
import WstawkaMaterialu from '../../components/WstawkaMaterialu'
import { PrzyciskDrukuj } from '../../components/Druk'
import { ADRES_STRONY, AUTOR_STRONY } from '@/lib/strona'
import { numerKat } from '@/lib/katalog/dane'
import { LiniaNrKat } from '../../components/NrKat'

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
    const spis = naglowki.length ? [...naglowki, { id: idCzesci('jak cytować'), tekst: 'jak cytować' }] : []

    const naglowek = (
        <>
            <TytulStrony bezOkruszkow>{o.tytul}</TytulStrony>
            <LiniaWpisu wpis={o} nazwy={n} />
            <LiniaNrKat nr={nrKat} />
        </>
    )
    return (
        <Strona uklad="karta" nrKat={nrKat} sciezka={[{ tekst: 'wpisy', href: '/wpisy' }]} akcje={<><CopyLinkButton sciezka={`/wpisy/${o.id}`} /><PrzyciskDrukuj /></>} naglowek={naglowek} spis={spis.length ? <SpisTresci pozycje={spis} /> : undefined}>
            {odcinki.map((cz, i) => ('material' in cz
                ? <PelnaSzerokosc key={i}><WstawkaMaterialu id={cz.material} poziom={poziom} /></PelnaSzerokosc>
                : <article key={i} className="wpis-tresc"><Tresc html={cz.html} /></article>))}
            {siec.odnosniki.length > 0 && <Powiazania dane={{ odnosniki: siec.odnosniki, wzmianki: [] }} />}
            <section id={idCzesci('jak cytować')} className="wpis-cytowanie">
                <JakCytowac plik={o.id} dane={{ tytul: o.tytul, adres: `${ADRES_STRONY}/wpisy/${o.id}`, opracowal: AUTOR_STRONY, rok: o.data?.slice(0, 4), rodzaj: 'wpis', nrKat, ...(nrKat ? { adres: `${ADRES_STRONY}/k/${nrKat}` } : {}) }} />
            </section>
            <ZglosPoprawke adres={`/wpisy/${o.id}`} tytul={o.tytul} pytanie="Coś się nie zgadza albo wiesz więcej?" />
        </Strona>
    )
}
