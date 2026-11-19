'use client'
// P7b (TER-01): wspólne części ekranów „w terenie” – pobieranie danych z prostymi komunikatami, identyfikator czynności, daty.
import * as React from 'react'
import { przypiszKonto, startZTelefonu, zapiszStart } from './pamiec'

/** Identyfikator czynności nadawany w telefonie – ta sama czynność wysłana ponownie niczego nie dubluje. */
export function nowyId(): string {
    const b = new Uint8Array(12)
    crypto.getRandomValues(b)
    return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

export const BRAK_SIECI = 'Brak internetu albo serwer nie odpowiada. Spróbuj ponownie za chwilę.'

/** Dane z trasy panelu; komunikaty prostym językiem (decyzja 19.11). */
export function useTeren<T>(adres: string): { dane: T | null; blad: string; odswiez: () => void } {
    const [dane, ustaw] = React.useState<T | null>(null)
    const [blad, ustawBlad] = React.useState('')
    const [n, ustawN] = React.useState(0)
    React.useEffect(() => {
        if (!adres) return
        let zywy = true
        fetch(adres, { cache: 'no-store' })
            .then(async (r) => (r.ok ? r.json() : Promise.reject((await r.json().catch(() => null))?.blad ?? (r.status === 401 ? 'Sesja wygasła – zaloguj się ponownie.' : 'Nie udało się wczytać danych.'))))
            .then((j) => { if (zywy) { ustaw(j); ustawBlad('') } })
            .catch((b) => { if (zywy) ustawBlad(typeof b === 'string' ? b : BRAK_SIECI) })
        return () => { zywy = false }
    }, [adres, n])
    return { dane, blad, odswiez: React.useCallback(() => ustawN((x) => x + 1), []) }
}

/**
 * P7b-2: dane ekranu startowego (/api/keystatic/teren) – z sieci, a bez sieci ostatnia kopia z telefonu (`zTelefonu` – kiedy pobrana).
 * Odpowiedź z sieci przypisuje dane w telefonie do zalogowanego konta.
 */
export function useStart<T extends { konto: string }>(): { dane: T | null; blad: string; zTelefonu: string; odswiez: () => void } {
    const [s, ustaw] = React.useState<{ dane: T | null; blad: string; zTelefonu: string }>({ dane: null, blad: '', zTelefonu: '' })
    const [n, ustawN] = React.useState(0)
    React.useEffect(() => {
        let zywy = true
        fetch('/api/keystatic/teren', { cache: 'no-store' })
            .then(async (r) => {
                const j = await r.json().catch(() => null)
                if (!r.ok) throw j?.blad ?? (r.status === 401 ? 'Sesja wygasła – zaloguj się ponownie.' : 'Nie udało się wczytać danych.')
                await zapiszStart(j).catch(() => {}); await przypiszKonto(j.konto).catch(() => {})
                if (zywy) ustaw({ dane: j, blad: '', zTelefonu: '' })
            })
            .catch(async (b) => {
                const k = typeof b === 'string' ? null : await startZTelefonu<T>().catch(() => null)
                if (zywy) ustaw(k ? { dane: k.dane, blad: '', zTelefonu: k.czas } : { dane: null, blad: typeof b === 'string' ? b : BRAK_SIECI, zTelefonu: '' })
            })
        return () => { zywy = false }
    }, [n])
    return { ...s, odswiez: React.useCallback(() => ustawN((x) => x + 1), []) }
}

export function kiedy(czas: string): string {
    const d = new Date(czas), dzis = new Date()
    if (Number.isNaN(d.getTime())) return ''
    const godz = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    if (d.toDateString() === dzis.toDateString()) return `dziś ${godz}`
    const wczoraj = new Date(dzis); wczoraj.setDate(dzis.getDate() - 1)
    if (d.toDateString() === wczoraj.toDateString()) return `wczoraj ${godz}`
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

export function Blad({ tekst }: { tekst: string }) {
    return <p className="pn-ostrz pn-bez-marginesu" role="alert"><span>{tekst}</span></p>
}
