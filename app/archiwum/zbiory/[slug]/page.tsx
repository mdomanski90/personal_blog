import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { poziomCzytelnika } from '@/lib/archiwum'
import { zbior, materialyZbioru } from '@/lib/paczka5'
import { naHtml } from '@/lib/markdoc'
import { Sekcja, Strona, Tresc, maTekst } from '../../../components/Uklad'
import { Czesc, CzescJakCytowac, NaglowekKarty, Tabela, W, ZAdresami, Zrodla, ZglosPoprawke, idCzesci, spisCzesci } from '../../../components/Karta'
import { daneCytatu } from '@/lib/cytowanie'
import SpisTresci from '../../../components/SpisTresci'
import { PrzyciskDrukuj, PrzyciskDrukujCalosc } from '../../../components/Druk'
import ListaMaterialow from '../../../components/ListaMaterialow'
import CopyLinkButton from '../../../components/CopyLinkButton'
import Komunikat from '../../../components/Komunikat'
import { numerKat } from '@/lib/katalog/dane'
import { odmiana } from '@/lib/tekst'
import { WierszNrKat } from '../../../components/NrKat'
export const dynamic = 'force-dynamic'
type P = { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const z = await zbior((await params).slug, await poziomCzytelnika())
  return { title: z ? `${z.nazwa} · archiwum · odniepamieci.pl` : 'nie znaleziono · odniepamieci.pl', robots: { index: !!z && z.widocznosc === 'publiczne' } }
}
/** P7D-2 (AUD-02): karta zbioru według wzoru kart. Etap 3 (uwaga 17.11): standardowy kontener – opis jako wstęp nad tabelą,
 *  „materiały w zbiorze” w zwykłej kolumnie karty (bez PelnaSzerokosc – jeden spis), „jak cytować” i źródła w tej samej kolumnie. */
export default async function Zbior({ params }: P) {
  const poziom = await poziomCzytelnika()
  const z = await zbior((await params).slug, poziom)
  if (!z) notFound()
  const tekst = naHtml(z.opis)
  const mats = await materialyZbioru(z.id, poziom)
  const nrKat = numerKat('zbior', z.id)
  return (
    <Strona uklad="karta" nrKat={nrKat} sciezka={[{ tekst: 'archiwum', href: '/archiwum' }, { tekst: 'zbiory', href: '/archiwum/zbiory' }]} akcje={<><CopyLinkButton sciezka={`/archiwum/zbiory/${z.id}`} /><PrzyciskDrukuj /><PrzyciskDrukujCalosc rodzaj="zbior" id={z.id} /></>}
      naglowek={<NaglowekKarty sciezka={[]} tytul={z.nazwa} linia={['zbiór', odmiana(mats.length, ['materiał', 'materiały', 'materiałów'])]} lead={maTekst(tekst) ? <Tresc html={tekst} pusta={null} /> : undefined} />}
      spis={<SpisTresci pozycje={spisCzesci([(!!nrKat || z.pochodzenie || z.prawa) && 'podstawowe', 'materiały w zbiorze', 'jak cytować', z.zrodla.length > 0 && 'źródła'], { wstep: maTekst(tekst) })} />}>
      {(!!nrKat || z.pochodzenie || z.prawa) && (
        <Tabela etykieta={`${z.nazwa} – podstawowe`}>
          <Czesc tytul="podstawowe" />
          <WierszNrKat nr={nrKat} />
          <W e="pochodzenie">{z.pochodzenie}</W>
          <W e="prawa">{z.prawa}</W>
        </Tabela>
      )}
      <Sekcja tytul="materiały w zbiorze" id={idCzesci('materiały w zbiorze')}>
        {mats.length ? <ListaMaterialow materialy={mats} /> : <Komunikat rodzaj="pusto">W tym zbiorze nie ma jeszcze opublikowanych materiałów.</Komunikat>}
      </Sekcja>
      {/* uwaga 16.11: „jak cytować” na każdej karcie – tabela zawsze, źródła gdy są */}
      <Tabela etykieta={`${z.nazwa} – jak cytować i źródła`}>
        <CzescJakCytowac plik={z.id} dane={daneCytatu({ tytul: z.nazwa, sciezka: `/archiwum/zbiory/${z.id}`, nrKat, rodzaj: 'zbior' })} />
        <Zrodla pozycje={z.zrodla.map((x, i) => <ZAdresami key={i} tekst={x} />)} />
      </Tabela>
      <ZglosPoprawke adres={`/archiwum/zbiory/${z.id}`} tytul={z.nazwa} pytanie="Masz materiał, który pasuje do tego zbioru?" />
    </Strona>
  )
}
