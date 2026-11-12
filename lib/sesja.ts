// Logowanie „dla bliskich”: jedno wspólne hasło, bez kont.
//
// Hasło (skrót scrypt) i sekret sesji są w pliku .env.local na serwerze (poza repozytorium) –
// ustawia je polecenie `npm run haslo -- 'nowe hasło'`. Ciasteczko sesji to podpis skrótu hasła,
// więc zmiana hasła od razu wylogowuje wszystkich.

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export const CIASTECZKO = 'odp_bliscy'
/** Widoczne dla skryptów strony – tylko do pokazania „wyloguj” zamiast „zaloguj”, nic nie odblokowuje. */
export const CIASTECZKO_UI = 'odp_zalogowany'
export const WAZNOSC_S = 180 * 24 * 3600

function konfiguracja(): { hash: string; sekret: string } | null {
    const hash = process.env.HASLO_BLISKICH_HASH
    const sekret = process.env.SEKRET_SESJI
    return hash && sekret && hash.startsWith('scrypt:') ? { hash, sekret } : null
}

export const logowanieWlaczone = () => konfiguracja() !== null

export function hashHasla(haslo: string, sol = randomBytes(16).toString('hex')): string {
    return `scrypt:${sol}:${scryptSync(haslo.normalize('NFC'), sol, 32).toString('hex')}`
}

const rowne = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b)

export function sprawdzHaslo(haslo: string): boolean {
    const k = konfiguracja()
    if (!k || !haslo) return false
    const [, sol, skrot] = k.hash.split(':')
    return rowne(scryptSync(haslo.normalize('NFC'), sol, 32), Buffer.from(skrot, 'hex'))
}

export function tokenSesji(): string | null {
    const k = konfiguracja()
    return k ? createHmac('sha256', k.sekret).update(`bliscy:${k.hash}`).digest('base64url') : null
}

export function sesjaWazna(token: string | undefined): boolean {
    const t = tokenSesji()
    return !!t && !!token && rowne(Buffer.from(t), Buffer.from(token))
}

// ---------- limit prób: 5 nieudanych w ciągu 15 minut z jednego adresu ----------

const OKNO_MS = 15 * 60 * 1000
const MAKS_PROB = 5
const proby = new Map<string, number[]>()

function aktualne(ip: string): number[] {
    const teraz = Date.now()
    const lista = (proby.get(ip) ?? []).filter((t) => teraz - t < OKNO_MS)
    if (lista.length) proby.set(ip, lista)
    else proby.delete(ip)
    return lista
}

export const mozeProbowac = (ip: string) => aktualne(ip).length < MAKS_PROB
export const zapiszNieudana = (ip: string) => proby.set(ip, [...aktualne(ip), Date.now()])
export const wyczyscProby = (ip: string) => proby.delete(ip)

/** Bezpieczny adres powrotu po zalogowaniu: tylko ścieżka na tej stronie. */
export function adresPowrotu(a: unknown): string {
    const s = typeof a === 'string' ? a : ''
    return s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\') ? s : '/'
}
