import { brakDostepu } from '@/lib/plany/dane'
import { REGULY_JAKOSCI, stanUwagi, uwagiJakosci, type StanUwagi } from '@/lib/panel/jakosc'
import { widziTylkoJaZadanie } from '@/lib/konta/straz'
import { ukryteDla, ukrytyKlucz } from '@/lib/konta/tylko-ja'

// P7c (KON-08): ostrzeżenia o pozycjach „tylko ja” – tylko dla konta z rolą administratora
async function uwagiDla(req: Request) {
    const u = await ukryteDla(widziTylkoJaZadanie(req))
    return (await uwagiJakosci()).filter((x) => !ukrytyKlucz(x.kolekcja, x.rekord, u))
}

export const dynamic = 'force-dynamic'
const HEADERS = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    if (new URL(req.url).searchParams.get('reguly')) return Response.json(REGULY_JAKOSCI, { headers: HEADERS }) // P6a: spis reguł
    try { return Response.json(await uwagiDla(req), { headers: HEADERS }) }
    catch { return Response.json({ blad: 'Nie udało się odczytać katalogu ostrzeżeń.' }, { status: 500, headers: HEADERS }) }
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const typ = req.headers.get('content-type') ?? ''
    if (!typ.startsWith('application/json')) return Response.json({ blad: 'Wymagany JSON' }, { status: 415, headers: HEADERS })
    const data = await req.json().catch(() => null) as { id?: unknown; stan?: unknown; notatka?: unknown; dni?: unknown } | null
    if (!data || typeof data.id !== 'string' || typeof data.stan !== 'string' || !['aktywne','odlozone','ignorowane'].includes(data.stan) || (data.notatka !== undefined && typeof data.notatka !== 'string'))
        return Response.json({ blad: 'Niepoprawne dane' }, { status: 400, headers: HEADERS })
    if (!widziTylkoJaZadanie(req) && !(await uwagiDla(req)).some((x) => x.id === data.id)) return Response.json({ blad: 'Nie odnaleziono ostrzeżenia' }, { status: 404, headers: HEADERS })
    try {
        const ok = await stanUwagi(data.id, data.stan as StanUwagi, typeof data.notatka === 'string' ? data.notatka : '', typeof data.dni === 'number' ? data.dni : 30)
        return Response.json(ok ? { ok: true } : { blad: 'Nie odnaleziono ostrzeżenia' }, { status: ok ? 200 : 404, headers: HEADERS })
    } catch {
        return Response.json({ blad: 'Nie można zapisać decyzji. Sprawdź prawa zapisu katalogu content/_panel.' }, { status: 500, headers: HEADERS })
    }
}
