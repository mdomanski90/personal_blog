import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { poziomCzytelnika } from '@/lib/archiwum'
import { zbior, materialyZbioru } from '@/lib/paczka5'
import { naHtml } from '@/lib/markdoc'
import { Strona, Tresc, maTekst } from '../../../components/Uklad'
import { Czesc, NaglowekKarty, Tabela, W, ZAdresami, Zrodla, ZglosPoprawke } from '../../../components/Karta'
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
    <Strona akcje={<CopyLinkButton sciezka={`/archiwum/zbiory/${z.id}`} />}>
      <NaglowekKarty sciezka={[{ tekst: 'archiwum', href: '/archiwum' }, { tekst: 'zbiory', href: '/archiwum/zbiory' }]}
        tytul={z.nazwa} linia={['zbiór', `${mats.length} ${mats.length === 1 ? 'materiał' : 'materiałów'}`]} />
      {(z.pochodzenie || z.prawa) && (
        <Tabela etykieta={`${z.nazwa} – podstawowe`}>
          <Czesc tytul="podstawowe" />
          <W e="pochodzenie">{z.pochodzenie}</W>
          <W e="prawa">{z.prawa}</W>
        </Tabela>
      )}
      {maTekst(tekst) && <Tresc html={tekst} />}
      <h2 className="karta-sekcja-tytul">materiały w zbiorze</h2>
      {mats.length ? <ListaMaterialow materialy={mats} /> : <Komunikat rodzaj="pusto">W tym zbiorze nie ma jeszcze opublikowanych materiałów.</Komunikat>}
      {z.zrodla.length > 0 && <Tabela etykieta="źródła"><Zrodla pozycje={z.zrodla.map((x, i) => <ZAdresami key={i} tekst={x} />)} /></Tabela>}
      <ZglosPoprawke adres={`/archiwum/zbiory/${z.id}`} tytul={z.nazwa} pytanie="Masz materiał, który pasuje do tego zbioru?" />
    </Strona>
  )
}
