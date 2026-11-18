import { brakDostepu } from '@/lib/plany/dane'
import { daneListy, podgladZmiany, zapiszZmiane } from '@/lib/panel/listy'
import type { AkcjaZbiorcza } from '@/lib/panel/listy-konfig'
import { poZapisieTresci } from '@/lib/katalog/dane'

// P5 (PNL-09): lista panelu – GET ?kolekcja=<klucz>; POST {akcja:'podglad'|'zapisz', kolekcja, slugi, zmiana}.
// Zapis = operacja (kopia + „cofnij” w ostatnich operacjach); po zapisie numery katalogowe dla nowych pozycji publicznych (KAT-01).
export const dynamic = 'force-dynamic'
const BEZ_CACHE = { 'Cache-Control': 'no-store' }

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    try { return Response.json(await daneListy(String(new URL(req.url).searchParams.get('kolekcja') ?? '')), { headers: BEZ_CACHE }) }
    catch (e) { return Response.json({ blad: e instanceof Error ? e.message : String(e) }, { status: 400, headers: BEZ_CACHE }) }
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = (await req.json().catch(() => null)) as { akcja?: string; kolekcja?: string; slugi?: string[]; zmiana?: AkcjaZbiorcza } | null
    if (!d?.kolekcja || !Array.isArray(d.slugi) || !d.zmiana) return Response.json({ blad: 'Niepełne polecenie.' }, { status: 400 })
    try {
        if (d.akcja === 'podglad') return Response.json(await podgladZmiany(d.kolekcja, d.slugi, d.zmiana), { headers: BEZ_CACHE })
        if (d.akcja === 'zapisz') {
            const w = await zapiszZmiane(d.kolekcja, d.slugi, d.zmiana)
            if (w.zapisane) await poZapisieTresci()
            return Response.json(w, { headers: BEZ_CACHE })
        }
        return Response.json({ blad: 'Nieznana akcja.' }, { status: 400 })
    } catch (e) {
        return Response.json({ blad: e instanceof Error ? e.message : String(e) }, { status: 409, headers: BEZ_CACHE })
    }
}
