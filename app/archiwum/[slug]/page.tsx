import type { Metadata } from 'next'
import { brakLubPrzekierowanie } from '@/lib/przekierowania'
import { kontekstTresci, material, nazwy, obiekty, objasnieniaDoWidoku, powiazania, poziomCzytelnika } from '@/lib/archiwum'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml } from '@/lib/markdoc'
import { typPliku } from '@/lib/pliki'
import { rozdzielZrodla } from '@/lib/markdoc'
import PrzegladarkaDokumentu from '../../components/PrzegladarkaDokumentu'
import TekstyZrodla from '../../components/TekstyZrodla'
import { daneCytatu } from '@/lib/cytowanie'
import { RAMKA, PelnaSzerokosc, Strona, Tresc, maTekst } from '../../components/Uklad'
import { Czesc, CzescJakCytowac, LiniaKarty, NaglowekKarty, Tabela, W, WCaly, ZAdresami, Zrodla, ZglosPoprawke, spisCzesci } from '../../components/Karta'
import SpisTresci from '../../components/SpisTresci'
import { PastylkaOsoby } from '../../components/Wzorce'
import { PrzyciskDrukuj } from '../../components/Druk'
import { odnosnikiInstytucji, odnosnikiOsob } from '@/lib/powiazania-karty'
import { parafie } from '@/lib/archiwum'
import SkanZTekstem from '../../components/SkanZTekstem'
import { rekonstrukcjaMaterialu } from '@/lib/plany/serwer'
import { opisPlanu } from '@/lib/plany/katalog'
import { katalog } from '@/lib/plany/typy'
import CopyLinkButton from '../../components/CopyLinkButton'
import Powiazania from '../../components/Powiazania'
import { zbiory } from '@/lib/paczka5'
import { Link } from 'next-view-transitions'
import { widoczne } from '@/lib/archiwum'
import { numerKat } from '@/lib/katalog/dane'
import { WierszNrKat } from '../../components/NrKat'

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
    if (!m) return brakLubPrzekierowanie('archiwum', slug)
    const n = await nazwy(poziom)
    const nazwyObiektow = new Map((await obiekty(poziom)).map((o) => [o.id, o.nazwa]))
    const siec = await powiazania('material', m.id, poziom)
    const dostepneZbiory = new Map((await zbiory(poziom)).map((z) => [z.id, z.nazwa])) // PACZKA5_2026
    // JW-16: osoby i instytucje z nazwami (nie identyfikatorami), tylko widoczne dla czytelnika
    const stanOsobP5 = await (await import('@/lib/osoby/dane')).stanOsob()
    const osobyM = odnosnikiOsob(m.osobyIds, stanOsobP5.drzewo.osoby, (id) => widoczne(stanOsobP5.widocznosc(id), poziom))
    const instytucjeM = odnosnikiInstytucji(m.instytucje, await parafie())
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
    // PH1 · jeden widok dokumentu: plan zrekonstruowany z tego materiału jako warstwa skanu i część karty „rekonstrukcja”
    const rek = skan ? await rekonstrukcjaMaterialu(m.id) : null
    const opisRek = rek ? opisPlanu(rek.plan, katalog(rek.ustawienia)) : null
    const oryginal = [m.pochodzenie, m.sygnatura].filter(Boolean).join(', ')
    const podpisZrodla = m.podpisZrodla || [m.miejscePrzechowywania, m.sygnatura, m.prawa].filter(Boolean).join(' · ')

    const rok = m.czas ? formatujEdtf(m.czas) : null
    const ileStr = m.strony.length > 1 ? `${m.strony.length} ${m.strony.length % 10 >= 2 && m.strony.length % 10 <= 4 && (m.strony.length % 100 < 12 || m.strony.length % 100 > 14) ? 'strony' : 'stron'}` : null
    const reszta = naHtml(cz.reszta, ktx)
    const wpisyZMat = siec.odnosniki.filter((z) => z.zrodlo.rodzaj === 'wpis')
    const inneOdnosniki = siec.odnosniki.filter((z) => z.zrodlo.rodzaj !== 'wpis')
    const nrKat = numerKat('material', m.id)
    const jestOpis = !!nrKat || !!(m.sygnatura || m.pochodzenie || m.tworca || m.jezyk || m.prawa || m.przekazal || m.opracowal || m.miejscePrzechowywania || m.transkrypcja || m.zbiory.length || osobyM.length || instytucjeM.length)
    const jestDotyczy = miejscaM.length > 0 || tematyM.length > 0 || obiektyM.length > 0 || wpisyZMat.length > 0
    const spis = spisCzesci([jestOpis && 'opis archiwalny', jestDotyczy && 'dotyczy', rek && 'rekonstrukcja', 'jak cytować', (oryginal || m.zrodla.length > 0) && 'źródła'])
    const naglowek = (
        <NaglowekKarty
            sciezka={[]}
            tytul={m.nazwa}
            linia={[RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj, rok && !m.nazwa.includes(rok) ? rok : null, ileStr, m.jezyk || null, m.widocznosc === 'bliscy' ? 'dla bliskich' : null]}
            lead={maTekst(reszta) ? <Tresc html={reszta} pusta={null} /> : undefined}
        />
    )

    return (
        <Strona uklad="karta" nrKat={nrKat} sciezka={[{ tekst: 'archiwum', href: '/archiwum' }]} akcje={<><CopyLinkButton sciezka={`/archiwum/${m.id}`} /><PrzyciskDrukuj /></>} naglowek={naglowek} spis={<SpisTresci pozycje={spis} />}>
            {/* JW-2: skan z tekstem na pełnej szerokości (skan = kolumna tekstu, tekst od linii paska bocznego); spis treści wraca po nim */}
            {obok ? (
                <PelnaSzerokosc>
                    <SkanZTekstem strony={m.strony} objasnienia={obj} tytul={m.nazwa} {...teksty} opracowal={m.opracowal || undefined} rekonstrukcja={rek ?? undefined} />
                    {podpisZrodla && <p className="podpis-zrodla"><span>źródło:</span> {podpisZrodla}</p>}
                </PelnaSzerokosc>
            ) : skan ? (
                <PelnaSzerokosc>
                    <PrzegladarkaDokumentu strony={m.strony} objasnienia={obj} tytul={m.nazwa} rekonstrukcja={rek ?? undefined} />
                    {podpisZrodla && <p className="podpis-zrodla"><span>źródło:</span> {podpisZrodla}</p>}
                </PelnaSzerokosc>
            ) : m.plik && (
                <figure className="material-plik">
                    {typ === 'dzwiek' && <audio controls preload="metadata" src={m.plik} className="w-full" />}
                    {typ === 'film' && <video controls preload="metadata" src={m.plik} className="w-full material-plik-film" />}
                    {typ === 'pdf' && <iframe src={m.plik} title={m.nazwa} className={`${RAMKA} w-full material-plik-pdf`} />}
                    {<a href={m.plik} className="odn lowercase w-fit material-plik-pobierz" download>pobierz plik</a>}
                    {/* P7C-1 (JV-18): źródło skanu/mapy zawsze widoczne pod obrazem, bez klikania */}
                    {podpisZrodla && <figcaption className="podpis-zrodla"><span>źródło:</span> {podpisZrodla}</figcaption>}
                </figure>
            )}
            {!obok && maTeksty && <TekstyZrodla {...teksty} />}

            <Tabela etykieta={`${m.nazwa} – opis`}>
                {jestOpis && <Czesc tytul="opis archiwalny" />}
                <WierszNrKat nr={nrKat} />
                <W e="sygnatura">{m.sygnatura}</W>
                <W e="miejsce przechowywania">{m.miejscePrzechowywania}</W>
                <W e="transkrypcja">{m.transkrypcja && <span className="whitespace-pre-wrap">{m.transkrypcja}</span>}</W>
                <W e="zbiory">{m.zbiory.filter(id => dostepneZbiory.has(id)).map(id => <span key={id} className="block"><Link className="odn" href={`/archiwum/zbiory/${id}`}>{dostepneZbiory.get(id)}</Link></span>)}</W>
                <W e={osobyM.length > 1 ? 'osoby' : 'osoba'}>{osobyM.length > 0 && <span className="ot-osoby">{osobyM.map((o) => <PastylkaOsoby key={o.id} href={o.href} plec={o.plec}>{o.nazwa}</PastylkaOsoby>)}</span>}</W>
                <W e={instytucjeM.length > 1 ? 'instytucje' : 'instytucja'}>{instytucjeM.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[instytucjeM.map((i) => ({ tekst: i.nazwa, href: i.href }))]} />}</W>
                <W e="pochodzenie">{m.pochodzenie && <span className="whitespace-pre-line">{m.pochodzenie}</span>}</W>
                <W e="autor / wytwórca">{m.tworca}</W>
                <W e="język">{m.jezyk}</W>
                <W e="prawa">{m.prawa}</W>
                <W e="przekazał(a)">{m.przekazal}</W>
                <W e="opracował(a)">{m.opracowal}</W>

                {jestDotyczy && <Czesc tytul="dotyczy" />}
                <W e={miejscaM.length > 1 ? 'miejsca' : 'miejsce'}>{miejscaM.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[miejscaM.map((id) => ({ tekst: n.miejsca.get(id), href: `/miejsca/${id}` }))]} />}</W>
                <W e={tematyM.length > 1 ? 'tematy' : 'temat'}>{tematyM.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[tematyM.map((id) => ({ tekst: n.tematy.get(id), href: `/tematy/${id}` }))]} />}</W>
                <W e="przedstawia">{obiektyM.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[obiektyM.map((id) => ({ tekst: nazwyObiektow.get(id), href: `/obiekty/${id}` }))]} />}</W>
                <W e="we wpisach">{wpisyZMat.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[wpisyZMat.map((z) => ({ tekst: z.zrodlo.nazwa, href: z.zrodlo.adres }))]} />}</W>

                {rek && opisRek && (
                    <>
                        <Czesc tytul="rekonstrukcja" id="rekonstrukcja">{opisRek.prawa}</Czesc>
                        <W e="plan">{rek.plan.tytul}</W>
                        {opisRek.pola.map(([e, v]) => <W key={e} e={e}>{v}</W>)}
                        <W e="opis">{rek.plan.opis}</W>
                        <W e="prawa do rekonstrukcji">{rek.plan.prawa}</W>
                        <WCaly><span className="ot-drobne">Rekonstrukcję widać na skanie: przełącznik „skan / skan + plan / plan” nad obrazem{rek.podklad.strona > 0 ? ` (strona ${rek.podklad.strona + 1})` : ''}.</span></WCaly>
                    </>
                )}

                <CzescJakCytowac plik={m.id} dane={daneCytatu({ tytul: m.czas && !m.nazwa.includes(formatujEdtf(m.czas)) ? `${m.nazwa}, ${formatujEdtf(m.czas)}` : m.nazwa, sciezka: `/archiwum/${m.id}`, nrKat, rodzaj: 'material', opracowal: m.opracowal || undefined, autor: m.tworca || undefined, rok: m.czas?.slice(0, 4), oryginal: oryginal || undefined })} />
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
