import { poziomCzytelnika } from '@/lib/archiwum'
import { stanOsob } from '@/lib/osoby/dane'
import { drzewoHtml, MAKS_POKOLEN, type ZakresDrzewa } from '@/lib/osoby/drzewo'

// Drzewo osoby z większą liczbą pokoleń – doczytywane na pełnym ekranie (DrzewaLinie).
// Widoczność jak na stronie: czytelnik dostaje tylko to, co może zobaczyć.
export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const q = new URL(req.url).searchParams
    const liczba = (k: string) => Math.max(0, Math.min(MAKS_POKOLEN, Number.parseInt(q.get(k) ?? '', 10) || 0))
    const z = q.get('zakres')
    const zakres: ZakresDrzewa = z === 'linia' || z === 'rodzenstwo' ? z : 'malzonkowie'
    const poziom = await poziomCzytelnika()
    const html = drzewoHtml(await stanOsob(), id, { wstecz: liczba('wstecz'), naprzod: liczba('naprzod'), zakres, wTabeli: q.get('tabela') === '1' }, poziom)
    if (!html) return new Response('Nie znaleziono', { status: 404 })
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' } })
}
