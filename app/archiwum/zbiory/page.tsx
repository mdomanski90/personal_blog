import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { Link } from 'next-view-transitions'
import { poziomCzytelnika } from '@/lib/archiwum'
import { zbiory, materialyZbioru } from '@/lib/paczka5'
import { Strona, TytulStrony } from '../../components/Uklad'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'zbiory · archiwum · odniepamieci.pl' }
export default async function Zbiory() {
  const poziom = await poziomCzytelnika()
  const lista = await zbiory(poziom)
  return <Strona><TytulStrony><TytulDzialu dzial="zbiory" domyslny="zbiory i kolekcje" /></TytulStrony>
    <p className="text-gray-600 dark:text-gray-400"><WstepTekst dzial="zbiory" domyslny={"Zachowane zespoły materiałów, np. rodzinne albumy i przekazana korespondencja. Jeden materiał może należeć do kilku zbiorów."} /></p>
    {lista.length ? <ul className="flex flex-col" style={{ listStyle: 'none', padding: 0, gap: 12 }}>
      {await Promise.all(lista.map(async z => <li key={z.id} className="border-b border-[#e7e2d8] pb-3 dark:border-[#374151]">
        <Link className="odn font-bold" href={`/archiwum/zbiory/${z.id}`}>{z.nazwa} →</Link>
        <p className="ot-drobne">{(await materialyZbioru(z.id, poziom)).length} materiałów{z.pochodzenie ? ` · ${z.pochodzenie}` : ''}</p>
      </li>))}</ul> : <p className="ot-drobne">Zbiory nie zostały jeszcze opublikowane.</p>}
  </Strona>
}
