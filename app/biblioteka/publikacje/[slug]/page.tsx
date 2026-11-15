import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from 'next-view-transitions'
import { poziomCzytelnika } from '@/lib/archiwum'
import { publikacja } from '@/lib/paczka5'
import { Strona, TytulStrony } from '../../../components/Uklad'
export const dynamic = 'force-dynamic'
type P = { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await publikacja((await params).slug, await poziomCzytelnika())
  return { title: p ? `${p.nazwa} · biblioteka · odniepamieci.pl` : 'nie znaleziono · odniepamieci.pl', robots: { index: !!p && p.widocznosc === 'publiczne' } }
}
export default async function Publikacja({ params }: P) {
  const p = await publikacja((await params).slug, await poziomCzytelnika())
  if (!p) notFound()
  return <Strona><TytulStrony sciezka={[{ tekst: 'biblioteka', href: '/biblioteka' }, { tekst: 'publikacje', href: '/biblioteka/publikacje' }]}>{p.nazwa}</TytulStrony>
    {[['rodzaj',p.rodzaj], ['autor',p.autor], ['rok',p.rok],['wydawca',p.wydawca],['ISBN / identyfikator',p.isbn]]
      .filter(([,v])=>!!v).map(([k,v])=><p key={k}><strong>{k}:</strong> {v}</p>)}
    {p.opis && <p className="whitespace-pre-wrap">{p.opis}</p>}
    {p.url && <p><Link className="odn" href={p.url}>otwórz publikację / katalog źródłowy →</Link></p>}
  </Strona>
}
