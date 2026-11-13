import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { kontekstTresci, material, nazwy, obiekty, powiazania, poziomCzytelnika } from '@/lib/archiwum'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml } from '@/lib/markdoc'
import { typPliku } from '@/lib/pliki'
import { rozdzielZrodla } from '@/lib/markdoc'
import PodgladSkanu from '../../components/PodgladSkanu'
import TekstyZrodla from '../../components/TekstyZrodla'
import JakCytowac from '../../components/JakCytowac'
import { ADRES_STRONY, AUTOR_STRONY } from '@/lib/strona'
import Zgloszenie from '../../components/Zgloszenie'
import { Kreski, Metki, RAMKA, Sekcja, Strona, Tresc, TytulStrony, Wiersz } from '../../components/Uklad'
import CopyLinkButton from '../../components/CopyLinkButton'
import Powiazania from '../../components/Powiazania'
import { Link } from 'next-view-transitions'

export const dynamic = 'force-dynamic'

type Parametry = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Parametry): Promise<Metadata> {
    const { slug } = await params
    const m = await material(slug, await poziomCzytelnika())
    if (!m) return { title: 'odniepamieci.pl' }
    return {
        title: `${m.nazwa} · archiwum · odniepamieci.pl`,
        // strony „dla bliskich” poza wyszukiwarkami
        ...(m.widocznosc !== 'publiczne' ? { robots: { index: false, follow: false } } : {}),
    }
}

