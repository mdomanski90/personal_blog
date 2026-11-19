import fs from 'node:fs'
import { brakDostepu } from '@/lib/plany/dane'
import { osobaWTerenie, sciezkaZdjeciaTerenu, wczytajMiejsceTerenu } from '@/lib/teren/serwer'

// P7b (TER-01): zdjęcie nowego miejsca – tylko w panelu: redakcja skrzynki albo autor wpisu.
export const dynamic = 'force-dynamic'
const nieMa = () => new Response('Nie znaleziono', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

export async function GET(req: Request, { params }: { params: Promise<{ id: string; plik: string }> }) {
    const b = brakDostepu(req); if (b) return b
    const { id, plik } = await params
    const o = osobaWTerenie(req), m = await wczytajMiejsceTerenu(id)
    if (!o || !m || !(o.redakcja || m.kto === o.id) || !m.zdjecia.some((z) => z.plik === plik)) return nieMa()
    const p = sciezkaZdjeciaTerenu(id, plik)
    if (!p) return nieMa()
    try {
        const dane = await fs.promises.readFile(/*turbopackIgnore: true*/ p)
        return new Response(new Uint8Array(dane), { headers: { 'Content-Type': 'image/jpeg', 'Content-Length': String(dane.length), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } })
    } catch { return nieMa() }
}
