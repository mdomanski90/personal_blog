// P7a (KON-01): kto pisze i czy może – jedno miejsce dla tras API panelu, zapisu Keystatic, stron panelu i strony publicznej.
// Konta są włączone, gdy w .env.local są KONTA_ADRES, KONTA_KLIENT_ID, KONTA_KLIENT_SEKRET i SEKRET_SESJI
// (npm run konta:przygotuj). Bez nich wszystko działa jak przed P7a (hasło nginx) – to także droga wycofania.
import { AsyncLocalStorage } from 'node:async_hooks'
import { ADRES_STRONY } from '../strona'
import { wczytajKonta } from './dane'
import { definicjeRol, maRoleAdministratora, mozeTylkoJa, nazwaRoli, nazwaUprawnienia, opisRoliZDzialami, roleCodzienne, uprawnieniaKonta, uprawnieniaTrasy, type Konto, type Rola, type Uprawnienie } from './model'
import { CIASTECZKO_KONTA, odczytajSesje, sesjaUniewazniona, zNaglowka, type Sesja } from './sesja'

export interface KonfiguracjaKont { adres: string; klientId: string; klientSekret: string; kluczApi: string; sekret: string; strona: string }

export function konfiguracjaKont(): KonfiguracjaKont | null {
    const e = process.env
    const adres = (e.KONTA_ADRES ?? '').replace(/\/+$/, '')
    if (!/^https?:\/\//.test(adres) || !e.KONTA_KLIENT_ID || !e.KONTA_KLIENT_SEKRET || !e.SEKRET_SESJI) return null
    return { adres, klientId: e.KONTA_KLIENT_ID, klientSekret: e.KONTA_KLIENT_SEKRET, kluczApi: e.KONTA_KLUCZ_API ?? '', sekret: e.SEKRET_SESJI, strona: (e.KONTA_STRONA ?? ADRES_STRONY).replace(/\/+$/, '') }
}
export const kontaWlaczone = () => konfiguracjaKont() !== null

export interface Zalogowany {
    konto: Konto; sesja: Sesja; role: Rola[]
    /** pracuje teraz jako administrator (po ponownym użyciu klucza, najwyżej 30 minut) */
    administrator: boolean
    uprawnienia: Set<Uprawnienie>
}

/** Konto z nagłówka Cookie: dobra sesja, konto istnieje, jest aktywne, sesja nie została unieważniona. */
export function zalogowanyZNaglowka(cookie: string | null | undefined, teraz = Date.now()): Zalogowany | null {
    const k = konfiguracjaKont()
    if (!k) return null
    const sesja = odczytajSesje(k.sekret, zNaglowka(cookie, CIASTECZKO_KONTA), teraz)
    if (!sesja) return null
    const plik = wczytajKonta()
    const konto = plik.konta.find((x) => x.id === sesja.id)
    if (!konto || konto.stan !== 'aktywny' || sesjaUniewazniona(sesja, konto.sesjeOd)) return null
    const role = definicjeRol(plik)
    const administrator = !!sesja.adminDo && maRoleAdministratora(konto)
    return { konto, sesja, role, administrator, uprawnienia: uprawnieniaKonta(konto, role, administrator) }
}
export const zalogowany = (req: Request) => zalogowanyZNaglowka(req.headers.get('cookie'))

/** To samo w komponentach serwera i trasach bez obiektu żądania (next/headers). Poza żądaniem – null. */
export async function zalogowanyTeraz(): Promise<Zalogowany | null> {
    if (!kontaWlaczone()) return null
    try {
        const { headers } = await import('next/headers')
        return zalogowanyZNaglowka((await headers()).get('cookie'))
    } catch { return null }
}

/** Nazwa roli do pokazania przy imieniu: „administrator” w trybie administratora, inaczej role na co dzień. */
export function rolaTeraz(z: Zalogowany): string {
    if (z.administrator) return 'administrator'
    const c = roleCodzienne(z.konto)
    return c.length ? c.map((r) => nazwaRoli(z.role, r)).join(' + ') : 'administrator (na żądanie)'
}

// ---------- podpis „kto” ----------
export interface Kto { id: string; imie: string; administrator: boolean; rolaAdministratora: boolean }
const kto = new AsyncLocalStorage<Kto>()
/** Zapamiętuje autora na czas bieżącego żądania (strażnik wywołuje to po udanej kontroli). */
export function ustawKto(z: Zalogowany): void {
    kto.enterWith({ id: z.konto.id, imie: z.konto.imie, administrator: z.administrator, rolaAdministratora: maRoleAdministratora(z.konto) })
}
/** Autor bieżącego żądania albo null (konta wyłączone, skrypt, kopia nocna). */
export const ktoTeraz = (): Kto | null => kto.getStore() ?? null
/** Imię do podpisu po identyfikatorze konta; konto usunięte – „konto usunięte”. */
export function imieKonta(id: string | undefined | null): string | null {
    if (!id) return null
    return wczytajKonta().konta.find((k) => k.id === id)?.imie ?? 'konto usunięte'
}

// ---------- strażnik tras ----------
const json = (blad: string, status: number, wiecej: Record<string, unknown> = {}) =>
    new Response(JSON.stringify({ blad, ...wiecej }), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })

export function komunikatBraku(z: Zalogowany, brak: Uprawnienie, zapis: boolean): string {
    if (brak === 'administracja' || (!z.uprawnienia.has(brak) && maRoleAdministratora(z.konto) && !z.administrator && !roleCodzienne(z.konto).length))
        return maRoleAdministratora(z.konto)
            ? 'To wymaga roli administratora. Przełącz rolę w menu pod swoim imieniem – potwierdzisz kluczem dostępu.'
            : 'To może zrobić tylko administrator.'
    if (!zapis) return 'Twoje konto nie ma dostępu do panelu.'
    return `Zapis wstrzymany. Twoja rola (${opisRoliZDzialami(z.konto, z.role, z.administrator)}) nie obejmuje: „${nazwaUprawnienia(brak).replace(' – rysowanie i opis', '')}”. Nic nie zmieniono – poproś administratora o uprawnienie.`
}

/**
 * Kontrola trasy /api/keystatic/…: zalogowane konto i uprawnienia trasy (albo podane wprost). Zwraca odpowiedź odmowy albo null.
 * Po udanej kontroli zapamiętuje autora żądania (podpis w historii i operacjach).
 */
export function odmowaKonta(req: Request, wymagane?: Uprawnienie[]): Response | null {
    const z = zalogowany(req)
    if (!z) return json('Sesja wygasła albo konto nie ma dostępu – zaloguj się ponownie.', 401, { zaloguj: true })
    const u = new URL(req.url)
    const potrzebne = wymagane ?? uprawnieniaTrasy(u.pathname, req.method)
    if (!potrzebne) return json('Ta część panelu nie ma jeszcze reguły dostępu – zgłoś to administratorowi.', 403)
    const zapis = !['GET', 'HEAD'].includes(req.method.toUpperCase())
    for (const p of potrzebne) if (!z.uprawnienia.has(p)) return json(komunikatBraku(z, p, zapis), 403, { brak: p })
    ustawKto(z)
    return null
}

/** Dodatkowa kontrola wewnątrz trasy (np. import w trasie osób wymaga „operacji”). */
export function brakUprawnienia(req: Request, ...wymagane: Uprawnienie[]): Response | null {
    return kontaWlaczone() ? odmowaKonta(req, wymagane) : null
}

export { mozeTylkoJa }
