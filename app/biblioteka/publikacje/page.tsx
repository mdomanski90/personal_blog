import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { Link } from 'next-view-transitions'
import { poziomCzytelnika } from '@/lib/archiwum'
import { publikacje } from '@/lib/paczka5'
import { przygotujZapytanie, pasuje } from '@/lib/szukanie'
import { Strona, TytulStrony } from '../../components/Uklad'
import PoleSzukania from '../../components/PoleSzukania'
import Komunikat from '../../components/Komunikat'
const RODZAJE: [string, string][] = [['', 'wszystkie'], ['ksiazka', 'książki'], ['artykul', 'artykuły'], ['prasa', 'prasa'], ['opracowanie', 'opracowania'], ['baza', 'bazy i serwisy']]
import SpisBiblioteki from '../SpisBiblioteki'
import { RODZAJE_PUBLIKACJI } from '@/lib/biblioteka'
import { KartaPozycji, OdnosnikZewn, Wiersz } from '../../components/KartaPozycji'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'publikacje · biblioteka · odniepamieci.pl' }
export default async function Publikacje({ searchParams }: { searchParams: Promise<{ q?: string; typ?: string }> }) {
  const sp = await searchParams
  const q = (sp.q ?? '').slice(0, 100)
  const z = przygotujZapytanie(q)
  const lista = (await publikacje(await poziomCzytelnika())).filter(p =>
    (!sp.typ || p.rodzaj === sp.typ) && (!z || pasuje(z, [p.nazwa, p.autor, p.rok, p.wydawca, p.opis].join(' '))))
  const href = (t: string) => `/biblioteka/publikacje${t || q ? '?' : ''}${[t && `typ=${t}`, q && `q=${encodeURIComponent(q)}`].filter(Boolean).join('&')}`
  return <Strona uklad="pelna"><TytulStrony sciezka={[{ tekst: 'biblioteka', href: '/biblioteka' }]}><TytulDzialu dzial="publikacje" domyslny="publikacje i opracowania" /></TytulStrony>
            <SpisBiblioteki wybrany="publikacje" />
            <WstepDzialu dzial="publikacje" className="ot-drobne" />
    {/* P7D-3 (AUD-03, AUD-04): to samo pole szukania i pastylki co w słowniku; lista jak lista materiałów; puste – Komunikat */}
    <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
      <PoleSzukania action="/biblioteka/publikacje" defaultValue={q} placeholder="tytuł, autor, wydawca" ukryte={{ typ: sp.typ ?? '' }} style={{ minWidth: 260 }} />
      <div className="flex flex-wrap filtr-pastylki" style={{ gap: 7 }} role="group" aria-label="rodzaj publikacji">
        {RODZAJE.map(([id, n]) => <Link key={id} href={href(id)} className="szukaj-filtr" aria-current={(sp.typ ?? '') === id ? 'true' : undefined}>{(sp.typ ?? '') === id ? <b>{n}</b> : n}</Link>)}
      </div>
    </div>
    <p className="ot-drobne" aria-live="polite">{lista.length} {lista.length === 1 ? 'pozycja' : lista.length % 10 >= 2 && lista.length % 10 <= 4 && (lista.length % 100 < 12 || lista.length % 100 > 14) ? 'pozycje' : 'pozycji'}</p>
    {/* P7F-3: publikacje jako karty – ten sam wzorzec co księgi metrykalne i karty osób */}
    {lista.length ? <div className="karty-ksiag">
      {lista.map(p => <KartaPozycji key={p.id} poziom={2} etykieta={p.nazwa}
        tytul={<Link href={`/biblioteka/publikacje/${p.id}`} className="kp-tytul">{p.nazwa}</Link>}
        prawa={[RODZAJE_PUBLIKACJI[p.rodzaj], p.rok].filter(Boolean).join(' · ')}>
        <Wiersz e="autor">{p.autor}</Wiersz>
        <Wiersz e="wydawca / czasopismo">{p.wydawca}</Wiersz>
        <Wiersz e="dostęp">{p.url && <OdnosnikZewn href={p.url}>{p.rodzaj === 'baza' ? 'otwórz serwis' : 'wersja cyfrowa'}</OdnosnikZewn>}</Wiersz>
      </KartaPozycji>)}</div> : <Komunikat rodzaj="pusto">{q || sp.typ ? 'Brak pozycji spełniających kryteria – zmień frazę albo rodzaj.' : 'Spis książek i artykułów jest w przygotowaniu.'}</Komunikat>}
  </Strona>
}
