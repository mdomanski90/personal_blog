import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { Link } from 'next-view-transitions'
import { obiekty, poziomCzytelnika } from '@/lib/archiwum'
import { Strona, TytulStrony } from '../components/Uklad'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'obiekty · odniepamieci.pl' }
export default async function Obiekty() {
  const lista = await obiekty(await poziomCzytelnika())
  return <Strona><TytulStrony sciezka={[{ tekst: 'miejsca', href: '/miejsca' }]}><TytulDzialu dzial="obiekty" domyslny="obiekty" /></TytulStrony>
    <p className="ot-drobne"><WstepTekst dzial="obiekty" domyslny={"Kościoły, kaplice, cmentarze, budynki i inne obiekty. Instytucje, takie jak parafie, mają osobne karty."} /></p>
    <ul className="flex flex-col" style={{ listStyle: 'none', padding: 0 }}>
      {lista.map(o => <li key={o.id} className="border-b border-[#e7e2d8] py-3 dark:border-[#374151]">
        <Link className="odn font-bold" href={`/obiekty/${o.id}`}>{o.nazwa} →</Link>
      </li>)}
    </ul>
    {!lista.length && <p className="ot-drobne">Brak opublikowanych obiektów.</p>}
  </Strona>
}
