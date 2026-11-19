// P7a (KON-01): sesja konta – podpisane ciasteczko (HMAC-SHA256), bez danych osobowych w środku.
// W ciasteczku: identyfikator konta, czas wydania i – po ponownym użyciu klucza – do kiedy trwa praca jako administrator.
// Rola i uprawnienia są czytane z pliku kont przy każdym żądaniu, więc zablokowanie konta działa od razu.
import { createHmac, timingSafeEqual } from 'node:crypto'

export const CIASTECZKO_KONTA = 'odp_konto'
/** Na czas przejścia do usługi logowania i z powrotem (state, nonce, PKCE, adres powrotu). */
export const CIASTECZKO_LOGOWANIA = 'odp_konto_logowanie'
/** Sesja na urządzeniu: 30 dni (decyzja właściciela 19.11.2026 16:55). */
export const SESJA_S = 30 * 24 * 3600
/** Praca jako administrator: najwyżej 30 minut od ponownego użycia klucza (decyzja 19.11.2026 09:04). */
export const ADMINISTRATOR_S = 30 * 60
/** Jak świeże musi być użycie klucza przy przełączeniu na administratora. */
export const SWIEZOSC_KLUCZA_S = 120
export const LOGOWANIE_S = 10 * 60

export interface Sesja { id: string; wydano: number; adminDo?: number }

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url')
const klucz = (sekret: string, cel: string) => createHmac('sha256', sekret).update(`odniepamieci:${cel}:v1`).digest()
const podpis = (sekret: string, cel: string, tresc: string) => createHmac('sha256', klucz(sekret, cel)).update(tresc).digest('base64url')

/** Podpisana wartość: treść.podpis. `cel` rozdziela rodzaje ciasteczek (podpis jednego nie pasuje do drugiego). */
export function podpisz(sekret: string, cel: string, dane: unknown): string {
    const t = b64(JSON.stringify(dane))
    return `${t}.${podpis(sekret, cel, t)}`
}
export function odczytajPodpisane<T>(sekret: string, cel: string, wartosc: string | undefined | null): T | null {
    if (!sekret || !wartosc || wartosc.length > 4000) return null
    const i = wartosc.lastIndexOf('.')
    if (i <= 0) return null
    const t = wartosc.slice(0, i), p = Buffer.from(wartosc.slice(i + 1)), dobry = Buffer.from(podpis(sekret, cel, t))
    if (p.length !== dobry.length || !timingSafeEqual(p, dobry)) return null
    try { return JSON.parse(Buffer.from(t, 'base64url').toString('utf8')) as T } catch { return null }
}

export function ciasteczkoSesji(sekret: string, s: Sesja): string {
    return podpisz(sekret, 'sesja', { i: s.id, w: s.wydano, ...(s.adminDo ? { a: s.adminDo } : {}) })
}

/** Sesja z ciasteczka: dobry podpis, nie starsza niż 30 dni, nie z przyszłości. Praca jako administrator wygasa sama. */
export function odczytajSesje(sekret: string, wartosc: string | undefined | null, teraz = Date.now()): Sesja | null {
    const d = odczytajPodpisane<{ i?: unknown; w?: unknown; a?: unknown }>(sekret, 'sesja', wartosc)
    if (!d || typeof d.i !== 'string' || !d.i || typeof d.w !== 'number') return null
    const t = Math.floor(teraz / 1000)
    if (d.w > t + 60 || t - d.w > SESJA_S) return null
    const adminDo = typeof d.a === 'number' && d.a > t && d.a - t <= ADMINISTRATOR_S ? d.a : undefined
    return { id: d.i, wydano: d.w, ...(adminDo ? { adminDo } : {}) }
}

/** Czy sesja została unieważniona przez „wyloguj ze wszystkich urządzeń” (sesje wydane przed tą chwilą). */
export const sesjaUniewazniona = (s: Sesja, sesjeOd: string | undefined) => !!sesjeOd && s.wydano * 1000 < Date.parse(sesjeOd)

/** Wartość ciasteczka z nagłówka Cookie (bez zależności od Next – działa też w proxy i w testach). */
export function zNaglowka(naglowek: string | null | undefined, nazwa: string): string | undefined {
    for (const c of (naglowek ?? '').split(';')) {
        const i = c.indexOf('=')
        if (i > 0 && c.slice(0, i).trim() === nazwa) return decodeURIComponent(c.slice(i + 1).trim())
    }
    return undefined
}

export function naglowekCiasteczka(nazwa: string, wartosc: string, maxAge: number, opcje: { httpOnly?: boolean } = {}): string {
    const bezpieczne = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    return `${nazwa}=${wartosc}; Path=/; Max-Age=${maxAge}${opcje.httpOnly === false ? '' : '; HttpOnly'}; SameSite=Lax${bezpieczne}`
}
