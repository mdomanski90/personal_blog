import { brakDostepu } from '@/lib/plany/dane'
import { dlaEksportu } from '@/lib/archiwum'
import { raportKsiag } from '@/lib/ksiegi-raport'

// P5 (REL-07): raport ksiąg dla panelu – wszystkie księgi (także „tylko ja”), te same reguły co katalog i karty.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const [ksiegi, miejsca, parafie] = await Promise.all([dlaEksportu.ksiegi(), dlaEksportu.miejsca(), dlaEksportu.parafie()])
    return Response.json(raportKsiag(ksiegi, miejsca, parafie), { headers: { 'Cache-Control': 'no-store' } })
}
