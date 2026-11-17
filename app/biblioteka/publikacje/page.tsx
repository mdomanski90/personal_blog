import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu } from '@/app/components/WstepDzialu'
import { Link } from 'next-view-transitions'
import { poziomCzytelnika } from '@/lib/archiwum'
import { publikacje } from '@/lib/paczka5'
import { przygotujZapytanie, pasuje } from '@/lib/szukanie'
import { adresFiltrow, wartosc } from '@/lib/adres-filtrow'
import { stronicuj } from '@/lib/stronicowanie'
import StronaDzialu, { LicznikWynikow } from '../../components/StronaDzialu'
import FiltryKatalogu from '../../components/FiltryKatalogu'
import { NawigacjaStron, PastylkaFiltra, RzadFiltrow, WybraneFiltry } from '../../components/Wzorce'
import Komunikat from '../../components/Komunikat'
import SpisBiblioteki from '../SpisBiblioteki'
import { RODZAJE_PUBLIKACJI } from '@/lib/biblioteka'
import { KartaPozycji, OdnosnikZewn, Wiersz } from '../../components/KartaPozycji'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'publikacje · biblioteka · odniepamieci.pl' }
type Parametry = Record<string, string | string[] | undefined>
const BAZA = '/biblioteka/publikacje'
const RODZAJE: [string, string][] = [['ksiazka', 'książki'], ['artykul', 'artykuły'], ['prasa', 'prasa'], ['opracowanie', 'opracowania'], ['baza', 'bazy i serwisy']]

export default async function Publikacje({ searchParams }: { searchParams: Promise<Parametry> }) {
  const sp = await searchParams
  const q = wartosc(sp.q)
  const typ = RODZAJE.some(([id]) => id === wartosc(sp.typ)) ? wartosc(sp.typ) : ''
  const strona = /^\d{1,5}$/.test(wartosc(sp.strona)) ? Number(wartosc(sp.strona)) : 1
  const z = przygotujZapytanie(q)
  const wszystkie = await publikacje(await poziomCzytelnika())
  const poFrazie = wszystkie.filter((p) => !z || pasuje(z, [p.nazwa, p.autor, p.rok, p.wydawca, p.opis].join(' ')))
  const wyn = stronicuj(poFrazie.filter((p) => !typ || p.rodzaj === typ), strona)
  const bez = (klucze: string[]) => adresFiltrow(BAZA, sp, { pomin: klucze })
  const wybrane = [
    q && { klucz: 'q', etykieta: `„${q}”`, href: bez(['q']) },
    typ && { klucz: 'typ', etykieta: RODZAJE.find(([id]) => id === typ)?.[1] ?? typ, href: bez(['typ']) },
  ].filter(Boolean) as { klucz: string; etykieta: string; href: string }[]
  return <StronaDzialu
    tytul={<TytulDzialu dzial="publikacje" domyslny="publikacje i opracowania" />}
    sciezka={[{ tekst: 'biblioteka', href: '/biblioteka' }]}
    spis={<SpisBiblioteki wybrany="publikacje" />}
    wstep={<WstepDzialu dzial="publikacje" className="tekst-opis wstep-dzialu-tekst" />}
    panel={<>
      <FiltryKatalogu adresBazowy={BAZA} tytul="szukaj i filtruj w publikacjach" etykietaFrazy="szukaj w tytułach, autorach, wydawcach i opisach"
        parametrDzialu="typ" lata={false} sortowanie={false} poczatkowe={{ q, rodzaj: typ }} />
      <RzadFiltrow etykieta="rodzaj publikacji">
        <PastylkaFiltra href={adresFiltrow(BAZA, sp, { ustaw: { typ: '' } })} aktywny={!typ} liczba={poFrazie.length}>wszystkie</PastylkaFiltra>
        {RODZAJE.map(([id, n]) => <PastylkaFiltra key={id} href={adresFiltrow(BAZA, sp, { ustaw: { typ: id } })} aktywny={typ === id} liczba={poFrazie.filter((p) => p.rodzaj === id).length}>{n}</PastylkaFiltra>)}
      </RzadFiltrow>
    </>}
    wybrane={<WybraneFiltry wybrane={wybrane} wyczysc={bez(['q', 'typ'])} />}
    licznik={<LicznikWynikow liczba={wyn.razem} formy={['pozycja', 'pozycje', 'pozycji']} strona={wyn.strona} stron={wyn.stron} />}
    tresc={wyn.razem
      // P7F-3: publikacje jako karty – ten sam wzorzec co księgi metrykalne i karty osób
      ? <div className="karty-ksiag">
        {wyn.wyniki.map((p) => <KartaPozycji key={p.id} poziom={2} etykieta={p.nazwa}
          tytul={<Link href={`/biblioteka/publikacje/${p.id}`} className="kp-tytul">{p.nazwa}</Link>}
          prawa={[RODZAJE_PUBLIKACJI[p.rodzaj], p.rok].filter(Boolean).join(' · ')}>
          <Wiersz e="autor">{p.autor}</Wiersz>
          <Wiersz e="wydawca / czasopismo">{p.wydawca}</Wiersz>
          <Wiersz e="dostęp">{p.url && <OdnosnikZewn href={p.url}>{p.rodzaj === 'baza' ? 'otwórz serwis' : 'wersja cyfrowa'}</OdnosnikZewn>}</Wiersz>
        </KartaPozycji>)}</div>
      : <Komunikat rodzaj="pusto" tytul={wszystkie.length ? 'nic nie pasuje do wybranych filtrów.' : 'spis książek i artykułów jest w przygotowaniu.'}>
        {wszystkie.length > 0 && <p className="k-kom-akcje">
          {wybrane.length > 0 && <Link href={bez(['q', 'typ'])}>wyczyść filtry</Link>}
          <Link href="/szukaj">szukaj w całym serwisie</Link>
        </p>}
      </Komunikat>}
    stronicowanie={<NawigacjaStron strona={wyn.strona} stron={wyn.stron} adres={(n) => adresFiltrow(BAZA, sp, { ustaw: { strona: String(n) } })} etykieta="strony publikacji" />}
  />
}
