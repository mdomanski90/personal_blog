import { nieMa, planDlaCzytelnika, wydajPlik } from '@/lib/plany/serwer'

// Zdjęcie nagrobka – tylko gdy czytelnik widzi grób z tym zdjęciem (groby zmarłych niedawno: dla bliskich).
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; plik: string }> }) {
    const { slug, plik } = await params
    const w = await planDlaCzytelnika(slug)
    const el = w?.plan.elementy.find((e) => e.zdjecia?.some((z) => z.plik === plik))
    if (!w || !el) return nieMa()
    return wydajPlik(slug, plik, w.poziom === 'publiczne' && (el.widocznosc ?? 'publiczne') === 'publiczne' && w.plan.widocznosc === 'publiczne')
}
