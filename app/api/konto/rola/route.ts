import { CIASTECZKO_KONTA, SESJA_S, ciasteczkoSesji, naglowekCiasteczka } from '@/lib/konta/sesja'
import { konfiguracjaKont, zalogowany } from '@/lib/konta/straz'
import { adresPowrotu } from '@/lib/sesja'

// P7a: powrót z roli administratora do roli na co dzień (bez czekania na koniec 30 minut). Włączenie administratora:
// /api/konto/zaloguj?tryb=administrator (ponowne użycie klucza).
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    const site = req.headers.get('sec-fetch-site')
    if (site && site !== 'same-origin' && site !== 'none') return new Response('Zabronione', { status: 403 })
    const dane = await req.formData().catch(() => null)
    const k = konfiguracjaKont(), z = zalogowany(req)
    const h = new Headers({ Location: adresPowrotu(dane?.get('wroc')), 'Cache-Control': 'no-store' })
    if (k && z) h.append('Set-Cookie', naglowekCiasteczka(CIASTECZKO_KONTA, ciasteczkoSesji(k.sekret, { id: z.sesja.id, wydano: z.sesja.wydano }), Math.max(60, SESJA_S - (Math.floor(Date.now() / 1000) - z.sesja.wydano))))
    return new Response(null, { status: 303, headers: h })
}
