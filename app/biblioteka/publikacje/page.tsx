import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { Link } from 'next-view-transitions'
import { poziomCzytelnika } from '@/lib/archiwum'
import { publikacje } from '@/lib/paczka5'
import { przygotujZapytanie, pasuje } from '@/lib/szukanie'
import { RAMKA, Strona, TytulStrony } from '../../components/Uklad'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'publikacje · biblioteka · odniepamieci.pl' }
export default async function Publikacje({ searchParams }: { searchParams: Promise<{ q?: string; typ?: string }> }) {
  const sp = await searchParams
  const q = (sp.q ?? '').slice(0, 100)
  const z = przygotujZapytanie(q)
  const lista = (await publikacje(await poziomCzytelnika())).filter(p =>
    (!sp.typ || p.rodzaj === sp.typ) && (!z || pasuje(z, [p.nazwa, p.autor, p.rok, p.wydawca, p.opis].join(' '))))
  return <Strona><TytulStrony sciezka={[{ tekst: 'biblioteka', href: '/biblioteka' }]}><TytulDzialu dzial="publikacje" domyslny="publikacje i opracowania" /></TytulStrony>
            <WstepDzialu dzial="publikacje" className="ot-drobne" />
    <form method="get" className="flex flex-wrap items-end" style={{ gap: 10 }}>
      <label className="flex flex-col ot-drobne">szukaj<input name="q" defaultValue={q} className={`${RAMKA} bg-transparent text-current`} style={{ padding: '6px 8px' }} /></label>
      <label className="flex flex-col ot-drobne">rodzaj<select name="typ" defaultValue={sp.typ ?? ''} className={`${RAMKA} bg-transparent text-current`} style={{ padding: '6px' }}>
        <option value="">wszystkie</option><option value="ksiazka">książki</option><option value="artykul">artykuły</option><option value="prasa">prasa</option><option value="opracowanie">opracowania</option><option value="baza">bazy i serwisy</option>
      </select></label>
      <button type="submit" className={`${RAMKA} bg-muted`} style={{ padding: '6px 12px' }}>filtruj</button>
      {(q || sp.typ) && <Link href="/biblioteka/publikacje">wyczyść</Link>}
    </form>
    <p className="ot-drobne">wyniki: {lista.length}</p>
    {lista.length ? <ul className="flex flex-col" style={{ listStyle: 'none', padding: 0 }}>
      {lista.map(p => <li key={p.id} className="border-b border-[#e7e2d8] py-3 dark:border-[#374151]">
        <Link className="odn font-bold" href={`/biblioteka/publikacje/${p.id}`}>{p.nazwa} →</Link>
        <p className="ot-drobne">{[p.autor, p.rok, p.wydawca].filter(Boolean).join(' · ')}</p>
      </li>)}</ul> : <p className="ot-drobne">Brak opublikowanych pozycji spełniających kryteria.</p>}
  </Strona>
}
