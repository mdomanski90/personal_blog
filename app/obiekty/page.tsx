import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { Link } from 'next-view-transitions'
import { RODZAJE_OBIEKTOW as NAZWY_OBIEKTOW, obiekty, poziomCzytelnika } from '@/lib/archiwum'
import { Strona, TytulStrony } from '../components/Uklad'
import Komunikat from '../components/Komunikat'
import { tarczaObiektu } from '@/lib/tarcze'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'obiekty · odniepamieci.pl' }
export default async function Obiekty() {
  const lista = await obiekty(await poziomCzytelnika())
  return <Strona><TytulStrony sciezka={[{ tekst: 'miejsca', href: '/miejsca' }]}><TytulDzialu dzial="obiekty" domyslny="obiekty" /></TytulStrony>
    <p className="ot-drobne"><WstepTekst dzial="obiekty" domyslny={"Kościoły, kaplice, cmentarze, budynki i inne obiekty. Instytucje, takie jak parafie, mają osobne karty."} /></p>
    {/* P7D-3 (AUD-04): wspólna lista pozycji działu; puste – Komunikat */}
    {lista.length ? <ul className="lista-pozycji">
      {lista.map(o => <li key={o.id} className="lista-pozycja lista-pozycja--z-tarcza">
        {/* P7F-2: ta sama tarcza rodzaju co na mapie i w kartach */}
        <span className="lo-tarcza" aria-hidden="true" dangerouslySetInnerHTML={{ __html: tarczaObiektu(o.rodzaj, NAZWY_OBIEKTOW[o.rodzaj] ?? o.rodzaj, 28, o.istnieje !== false) }} />
        <span className="lo-tresc">
          <Link className="lista-tytul" href={`/obiekty/${o.id}`}>{o.nazwa}</Link>
          <span className="lista-linia">{[NAZWY_OBIEKTOW[o.rodzaj] ?? o.rodzaj, o.istnieje === false ? 'nie istnieje' : null].filter(Boolean).join(' · ')}</span>
        </span>
      </li>)}
    </ul> : <Komunikat rodzaj="pusto">Spis obiektów jest w przygotowaniu.</Komunikat>}
  </Strona>
}
