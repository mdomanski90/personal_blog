import { brakDostepu } from '@/lib/plany/dane'
import { poziomPanelu, widziTylkoJaZadanie } from '@/lib/konta/straz'
import { osobaWTerenie } from '@/lib/teren/serwer'
import { podgladObiektu, utworzObiektZTerenu } from '@/lib/teren/obiekt-serwer'

// P7c (TER-04): „utwórz obiekt…” ze skrzynki „z terenu” – GET: podgląd pól, POST: zapis (operacja z „cofnij”).
// Obiekt powstaje z widocznością „tylko ja”, a taką pozycję zapisuje tylko konto z rolą administratora (lib/konta/model.ts ocenZapis).
export const dynamic = 'force-dynamic'
const BEZ_PRAWA = 'Obiekt ze skrzynki powstaje jako „tylko ja” – tworzy go administrator. Możesz założyć obiekt ręcznie („+ nowy obiekt”) i oznaczyć wpis jako opracowany.'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const b = brakDostepu(req); if (b) return b
    if (!osobaWTerenie(req)?.redakcja) return Response.json({ blad: 'Brak dostępu.' }, { status: 403 })
    const p = await podgladObiektu((await params).id, poziomPanelu(req))
    if (!p) return Response.json({ blad: 'Nie ma takiego wpisu.' }, { status: 404 })
    return Response.json({ ...p, mozna: widziTylkoJaZadanie(req), ...(widziTylkoJaZadanie(req) ? {} : { powod: BEZ_PRAWA }) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const b = brakDostepu(req); if (b) return b
    const o = osobaWTerenie(req)
    if (!o?.redakcja) return Response.json({ blad: 'Brak dostępu.' }, { status: 403 })
    if (!widziTylkoJaZadanie(req)) return Response.json({ blad: BEZ_PRAWA }, { status: 403 })
    const dane = await req.json().catch(() => null)
    const w = await utworzObiektZTerenu((await params).id, dane, o.id || 'redakcja', poziomPanelu(req))
    if (!w.ok) return Response.json({ blad: w.blad }, { status: w.status })
    return Response.json(w)
}
