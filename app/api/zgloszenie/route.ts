import { RODZAJE_ZGLOSZEN, zapiszZgloszenieStrony, type RodzajZgloszenia } from '@/lib/zgloszenia'

// Zgłoszenie czytelnika (poprawka, nowe miejsce, materiał). Limit: 5 na godzinę z jednego adresu.
export const dynamic = 'force-dynamic'
const OKNO = 60 * 60 * 1000, MAKS = 5
const proby = new Map<string, number[]>()

export async function POST(req: Request) {
    const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'lokalnie'
    const teraz = Date.now(), lista = (proby.get(ip) ?? []).filter((t) => teraz - t < OKNO)
    if (lista.length >= MAKS) return Response.json({ blad: 'limit' }, { status: 429 })
    const d = await req.json().catch(() => null)
    const rodzaj = String(d?.rodzaj ?? '') as RodzajZgloszenia
    const adres = String(d?.adres ?? ''), tresc = String(d?.tresc ?? '').trim().slice(0, 4000)
    if (!(rodzaj in RODZAJE_ZGLOSZEN) || !adres.startsWith('/') || adres.startsWith('//') || tresc.length < 3 || d?.www) return Response.json({ blad: 'dane' }, { status: 400 })
    proby.set(ip, [...lista, teraz])
    await zapiszZgloszenieStrony({ rodzaj, adres: adres.slice(0, 300), tytul: String(d?.tytul ?? '').slice(0, 200), tresc, kontakt: String(d?.kontakt ?? '').trim().slice(0, 200) })
    return Response.json({ ok: true })
}
