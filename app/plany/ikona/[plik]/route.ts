import { wczytajUstawienia } from '@/lib/plany/dane'
import { nieMa, wydajPlik } from '@/lib/plany/serwer'

// Znaki PNG własnych typów (publiczne – pojawiają się na planach i w legendach).
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ plik: string }> }) {
    const { plik } = await params
    const u = await wczytajUstawienia()
    if (!u.wlasneTypy.some((t) => t.png === plik)) return nieMa()
    return wydajPlik('_ikony', plik, true)
}
