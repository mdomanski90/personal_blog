import { brakDostepu } from '@/lib/plany/dane'
import { dlaEksportu } from '@/lib/archiwum'
import { raportKsiag } from '@/lib/ksiegi-raport'
import { widziTylkoJaZadanie } from '@/lib/konta/straz'

// P5 (REL-07): raport ksiąg dla panelu – wszystkie księgi (także „tylko ja” – tylko dla roli administratora, P7c), te same reguły co katalog i karty.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const [k0, m0, parafie] = await Promise.all([dlaEksportu.ksiegi(), dlaEksportu.miejsca(), dlaEksportu.parafie()])
    // P7c (KON-08): bez ksiąg i miejscowości „tylko ja” dla konta bez roli administratora
    const widzi = widziTylkoJaZadanie(req)
    const ksiegi = widzi ? k0 : k0.filter((x) => x.widocznosc !== 'ja'), miejsca = widzi ? m0 : m0.filter((x) => x.widocznosc !== 'ja')
    return Response.json(raportKsiag(ksiegi, miejsca, parafie), { headers: { 'Cache-Control': 'no-store' } })
}
