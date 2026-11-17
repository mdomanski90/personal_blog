import { zapiszZgloszenieStrony, zgloszenieZDanych } from '@/lib/zgloszenia'

// Zgłoszenie czytelnika (poprawka, nowe miejsce, materiał, odczyt, wspomnienie, rozpoznanie). Limit: 5 na godzinę z jednego adresu.
export const dynamic = 'force-dynamic'
const OKNO = 60 * 60 * 1000, MAKS = 5
const proby = new Map<string, number[]>()

export async function POST(req: Request) {
    const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'lokalnie'
    const teraz = Date.now(), lista = (proby.get(ip) ?? []).filter((t) => teraz - t < OKNO)
    if (lista.length >= MAKS) return Response.json({ blad: 'limit' }, { status: 429 })
    const z = zgloszenieZDanych(await req.json().catch(() => null))
    if (!z) return Response.json({ blad: 'dane' }, { status: 400 })
    proby.set(ip, [...lista, teraz])
    await zapiszZgloszenieStrony(z)
    return Response.json({ ok: true })
}
