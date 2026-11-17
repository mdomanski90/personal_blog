import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hasla, miejsca, poziomCzytelnika, powiazania, RODZAJE_HASEL } from '@/lib/archiwum'
import { adresHasla } from '@/lib/slownik'
import { formatujEdtf } from '@/lib/edtf'
import { daneCytatu } from '@/lib/cytowanie'
import { Strona } from '../../../components/Uklad'
import { Czesc, CzescJakCytowac, LiniaKarty, NaglowekKarty, Tabela, W, ZAdresami, ZglosPoprawke, spisCzesci } from '../../../components/Karta'
import { TYTUL_WYSTEPUJE, WystepujeW } from '../../../components/Powiazania'
import SpisTresci from '../../../components/SpisTresci'
import CopyLinkButton from '../../../components/CopyLinkButton'
import { PrzyciskDrukuj } from '../../../components/Druk'

export const dynamic = 'force-dynamic'
type P = { params: Promise<{ slug: string }> }
const znajdz = async (slug: string) => (await hasla(await poziomCzytelnika())).find((h) => h.id === slug)

export async function generateMetadata({ params }: P): Promise<Metadata> {
    const h = await znajdz((await params).slug)
    return { title: h ? `${h.haslo} · słownik · odniepamieci.pl` : 'nie znaleziono · odniepamieci.pl', robots: { index: !!h && h.widocznosc === 'publiczne' } }
}

/**
 * SLW-02 (P3): strona hasła według wzorca karty – znaczenie jako wstęp; „podstawowe”: rodzaj, formy, przykład, pochodzenie słowa,
 * występowanie (miejscowości), źródło znaczenia, zobacz też; „występuje w” (SLW-03 – teksty z [[hasło]] i ze słowem, z fragmentem);
 * „jak cytować” z „zgłosił(a)” (KRT-01) i opracowaniem. Powiązane pozycje tylko widoczne dla czytelnika.
 */
export default async function Haslo({ params }: P) {
    const poziom = await poziomCzytelnika()
    const { slug } = await params
    const wszystkie = await hasla(poziom)
    const h = wszystkie.find((x) => x.id === slug)
    if (!h) notFound()
    const adres = adresHasla(h.id)
    const [msc, siec] = await Promise.all([miejsca(poziom), powiazania('haslo', h.id, poziom)])
    const wystepowanie = (h.wystepowanie ?? []).map((id) => msc.find((m) => m.id === id)).filter((m): m is NonNullable<typeof m> => !!m)
    const zobacz = (h.zobaczTez ?? []).map((id) => wszystkie.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x && x.id !== h.id)
    const maWystepuje = siec.odnosniki.length + siec.wzmianki.length > 0
    const opracowanie = [h.opracowal, h.dataOpracowania && formatujEdtf(h.dataOpracowania)].filter(Boolean).join(', ')
    return (
        <Strona uklad="karta" sciezka={[{ tekst: 'biblioteka', href: '/biblioteka' }, { tekst: 'słownik', href: '/biblioteka/slownik' }]} akcje={<><CopyLinkButton sciezka={adres} /><PrzyciskDrukuj /></>}
            naglowek={<NaglowekKarty sciezka={[]} tytul={h.haslo} linia={[RODZAJE_HASEL[h.rodzaj] ?? h.rodzaj]}
                lead={<p className="m-0 whitespace-pre-line">{h.znaczenie}</p>} />}
            spis={<SpisTresci pozycje={spisCzesci(['podstawowe', maWystepuje && TYTUL_WYSTEPUJE, 'jak cytować'], { wstep: true })} />}>
            <Tabela etykieta={`${h.haslo} – hasło słownika`}>
                <Czesc tytul="podstawowe" />
                <W e="rodzaj hasła">{RODZAJE_HASEL[h.rodzaj] ?? h.rodzaj}</W>
                <W e="inne formy">{h.formy.length > 0 && h.formy.join(', ')}</W>
                <W e="przykład użycia">{h.przyklad && <span className="whitespace-pre-line">{h.przyklad}</span>}</W>
                <W e="pochodzenie słowa">{h.etymologia && <span className="whitespace-pre-line">{h.etymologia}</span>}</W>
                <W e="występowanie">{wystepowanie.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[wystepowanie.map((m) => ({ tekst: m.nazwa, href: `/miejsca/${m.id}` }))]} />}</W>
                <W e="źródło znaczenia">{h.zrodlo && <ZAdresami tekst={h.zrodlo} />}</W>
                <W e="zobacz też">{zobacz.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[zobacz.map((x) => ({ tekst: x.haslo, href: adresHasla(x.id) }))]} />}</W>
                <W e="opracował(a)">{opracowanie || null}</W>
                <WystepujeW dane={siec} />
                <CzescJakCytowac plik={h.id} zglosil={h.zglosil} dane={daneCytatu({ tytul: h.haslo, sciezka: adres, rodzaj: 'haslo', opracowal: h.opracowal || undefined })} />
            </Tabela>
            <ZglosPoprawke adres={adres} tytul={h.haslo} pytanie="Znasz inne znaczenie tego słowa albo przykład jego użycia?" />
        </Strona>
    )
}
