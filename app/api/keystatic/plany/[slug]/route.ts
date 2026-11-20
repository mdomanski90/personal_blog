import { brakDostepu, usunPlan, wczytajPlan, zapiszZWersja } from '@/lib/plany/dane'
import { popraw, type Plan } from '@/lib/plany/model'
import { zNadaniemNumerow } from '@/lib/katalog/dane'
import { numeryPlanu, numerTekst } from '@/lib/plany/numeracja'
import { zapiszOstatniePozycje } from '@/lib/panel/praca'
import { widziTylkoJaZadanie } from '@/lib/konta/straz'
import { planBezTylkoJa, planUkryty, scalZUkrytymi } from '@/lib/plany/tylko-ja'

// Jeden plan: odczyt pełny (z polami roboczymi), zapis z kontrolą wersji (autozapis edytora), usunięcie do kosza.
// P7c (KON-08): konto bez roli administratora – plan „tylko ja” jak nieistniejący, elementy „tylko ja” wycięte z odczytu
// i odtworzone z pliku przy zapisie (lib/plany/tylko-ja.ts).
export const dynamic = 'force-dynamic'
type P = { params: Promise<{ slug: string }> }

export async function GET(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    const plan = await wczytajPlan((await params).slug)
    const widzi = widziTylkoJaZadanie(req)
    if (!plan || (!widzi && planUkryty(plan))) return Response.json({ blad: 'nie ma takiego planu' }, { status: 404 })
    return Response.json(widzi ? plan : planBezTylkoJa(plan))
}

// KAT-01: po udanym zapisie – numery katalogowe dla nowych pozycji publicznych
export const PUT = zNadaniemNumerow(zapiszPUT)

async function zapiszPUT(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    const slug = (await params).slug
    const d = (await req.json().catch(() => null)) as Plan | null
    if (!d || d.slug !== slug) return Response.json({ blad: 'złe dane' }, { status: 400 })
    const widzi = widziTylkoJaZadanie(req)
    let doZapisu = popraw(d)
    if (!widzi) {
        const s = scalZUkrytymi(doZapisu, await wczytajPlan(slug))
        if (typeof s === 'string') return Response.json({ blad: s }, { status: s === 'Nie ma takiego planu.' ? 404 : 403 })
        doZapisu = s
    }
    // sprawdzenie wersji i zapis w kolejce planu – dwa jednoczesne zapisy z tą samą wersją: drugi dostaje 409
    const w = await zapiszZWersja({ ...doZapisu, wersja: d.wersja })
    if ('konflikt' in w) return Response.json({ blad: 'konflikt', plan: widzi ? w.konflikt : planBezTylkoJa(w.konflikt) }, { status: 409 })
    if ('blad' in w) return Response.json({ blad: w.blad }, { status: 422 })
    // P6a (PNL-08): „wróć do pracy” – plan z miejscem pracy (ostatnio zaznaczony element, nagłówek z edytora)
    let el = ''
    try { el = decodeURIComponent(req.headers.get('x-miejsce-pracy') ?? '') } catch { /* zły nagłówek – bez miejsca */ }
    const e = w.plan.elementy.find((x) => x.id === el)
    const n = e ? numeryPlanu(w.plan).get(e.id) : undefined, nr = numerTekst(n)
    await zapiszOstatniePozycje([{ href: `/keystatic/plany/${slug}${e ? `?el=${encodeURIComponent(e.id)}` : ''}`, nazwa: `plan „${w.plan.tytul}”`, rodzaj: 'plan',
        ...(w.plan.widocznosc !== 'ja' ? { strona: `/plany/${slug}` } : {}),
        ...(e ? { miejsce: nr ? `grób: ${nr}` : e.nazwa?.split('\n')[0] || e.typ } : {}), ...(n ? { grob: [n.kwatera, n.rzad, n.miejsce].filter(Boolean).join('/') } : {}) }]).catch(() => {})
    return Response.json({ wersja: w.plan.wersja, zmieniono: w.plan.zmieniono, przywrocone: w.przywrocone })
}

export async function DELETE(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    if (!widziTylkoJaZadanie(req) && planUkryty(await wczytajPlan((await params).slug))) return Response.json({ blad: 'nie ma takiego planu' }, { status: 404 })
    await usunPlan((await params).slug)
    return Response.json({ ok: true })
}
