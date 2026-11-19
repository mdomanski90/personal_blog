// P7a (KON-01): strony panelu /keystatic/* tylko dla zalogowanego konta z dostępem do panelu.
// Trasy /api/keystatic/* sprawdza strażnik w każdej trasie (lib/plany/dane.ts brakDostepu → lib/konta/straz.ts) –
// proxy ich nie obejmuje, żeby nie ograniczać rozmiaru przesyłanych skanów. Konta wyłączone (brak ustawień w .env.local):
// nic się nie zmienia, panel chroni hasło nginx jak przed P7a.
import { NextResponse, type NextRequest } from 'next/server'
import { uprawnienieStrony } from './lib/konta/model'
import { kontaWlaczone, zalogowanyZNaglowka } from './lib/konta/straz'

export function proxy(req: NextRequest) {
    if (!kontaWlaczone()) return NextResponse.next()
    const { pathname, search } = req.nextUrl
    const z = zalogowanyZNaglowka(req.headers.get('cookie'))
    // przekierowania względne – za nginx adres żądania to 127.0.0.1
    const idz = (adres: string) => new NextResponse(null, { status: 307, headers: { Location: adres, 'Cache-Control': 'no-store' } })
    if (!z) return idz(`/zaloguj?wroc=${encodeURIComponent(pathname + search)}`)
    if (!z.uprawnienia.has('panel')) return idz('/moje-konto?panel=brak')
    if (!z.uprawnienia.has(uprawnienieStrony(pathname))) return idz('/keystatic/panel?odmowa=administrator')
    return NextResponse.next()
}

export const config = { matcher: ['/keystatic', '/keystatic/:path*'] }
