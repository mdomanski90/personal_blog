import { brakDostepu, usunPlan, wczytajPlan, zapiszPlan } from '@/lib/plany/dane'
import { popraw, type Plan } from '@/lib/plany/model'

// Jeden plan: odczyt pełny (z polami roboczymi), zapis z kontrolą wersji (autozapis edytora), usunięcie do kosza.
export const dynamic = 'force-dynamic'
type P = { params: Promise<{ slug: string }> }

export async function GET(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    const plan = await wczytajPlan((await params).slug)
    return plan ? Response.json(plan) : Response.json({ blad: 'nie ma takiego planu' }, { status: 404 })
}

export async function PUT(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    const slug = (await params).slug
    const d = (await req.json().catch(() => null)) as Plan | null
    if (!d || d.slug !== slug) return Response.json({ blad: 'złe dane' }, { status: 400 })
    const obecny = await wczytajPlan(slug)
    if (obecny && obecny.wersja !== d.wersja) return Response.json({ blad: 'konflikt', plan: obecny }, { status: 409 })
    const zapisany = await zapiszPlan(popraw({ ...d, wersja: (obecny?.wersja ?? 0) + 1 }))
    return Response.json({ wersja: zapisany.wersja, zmieniono: zapisany.zmieniono })
}

export async function DELETE(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    await usunPlan((await params).slug)
    return Response.json({ ok: true })
}
