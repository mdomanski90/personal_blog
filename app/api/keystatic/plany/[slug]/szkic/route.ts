import { brakDostepu, usunSzkic, wczytajPlan, wczytajSzkic, zapiszSzkic } from '@/lib/plany/dane'
import type { Plan } from '@/lib/plany/model'

// Szkic awaryjny planu na serwerze (etap 1, CEM-23): edytor zapisuje go, gdy zapis planu się nie udał.
export const dynamic = 'force-dynamic'
type P = { params: Promise<{ slug: string }> }

export async function GET(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    const s = await wczytajSzkic((await params).slug)
    // brak szkicu = null (200), żeby zwykłe wejście do edytora nie zostawiało błędu w konsoli
    return Response.json(s ?? null, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    const slug = (await params).slug
    if (!(await wczytajPlan(slug))) return Response.json({ blad: 'nie ma takiego planu' }, { status: 404 })
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
