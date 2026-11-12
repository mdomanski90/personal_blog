import { adresPowrotu, CIASTECZKO, CIASTECZKO_UI, logowanieWlaczone, mozeProbowac, sprawdzHaslo, tokenSesji, WAZNOSC_S, wyczyscProby, zapiszNieudana } from '@/lib/sesja'

// Logowanie „dla bliskich” – zwykły formularz (POST), bez akcji serwera (nginx blokuje Next-Action).

export const dynamic = 'force-dynamic'

/** Przekierowanie względne – za nginx adres żądania to 127.0.0.1, więc nie budujemy pełnego URL. */
function idzDo(adres: string, ciasteczka: string[] = []) {
    const h = new Headers({ Location: adres, 'Cache-Control': 'no-store' })
    for (const c of ciasteczka) h.append('Set-Cookie', c)
    return new Response(null, { status: 303, headers: h })
}

export async function POST(req: Request) {
    const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'lokalnie'
    const dane = await req.formData().catch(() => null)
    const wroc = adresPowrotu(dane?.get('wroc'))
    const zWroc = (blad: string) => `/zaloguj?blad=${blad}&wroc=${encodeURIComponent(wroc)}`
    if (!logowanieWlaczone()) return idzDo(zWroc('wylaczone'))
    if (!mozeProbowac(ip)) return idzDo(zWroc('limit'))
    if (!sprawdzHaslo(String(dane?.get('haslo') ?? ''))) {
        zapiszNieudana(ip)
        return idzDo(zWroc('haslo'))
    }
    wyczyscProby(ip)
    const bezpieczne = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    return idzDo(wroc, [
        `${CIASTECZKO}=${tokenSesji()}; Path=/; Max-Age=${WAZNOSC_S}; HttpOnly; SameSite=Lax${bezpieczne}`,
        `${CIASTECZKO_UI}=1; Path=/; Max-Age=${WAZNOSC_S}; SameSite=Lax${bezpieczne}`,
    ])
}
