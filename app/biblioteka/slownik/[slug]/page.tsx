import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hasla, poziomCzytelnika, RODZAJE_HASEL } from '@/lib/archiwum'
import { adresHasla } from '@/lib/slownik'
import { Strona } from '../../../components/Uklad'
import { Czesc, NaglowekKarty, Tabela, W, ZglosPoprawke, spisCzesci } from '../../../components/Karta'
import SpisTresci from '../../../components/SpisTresci'
import CopyLinkButton from '../../../components/CopyLinkButton'

export const dynamic = 'force-dynamic'
type P = { params: Promise<{ slug: string }> }
const znajdz = async (slug: string) => (await hasla(await poziomCzytelnika())).find((h) => h.id === slug)

export async function generateMetadata({ params }: P): Promise<Metadata> {
    const h = await znajdz((await params).slug)
    return { title: h ? `${h.haslo} · słownik · odniepamieci.pl` : 'nie znaleziono · odniepamieci.pl', robots: { index: !!h && h.widocznosc === 'publiczne' } }
}

/**
 * SLW-01 (P2): minimalna strona hasła – cel fiszki ze słownika. Znaczenie jako wstęp, tabela „podstawowe”, zgłoszenie poprawki.
 * Etymologia, występowanie, „zgłosił(a)” i hasła w sieci powiązań – P3 (SLW-02/03).
 */
export default async function Haslo({ params }: P) {
    const h = await znajdz((await params).slug)
    if (!h) notFound()
    const adres = adresHasla(h.id)
    return (
        <Strona uklad="karta" sciezka={[{ tekst: 'biblioteka', href: '/biblioteka' }, { tekst: 'słownik', href: '/biblioteka/slownik' }]} akcje={<CopyLinkButton sciezka={adres} />}
            naglowek={<NaglowekKarty sciezka={[]} tytul={h.haslo} linia={[RODZAJE_HASEL[h.rodzaj] ?? h.rodzaj]}
                lead={<p className="m-0 whitespace-pre-line">{h.znaczenie}</p>} />}
            spis={<SpisTresci pozycje={spisCzesci(['podstawowe'], { wstep: true })} />}>
            <Tabela etykieta={`${h.haslo} – hasło słownika`}>
                <Czesc tytul="podstawowe" />
                <W e="rodzaj hasła">{RODZAJE_HASEL[h.rodzaj] ?? h.rodzaj}</W>
                <W e="inne formy">{h.formy.length > 0 && h.formy.join(', ')}</W>
                <W e="przykład użycia">{h.przyklad && <span className="whitespace-pre-line">{h.przyklad}</span>}</W>
                <W e="źródło znaczenia">{h.zrodlo}</W>
            </Tabela>
            <ZglosPoprawke adres={adres} tytul={h.haslo} pytanie="Znasz inne znaczenie tego słowa albo przykład jego użycia?" />
        </Strona>
    )
}
