import { brakDostepu } from '@/lib/plany/dane'
import { wydajPlik } from '@/lib/plany/serwer'

// Pliki planu dla edytora (wszystkie podkłady, także „tylko do edycji”).
export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ slug: string; plik: string }> }) {
    const b = brakDostepu(req); if (b) return b
    const { slug, plik } = await params
    return wydajPlik(slug, plik, false)
}
