import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from 'next-view-transitions'
import { nazwy, opowiesciDlaTematu, materialyDla, powiazania, poziomCzytelnika, kontekstTresci, RODZAJE_TEMATOW, temat, tematy } from '@/lib/archiwum'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml, zajawka } from '@/lib/markdoc'
import { Sekcja, Strona, Tresc, maTekst } from '../../components/Uklad'
import { Czesc, KrotkieMaterialy, KrotkieWpisy, LiniaKarty, NaglowekKarty, Tabela, W, ZAdresami, Zrodla, ZglosPoprawke } from '../../components/Karta'
import CopyLinkButton from '../../components/CopyLinkButton'
import Powiazania from '../../components/Powiazania'

export const dynamic = 'force-dynamic'

type Parametry = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Parametry): Promise<Metadata> {
    const { slug } = await params
    const t = await temat(slug, await poziomCzytelnika())
    return { title: t ? `${t.nazwa} · tematy · odniepamieci.pl` : 'odniepamieci.pl' }
}

// Karta tematu – wspólny układ kart, wariant bez obrazu: nagłówek na całą szerokość, tabela „w skrócie”, opis,
// powiązane (wpisy, materiały), źródła, zgłoszenie poprawki.
export default async function TematStrona({ params }: Parametry) {
    const { slug } = await params
    const poziom = await poziomCzytelnika()
    const t = await temat(slug, poziom)
    if (!t) notFound()
    const n = await nazwy(poziom)
    const ktx = await kontekstTresci(poziom)
    const opow = await opowiesciDlaTematu(t.id, poziom)
    const miejscaTematu = t.miejsca.filter((id) => n.miejsca.has(id))
    const siec = await powiazania('temat', t.id, poziom)
    const mat = await materialyDla('temat', t.id, poziom)
    // tematy powiązane: dzielące miejsca z tym tematem (najwyżej 6, najpierw z największą liczbą wspólnych)
    const wspolne = (await tematy(poziom))
        .filter((x) => x.id !== t.id)
        .map((x) => ({ x, ile: x.miejsca.filter((id) => t.miejsca.includes(id)).length }))
        .filter((p) => p.ile > 0)
        .sort((a, b) => b.ile - a.ile)
        .slice(0, 6)
        .map((p) => p.x)
    const opisHtml = naHtml(t.opis, ktx)
    const lead = zajawka(t.opis, 240, ktx.rozwiaz)
    const wpisyWTekstach = siec.odnosniki.filter((z) => z.zrodlo.rodzaj !== 'wpis' || !opow.some((o) => o.id === z.zrodlo.id))

    return (
        <Strona akcje={<CopyLinkButton sciezka={`/tematy/${t.id}`} />}>
            <NaglowekKarty
                sciezka={[{ tekst: 'tematy', href: '/tematy' }]}
                tytul={t.nazwa}
                linia={[RODZAJE_TEMATOW[t.rodzaj] ?? t.rodzaj, t.czas ? formatujEdtf(t.czas) : null, t.inneNazwy.length ? `także: ${t.inneNazwy.join(', ')}` : null]}
                lead={lead ? <p style={{ margin: 0 }}>{lead}</p> : undefined}
            >
                {maTekst(opisHtml) && <a href="#opis" className="odn w-fit" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>cały opis ↓</a>}
            </NaglowekKarty>

            {(t.czas || miejscaTematu.length > 0 || wspolne.length > 0) && (
                <Tabela etykieta={`${t.nazwa} – w skrócie`}>
                    <Czesc tytul="w skrócie" />
                    <W e="okres">{t.czas ? formatujEdtf(t.czas) : null}</W>
                    <W e={miejscaTematu.length > 1 ? 'miejsca' : 'miejsce'}>{miejscaTematu.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[miejscaTematu.map((id) => ({ tekst: n.miejsca.get(id), href: `/miejsca/${id}` }))]} />}</W>
                    <W e="powiązane tematy">{wspolne.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[wspolne.map((x) => ({ tekst: x.nazwa, href: `/tematy/${x.id}` }))]} />}</W>
                </Tabela>
            )}

            <section id="opis" className="flex flex-col scroll-mt-6" style={{ gap: 10 }}>
                <h2 className="font-bold lowercase" style={{ fontSize: 'calc(20px * var(--font-scale, 1))' }}>opis</h2>
                <Tresc html={opisHtml} pusta="opis tematu nie został jeszcze dodany." />
            </section>

            {(opow.length > 0 || mat.length > 0 || t.zrodla.length > 0) && (
                <Tabela etykieta={`${t.nazwa} – powiązane i źródła`}>
                    {(opow.length > 0 || mat.length > 0) && <Czesc tytul="powiązane">{[opow.length && 'wpisy', mat.length && 'materiały'].filter(Boolean).join(' · ')}</Czesc>}
                    <W e="wpisy">{opow.length > 0 && <KrotkieWpisy wpisy={opow} />}</W>
                    <W e="materiały">{mat.length > 0 && <KrotkieMaterialy materialy={mat} />}</W>
                    <Zrodla pozycje={t.zrodla.map((z, i) => <ZAdresami key={i} tekst={z} />)} />
                </Tabela>
            )}

            <Powiazania dane={{ odnosniki: wpisyWTekstach, wzmianki: siec.wzmianki }} />

            {opow.length === 0 && mat.length === 0 && (
                <Sekcja tytul="powiązane">
                    <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>Nie ma jeszcze wpisów ani materiałów na ten temat. <Link href="/#pomoz" className="odn">Masz coś do dodania?</Link></p>
                </Sekcja>
            )}

            <ZglosPoprawke adres={`/tematy/${t.id}`} tytul={t.nazwa} pytanie="Coś się nie zgadza albo możesz coś dodać do tego tematu?" />
        </Strona>
    )
}
