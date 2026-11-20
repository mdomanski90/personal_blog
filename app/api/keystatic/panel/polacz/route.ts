import { brakDostepu } from '@/lib/plany/dane'
import { poziomPanelu } from '@/lib/konta/straz'
import { wzmiankiDoPolaczenia, zapiszPolaczenia } from '@/lib/panel/polacz-serwer'
import { poZapisieTresci } from '@/lib/katalog/dane'

// P6b (PD-10): „połącz” – GET: wzmianki bez odnośnika z kontekstem; POST {klucze}: zapis jako operacja („cofnij” w odpowiedzi
// i w ostatnich operacjach). Panel za hasłem nginx – jak pozostałe trasy /api/keystatic/panel.
export const dynamic = 'force-dynamic'
const BEZ_CACHE = { 'Cache-Control': 'no-store' }

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    try { return Response.json(await wzmiankiDoPolaczenia(process.cwd(), poziomPanelu(req)), { headers: BEZ_CACHE }) }
    catch (e) { return Response.json({ blad: e instanceof Error ? e.message : String(e) }, { status: 500, headers: BEZ_CACHE }) }
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = (await req.json().catch(() => null)) as { klucze?: unknown } | null
    const klucze = Array.isArray(d?.klucze) ? d!.klucze.filter((k): k is string => typeof k === 'string').slice(0, 500) : []
    if (!klucze.length) return Response.json({ blad: 'Nic nie zaznaczono.' }, { status: 400, headers: BEZ_CACHE })
    try {
        const w = await zapiszPolaczenia(klucze, process.cwd(), poziomPanelu(req))
        if (w.zapisane) await poZapisieTresci()
        return Response.json(w, { headers: BEZ_CACHE })
    } catch (e) {
        return Response.json({ blad: e instanceof Error ? e.message : String(e) }, { status: 409, headers: BEZ_CACHE })
    }
}
