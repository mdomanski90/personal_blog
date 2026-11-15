import { brakDostepu } from '@/lib/plany/dane'
import { AKCENT_DOMYSLNY, koloryAkcentu, prawidlowyHex, wczytajAkcent, zapiszAkcent } from '@/lib/panel/wyglad'

export const dynamic = 'force-dynamic'
export async function GET(req: Request) {
    const odmowa = brakDostepu(req); if (odmowa) return odmowa
    const akcent = await wczytajAkcent()
    return Response.json({ ...koloryAkcentu(akcent), domyslny: AKCENT_DOMYSLNY }, { headers: { 'Cache-Control': 'no-store' } })
}
export async function PUT(req: Request) {
    const odmowa = brakDostepu(req); if (odmowa) return odmowa
    if (req.headers.get('sec-fetch-site') === 'cross-site') return Response.json({ blad: 'Zabronione żądanie między witrynami' }, { status: 403 })
    const dane = await req.json().catch(() => null) as { akcent?: unknown; przywroc?: boolean } | null
    const akcent = dane?.przywroc === true ? AKCENT_DOMYSLNY : dane?.akcent
    if (!prawidlowyHex(akcent)) return Response.json({ blad: 'Podaj kolor w formacie #RRGGBB' }, { status: 400 })
    try {
        await zapiszAkcent(akcent)
        return Response.json({ ...koloryAkcentu(akcent), domyslny: AKCENT_DOMYSLNY }, { headers: { 'Cache-Control': 'no-store' } })
    } catch {
        return Response.json({ blad: 'Nie można zapisać ustawienia. Sprawdź prawa do content/_panel.' }, { status: 500 })
    }
}
