import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { lataMaterialu, nazwy, poziomCzytelnika, widoczne } from '@/lib/archiwum'
import { opisRodzajow, wierszeZbioru } from '@/lib/zbior'
import { Link } from 'next-view-transitions'
import { PastylkaOsoby } from '../../../components/Wzorce'
import { formatujEdtf } from '@/lib/edtf'
import { zbior, materialyZbioru } from '@/lib/paczka5'
import { naHtml } from '@/lib/markdoc'
import { Sekcja, Strona, Tresc, maTekst } from '../../../components/Uklad'
import { Czesc, CzescJakCytowac, WierszZglosil, LiniaKarty, NaglowekKarty, Tabela, W, ZAdresami, Zrodla, ZglosPoprawke, idCzesci, spisCzesci } from '../../../components/Karta'
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
  // ARC-09 (P3, makieta zbioru 17.11): wiersze liczone z materiałów (bez nowych pól); osoby tylko z kart widocznych dla czytelnika
  const { stanOsob } = await import('@/lib/osoby/dane')
  const { nazwaOsoby } = await import('@/lib/osoby/model')
  const stan = await stanOsob()
  const n = await nazwy(poziom)
  const wiersze = wierszeZbioru(mats.map((m) => ({ rodzaj: m.rodzaj, lata: lataMaterialu(m), miejsca: m.miejsca, tematy: m.tematy, osobyIds: m.osobyIds })),
    (id) => stan.drzewo.osoby.has(id) && widoczne(stan.widocznosc(id), poziom))
  const miejscaZ = wiersze.miejsca.filter((id) => n.miejsca.has(id))
  const tematyZ = wiersze.tematy.filter((id) => n.tematy.has(id))
  // obraz w pasku bocznym: pierwszy materiał zbioru ze skanem lub zdjęciem (widoczny dla czytelnika – lista już przefiltrowana)
  const zObrazem = mats.find((m) => m.strony.some((x) => x.adres.startsWith('/pliki/strony/')))
  const obraz = zObrazem ? zObrazem.strony.find((x) => x.adres.startsWith('/pliki/strony/'))!.adres : null
  const jestPodstawowe = !!nrKat || !!z.pochodzenie || !!z.prawa || mats.length > 0
  return (
    <Strona uklad="karta" nrKat={nrKat} sciezka={[{ tekst: 'archiwum', href: '/archiwum' }, { tekst: 'zbiory', href: '/archiwum/zbiory' }]} akcje={<><CopyLinkButton sciezka={`/archiwum/zbiory/${z.id}`} /><PrzyciskDrukuj /><PrzyciskDrukujCalosc rodzaj="zbior" id={z.id} /></>}
      naglowek={<NaglowekKarty sciezka={[]} tytul={z.nazwa} linia={['zbiór', odmiana(mats.length, ['materiał', 'materiały', 'materiałów'])]} lead={maTekst(tekst) ? <Tresc html={tekst} pusta={null} /> : undefined} />}
      bok={zObrazem && obraz ? (
        <figure className="osoba-portret">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${obraz}?w=480`} alt={`${zObrazem.nazwa} – ze zbioru ${z.nazwa}`} />
          <figcaption>{[zObrazem.nazwa, zObrazem.czas && formatujEdtf(zObrazem.czas)].filter(Boolean).join(', ')} · <a href={`#${idCzesci('materiały w zbiorze')}`} className="odn">wszystkie ({mats.length}) ↓</a></figcaption>
        </figure>
      ) : undefined}
      spis={<SpisTresci pozycje={spisCzesci([jestPodstawowe && 'podstawowe', 'materiały w zbiorze', 'jak cytować', z.zrodla.length > 0 && 'źródła'], { wstep: maTekst(tekst) })} />}>
      {jestPodstawowe && (
        <Tabela etykieta={`${z.nazwa} – podstawowe`}>
          <Czesc tytul="podstawowe" />
          <WierszNrKat nr={nrKat} />
          <W e="pochodzenie">{z.pochodzenie}</W>
          <W e="prawa">{z.prawa}</W>
          <W e="materiały">{opisRodzajow(wiersze.rodzaje, odmiana) || null}</W>
          <W e="lata">{wiersze.lata && (wiersze.lata[0] === wiersze.lata[1] ? String(wiersze.lata[0]) : `${wiersze.lata[0]}–${wiersze.lata[1]}`)}</W>
          <W e={miejscaZ.length > 1 ? 'miejsca' : 'miejsce'}>{miejscaZ.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[miejscaZ.map((id) => ({ tekst: n.miejsca.get(id), href: `/miejsca/${id}` }))]} />}</W>
          <W e={tematyZ.length > 1 ? 'tematy' : 'temat'}>{tematyZ.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[tematyZ.map((id) => ({ tekst: n.tematy.get(id), href: `/tematy/${id}` }))]} />}</W>
          <W e="osoby">{wiersze.osoby.length > 0 && <span className="ot-osoby">{wiersze.osoby.map((id) => <PastylkaOsoby key={id} href={`/osoby/${id}`} plec={stan.drzewo.osoby.get(id)!.plec}>{nazwaOsoby(stan.drzewo.osoby.get(id)!)}</PastylkaOsoby>)}</span>}</W>
          {/* plansza zbioru: „udostępnianie” – drukuj całość · kolekcja IIIF (P5, PD-05: manifesty publicznych materiałów ze skanami) */}
          <W e="udostępnianie"><LiniaKarty className="karta-linia-w" elementy={[[{ tekst: 'drukuj całość', href: `/druk/zbior/${encodeURIComponent(z.id)}` }, ...(z.widocznosc === 'publiczne' && mats.some((m) => m.strony.length > 0) ? [{ tekst: 'kolekcja IIIF', href: `/archiwum/zbiory/${encodeURIComponent(z.id)}/iiif.json` }] : [])]]} /></W>
          {mats.length > 0 && <W e=" "><span className="ot-drobne">miejsca, tematy, osoby i lata liczone z materiałów zbioru – bez osobnych pól</span></W>}
          <WierszZglosil v={z.zglosil} />
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
