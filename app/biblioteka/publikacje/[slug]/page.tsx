import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { nazwy, poziomCzytelnika } from '@/lib/archiwum'
import { publikacja } from '@/lib/paczka5'
import { Strona } from '../../../components/Uklad'
import { Czesc, LiniaKarty, NaglowekKarty, Tabela, W, ZAdresami, ZglosPoprawke, idCzesci, spisCzesci } from '../../../components/Karta'
import SpisTresci from '../../../components/SpisTresci'
import { PrzyciskDrukuj } from '../../../components/Druk'
import CopyLinkButton from '../../../components/CopyLinkButton'
import { numerKat } from '@/lib/katalog/dane'
import { WierszNrKat } from '../../../components/NrKat'
export const dynamic = 'force-dynamic'
type P = { params: Promise<{ slug: string }> }
const RODZAJE: Record<string, string> = { ksiazka: 'książka', artykul: 'artykuł', prasa: 'prasa', opracowanie: 'opracowanie', baza: 'baza / serwis' }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await publikacja((await params).slug, await poziomCzytelnika())
  return { title: p ? `${p.nazwa} · biblioteka · odniepamieci.pl` : 'nie znaleziono · odniepamieci.pl', robots: { index: !!p && p.widocznosc === 'publiczne' } }
}
/** P7D-2 (AUD-02): karta publikacji według wzoru kart (nagłówek, „podstawowe”, „powiązane”, zgłoszenie). */
export default async function Publikacja({ params }: P) {
  const poziom = await poziomCzytelnika()
  const p = await publikacja((await params).slug, poziom)
  if (!p) notFound()
  const n = await nazwy(poziom)
  const miejscaP = p.miejsca.filter((id) => n.miejsca.has(id))
  const tematyP = p.tematy.filter((id) => n.tematy.has(id))
  const nrKat = numerKat('publikacja', p.id)
  return (
    <Strona uklad="karta" nrKat={nrKat} sciezka={[{ tekst: 'biblioteka', href: '/biblioteka' }, { tekst: 'publikacje', href: '/biblioteka/publikacje' }]} akcje={<><CopyLinkButton sciezka={`/biblioteka/publikacje/${p.id}`} /><PrzyciskDrukuj /></>}
      naglowek={<NaglowekKarty sciezka={[]}
        tytul={p.nazwa} linia={[RODZAJE[p.rodzaj] ?? p.rodzaj, p.autor || null, p.rok || null]}
        lead={p.opis ? <p className="m-0 whitespace-pre-wrap">{p.opis}</p> : undefined} />}
      spis={<SpisTresci pozycje={spisCzesci(['podstawowe', (miejscaP.length > 0 || tematyP.length > 0) && 'powiązane'])} />}>
      <Tabela etykieta={`${p.nazwa} – opis bibliograficzny`}>
        <Czesc tytul="podstawowe" />
        <WierszNrKat nr={nrKat} />
        <W e="autor">{p.autor}</W>
        <W e="rok">{p.rok}</W>
        <W e="wydawca / czasopismo">{p.wydawca}</W>
        <W e="ISBN / identyfikator">{p.isbn}</W>
        <W e="dostęp">{p.url && <ZAdresami tekst={p.url} />}</W>
        {(miejscaP.length > 0 || tematyP.length > 0) && <Czesc tytul="powiązane" />}
        <W e="miejsca">{miejscaP.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[miejscaP.map((id) => ({ tekst: n.miejsca.get(id), href: `/miejsca/${id}` }))]} />}</W>
        <W e="tematy">{tematyP.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[tematyP.map((id) => ({ tekst: n.tematy.get(id), href: `/tematy/${id}` }))]} />}</W>
      </Tabela>
      <ZglosPoprawke adres={`/biblioteka/publikacje/${p.id}`} tytul={p.nazwa} pytanie="Znasz inne wydanie, egzemplarz albo wersję cyfrową?" />
    </Strona>
  )
}
