import { brakDostepu } from '@/lib/plany/dane'
import { imieKonta, widziTylkoJaZadanie } from '@/lib/konta/straz'
import { ukrytePozycje } from '@/lib/konta/tylko-ja'
import {
    cofnijOperacje, listaOperacji, operacjaTylkoJa, podgladCofniecia, wczytajManifest, rozstrzygnijPrzerwana, skrotOperacji, stanBlokady, zdejmijMartwaBlokade,
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
    if (id && await ukrytaOperacja(req, id)) return Response.json({ blad: 'Nie ma takiej operacji.' }, { status: 404, headers: BEZ_CACHE })
    if (id) return Response.json(await podgladCofniecia(id), { headers: BEZ_CACHE })
    const [L0, blokada, brak] = await Promise.all([listaOperacji(), stanBlokady(), brakujaceKatalogi()])
    const u = widziTylkoJaZadanie(req) ? null : await ukrytePozycje()
    const L = u ? (await Promise.all(L0.map(async (m) => ((await operacjaTylkoJa(m, u)) ? null : m)))).filter((m) => m !== null) : L0
    return Response.json({ operacje: L.map((m) => ({ ...skrotOperacji(m), kto: imieKonta(m.kto) })), blokada, katalogi: brak.length ? { brak, komenda: KOMENDA_KATALOGOW } : null }, { headers: BEZ_CACHE })
}

/** P7c (KON-08): konto bez roli administratora nie widzi i nie rusza operacji na pozycjach „tylko ja”. */
async function ukrytaOperacja(req: Request, id: string): Promise<boolean> {
    if (widziTylkoJaZadanie(req)) return false
    const m = await wczytajManifest(id)
    return !!m && await operacjaTylkoJa(m, await ukrytePozycje())
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = (await req.json().catch(() => null)) as { akcja?: string; id?: string; pominKonflikty?: boolean } | null
    if (d?.id && await ukrytaOperacja(req, d.id)) return Response.json({ blad: 'Nie ma takiej operacji.' }, { status: 404, headers: BEZ_CACHE })
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
