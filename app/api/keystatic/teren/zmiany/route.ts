import { brakDostepu, listaPlanow } from '@/lib/plany/dane'
import { ktoTeraz } from '@/lib/konta/straz'
import { osobaWTerenie, rozstrzygnijZmiane, wpisyZTerenu } from '@/lib/teren/serwer'

// P7b (TER-01): zmiany z terenu dla redakcji – kto, co i kiedy zapisał na planach; napisy „do decyzji” (obie wersje) i ich rozstrzygnięcie.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const o = osobaWTerenie(req)
    if (!o?.pelne) return Response.json({ blad: 'Zmiany z terenu przegląda redakcja planów.' }, { status: 403 })
    const wpisy = await wpisyZTerenu(await listaPlanow(), undefined, 200)
    return Response.json({ wpisy, doDecyzji: wpisy.filter((w) => w.wynik === 'do-decyzji' && !w.rozstrzygnieto).length }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = (await req.json().catch(() => ({}))) as { plan?: string; id?: string; wybor?: string }
    if (typeof d.plan !== 'string' || typeof d.id !== 'string' || (d.wybor !== 'teren' && d.wybor !== 'redakcja')) return Response.json({ blad: 'Brak danych.' }, { status: 400 })
    const w = await rozstrzygnijZmiane(d.plan, d.id, d.wybor, { id: ktoTeraz()?.id ?? 'redakcja' })
    if ('blad' in w) return Response.json({ blad: w.blad }, { status: w.status })
    return Response.json(w)
}
