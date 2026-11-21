import type { Metadata } from 'next'
import { odmiana } from '@/lib/tekst'
import { brakLubPrzekierowanie } from '@/lib/przekierowania'
import { zakoduj } from '@/lib/email-ochrona'
import { adresKontaktowy, hasla, haslaWTekscie, kontekstTresci, material, nazwy, obiekty, objasnieniaDoWidoku, podpisZrodlaMaterialu, powiazania, poziomCzytelnika } from '@/lib/archiwum'
import { adresHasla, skrocZnaczenie } from '@/lib/slownik'
import { linkujHasla } from '@/lib/slownik-linki'
import { brakiDoPomocy } from '@/lib/wspoltworz-dane'
import { zadaniaMaterialu } from '@/lib/wspoltworz'
import Zgloszenie from '../../components/Zgloszenie'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml } from '@/lib/markdoc'
import { typPliku } from '@/lib/pliki'
import { rozdzielZrodla } from '@/lib/markdoc'
import PrzegladarkaDokumentu from '../../components/PrzegladarkaDokumentu'
import TekstyZrodla from '../../components/TekstyZrodla'
import { daneCytatu } from '@/lib/cytowanie'
import { RAMKA, PelnaSzerokosc, Strona, Tresc, maTekst } from '../../components/Uklad'
import { Czesc, CzescJakCytowac, WierszZglosil, LiniaKarty, NaglowekKarty, Tabela, W, WCaly, ZAdresami, Zrodla, ZglosPoprawke, spisCzesci } from '../../components/Karta'
import SpisTresci from '../../components/SpisTresci'
import { PastylkaFiltra, PastylkaOsoby } from '../../components/Wzorce'
import { PrzyciskDrukuj } from '../../components/Druk'
import { odnosnikiInstytucji, odnosnikiOsob } from '@/lib/powiazania-karty'
import { parafie } from '@/lib/archiwum'
import SkanZTekstem from '../../components/SkanZTekstem'
import { rekonstrukcjaMaterialu } from '@/lib/plany/serwer'
import { elementyLegendy } from '@/lib/plany/ph3'
import { opisPlanu } from '@/lib/plany/katalog'
import { katalog } from '@/lib/plany/typy'
import CopyLinkButton from '../../components/CopyLinkButton'
import Powiazania, { czesciPowiazan } from '../../components/Powiazania'
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
    const typyRek = rek ? katalog(rek.ustawienia) : new Map()
    const legendaRek = rek ? elementyLegendy(rek.plan.elementy.filter((e) => typyRek.has(e.typ))) : []
    const oryginal = [m.pochodzenie, m.sygnatura].filter(Boolean).join(', ')
    const podpisZrodla = podpisZrodlaMaterialu(m)
    // WSP-04: skan bez transkrypcji – „pomóż odczytać” (ta sama definicja braku co w „współtwórz”)
    const brakiM = zadaniaMaterialu(m, { odczyt: obj.some((o) => o.rodzaj === 'odczyt'), tlumaczenie: obj.some((o) => o.rodzaj === 'tlumaczenie') }, () => '').map((z) => z.brak)
    const pomoc = await brakiDoPomocy('materialy', m.id, brakiM.filter((b) => b === 'brak-transkrypcji'), m.bezWspoltworz)
    const email = pomoc.size ? await adresKontaktowy() : undefined

    const rok = m.czas ? formatujEdtf(m.czas) : null
    const ileStr = m.strony.length > 1 ? odmiana(m.strony.length, ['strona', 'strony', 'stron']) : null
    // SLW-03 (łatka P3, decyzja 17.11): słowa ze słownika w opisie jako odnośniki do haseł (pierwsze wystąpienie, hasła widoczne dla czytelnika)
    const haslaCzytelnika = (await hasla(poziom)).map((h) => ({ id: h.id, haslo: h.haslo, formy: h.formy, znaczenie: h.znaczenie, adres: adresHasla(h.id) }))
    const reszta = linkujHasla(naHtml(cz.reszta, ktx), haslaCzytelnika)
    const wpisyZMat = siec.odnosniki.filter((z) => z.zrodlo.rodzaj === 'wpis')
    const inneOdnosniki = siec.odnosniki.filter((z) => z.zrodlo.rodzaj !== 'wpis')
    const nrKat = numerKat('material', m.id)
    const jestOpis = !!nrKat || !!(m.sygnatura || m.pochodzenie || m.tworca || m.jezyk || m.prawa || m.przekazal || m.opracowal || m.miejscePrzechowywania || m.transkrypcja || m.zbiory.length || osobyM.length || instytucjeM.length)
    // SLW-03 (P3, decyzja 17.11): hasła słownika wykryte w opisie i transkrypcji – liczone z sieci powiązań, bez nowych pól
    const slowa = await haslaWTekscie('material', m.id, poziom)
    const jestDotyczy = miejscaM.length > 0 || tematyM.length > 0 || obiektyM.length > 0 || wpisyZMat.length > 0 || slowa.length > 0
    const jestWstep = maTekst(reszta)
    const spis = spisCzesci([jestOpis && 'opis archiwalny', jestDotyczy && 'dotyczy', rek && 'rekonstrukcja', ...czesciPowiazan({ odnosniki: inneOdnosniki, wzmianki: [] }), 'jak cytować', (oryginal || m.zrodla.length > 0) && 'źródła'], { wstep: jestWstep })
    const naglowek = (
        <NaglowekKarty
            sciezka={[]}
            tytul={m.nazwa}
            linia={[RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj, rok && !m.nazwa.includes(rok) ? rok : null, ileStr, m.jezyk || null, m.widocznosc === 'bliscy' ? 'dla bliskich' : null]}
            lead={jestWstep ? <Tresc html={reszta} pusta={null} /> : undefined}
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
                    {pomoc.has('brak-transkrypcji') && (
                        // dopisek właściciela (komentarz na makiecie 17.11) – jak na kartach miejscowości i obiektu
                        <p className="podpis-zrodla wsp-pomoc">Ten dokument nie ma jeszcze transkrypcji –{' '}
                            <Zgloszenie rodzaj="odczyt" wariant="link" etykieta="pomóż go odczytać" adres={`/archiwum/${m.id}`} tytul={`${m.nazwa} – odczyt`} brak="brak-transkrypcji" zgoda email={email ? zakoduj(`${email.u}@${email.d}`) : undefined} />
                            . Wspólnie możemy tworzyć ten serwis.
                        </p>
                    )}
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
                {/* P5 (PD-05): manifest IIIF – tylko materiał publiczny ze skanami (inne przeglądarki archiwalne, np. Mirador) */}
                <W e="udostępnianie">{m.widocznosc === 'publiczne' && m.strony.length > 0 && <a className="odn" href={`/archiwum/${m.id}/manifest.json`}>manifest IIIF – skany i publiczne objaśnienia</a>}</W>
                <W e="przekazał(a)">{m.przekazal}</W>
                <W e="opracował(a)">{m.opracowal}</W>
                <WierszZglosil v={m.zglosil} />

                {jestDotyczy && <Czesc tytul="dotyczy" />}
                <W e={miejscaM.length > 1 ? 'miejsca' : 'miejsce'}>{miejscaM.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[miejscaM.map((id) => ({ tekst: n.miejsca.get(id), href: `/miejsca/${id}` }))]} />}</W>
                <W e="leksykon">{tematyM.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[tematyM.map((id) => ({ tekst: n.tematy.get(id), href: `/leksykon/${id}` }))]} />}</W>
                <W e="przedstawia">{obiektyM.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[obiektyM.map((id) => ({ tekst: nazwyObiektow.get(id), href: `/obiekty/${id}` }))]} />}</W>
                <W e="we wpisach">{wpisyZMat.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[wpisyZMat.map((z) => ({ tekst: z.zrodlo.nazwa, href: z.zrodlo.adres }))]} />}</W>
                <W e="słowa ze słownika">{slowa.length > 0 && (
                    <span className="flex flex-col gap-1">
                        <span className="karta-pastylki">
                            {slowa.map((h) => <PastylkaFiltra key={h.id} href={adresHasla(h.id)} title={skrocZnaczenie(h.znaczenie, 160)}>{h.haslo}</PastylkaFiltra>)}
                        </span>
                        <span className="ot-drobne">wykryte w opisie i transkrypcji · <Link href="/biblioteka/slownik" className="odn">słownik →</Link></span>
                    </span>
                )}</W>

                {rek && opisRek && (
                    <>
                        <Czesc tytul="rekonstrukcja">{opisRek.prawa}</Czesc>
                        <W e="plan">{rek.plan.tytul}</W>
                        {opisRek.pola.map(([e, v]) => <W key={e} e={e}>{v}</W>)}
                        <W e="opis">{rek.plan.opis}</W>
                        <W e="prawa do rekonstrukcji">{rek.plan.prawa}</W>
                        {/* PH-08: legenda numerowana rekonstrukcji (te same numery co na skanie z warstwą planu) */}
                        <W e="legenda planu">{legendaRek.length > 0 && (
                            <div className="plan-legenda-numery w-karcie">
                                <ol>
                                    {legendaRek.map((e) => (
                                        <li key={e.id}>
                                            <span className="plan-legenda-nr" aria-hidden="true">{e.nrLegendy}</span>
                                            <span><span className="sr-only">{e.nrLegendy}. </span>{e.nazwa?.split('\n').join(' ') || e.nazwaZrodlowa || typyRek.get(e.typ)?.nazwa.replace(/ \(.*\)$/, '')}
                                                {e.nieznanePolozenie && <span className="plan-legenda-uwaga"> · położenie nieznane</span>}
                                                {(e.odnosniki ?? []).map((k) => <span key={k.adres}> · <Link href={k.adres}>{k.nazwa}</Link></span>)}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}</W>
                        <WCaly><span className="ot-drobne">Rekonstrukcję widać na skanie: przełącznik „skan / skan + plan / plan” nad obrazem{rek.podklad.strona > 0 ? ` (strona ${rek.podklad.strona + 1})` : ''}.</span></WCaly>
                    </>
                )}

                <Powiazania dane={{ odnosniki: inneOdnosniki, wzmianki: [] }} />
                <CzescJakCytowac plik={m.id} dane={daneCytatu({ tytul: m.czas && !m.nazwa.includes(formatujEdtf(m.czas)) ? `${m.nazwa}, ${formatujEdtf(m.czas)}` : m.nazwa, sciezka: `/archiwum/${m.id}`, nrKat, rodzaj: 'material', opracowal: m.opracowal || undefined, autor: m.tworca || undefined, rok: m.czas?.slice(0, 4), oryginal: oryginal || undefined })} />
                <Zrodla pozycje={[
                    oryginal && <>oryginał: {oryginal}</>,
                    ...m.zrodla.map((z, i) => <ZAdresami key={i} tekst={z} />),
                ]} />
            </Tabela>

            <ZglosPoprawke adres={`/archiwum/${m.id}`} tytul={m.nazwa} pytanie="Coś się nie zgadza w opisie albo transkrypcji? „To nie Piotr, tylko Paweł” wystarczy." />
        </Strona>
    )
}
