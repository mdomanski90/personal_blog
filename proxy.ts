// P7a (KON-01): strony panelu /keystatic/* tylko dla zalogowanego konta z dostępem do panelu.
// Trasy /api/keystatic/* sprawdza strażnik w każdej trasie (lib/plany/dane.ts brakDostepu → lib/konta/straz.ts) –
// proxy ich nie obejmuje, żeby nie ograniczać rozmiaru przesyłanych skanów. Konta wyłączone (brak ustawień w .env.local):
// nic się nie zmienia, panel chroni hasło nginx jak przed P7a – chyba że hasło nginx wyłączono (KON-07): wtedy panel jest zamknięty.
import { NextResponse, type NextRequest } from 'next/server'
import { celStronyPanelu } from './lib/konta/model'
import { KOMUNIKAT_ZAMKNIETEGO, konfiguracjaKont, panelZamkniety, zalogowanyZNaglowka } from './lib/konta/straz'

export function proxy(req: NextRequest) {
    const strona = konfiguracjaKont()?.strona
    // KON-07: hasło nginx wyłączone (PANEL_TYLKO_KONTA=1), a konta nie działają → strony panelu zamknięte
    if (!strona) return panelZamkniety() ? new NextResponse(KOMUNIKAT_ZAMKNIETEGO, { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } }) : NextResponse.next()
    const { pathname, search } = req.nextUrl
    const z = zalogowanyZNaglowka(req.headers.get('cookie'))
    // proxy wymaga pełnego adresu przekierowania; za nginx adres żądania to 127.0.0.1, więc bierzemy adres strony z ustawień kont
    const idz = (adres: string) => { const r = NextResponse.redirect(new URL(adres, strona), 307); r.headers.set('Cache-Control', 'no-store'); return r }
    if (!z) return idz(`/zaloguj?wroc=${encodeURIComponent(pathname + search)}`)
    // P7b: konto tylko terenowe trafia na „w terenie”; reguła w lib/konta/model.ts (celStronyPanelu)
    const cel = celStronyPanelu(pathname, z.uprawnienia)
    return cel ? idz(cel) : NextResponse.next()
}

export const config = { matcher: ['/keystatic', '/keystatic/:path*'] }
