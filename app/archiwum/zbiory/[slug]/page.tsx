import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { poziomCzytelnika } from '@/lib/archiwum'
import { zbior, materialyZbioru } from '@/lib/paczka5'
import { naHtml } from '@/lib/markdoc'
import { Strona, TytulStrony, Tresc, maTekst } from '../../../components/Uklad'
import ListaMaterialow from '../../../components/ListaMaterialow'
export const dynamic = 'force-dynamic'
type P = { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const z = await zbior((await params).slug, await poziomCzytelnika())
  return { title: z ? `${z.nazwa} · archiwum · odniepamieci.pl` : 'nie znaleziono · odniepamieci.pl', robots: { index: !!z && z.widocznosc === 'publiczne' } }
}
export default async function Zbior({ params }: P) {
  const poziom = await poziomCzytelnika()
  const z = await zbior((await params).slug, poziom)
  if (!z) notFound()
  const tekst = naHtml(z.opis)
  return <Strona>
    <TytulStrony sciezka={[{ tekst: 'archiwum', href: '/archiwum' }, { tekst: 'zbiory', href: '/archiwum/zbiory' }]}>{z.nazwa}</TytulStrony>
    {maTekst(tekst) && <Tresc html={tekst} />}
    {z.pochodzenie && <p className="ot-drobne">pochodzenie: {z.pochodzenie}</p>}
    {z.prawa && <p className="ot-drobne">prawa: {z.prawa}</p>}
    <ListaMaterialow materialy={await materialyZbioru(z.id, poziom)} />
  </Strona>
}
