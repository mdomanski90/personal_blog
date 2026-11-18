import { brakDostepu } from '@/lib/plany/dane'
import { adresPanelu, dodajDoListy, usunZListy, wczytajPrace } from '@/lib/panel/praca'
import { nazwaDlaAdresu } from '@/lib/panel/praca-nazwy'

// P6a (PNL-08): „wróć do pracy” – GET: ostatnio edytowane, przypięte, widoki list; POST {akcja:'dodaj'|'usun', lista, href, nazwa?}.
export const dynamic = 'force-dynamic'
const BEZ_CACHE = { 'Cache-Control': 'private, no-store' }

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    return Response.json(await wczytajPrace(), { headers: BEZ_CACHE })
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = (await req.json().catch(() => null)) as { akcja?: unknown; lista?: unknown; href?: unknown; nazwa?: unknown } | null
    if (!d || !adresPanelu(d.href) || !['przypiete', 'widoki', 'ostatnie'].includes(String(d.lista))) return Response.json({ blad: 'złe dane' }, { status: 400, headers: BEZ_CACHE })
    try {
        if (d.akcja === 'usun') return Response.json(await usunZListy(d.lista as 'przypiete', d.href), { headers: BEZ_CACHE })
        if (d.akcja === 'dodaj' && d.lista !== 'ostatnie') {
            const nazwa = typeof d.nazwa === 'string' && d.nazwa.trim() ? d.nazwa : await nazwaDlaAdresu(d.href)
            const p = await dodajDoListy(d.lista as 'przypiete' | 'widoki', { href: d.href, nazwa })
            return p ? Response.json(p, { headers: BEZ_CACHE }) : Response.json({ blad: 'złe dane' }, { status: 400, headers: BEZ_CACHE })
        }
    } catch { return Response.json({ blad: 'Nie udało się zapisać (content/_panel).' }, { status: 500, headers: BEZ_CACHE }) }
    return Response.json({ blad: 'nieznana akcja' }, { status: 400, headers: BEZ_CACHE })
}
