import { adresLogowania } from '@/lib/konta/oidc'
import { CIASTECZKO_LOGOWANIA, LOGOWANIE_S, naglowekCiasteczka, podpisz } from '@/lib/konta/sesja'
import { konfiguracjaKont } from '@/lib/konta/straz'
import { adresPowrotu } from '@/lib/sesja'

// P7a (KON-01): „zaloguj kluczem dostępu” – przejście do Pocket ID (zwykły odnośnik GET; nginx blokuje akcje serwera).
// ?tryb=administrator – przełączenie na administratora: Pocket ID zawsze prosi o ponowne użycie klucza.
export const dynamic = 'force-dynamic'

const idz = (adres: string, ciasteczka: string[] = []) => {
    const h = new Headers({ Location: adres, 'Cache-Control': 'no-store' })
    for (const c of ciasteczka) h.append('Set-Cookie', c)
    return new Response(null, { status: 303, headers: h })
}

export async function GET(req: Request) {
    const u = new URL(req.url)
    const wroc = adresPowrotu(u.searchParams.get('wroc'))
    const k = konfiguracjaKont()
    if (!k) return idz(`/zaloguj?blad=konta-wylaczone&wroc=${encodeURIComponent(wroc)}`)
    try {
        const { adres, przejscie } = await adresLogowania(k, wroc, u.searchParams.get('tryb') === 'administrator')
        return idz(adres, [naglowekCiasteczka(CIASTECZKO_LOGOWANIA, podpisz(k.sekret, 'logowanie', przejscie), LOGOWANIE_S)])
    } catch (e) {
        console.error(`[konta] usługa logowania niedostępna: ${(e as Error).message}`)
        return idz(`/zaloguj?blad=usluga&wroc=${encodeURIComponent(wroc)}`)
    }
}
