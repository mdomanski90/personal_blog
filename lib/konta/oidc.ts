// P7a (KON-01): logowanie przez Pocket ID – OpenID Connect, kod autoryzacji + PKCE (biblioteka openid-client).
// Pocket ID potwierdza tylko tożsamość (sub) i czas użycia klucza (auth_time); o dostępie decyduje plik kont.
import * as oidc from 'openid-client'
import type { KonfiguracjaKont } from './straz'

let pamiec: { klucz: string; konfig: oidc.Configuration; czas: number } | null = null

async function konfig(k: KonfiguracjaKont): Promise<oidc.Configuration> {
    const klucz = `${k.adres}|${k.wewn}|${k.klientId}`
    if (pamiec && pamiec.klucz === klucz && Date.now() - pamiec.czas < 3600_000) return pamiec.konfig
    // http tylko dla testów na tym samym komputerze (Pocket ID uruchomiony lokalnie)
    const lokalnie = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(k.adres)
    // Serwer bloga łączy się z usługą logowania pod adresem wewnętrznym (piaskownica usługi blog dopuszcza tylko localhost);
    // wystawca i adresy w tokenach zostają publiczne – podmieniamy wyłącznie początek adresu żądania.
    const polacz: oidc.CustomFetch = (adres, opcje) => fetch(adres.startsWith(k.adres + '/') ? k.wewn + adres.slice(k.adres.length) : adres, opcje as RequestInit)
    const konfig = await oidc.discovery(new URL(k.adres), k.klientId, k.klientSekret, undefined, { [oidc.customFetch]: polacz, ...(lokalnie ? { execute: [oidc.allowInsecureRequests] } : {}) })
    konfig[oidc.customFetch] = polacz
    pamiec = { klucz, konfig, czas: Date.now() }
    return konfig
}

export const adresPowrotuOidc = (k: KonfiguracjaKont) => `${k.strona}/api/konto/powrot`

export interface Przejscie { state: string; nonce: string; weryfikator: string; wroc: string; administrator: boolean }

/**
 * Adres strony logowania Pocket ID. Zwykłe logowanie: klucz użyty najwyżej 5 minut temu wystarcza (max_age=300 – tyle trwa
 * droga z zaproszenia), inaczej Pocket ID prosi o klucz. Przełączenie na administratora: zawsze ponowne użycie klucza.
 */
export async function adresLogowania(k: KonfiguracjaKont, wroc: string, administrator: boolean): Promise<{ adres: string; przejscie: Przejscie }> {
    const c = await konfig(k)
    const weryfikator = oidc.randomPKCECodeVerifier()
    const przejscie: Przejscie = { state: oidc.randomState(), nonce: oidc.randomNonce(), weryfikator, wroc, administrator }
    const adres = oidc.buildAuthorizationUrl(c, {
        redirect_uri: adresPowrotuOidc(k), scope: 'openid profile', state: przejscie.state, nonce: przejscie.nonce,
        code_challenge: await oidc.calculatePKCECodeChallenge(weryfikator), code_challenge_method: 'S256',
        ...(administrator ? { prompt: 'login', max_age: '0' } : { max_age: '300' }),
    })
    return { adres: adres.href, przejscie }
}

export interface Tozsamosc { sub: string; imie: string; kluczUzyto: number | null }

/** Wymiana kodu z adresu powrotu na potwierdzoną tożsamość. `zapytanie` – część adresu po „?” z żądania powrotu. */
export async function odbierzLogowanie(k: KonfiguracjaKont, zapytanie: string, p: Przejscie): Promise<Tozsamosc> {
    const c = await konfig(k)
    // za nginx adres żądania to 127.0.0.1 – adres powrotu budujemy z ustawienia strony
    const tokeny = await oidc.authorizationCodeGrant(c, new URL(`${adresPowrotuOidc(k)}?${zapytanie}`), { pkceCodeVerifier: p.weryfikator, expectedState: p.state, expectedNonce: p.nonce, idTokenExpected: true })
    const cl = tokeny.claims()
    if (!cl?.sub) throw new Error('Usługa logowania nie podała identyfikatora konta.')
    return { sub: cl.sub, imie: typeof cl.name === 'string' ? cl.name : '', kluczUzyto: typeof cl.auth_time === 'number' ? cl.auth_time : null }
}
