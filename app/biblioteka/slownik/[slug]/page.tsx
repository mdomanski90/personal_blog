import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hasla, lataMaterialu, materialy, miejsca, poziomCzytelnika, powiazania, RODZAJE_HASEL } from '@/lib/archiwum'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'
import { adresHasla } from '@/lib/slownik'
import { formatujEdtf } from '@/lib/edtf'
import { daneCytatu } from '@/lib/cytowanie'
import { Strona } from '../../../components/Uklad'
import { Czesc, CzescJakCytowac, LiniaKarty, NaglowekKarty, Tabela, W, WierszZglosil, ZAdresami, ZglosPoprawke, spisCzesci } from '../../../components/Karta'
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

const OPIS_CZESCI: Record<string, string> = { miejsce: 'miejscowość · opis', temat: 'temat · opis', obiekt: 'obiekt · opis', wpis: 'wpis', osoba: 'biogram' }

/**
 * SLW-02 (P3; łatka wg planszy „strona hasła” 17.11): wzorzec karty – znaczenie jako wstęp; część „hasło”: znaczenie, przykład, rodzaj,
 * etymologia, występowanie, formy, źródło znaczenia, zgłosił(a), opracował(a), zobacz też; „występuje w” (SLW-03 – teksty z [[hasło]]
 * i ze słowem, z fragmentem, po prawej rodzaj i rok); jak cytować. Powiązane pozycje tylko widoczne dla czytelnika.
 */
export default async function Haslo({ params }: P) {
    const poziom = await poziomCzytelnika()
    const { slug } = await params
    const wszystkie = await hasla(poziom)
    const h = wszystkie.find((x) => x.id === slug)
    if (!h) notFound()
    const adres = adresHasla(h.id)
    const [msc, mats, siec] = await Promise.all([miejsca(poziom), materialy(poziom), powiazania('haslo', h.id, poziom)])
    const wystepowanie = (h.wystepowanie ?? []).map((id) => msc.find((m) => m.id === id)).filter((m): m is NonNullable<typeof m> => !!m)
    const zobacz = (h.zobaczTez ?? []).map((id) => wszystkie.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x && x.id !== h.id)
    const maWystepuje = siec.odnosniki.length + siec.wzmianki.length > 0
    const rodzaj = RODZAJE_HASEL[h.rodzaj] ?? h.rodzaj
    const opracowanie = [h.opracowal, h.dataOpracowania && `dodano ${/^\d{4}-\d{2}-\d{2}$/.test(h.dataOpracowania) ? h.dataOpracowania.split('-').reverse().join('.') : formatujEdtf(h.dataOpracowania)}`].filter(Boolean).join(' · ')
    const prawa = (z: { zrodlo: { rodzaj: string; id: string } }) => {
        if (z.zrodlo.rodzaj !== 'material') return OPIS_CZESCI[z.zrodlo.rodzaj] ?? z.zrodlo.rodzaj
        const m = mats.find((x) => x.id === z.zrodlo.id)
        const l = m ? lataMaterialu(m) : null
        return ['materiał', l && (l[0] === l[1] ? String(l[0]) : `${l[0]}–${l[1]}`)].filter(Boolean).join(' · ')
    }
    return (
        <Strona uklad="karta" sciezka={[{ tekst: 'biblioteka', href: '/biblioteka' }, { tekst: 'słownik', href: '/biblioteka/slownik' }]} akcje={<><CopyLinkButton sciezka={adres} /><PrzyciskDrukuj /></>}
            naglowek={<NaglowekKarty sciezka={[]} tytul={h.haslo} linia={['hasło słownika', rodzaj, h.formy.length > 0 && `formy: ${h.formy.join(', ')}`]}
                lead={<p className="m-0 whitespace-pre-line">{h.znaczenie}</p>} />}
            spis={<SpisTresci pozycje={spisCzesci(['hasło', maWystepuje && TYTUL_WYSTEPUJE, 'jak cytować'], { wstep: true })} />}>
            <Tabela etykieta={`${h.haslo} – hasło słownika`}>
                <Czesc tytul="hasło" />
                <W e="znaczenie"><span className="whitespace-pre-line">{h.znaczenie}</span></W>
                <W e="przykład">{h.przyklad && <span className="whitespace-pre-line">{h.przyklad}</span>}</W>
                <W e="rodzaj">{rodzaj}</W>
                <W e="etymologia">{h.etymologia && <span className="whitespace-pre-line">{h.etymologia}</span>}</W>
                <W e="występowanie">{wystepowanie.length > 0 && <><LiniaKarty className="karta-linia-w" elementy={[wystepowanie.map((m) => ({ tekst: m.nazwa, href: `/miejsca/${m.id}` }))]} /><span className="ot-drobne"> – w dokumentach i relacjach z tych miejscowości</span></>}</W>
                <W e="formy">{h.formy.length > 0 && <>{h.formy.join(', ')}<span className="ot-drobne"> – rozpoznawane w tekstach jako odnośnik</span></>}</W>
                <W e="źródło znaczenia">{h.zrodlo && <ZAdresami tekst={h.zrodlo} />}</W>
                <WierszZglosil v={h.zglosil} />
                <W e="opracował(a)">{opracowanie || null}</W>
                <W e="zobacz też">{(zobacz.length > 0 || rodzaj) && <LiniaKarty className="karta-linia-w" elementy={[...zobacz.map((x) => ({ tekst: x.haslo, href: adresHasla(x.id) })), { tekst: `wszystkie: ${rodzaj}`, href: `/biblioteka/slownik?rodzaj=${encodeURIComponent(h.rodzaj)}` }]} />}</W>
                <WystepujeW dane={siec} prawa={prawa} />
            </Tabela>
            <Tabela etykieta={`${h.haslo} – jak cytować`}>
                <CzescJakCytowac plik={h.id} dane={daneCytatu({ tytul: h.haslo, dopisek: 'hasło słownika', sciezka: adres, rodzaj: 'haslo', opracowal: h.opracowal || undefined })} />
            </Tabela>
            <ZglosPoprawke adres={adres} tytul={h.haslo} pytanie="Znasz inne znaczenie albo przykład z dokumentu?" />
        </Strona>
    )
}
