import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { Link } from 'next-view-transitions'
import { miejsca, obiekty, tematy, poziomCzytelnika, type Widocznosc } from '@/lib/archiwum'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'
import { zbiory, katalogP5, type FiltrP5 } from '@/lib/paczka5'
import { RAMKA, Strona, TytulStrony } from '../components/Uklad'
import ListaMaterialow from '../components/ListaMaterialow'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'archiwum · odniepamieci.pl' }
type Params = Record<string, string | string[] | undefined>
const val = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v ?? '').slice(0, 120)
const rok = (s: string) => /^-?\d{1,4}$/.test(s) ? Number(s) : undefined
const pole = { padding: '5px 8px', minHeight: 36, fontSize: 'calc(13px * var(--font-scale, 1))' }
const etykieta = 'flex flex-col ot-drobne'

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
      <span className="block"><Link href="/archiwum/zbiory" className="odn">zbiory i kolekcje →</Link></span>
    </p>
    <form method="get" action="/archiwum" className="flex flex-wrap items-end" style={{ gap: 10 }}>
      <label className={etykieta}>szukaj w metadanych i transkrypcjach
        <input name="q" defaultValue={f.q} className={`${RAMKA} bg-transparent text-current`} style={{ ...pole, width: 250 }} placeholder="wpisz frazę…" />
      </label>
      <label className={etykieta}>rodzaj<select name="rodzaj" defaultValue={f.rodzaj} className={`${RAMKA} bg-transparent text-current`} style={pole}>
        <option value="">wszystkie</option>{Object.entries(RODZAJE_MATERIALOW).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select></label>
      <label className={etykieta}>miejscowość<select name="miejsce" defaultValue={f.miejsce} className={`${RAMKA} bg-transparent text-current`} style={pole}>
        <option value="">wszystkie</option>{msc.map(m => <option key={m.id} value={m.id}>{m.nazwa}</option>)}
      </select></label>
      <label className={etykieta}>temat<select name="temat" defaultValue={f.temat} className={`${RAMKA} bg-transparent text-current`} style={pole}>
        <option value="">wszystkie</option>{tem.map(t => <option key={t.id} value={t.id}>{t.nazwa}</option>)}
      </select></label>
      <label className={etykieta}>obiekt<select name="obiekt" defaultValue={f.obiekt} className={`${RAMKA} bg-transparent text-current`} style={pole}>
        <option value="">wszystkie</option>{obj.map(o => <option key={o.id} value={o.id}>{o.nazwa}</option>)}
      </select></label>
      <label className={etykieta}>osoba<select name="osoba" defaultValue={f.osoba} className={`${RAMKA} bg-transparent text-current`} style={pole}>
        <option value="">wszystkie</option>{osoby.map(o => <option key={o.id} value={o.id}>{o.nazwa}</option>)}
      </select></label>
      <label className={etykieta}>zbiór<select name="zbior" defaultValue={f.zbior} className={`${RAMKA} bg-transparent text-current`} style={pole}>
        <option value="">wszystkie</option>{kol.map(z => <option key={z.id} value={z.id}>{z.nazwa}</option>)}
      </select></label>
      <label className={etykieta}>od roku<input name="od" defaultValue={val(sp.od)} inputMode="numeric" className={`${RAMKA} bg-transparent text-current`} style={{ ...pole, width: 82 }} placeholder="1750" /></label>
      <label className={etykieta}>do roku<input name="do" defaultValue={val(sp.do)} inputMode="numeric" className={`${RAMKA} bg-transparent text-current`} style={{ ...pole, width: 82 }} placeholder="1918" /></label>
      <label className={etykieta}>sortowanie<select name="sort" defaultValue={f.sort ?? 'data_rosnaco'} className={`${RAMKA} bg-transparent text-current`} style={pole}>
        <option value="data_rosnaco">chronologicznie</option><option value="data_malejaco">od najnowszych</option>
        <option value="tytul">tytuł A–Z</option><option value="dodano">ostatnio dodane</option>
      </select></label>
      <button type="submit" className={`${RAMKA} bg-muted cursor-pointer lowercase text-current`} style={pole}>filtruj</button>
      <Link className="ot-drobne" href="/archiwum">wyczyść</Link>
    </form>
    <p className="ot-drobne" aria-live="polite">{wyn.razem} materiałów · strona {wyn.strona} z {wyn.stron}</p>
    <ListaMaterialow materialy={wyn.wyniki} />
    {wyn.stron > 1 && <nav aria-label="strony katalogu archiwum" className="flex flex-wrap items-center" style={{ gap: 12 }}>
      {wyn.strona > 1 && <Link href={qs(wyn.strona - 1)} className="odn">← poprzednia</Link>}
      <span className="ot-drobne">{wyn.strona} / {wyn.stron}</span>
      {wyn.strona < wyn.stron && <Link href={qs(wyn.strona + 1)} className="odn">następna →</Link>}
    </nav>}
  </Strona>
}
