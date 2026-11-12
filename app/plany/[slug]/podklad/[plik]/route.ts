import { nieMa, planDlaCzytelnika, wydajPlik } from '@/lib/plany/serwer'

// Podkład planu – tylko gdy autor udostępnił go czytelnikom (publicznie albo dla bliskich).
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; plik: string }> }) {
    const { slug, plik } = await params
    const w = await planDlaCzytelnika(slug)
    const p = w?.plan.podklady.find((q) => q.plik === plik)
    if (!w || !p) return nieMa()
    return wydajPlik(slug, plik, p.widocznosc === 'publiczne' && w.plan.widocznosc === 'publiczne')
}
