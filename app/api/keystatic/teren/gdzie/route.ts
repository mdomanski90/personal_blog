import { brakDostepu } from '@/lib/plany/dane'
import { najblizszaMiejscowosc, opisBlisko } from '@/lib/teren/miejsca'
import { miejscowosciZPolozeniem, osobaWTerenie } from '@/lib/teren/serwer'

// P7b (TER-01): „najbliżej: Testowo (0,4 km na płn.-wsch.)” dla położenia z telefonu. Położenie nie jest zapisywane.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    if (!osobaWTerenie(req)) return Response.json({ blad: 'Brak dostępu.' }, { status: 403 })
    const u = new URL(req.url), lat = Number(u.searchParams.get('lat')), lon = Number(u.searchParams.get('lon'))
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return Response.json({ blad: 'Złe położenie.' }, { status: 400 })
    const blisko = najblizszaMiejscowosc(lat, lon, await miejscowosciZPolozeniem().catch(() => []))
    return Response.json({ blisko: blisko ?? null, opis: blisko ? opisBlisko(blisko) : null }, { headers: { 'Cache-Control': 'no-store' } })
}
