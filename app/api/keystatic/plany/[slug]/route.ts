import { brakDostepu, usunPlan, wczytajPlan, zapiszZWersja } from '@/lib/plany/dane'
import { popraw, type Plan } from '@/lib/plany/model'
import { zNadaniemNumerow } from '@/lib/katalog/dane'
import { numeryPlanu, numerTekst } from '@/lib/plany/numeracja'
import { zapiszOstatniePozycje } from '@/lib/panel/praca'

// Jeden plan: odczyt pełny (z polami roboczymi), zapis z kontrolą wersji (autozapis edytora), usunięcie do kosza.
export const dynamic = 'force-dynamic'
type P = { params: Promise<{ slug: string }> }

export async function GET(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    const plan = await wczytajPlan((await params).slug)
    return plan ? Response.json(plan) : Response.json({ blad: 'nie ma takiego planu' }, { status: 404 })
}

// KAT-01: po udanym zapisie – numery katalogowe dla nowych pozycji publicznych
export const PUT = zNadaniemNumerow(zapiszPUT)

async function zapiszPUT(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    const slug = (await params).slug
    const d = (await req.json().catch(() => null)) as Plan | null
    if (!d || d.slug !== slug) return Response.json({ blad: 'złe dane' }, { status: 400 })
    // sprawdzenie wersji i zapis w kolejce planu – dwa jednoczesne zapisy z tą samą wersją: drugi dostaje 409
    const w = await zapiszZWersja({ ...popraw(d), wersja: d.wersja })
    if ('konflikt' in w) return Response.json({ blad: 'konflikt', plan: w.konflikt }, { status: 409 })
    if ('blad' in w) return Response.json({ blad: w.blad }, { status: 422 })
    // P6a (PNL-08): „wróć do pracy” – plan z miejscem pracy (ostatnio zaznaczony element, nagłówek z edytora)
    let el = ''
    try { el = decodeURIComponent(req.headers.get('x-miejsce-pracy') ?? '') } catch { /* zły nagłówek – bez miejsca */ }
    const e = w.plan.elementy.find((x) => x.id === el)
    const nr = e ? numerTekst(numeryPlanu(w.plan).get(e.id)) : ''
    await zapiszOstatniePozycje([{ href: `/keystatic/plany/${slug}${e ? `?el=${encodeURIComponent(e.id)}` : ''}`, nazwa: `plan „${w.plan.tytul}”`, ...(e ? { miejsce: nr ? `grób: ${nr}` : e.nazwa?.split('\n')[0] || e.typ } : {}) }]).catch(() => {})
    return Response.json({ wersja: w.plan.wersja, zmieniono: w.plan.zmieniono, przywrocone: w.przywrocone })
}

export async function DELETE(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    await usunPlan((await params).slug)
    return Response.json({ ok: true })
}
