import type { Metadata } from 'next'
import { TytulDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { Link } from 'next-view-transitions'
import { miejsca, obiekty, tematy, poziomCzytelnika, RODZAJE_OBIEKTOW, type Widocznosc } from '@/lib/archiwum'
import FiltryKatalogu from '../components/FiltryKatalogu'
import { NawigacjaStron, WybraneFiltry } from '../components/Wzorce'
import { adresFiltrow, wartosc } from '@/lib/adres-filtrow'
import SpisDzialow, { type Dzial } from './SpisDzialow'
import { zbiory, katalogP5, type FiltrP5 } from '@/lib/paczka5'
import StronaDzialu, { LicznikWynikow } from '../components/StronaDzialu'
import ListaMaterialow from '../components/ListaMaterialow'
import Komunikat from '../components/Komunikat'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'archiwum · odniepamieci.pl' }
type Params = Record<string, string | string[] | undefined>
const val = wartosc
const rok = (s: string) => /^-?\d{1,4}$/.test(s) ? Number(s) : undefined

export default async function Archiwum({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams
  const poziom: Widocznosc = await poziomCzytelnika()
  const f: FiltrP5 = {
    q: val(sp.q), rodzaj: val(sp.rodzaj), miejsce: val(sp.miejsce), temat: val(sp.temat),
    obiekt: val(sp.obiekt), osoba: val(sp.osoba), zbior: val(sp.zbior),
    od: rok(val(sp.od)), do: rok(val(sp.do)),
    sort: ['data_rosnaco', 'data_malejaco', 'tytul', 'dodano'].includes(val(sp.sort)) ? val(sp.sort) as FiltrP5['sort'] : undefined,
    strona: /^\d{1,5}$/.test(val(sp.strona)) ? Number(val(sp.strona)) : 1,
  }
  const [wyn, msc, tem, obj, kol] = await Promise.all([
    katalogP5(poziom, f), miejsca(poziom), tematy(poziom), obiekty(poziom), zbiory(poziom),
  ])
  const { stanOsob } = await import('@/lib/osoby/dane')
  const { nazwaOsoby } = await import('@/lib/osoby/model')
  const { widoczne } = await import('@/lib/archiwum')
  const stan = await stanOsob()
  const osoby = [...stan.drzewo.osoby.values()]
    .filter((o) => widoczne(stan.widocznosc(o.id), poziom))
    .map((o) => ({ id: o.id, nazwa: nazwaOsoby(o) }))
    .sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'))
  const nazwyMsc = new Map(msc.map((m) => [m.id, m.nazwa]))
  // P7A-4: działy z liczbami (te same liczby co wyniki katalogu przy samym dziale); widoczne wszystkie, także puste (decyzja właściciela 15.11)
  const DZIALY: [string, string][] = [['dokument', 'dokumenty'], ['akt', 'akty metrykalne'], ['wspomnienie', 'wspomnienia i relacje'], ['zdjecie', 'fotografie'], ['nagranie', 'nagrania'], ['mapa', 'mapy']]
  const hrefDzialu = (rodzaj: string) => adresFiltrow('/archiwum', sp, { ustaw: { rodzaj } })
  // P7B: rząd „wybrane” – każdy aktywny filtr z ✕ (zwykły odnośnik bez tego parametru)
  const bez = (klucze: string[]) => adresFiltrow('/archiwum', sp, { pomin: klucze })
  const nazwa = (lista: { id: string; nazwa: string }[], id?: string) => (id ? lista.find((x) => x.id === id)?.nazwa ?? id : '')
  const wybrane = [
    f.q && { klucz: 'q', etykieta: `„${f.q}”`, usun: ['q'] },
    f.miejsce && { klucz: 'miejsce', etykieta: nazwa(msc, f.miejsce), usun: ['miejsce'] },
    f.obiekt && { klucz: 'obiekt', etykieta: nazwa(obj, f.obiekt), usun: ['obiekt'] },
    f.osoba && { klucz: 'osoba', etykieta: nazwa(osoby, f.osoba), usun: ['osoba'] },
    f.temat && { klucz: 'temat', etykieta: nazwa(tem, f.temat), usun: ['temat'] },
    f.zbior && { klucz: 'zbior', etykieta: `zbiór: ${nazwa(kol, f.zbior)}`, usun: ['zbior'] },
    (f.od !== undefined || f.do !== undefined) && { klucz: 'lata', etykieta: `${f.od ?? '…'}–${f.do ?? '…'}`, usun: ['od', 'do'] },
  ].filter(Boolean) as { klucz: string; etykieta: string; usun: string[] }[]
  const WSZYSTKIE_FILTRY = ['q', 'miejsce', 'temat', 'obiekt', 'osoba', 'zbior', 'od', 'do']
  const liczby = await Promise.all(DZIALY.map(([k]) => katalogP5(poziom, { rodzaj: k })))
  const wszystkich = (await katalogP5(poziom, {})).razem
  const dzialy: Dzial[] = [
    { klucz: 'wszystkie', nazwa: 'wszystkie materiały', href: hrefDzialu(''), liczba: wszystkich },
    ...DZIALY.map(([k, nazwa], i) => ({ klucz: k, nazwa, href: hrefDzialu(k), liczba: liczby[i].razem })),
    { klucz: 'zbiory', nazwa: 'zbiory i kolekcje', href: '/archiwum/zbiory', liczba: kol.length },
  ]
  const qs = (n: number) => adresFiltrow('/archiwum', sp, { ustaw: { strona: String(n) } })
  // DZL-01 (17.11, zastępuje JW-2 z 16.11): tytuł → spis działów → wstęp → „szukaj i filtruj” → wybrane → licznik → lista → strony
  return <StronaDzialu
    tytul={<TytulDzialu dzial="archiwum" domyslny="archiwum" />}
    spis={<SpisDzialow dzialy={dzialy} wybrany={f.rodzaj || 'wszystkie'} />}
    wstep={<p className="tekst-opis wstep-dzialu-tekst">
      <WstepTekst dzial="archiwum" domyslny={"Dokumenty, fotografie, wspomnienia, nagrania i mapy z opisem, pochodzeniem oraz powiązaniami."} />
    </p>}
    panel={<FiltryKatalogu adresBazowy="/archiwum" tytul="szukaj i filtruj w archiwum"
      poczatkowe={{ q: f.q ?? '', rodzaj: f.rodzaj ?? '', miejsce: f.miejsce ?? '', temat: f.temat ?? '', obiekt: f.obiekt ?? '', osoba: f.osoba ?? '', zbior: f.zbior ?? '', od: val(sp.od), do: val(sp.do), sort: f.sort ?? '' }}
      miejscowosci={msc.map((m) => ({ id: m.id, nazwa: m.nazwa }))}
      tematy={tem.map((x) => ({ id: x.id, nazwa: x.nazwa }))}
      obiekty={obj.map((o) => ({ id: o.id, nazwa: o.nazwa, szukaj: o.inneNazwy, opis: [RODZAJE_OBIEKTOW[o.rodzaj as keyof typeof RODZAJE_OBIEKTOW] ?? o.rodzaj, o.miejsce ? nazwyMsc.get(o.miejsce) : ''].filter(Boolean).join(' · ') }))}
      osoby={osoby}
      zbiory={kol.map((z) => ({ id: z.id, nazwa: z.nazwa }))}
    />}
    wybrane={<WybraneFiltry wybrane={wybrane.map((x) => ({ klucz: x.klucz, etykieta: x.etykieta, href: bez(x.usun) }))} wyczysc={bez(WSZYSTKIE_FILTRY)} />}
    licznik={<LicznikWynikow liczba={wyn.razem} formy={['materiał', 'materiały', 'materiałów']} strona={wyn.strona} stron={wyn.stron} />}
    tresc={wyn.razem === 0
      ? <Komunikat rodzaj="pusto" tytul="nic nie pasuje do wybranych filtrów.">
          <p>Brak wyniku nie oznacza, że materiał nie istnieje – archiwum jest w opracowaniu.</p>
          <p className="k-kom-akcje">
            {wybrane.length > 0 && <Link href={bez(WSZYSTKIE_FILTRY)}>wyczyść filtry</Link>}
            {f.rodzaj && <Link href={bez(['rodzaj'])}>wszystkie działy</Link>}
            <Link href="/szukaj">szukaj w całym serwisie</Link>
          </p>
        </Komunikat>
      : <ListaMaterialow materialy={wyn.wyniki} />}
    stronicowanie={<NawigacjaStron strona={wyn.strona} stron={wyn.stron} adres={qs} etykieta="strony katalogu archiwum" />}
  />
}
