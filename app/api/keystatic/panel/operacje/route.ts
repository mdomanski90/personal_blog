import { brakDostepu } from '@/lib/plany/dane'
import {
    cofnijOperacje, listaOperacji, podgladCofniecia, rozstrzygnijPrzerwana, skrotOperacji, stanBlokady, zdejmijMartwaBlokade,
} from '@/lib/panel/operacje'
import { uniewaznij } from '@/lib/osoby/dane'
import { brakujaceKatalogi, KOMENDA_KATALOGOW } from '@/lib/panel/katalogi'

// P5: ostatnie operacje (import ksiąg, import drzewa, zmiany zbiorcze) – lista, podgląd cofnięcia, cofnij, przerwane po awarii.
// GET – lista + stan blokady; GET ?podglad=<id> – co zmieni „cofnij”.
// POST {akcja:'cofnij', id, pominKonflikty?} · {akcja:'dokoncz'|'cofnij-przerwana', id} · {akcja:'odblokuj'}
export const dynamic = 'force-dynamic'
const BEZ_CACHE = { 'Cache-Control': 'no-store' }

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const id = new URL(req.url).searchParams.get('podglad')
    if (id) return Response.json(await podgladCofniecia(id), { headers: BEZ_CACHE })
    const [L, blokada, brak] = await Promise.all([listaOperacji(), stanBlokady(), brakujaceKatalogi()])
    return Response.json({ operacje: L.map(skrotOperacji), blokada, katalogi: brak.length ? { brak, komenda: KOMENDA_KATALOGOW } : null }, { headers: BEZ_CACHE })
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = (await req.json().catch(() => null)) as { akcja?: string; id?: string; pominKonflikty?: boolean } | null
    try {
        if (d?.akcja === 'cofnij' && d.id) {
            const w = await cofnijOperacje(d.id, { pominKonflikty: d.pominKonflikty === true })
            return Response.json(w, { headers: BEZ_CACHE })
        }
        if ((d?.akcja === 'dokoncz' || d?.akcja === 'cofnij-przerwana') && d.id)
            return Response.json(await rozstrzygnijPrzerwana(d.id, d.akcja === 'dokoncz' ? 'dokoncz' : 'cofnij'), { headers: BEZ_CACHE })
        if (d?.akcja === 'odblokuj') {
            const blad = await zdejmijMartwaBlokade()
            return blad ? Response.json({ blad }, { status: 409 }) : Response.json({ ok: true })
        }
        return Response.json({ blad: 'nieznana akcja' }, { status: 400 })
    } catch (e) {
        return Response.json({ blad: e instanceof Error ? e.message : String(e) }, { status: 409, headers: BEZ_CACHE })
    } finally {
        uniewaznij() // drzewo osób w pamięci – po cofnięciu importu drzewa
    }
}
