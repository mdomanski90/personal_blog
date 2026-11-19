'use client'
// P7b (TER-01): wspólne części ekranów „w terenie” – pobieranie danych z prostymi komunikatami, identyfikator czynności, daty.
import * as React from 'react'

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
