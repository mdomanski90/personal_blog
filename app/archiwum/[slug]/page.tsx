import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { kontekstTresci, material, nazwy, obiekty, objasnieniaDoWidoku, powiazania, poziomCzytelnika } from '@/lib/archiwum'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml } from '@/lib/markdoc'
import { typPliku } from '@/lib/pliki'
import { rozdzielZrodla } from '@/lib/markdoc'
import PrzegladarkaDokumentu from '../../components/PrzegladarkaDokumentu'
import TekstyZrodla from '../../components/TekstyZrodla'
import JakCytowac from '../../components/JakCytowac'
import { ADRES_STRONY, AUTOR_STRONY } from '@/lib/strona'
import { RAMKA, Strona, Tresc, maTekst } from '../../components/Uklad'
import { Czesc, LiniaKarty, NaglowekKarty, Tabela, W, WCaly, ZAdresami, Zrodla, ZglosPoprawke } from '../../components/Karta'
import SkanZTekstem from '../../components/SkanZTekstem'
import CopyLinkButton from '../../components/CopyLinkButton'
import Powiazania from '../../components/Powiazania'

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
    // skan obok tekstu: strony skanu z transkrypcją albo tłumaczeniem
    const skan = m.strony.length > 0
    const obj = skan ? await objasnieniaDoWidoku(m.id, poziom) : []
    const obok = skan && maTeksty
    const oryginal = [m.pochodzenie, m.sygnatura].filter(Boolean).join(', ')

    const rok = m.czas ? formatujEdtf(m.czas) : null
    const ileStr = m.strony.length > 1 ? `${m.strony.length} ${m.strony.length % 10 >= 2 && m.strony.length % 10 <= 4 && (m.strony.length % 100 < 12 || m.strony.length % 100 > 14) ? 'strony' : 'stron'}` : null
    const reszta = naHtml(cz.reszta, ktx)
    const wpisyZMat = siec.odnosniki.filter((z) => z.zrodlo.rodzaj === 'wpis')
    const inneOdnosniki = siec.odnosniki.filter((z) => z.zrodlo.rodzaj !== 'wpis')

    return (
        <Strona szeroka={obok} akcje={<CopyLinkButton sciezka={`/archiwum/${m.id}`} />}>
            <div style={obok ? { maxWidth: '52rem' } : undefined}>
                <NaglowekKarty
                    sciezka={[{ tekst: 'archiwum', href: '/archiwum' }]}
                    tytul={m.nazwa}
                    linia={[RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj, rok && !m.nazwa.includes(rok) ? rok : null, ileStr, m.jezyk || null, m.widocznosc === 'bliscy' ? 'dla bliskich' : null]}
                    lead={maTekst(reszta) ? <Tresc html={reszta} pusta={null} /> : undefined}
                />
            </div>

            {obok ? (
                <SkanZTekstem strony={m.strony} objasnienia={obj} tytul={m.nazwa} {...teksty} opracowal={m.opracowal || undefined} />
            ) : skan ? (
                <PrzegladarkaDokumentu strony={m.strony} objasnienia={obj} tytul={m.nazwa} />
            ) : m.plik && (
                <figure className="flex flex-col" style={{ gap: 6, margin: 0 }}>
                    {typ === 'dzwiek' && <audio controls preload="metadata" src={m.plik} className="w-full" />}
                    {typ === 'film' && <video controls preload="metadata" src={m.plik} className="w-full" style={{ borderRadius: 8 }} />}
                    {typ === 'pdf' && <iframe src={m.plik} title={m.nazwa} className={`${RAMKA} w-full`} style={{ height: '75vh', borderRadius: 8 }} />}
                    {<a href={m.plik} className="odn lowercase w-fit" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }} download>pobierz plik</a>}
                </figure>
            )}
            {!obok && maTeksty && <TekstyZrodla {...teksty} />}

            <Tabela etykieta={`${m.nazwa} – opis`}>
                {(m.sygnatura || m.pochodzenie || m.tworca || m.jezyk || m.prawa || m.przekazal || m.opracowal) && <Czesc tytul="opis archiwalny" />}
                <W e="sygnatura">{m.sygnatura}</W>
                <W e="pochodzenie">{m.pochodzenie && <span className="whitespace-pre-line">{m.pochodzenie}</span>}</W>
                <W e="autor / wytwórca">{m.tworca}</W>
                <W e="język">{m.jezyk}</W>
                <W e="prawa">{m.prawa}</W>
                <W e="przekazał(a)">{m.przekazal}</W>
                <W e="opracował(a)">{m.opracowal}</W>

                {(miejscaM.length > 0 || tematyM.length > 0 || obiektyM.length > 0 || wpisyZMat.length > 0) && <Czesc tytul="dotyczy" />}
                <W e={miejscaM.length > 1 ? 'miejsca' : 'miejsce'}>{miejscaM.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[miejscaM.map((id) => ({ tekst: n.miejsca.get(id), href: `/miejsca/${id}` }))]} />}</W>
                <W e={tematyM.length > 1 ? 'tematy' : 'temat'}>{tematyM.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[tematyM.map((id) => ({ tekst: n.tematy.get(id), href: `/tematy/${id}` }))]} />}</W>
                <W e="przedstawia">{obiektyM.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[obiektyM.map((id) => ({ tekst: nazwyObiektow.get(id), href: `/obiekty/${id}` }))]} />}</W>
                <W e="we wpisach">{wpisyZMat.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[wpisyZMat.map((z) => ({ tekst: z.zrodlo.nazwa, href: z.zrodlo.adres }))]} />}</W>

                <Czesc tytul="jak cytować" />
                <WCaly>
                    <JakCytowac wTabeli plik={m.id} dane={{ tytul: m.czas && !m.nazwa.includes(formatujEdtf(m.czas)) ? `${m.nazwa}, ${formatujEdtf(m.czas)}` : m.nazwa, adres: `${ADRES_STRONY}/archiwum/${m.id}`, opracowal: m.opracowal || AUTOR_STRONY, autor: m.tworca || undefined, rok: m.czas?.slice(0, 4), oryginal: oryginal || undefined, rodzaj: 'material' }} />
                </WCaly>
                <Zrodla pozycje={[
                    oryginal && <>oryginał: {oryginal}</>,
                    ...m.zrodla.map((z, i) => <ZAdresami key={i} tekst={z} />),
                ]} />
            </Tabela>

            {inneOdnosniki.length > 0 && <Powiazania dane={{ odnosniki: inneOdnosniki, wzmianki: [] }} />}

            <ZglosPoprawke adres={`/archiwum/${m.id}`} tytul={m.nazwa} pytanie="Coś się nie zgadza w opisie albo transkrypcji? „To nie Piotr, tylko Paweł” wystarczy." />
        </Strona>
    )
}
