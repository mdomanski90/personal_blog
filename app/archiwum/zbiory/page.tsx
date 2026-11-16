import type { Metadata } from 'next'
import { TytulDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { Link } from 'next-view-transitions'
import { poziomCzytelnika } from '@/lib/archiwum'
import { zbiory, materialyZbioru } from '@/lib/paczka5'
import { Strona, TytulStrony } from '../../components/Uklad'
import Komunikat from '../../components/Komunikat'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'zbiory · archiwum · odniepamieci.pl' }
export default async function Zbiory() {
  const poziom = await poziomCzytelnika()
  const lista = await zbiory(poziom)
  return <Strona uklad="pelna"><TytulStrony sciezka={[{ tekst: 'archiwum', href: '/archiwum' }]}><TytulDzialu dzial="zbiory" domyslny="zbiory i kolekcje" /></TytulStrony>
    <p className="ot-drobne"><WstepTekst dzial="zbiory" domyslny={"Zachowane zespoły materiałów, np. rodzinne albumy i przekazana korespondencja. Jeden materiał może należeć do kilku zbiorów."} /></p>
    {lista.length ? <ul className="lista-pozycji">
      {await Promise.all(lista.map(async z => <li key={z.id} className="lista-pozycja">
        <Link className="lista-tytul" href={`/archiwum/zbiory/${z.id}`}>{z.nazwa}</Link>
        <span className="lista-linia">{(await materialyZbioru(z.id, poziom)).length} materiałów{z.pochodzenie ? ` · ${z.pochodzenie}` : ''}</span>
      </li>))}</ul> : <Komunikat rodzaj="pusto">Zbiory nie zostały jeszcze opublikowane.</Komunikat>}
  </Strona>
}
