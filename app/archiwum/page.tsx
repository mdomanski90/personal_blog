import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { Link } from 'next-view-transitions'
import { miejsca, obiekty, tematy, poziomCzytelnika, RODZAJE_OBIEKTOW, type Widocznosc } from '@/lib/archiwum'
import FiltryArchiwum from './FiltryArchiwum'
import SpisDzialow, { type Dzial } from './SpisDzialow'
import { zbiory, katalogP5, type FiltrP5 } from '@/lib/paczka5'
import { Strona, TytulStrony } from '../components/Uklad'
import ListaMaterialow from '../components/ListaMaterialow'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'archiwum · odniepamieci.pl' }
type Params = Record<string, string | string[] | undefined>
const val = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v ?? '').slice(0, 120)
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
  const hrefDzialu = (rodzaj: string) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (k !== 'strona' && k !== 'rodzaj') { const s = val(v); if (s) p.set(k, s) }
    if (rodzaj) p.set('rodzaj', rodzaj)
    const s = p.toString()
    return s ? `/archiwum?${s}` : '/archiwum'
  }
  const liczby = await Promise.all(DZIALY.map(([k]) => katalogP5(poziom, { rodzaj: k })))
  const wszystkich = (await katalogP5(poziom, {})).razem
  const dzialy: Dzial[] = [
    { klucz: 'wszystkie', nazwa: 'wszystkie materiały', href: hrefDzialu(''), liczba: wszystkich },
    ...DZIALY.map(([k, nazwa], i) => ({ klucz: k, nazwa, href: hrefDzialu(k), liczba: liczby[i].razem })),
    { klucz: 'zbiory', nazwa: 'zbiory i kolekcje', href: '/archiwum/zbiory', liczba: kol.length },
  ]
  const qs = (n: number) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (k !== 'strona') { const s = val(v); if (s) p.set(k, s) }
    p.set('strona', String(n))
    return `/archiwum?${p.toString()}`
  }
  return <Strona>
    <TytulStrony><TytulDzialu dzial="archiwum" domyslny="archiwum" /></TytulStrony>
    <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>
      <WstepTekst dzial="archiwum" domyslny={"Dokumenty, fotografie, wspomnienia, nagrania i mapy z opisem, pochodzeniem oraz powiązaniami."} />
    </p>
    <SpisDzialow dzialy={dzialy} wybrany={f.rodzaj || 'wszystkie'} />
    <FiltryArchiwum
      poczatkowe={{ q: f.q ?? '', rodzaj: f.rodzaj ?? '', miejsce: f.miejsce ?? '', temat: f.temat ?? '', obiekt: f.obiekt ?? '', osoba: f.osoba ?? '', zbior: f.zbior ?? '', od: val(sp.od), do: val(sp.do), sort: f.sort ?? '' }}
      miejscowosci={msc.map((m) => ({ id: m.id, nazwa: m.nazwa }))}
      tematy={tem.map((x) => ({ id: x.id, nazwa: x.nazwa }))}
      obiekty={obj.map((o) => ({ id: o.id, nazwa: o.nazwa, szukaj: o.inneNazwy, opis: [RODZAJE_OBIEKTOW[o.rodzaj as keyof typeof RODZAJE_OBIEKTOW] ?? o.rodzaj, o.miejsce ? nazwyMsc.get(o.miejsce) : ''].filter(Boolean).join(' · ') }))}
      osoby={osoby}
      zbiory={kol.map((z) => ({ id: z.id, nazwa: z.nazwa }))}
    />
    <p className="ot-drobne" aria-live="polite">{wyn.razem} materiałów · strona {wyn.strona} z {wyn.stron}</p>
    <ListaMaterialow materialy={wyn.wyniki} />
    {wyn.stron > 1 && <nav aria-label="strony katalogu archiwum" className="flex flex-wrap items-center" style={{ gap: 12 }}>
      {wyn.strona > 1 && <Link href={qs(wyn.strona - 1)} className="odn">← poprzednia</Link>}
      <span className="ot-drobne">{wyn.strona} / {wyn.stron}</span>
      {wyn.strona < wyn.stron && <Link href={qs(wyn.strona + 1)} className="odn">następna →</Link>}
    </nav>}
  </Strona>
}
