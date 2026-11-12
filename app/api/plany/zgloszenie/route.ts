import { wczytajPlan, zapiszZgloszenie } from '@/lib/plany/dane'

// Prośba czytelnika o usunięcie albo poprawkę elementu planu. Trafia do panelu (/keystatic/plany), nic nie publikuje.
export const dynamic = 'force-dynamic'

const OKNO = 60 * 60 * 1000, MAKS = 5
const proby = new Map<string, number[]>()

export async function POST(req: Request) {
    const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'lokalnie'
    const teraz = Date.now(), lista = (proby.get(ip) ?? []).filter((t) => teraz - t < OKNO)
    if (lista.length >= MAKS) return Response.json({ blad: 'limit' }, { status: 429 })
    const d = await req.json().catch(() => null)
    const tresc = String(d?.tresc ?? '').trim().slice(0, 2000), kontakt = String(d?.kontakt ?? '').trim().slice(0, 200)
    const plan = await wczytajPlan(String(d?.plan ?? ''))
    const el = plan?.elementy.find((e) => e.id === String(d?.element ?? ''))
    if (!plan || !el || tresc.length < 3) return Response.json({ blad: 'dane' }, { status: 400 })
    proby.set(ip, [...lista, teraz])
    await zapiszZgloszenie({ plan: plan.slug, element: el.id, opisElementu: [el.nazwa, el.osoby?.map((o) => o.nazwa).join(', '), (el.opis ?? '').slice(0, 80)].filter(Boolean).join(' · '), tresc, kontakt })
    return Response.json({ ok: true })
}
