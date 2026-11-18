import { zbior, materialyZbioru } from '@/lib/paczka5'
import { ADRES_STRONY } from '@/lib/strona'
import { kolekcjaZbioru } from '@/lib/iiif'

// P5 (PD-05): kolekcja IIIF zbioru – manifesty publicznych materiałów zbioru, które mają skany. Zawsze poziom „publiczne”.
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const z = await zbior(slug, 'publiczne')
    if (!z) return new Response('Nie znaleziono', { status: 404 })
    const mats = (await materialyZbioru(z.id, 'publiczne')).filter((m) => m.strony.length > 0)
    return new Response(JSON.stringify(kolekcjaZbioru(ADRES_STRONY, z, mats), null, 1), {
        headers: { 'Content-Type': 'application/ld+json; profile="http://iiif.io/api/presentation/3/context.json"; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' },
    })
}
