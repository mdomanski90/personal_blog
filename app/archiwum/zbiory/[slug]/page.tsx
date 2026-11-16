import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { poziomCzytelnika } from '@/lib/archiwum'
import { zbior, materialyZbioru } from '@/lib/paczka5'
import { naHtml } from '@/lib/markdoc'
import { PelnaSzerokosc, Sekcja, Strona, Tresc, maTekst } from '../../../components/Uklad'
import { Czesc, NaglowekKarty, Tabela, W, ZAdresami, Zrodla, ZglosPoprawke, idCzesci, spisCzesci } from '../../../components/Karta'
import SpisTresci from '../../../components/SpisTresci'
import { PrzyciskDrukuj } from '../../../components/Druk'
import ListaMaterialow from '../../../components/ListaMaterialow'
import CopyLinkButton from '../../../components/CopyLinkButton'
import Komunikat from '../../../components/Komunikat'
export const dynamic = 'force-dynamic'
type P = { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const z = await zbior((await params).slug, await poziomCzytelnika())
  return { title: z ? `${z.nazwa} · archiwum · odniepamieci.pl` : 'nie znaleziono · odniepamieci.pl', robots: { index: !!z && z.widocznosc === 'publiczne' } }
}
/** P7D-2 (AUD-02): karta zbioru według wzoru kart. */
export default async function Zbior({ params }: P) {
  const poziom = await poziomCzytelnika()
  const z = await zbior((await params).slug, poziom)
  if (!z) notFound()
  const tekst = naHtml(z.opis)
  const mats = await materialyZbioru(z.id, poziom)
  return (
    <Strona uklad="karta" sciezka={[{ tekst: 'archiwum', href: '/archiwum' }, { tekst: 'zbiory', href: '/archiwum/zbiory' }]} akcje={<><CopyLinkButton sciezka={`/archiwum/zbiory/${z.id}`} /><PrzyciskDrukuj /></>}
      naglowek={<NaglowekKarty sciezka={[]} tytul={z.nazwa} linia={['zbiór', `${mats.length} ${mats.length === 1 ? 'materiał' : 'materiałów'}`]} />}
      spis={<SpisTresci pozycje={spisCzesci([(z.pochodzenie || z.prawa) && 'podstawowe', 'materiały w zbiorze', z.zrodla.length > 0 && 'źródła'])} />}>
      {(z.pochodzenie || z.prawa) && (
        <Tabela etykieta={`${z.nazwa} – podstawowe`}>
          <Czesc tytul="podstawowe" />
          <W e="pochodzenie">{z.pochodzenie}</W>
          <W e="prawa">{z.prawa}</W>
        </Tabela>
      )}
      {maTekst(tekst) && <Tresc html={tekst} />}
      {/* siatka miniatur na pełną szerokość (rzecz przestrzenna), spis wraca po niej */}
      <PelnaSzerokosc>
        <Sekcja tytul="materiały w zbiorze" id={idCzesci('materiały w zbiorze')}>
          {mats.length ? <ListaMaterialow materialy={mats} /> : <Komunikat rodzaj="pusto">W tym zbiorze nie ma jeszcze opublikowanych materiałów.</Komunikat>}
        </Sekcja>
      </PelnaSzerokosc>
      {z.zrodla.length > 0 && <Tabela etykieta="źródła"><Zrodla pozycje={z.zrodla.map((x, i) => <ZAdresami key={i} tekst={x} />)} /></Tabela>}
      <ZglosPoprawke adres={`/archiwum/zbiory/${z.id}`} tytul={z.nazwa} pytanie="Masz materiał, który pasuje do tego zbioru?" />
    </Strona>
  )
}
