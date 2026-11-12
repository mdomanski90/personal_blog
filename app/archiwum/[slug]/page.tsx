import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { kontekstTresci, material, nazwy, obiekty, powiazania, poziomCzytelnika } from '@/lib/archiwum'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml } from '@/lib/markdoc'
import { typPliku } from '@/lib/pliki'
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

    return (
        <Strona>
            <TytulStrony
                sciezka={[{ tekst: 'archiwum', href: '/archiwum' }]}
                akcje={<><Link href="/archiwum" className={`${RAMKA} lowercase !no-underline text-current hover:bg-muted inline-flex items-center`} style={{ fontSize: 'calc(14px * var(--font-scale, 1))', minHeight: 'calc(28px * var(--font-scale, 1))', padding: '0 10px', borderRadius: 7 }}>← archiwum</Link><CopyLinkButton sciezka={`/archiwum/${m.id}`} /></>}
            >
                {m.nazwa}
            </TytulStrony>
            <Metki elementy={[RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj, m.czas ? formatujEdtf(m.czas) : null, m.widocznosc === 'bliscy' ? 'dla bliskich' : null]} />

            {m.plik && (
                <figure className="flex flex-col" style={{ gap: 6, margin: '0 0 0.5rem' }}>
                    {typ === 'obraz' && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.plik} data-zoom-src={m.plik} alt={m.nazwa} className={`${RAMKA} w-full cursor-zoom-in`} style={{ borderRadius: 8 }} />
                    )}
                    {typ === 'dzwiek' && <audio controls preload="metadata" src={m.plik} className="w-full" />}
                    {typ === 'film' && <video controls preload="metadata" src={m.plik} className="w-full" style={{ borderRadius: 8 }} />}
                    {typ === 'pdf' && <iframe src={m.plik} title={m.nazwa} className={`${RAMKA} w-full`} style={{ height: '75vh', borderRadius: 8 }} />}
                    <a href={m.plik} className="lowercase w-fit" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }} download>
                        pobierz plik
                    </a>
                </figure>
            )}

            <div>
                {m.tworca && <Wiersz etykieta="autor / wytwórca">{m.tworca}</Wiersz>}
                {m.pochodzenie && <Wiersz etykieta="pochodzenie"><span className="whitespace-pre-line">{m.pochodzenie}</span></Wiersz>}
                {m.sygnatura && <Wiersz etykieta="sygnatura">{m.sygnatura}</Wiersz>}
                {m.jezyk && <Wiersz etykieta="język">{m.jezyk}</Wiersz>}
                {m.prawa && <Wiersz etykieta="prawa">{m.prawa}</Wiersz>}
            </div>

            <Tresc html={naHtml(m.opis, await kontekstTresci(poziom))} pusta={null} />

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
        </Strona>
    )
}
