import { zmienKonta, wczytajKonta } from '@/lib/konta/dane'
import { maRoleAdministratora } from '@/lib/konta/model'
import { odbierzLogowanie, type Przejscie } from '@/lib/konta/oidc'
import { ADMINISTRATOR_S, CIASTECZKO_KONTA, CIASTECZKO_LOGOWANIA, SESJA_S, SWIEZOSC_KLUCZA_S, ciasteczkoSesji, naglowekCiasteczka, odczytajPodpisane, zNaglowka } from '@/lib/konta/sesja'
import { konfiguracjaKont } from '@/lib/konta/straz'
import { adresPowrotu, CIASTECZKO_UI } from '@/lib/sesja'

// P7a (KON-01): powrót z Pocket ID. Tożsamość potwierdza usługa logowania; o dostępie decyduje plik kont
// (osoba bez konta w panelu albo z kontem zablokowanym nie dostaje sesji).
export const dynamic = 'force-dynamic'

const idz = (adres: string, ciasteczka: string[] = []) => {
    const h = new Headers({ Location: adres, 'Cache-Control': 'no-store' })
    h.append('Set-Cookie', naglowekCiasteczka(CIASTECZKO_LOGOWANIA, '', 0))
    for (const c of ciasteczka) h.append('Set-Cookie', c)
    return new Response(null, { status: 303, headers: h })
}

export async function GET(req: Request) {
    const k = konfiguracjaKont()
    if (!k) return idz('/zaloguj?blad=konta-wylaczone')
    const p = odczytajPodpisane<Przejscie>(k.sekret, 'logowanie', zNaglowka(req.headers.get('cookie'), CIASTECZKO_LOGOWANIA))
    if (!p || typeof p.state !== 'string' || typeof p.weryfikator !== 'string') return idz('/zaloguj?blad=przerwane')
    const wroc = adresPowrotu(p.wroc)
    const blad = (b: string) => idz(`/zaloguj?blad=${b}&wroc=${encodeURIComponent(wroc)}`)
    let kto
    try { kto = await odbierzLogowanie(k, new URL(req.url).search.slice(1), p) }
    catch (e) { console.error(`[konta] logowanie nieudane: ${(e as Error).message}`); return blad('przerwane') }
    const konto = wczytajKonta().konta.find((x) => x.id === kto.sub)
    if (!konto) return blad('brak-konta')
    if (konto.stan === 'zablokowany') return blad('zablokowane')
    const teraz = Math.floor(Date.now() / 1000)
    // administrator tylko po świeżym użyciu klucza (auth_time z Pocket ID), najwyżej na 30 minut
    const swiezo = kto.kluczUzyto !== null && teraz - kto.kluczUzyto <= SWIEZOSC_KLUCZA_S
    const adminDo = p.administrator && maRoleAdministratora(konto) && swiezo ? teraz + ADMINISTRATOR_S : undefined
    try {
        zmienKonta((plik) => {
            const x = plik.konta.find((y) => y.id === konto.id)
            if (x) { x.stan = 'aktywny'; x.ostatnio = new Date().toISOString(); delete x.zaproszenie }
            return plik
        })
    } catch (e) { console.error(`[konta] nie zapisano czasu logowania: ${(e as Error).message}`); if (konto.stan !== 'aktywny') return blad('zapis') }
    return idz(p.administrator && !adminDo ? `${wroc}${wroc.includes('?') ? '&' : '?'}rola=bez-zmiany` : wroc, [
        naglowekCiasteczka(CIASTECZKO_KONTA, ciasteczkoSesji(k.sekret, { id: konto.id, wydano: teraz, adminDo }), SESJA_S),
        naglowekCiasteczka(CIASTECZKO_UI, '1', SESJA_S, { httpOnly: false }),
    ])
}