export default async function MaterialStrona({ params }: Parametry) {
    const { slug } = await params
    const poziom = await poziomCzytelnika()
    const m = await material(slug, poziom)
    if (!m) notFound()
    const n = await nazwy(poziom)
    const nazwyObiektow = new Map((await obiekty(poziom)).map((o) => [o.id, o.nazwa]))
    const siec = await powiazania('material', m.id, poziom)
    const typ = typPliku(m.plik)
    const miejscaM = m.miejsca.filter((id) => n.miejsca.has(id))
    const tematyM = m.tematy.filter((id) => n.tematy.has(id))
    const obiektyM = m.obiekty.filter((id) => nazwyObiektow.has(id))
    const ktx = await kontekstTresci(poziom)
    const cz = rozdzielZrodla(m.opis)
    const teksty = { transkrypcja: naHtml(cz.transkrypcja, ktx), tlumaczenie: naHtml(cz.tlumaczenie, ktx), oryginal: naHtml(cz.oryginal, ktx) }
    const maTeksty = !!(teksty.transkrypcja || teksty.tlumaczenie || teksty.oryginal)
    // skan obok tekstu: obraz z transkrypcją albo tłumaczeniem
    const obok = typ === 'obraz' && maTeksty
    const oryginal = [m.pochodzenie, m.sygnatura].filter(Boolean).join(', ')

    return (
        <Strona szeroka={obok} akcje={<><Link href="/archiwum" className={`${RAMKA} lowercase !no-underline text-current hover:bg-muted inline-flex items-center`} style={{ fontSize: 'calc(14px * var(--font-scale, 1))', minHeight: 'calc(28px * var(--font-scale, 1))', padding: '0 10px', borderRadius: 7 }}>← archiwum</Link><CopyLinkButton sciezka={`/archiwum/${m.id}`} /></>}>
            <TytulStrony
                sciezka={[{ tekst: 'archiwum', href: '/archiwum' }]}
            >
                {m.nazwa}
            </TytulStrony>
            <Metki elementy={[RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj, m.czas ? formatujEdtf(m.czas) : null, m.widocznosc === 'bliscy' ? 'dla bliskich' : null]} />

            {obok ? (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
                    <section className="flex flex-col" style={{ gap: 6 }}><h2 className="font-bold lowercase" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>skan</h2><PodgladSkanu src={m.plik!} alt={m.nazwa} /></section>
                    <section className="flex flex-col" style={{ gap: 6 }}><TekstyZrodla {...teksty} />{m.opracowal && <span className="text-gray-500" style={{ fontSize: 'calc(12px * var(--font-scale, 1))' }}>transkrypcja i tłumaczenie: {m.opracowal} · luki w nawiasach […] przygaszone</span>}</section>
                </div>
            ) : m.plik && (
                <figure className="flex flex-col" style={{ gap: 6, margin: '0 0 0.5rem' }}>
                    {typ === 'obraz' && <PodgladSkanu src={m.plik} alt={m.nazwa} />}
                    {typ === 'dzwiek' && <audio controls preload="metadata" src={m.plik} className="w-full" />}
                    {typ === 'film' && <video controls preload="metadata" src={m.plik} className="w-full" style={{ borderRadius: 8 }} />}
                    {typ === 'pdf' && <iframe src={m.plik} title={m.nazwa} className={`${RAMKA} w-full`} style={{ height: '75vh', borderRadius: 8 }} />}
                    {typ !== 'obraz' && <a href={m.plik} className="lowercase w-fit" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }} download>pobierz plik</a>}
                </figure>
            )}

            <div>
                {m.tworca && <Wiersz etykieta="autor / wytwórca">{m.tworca}</Wiersz>}
                {m.pochodzenie && <Wiersz etykieta="pochodzenie"><span className="whitespace-pre-line">{m.pochodzenie}</span></Wiersz>}
                {m.sygnatura && <Wiersz etykieta="sygnatura">{m.sygnatura}</Wiersz>}
                {m.jezyk && <Wiersz etykieta="język">{m.jezyk}</Wiersz>}
                {m.prawa && <Wiersz etykieta="prawa">{m.prawa}</Wiersz>}
                {m.przekazal && <Wiersz etykieta="przekazał(a)">{m.przekazal}</Wiersz>}
                {m.opracowal && <Wiersz etykieta="opracował(a)">{m.opracowal}</Wiersz>}
            </div>

            {!obok && maTeksty && <TekstyZrodla {...teksty} />}
            <Tresc html={naHtml(cz.reszta, ktx)} pusta={null} />

            <JakCytowac plik={m.id} dane={{ tytul: m.czas && !m.nazwa.includes(formatujEdtf(m.czas)) ? `${m.nazwa}, ${formatujEdtf(m.czas)}` : m.nazwa, adres: `${ADRES_STRONY}/archiwum/${m.id}`, opracowal: m.opracowal || AUTOR_STRONY, autor: m.tworca || undefined, rok: m.czas?.slice(0, 4), oryginal: oryginal || undefined, rodzaj: 'material' }} />

            {miejscaM.length > 0 && (
                <Sekcja tytul="miejsca">
                    <Metki elementy={miejscaM.map((id) => ({ tekst: n.miejsca.get(id), href: `/miejsca/${id}` }))} />
                </Sekcja>
            )}
            {tematyM.length > 0 && (
                <Sekcja tytul="tematy">
                    <Metki elementy={tematyM.map((id) => ({ tekst: n.tematy.get(id), href: `/tematy/${id}` }))} />
                </Sekcja>
            )}
            {obiektyM.length > 0 && (
                <Sekcja tytul="przedstawia">
                    <Metki elementy={obiektyM.map((id) => ({ tekst: nazwyObiektow.get(id), href: `/obiekty/${id}` }))} />
                </Sekcja>
            )}

            {(siec.odnosniki.length > 0 || siec.wzmianki.length > 0) && <Kreski />}
            <Powiazania dane={{ odnosniki: siec.odnosniki, wzmianki: [] }} />

            <div className="border-t border-[#e7e2d8] dark:border-[#374151] flex flex-wrap items-center" style={{ paddingTop: '1rem', gap: '0.6rem 1rem' }}>
                <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>Coś się nie zgadza w opisie albo transkrypcji? „To nie Piotr, tylko Paweł” wystarczy.</span>
                <Zgloszenie rodzaj="poprawka" adres={`/archiwum/${m.id}`} tytul={m.nazwa} />
            </div>
        </Strona>
    )
}
