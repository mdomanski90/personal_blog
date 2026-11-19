import { wczytajKonta } from '@/lib/konta/dane'
import { urzadzenia } from '@/lib/konta/pocket-id'
import { konfiguracjaKont } from '@/lib/konta/straz'
import { kontoZKodu } from '@/lib/konta/zaproszenia'

// P7a: strona „witaj” pyta, czy urządzenie jest już połączone (osoba zapisała klucz dostępu w Pocket ID w drugiej karcie).
// Odpowiada tylko na ważny kod z linku; nie zdradza niczego o koncie.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const naglowki = { 'Cache-Control': 'no-store' }
    const k = konfiguracjaKont()
    const konto = k ? kontoZKodu(wczytajKonta(), new URL(req.url).searchParams.get('kod') ?? '') : null
    if (!k || !konto) return Response.json({ wazne: false }, { status: 404, headers: naglowki })
    try {
        return Response.json({ wazne: true, polaczone: (await urzadzenia(k, konto.id)).length > 0 }, { headers: naglowki })
    } catch (e) {
        console.error(`[konta] zaproszenie: ${(e as Error).message}`)
        return Response.json({ wazne: true, polaczone: false, blad: true }, { status: 503, headers: naglowki })
    }
}
