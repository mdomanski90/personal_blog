import { brakDostepu } from '@/lib/plany/dane'
import { widziTylkoJaZadanie } from '@/lib/konta/straz'
import { ukryteDla } from '@/lib/konta/tylko-ja'
import { podgladPorzadkuTomow, zapiszPorzadekTomow } from '@/lib/panel/porzadek-tomow'

// P7c łatka (20.11): porządek uwag tomów ksiąg – GET podgląd (liczby), POST zapis jako operacja z „cofnij” (uprawnienie „operacje”).
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const BEZ_CACHE = { 'Cache-Control': 'no-store' }

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    return Response.json(await podgladPorzadkuTomow(await ukryteDla(widziTylkoJaZadanie(req))), { headers: BEZ_CACHE })
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    try { return Response.json(await zapiszPorzadekTomow(await ukryteDla(widziTylkoJaZadanie(req))), { headers: BEZ_CACHE }) }
    catch (e) {
        console.error('porządek tomów:', e)
        return Response.json({ blad: e instanceof Error ? e.message : 'Błąd zapisu.' }, { status: 400, headers: BEZ_CACHE })
    }
}
