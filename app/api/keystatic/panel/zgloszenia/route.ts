import { brakDostepu } from '@/lib/plany/dane'
import { usunZgloszeniePanelu, zgloszeniaPanelu, zgloszenieWidoczne, zmienZgloszenie } from '@/lib/panel/dane'
import { widziTylkoJaZadanie } from '@/lib/konta/straz'

// Zgłoszenia czytelników (ze stron i z planów) w jednej kolejce: stan i notatka (PATCH), usunięcie na stałe (DELETE).
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    return Response.json(await zgloszeniaPanelu(widziTylkoJaZadanie(req)), { headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = (await req.json().catch(() => null)) as { zrodlo?: string; id?: string; stan?: string; notatka?: string } | null
    if (!d?.zrodlo || !d.id) return Response.json({ blad: 'złe dane' }, { status: 400 })
    if (!(await zgloszenieWidoczne(d.zrodlo, d.id, widziTylkoJaZadanie(req)))) return Response.json({ blad: 'Nie ma takiego zgłoszenia.' }, { status: 404 })
    return (await zmienZgloszenie(d.zrodlo, d.id, { stan: d.stan, notatka: d.notatka })) ? Response.json({ ok: true }) : Response.json({ blad: 'Nie udało się zapisać (zgłoszenie usunięte?).' }, { status: 400 })
}

export async function DELETE(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const q = new URL(req.url).searchParams
    if (!(await zgloszenieWidoczne(q.get('zrodlo') ?? '', q.get('id') ?? '', widziTylkoJaZadanie(req)))) return Response.json({ blad: 'Nie ma takiego zgłoszenia.' }, { status: 404 })
    const blad = await usunZgloszeniePanelu(q.get('zrodlo') ?? '', q.get('id') ?? '')
    return blad ? Response.json({ blad }, { status: 400 }) : Response.json({ ok: true })
}
