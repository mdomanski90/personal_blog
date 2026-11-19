// P7a (KON-01): API Pocket ID (klucz w nagłówku X-API-KEY) – zakładanie osób, linki jednorazowe, urządzenia (klucze dostępu).
// Sprawdzone na Pocket ID 2.19.2: POST /api/users, POST /api/users/{id}/one-time-access-token {ttl:"168h"} → kod 12 znaków,
// strona linku /lc/{kod}, GET i DELETE /api/users/{id}/webauthn-credentials[/{idKlucza}], klient OIDC: /api/oidc/clients.
import type { KonfiguracjaKont } from './straz'

export class BladPocketId extends Error { constructor(public status: number, tresc: string) { super(tresc) } }

async function api<T>(k: Pick<KonfiguracjaKont, 'adres' | 'kluczApi'>, metoda: string, sciezka: string, dane?: unknown): Promise<T> {
    if (!k.kluczApi) throw new BladPocketId(0, 'Brak klucza API usługi logowania (KONTA_KLUCZ_API w .env.local).')
    let r: Response
    try {
        r = await fetch(`${k.adres}${sciezka}`, { method: metoda, cache: 'no-store', signal: AbortSignal.timeout(10_000),
            headers: { 'X-API-KEY': k.kluczApi, ...(dane !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: dane !== undefined ? JSON.stringify(dane) : undefined })
    } catch (e) { throw new BladPocketId(0, `Usługa logowania nie odpowiada (${(e as Error).message}).`) }
    const tekst = await r.text()
    if (!r.ok) {
        let opis = tekst.slice(0, 200)
        try { opis = (JSON.parse(tekst) as { error?: string }).error ?? opis } catch { /* nie JSON */ }
        throw new BladPocketId(r.status, `Usługa logowania odmówiła (${r.status}): ${opis}`)
    }
    return (tekst ? JSON.parse(tekst) : null) as T
}

export interface OsobaPocketId { id: string; username: string; displayName: string; email: string | null; disabled: boolean }
export interface Urzadzenie { id: string; nazwa: string; od: string }

/** Nazwa użytkownika z imienia: litery łacińskie, cyfry i łącznik + losowy dopisek (musi być niepowtarzalna). */
export function nazwaUzytkownika(imie: string, los = Math.random().toString(36).slice(2, 6)): string {
    const pl: Record<string, string> = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }
    const baza = imie.toLowerCase().replace(/[ąćęłńóśźż]/g, (z) => pl[z]).normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'osoba'
    return `${baza}-${los}`
}

export async function zalozOsobe(k: KonfiguracjaKont, imie: string, email?: string): Promise<OsobaPocketId> {
    const [pierwsze, ...reszta] = imie.trim().split(/\s+/)
    return api<OsobaPocketId>(k, 'POST', '/api/users', { username: nazwaUzytkownika(imie), firstName: pierwsze, lastName: reszta.join(' '), displayName: imie.trim(), isAdmin: false, locale: 'pl', ...(email ? { email } : {}) })
}
export const listaOsob = async (k: Pick<KonfiguracjaKont, 'adres' | 'kluczApi'>) => (await api<{ data: OsobaPocketId[] }>(k, 'GET', '/api/users?pagination[limit]=200')).data
export const usunOsobe = (k: KonfiguracjaKont, id: string) => api<null>(k, 'DELETE', `/api/users/${encodeURIComponent(id)}`)

/** Kod linku jednorazowego (strona Pocket ID: /lc/{kod}). `godziny` – ważność, najwyżej 31 dni. */
export async function kodJednorazowy(k: Pick<KonfiguracjaKont, 'adres' | 'kluczApi'>, id: string, godziny: number): Promise<string> {
    const { token } = await api<{ token: string }>(k, 'POST', `/api/users/${encodeURIComponent(id)}/one-time-access-token`, { ttl: `${Math.min(Math.max(1, Math.round(godziny)), 31 * 24)}h` })
    return token
}
export const adresPolaczenia = (k: Pick<KonfiguracjaKont, 'adres'>, kod: string) => `${k.adres}/lc/${encodeURIComponent(kod)}`

export async function urzadzenia(k: KonfiguracjaKont, id: string): Promise<Urzadzenie[]> {
    const L = await api<{ id: string; name: string; createdAt: string }[]>(k, 'GET', `/api/users/${encodeURIComponent(id)}/webauthn-credentials`)
    return (L ?? []).map((x) => ({ id: x.id, nazwa: x.name, od: x.createdAt }))
}
export const usunUrzadzenie = (k: KonfiguracjaKont, id: string, idKlucza: string) => api<null>(k, 'DELETE', `/api/users/${encodeURIComponent(id)}/webauthn-credentials/${encodeURIComponent(idKlucza)}`)

// ---------- klient OIDC (npm run konta:przygotuj) ----------
export interface KlientOidc { id: string; name: string; callbackURLs: string[] }
export const listaKlientow = async (k: Pick<KonfiguracjaKont, 'adres' | 'kluczApi'>) => (await api<{ data: KlientOidc[] }>(k, 'GET', '/api/oidc/clients?pagination[limit]=100')).data
export async function zalozKlienta(k: Pick<KonfiguracjaKont, 'adres' | 'kluczApi'>, nazwa: string, strona: string): Promise<{ id: string; sekret: string }> {
    const kl = await api<KlientOidc>(k, 'POST', '/api/oidc/clients', { name: nazwa, callbackURLs: [`${strona}/api/konto/powrot`], logoutCallbackURLs: [`${strona}/`], launchURL: `${strona}/moje-konto`, isPublic: false, pkceEnabled: true, skipConsent: true })
    const { secret } = await api<{ secret: string }>(k, 'POST', `/api/oidc/clients/${kl.id}/secrets`, {})
    return { id: kl.id, sekret: secret }
}
