import { brakDostepu, usunSzkic, wczytajPlan, wczytajSzkic, zapiszSzkic } from '@/lib/plany/dane'
import type { Plan } from '@/lib/plany/model'
import { widziTylkoJaZadanie } from '@/lib/konta/straz'
import { planBezTylkoJa, planUkryty } from '@/lib/plany/tylko-ja'

// Szkic awaryjny planu na serwerze (etap 1, CEM-23): edytor zapisuje go, gdy zapis planu się nie udał.
export const dynamic = 'force-dynamic'
type P = { params: Promise<{ slug: string }> }

export async function GET(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    const slug = (await params).slug
    // P7c (KON-08): szkic planu „tylko ja” – nie dla konta bez roli administratora; elementy „tylko ja” wycięte
    if (!widziTylkoJaZadanie(req)) {
        if (planUkryty(await wczytajPlan(slug))) return Response.json(null, { headers: { 'Cache-Control': 'no-store' } })
        const s = await wczytajSzkic(slug)
        return Response.json(s ? { ...s, plan: s.plan ? planBezTylkoJa(s.plan) : s.plan } : null, { headers: { 'Cache-Control': 'no-store' } })
    }
    const s = await wczytajSzkic(slug)
    // brak szkicu = null (200), żeby zwykłe wejście do edytora nie zostawiało błędu w konsoli
    return Response.json(s ?? null, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    const slug = (await params).slug
    const obecny = await wczytajPlan(slug)
    if (!obecny || (!widziTylkoJaZadanie(req) && planUkryty(obecny))) return Response.json({ blad: 'nie ma takiego planu' }, { status: 404 })
    const d = (await req.json().catch(() => null)) as Plan | null
    if (!d || d.slug !== slug || !Array.isArray(d.elementy)) return Response.json({ blad: 'złe dane' }, { status: 400 })
    const s = await zapiszSzkic(slug, d)
    return Response.json({ czas: s.czas })
}

export async function DELETE(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    await usunSzkic((await params).slug)
    return Response.json({ ok: true })
}
