import { brakDostepu } from '@/lib/plany/dane'
import { usunZgloszeniePanelu, zgloszeniaPanelu, zmienZgloszenie } from '@/lib/panel/dane'

// Zgłoszenia czytelników (ze stron i z planów) w jednej kolejce: stan i notatka (PATCH), usunięcie na stałe (DELETE).
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    return Response.json(await zgloszeniaPanelu(), { headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = (await req.json().catch(() => null)) as { zrodlo?: string; id?: string; stan?: string; notatka?: string } | null
    if (!d?.zrodlo || !d.id) return Response.json({ blad: 'złe dane' }, { status: 400 })
    return (await zmienZgloszenie(d.zrodlo, d.id, { stan: d.stan, notatka: d.notatka })) ? Response.json({ ok: true }) : Response.json({ blad: 'Nie udało się zapisać (zgłoszenie usunięte?).' }, { status: 400 })
}

export async function DELETE(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const q = new URL(req.url).searchParams
    await usunZgloszeniePanelu(q.get('zrodlo') ?? '', q.get('id') ?? '')
    return Response.json({ ok: true })
}
