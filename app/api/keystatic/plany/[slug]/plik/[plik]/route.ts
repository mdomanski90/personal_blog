import { brakDostepu, wczytajPlan, wczytajUstawienia } from '@/lib/plany/dane'
import { wydajPlik } from '@/lib/plany/serwer'
import { kontaWlaczone, zalogowany } from '@/lib/konta/straz'
import { planDlaTerenu, plikiDlaTerenu } from '@/lib/teren/czynnosci'
import { osobaZKonta } from '@/lib/teren/serwer'

// Pliki planu dla edytora (wszystkie podkłady, także „tylko do edycji”).
// P7b (TER-01): konto tylko terenowe dostaje pliki wyłącznie swoich planów i tylko te, które widzi na planie „dla terenu”.
export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ slug: string; plik: string }> }) {
    const b = brakDostepu(req); if (b) return b
    const { slug, plik } = await params
    const z = kontaWlaczone() ? zalogowany(req) : null
    if (z && !z.uprawnienia.has('panel')) {
        const o = osobaZKonta(z), plan = o.naPlanie(slug) ? await wczytajPlan(slug) : null
        if (!plan || !plikiDlaTerenu(planDlaTerenu(plan, o.pelne, o.poziom, await wczytajUstawienia())).has(plik)) return Response.json({ blad: 'Brak dostępu do tego pliku.' }, { status: 403 })
    }
    return wydajPlik(slug, plik, false)
}
