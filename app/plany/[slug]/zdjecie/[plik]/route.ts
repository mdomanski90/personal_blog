import { nieMa, planDlaCzytelnika, wydajPlik } from '@/lib/plany/serwer'
import { dozwolona } from '@/lib/szerokosci-obrazow'

// Zdjęcie nagrobka – tylko gdy czytelnik widzi grób z tym zdjęciem (groby zmarłych niedawno: dla bliskich).
// ?w=480|1200 – pomniejszona kopia WebP do miniatur (20.11); bez – całe zdjęcie (galeria planu).
export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ slug: string; plik: string }> }) {
    const { slug, plik } = await params
    const w = await planDlaCzytelnika(slug)
    const el = w?.plan.elementy.find((e) => e.zdjecia?.some((z) => z.plik === plik))
    if (!w || !el) return nieMa()
    const szer = Number(new URL(req.url).searchParams.get('w'))
    return wydajPlik(slug, plik, w.poziom === 'publiczne' && (el.widocznosc ?? 'publiczne') === 'publiczne' && w.plan.widocznosc === 'publiczne', dozwolona('zdjeciaGrobow', szer) ? szer : undefined)
}
