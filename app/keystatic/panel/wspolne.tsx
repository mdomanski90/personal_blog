'use client'
// Wspólne dla stron panelu: formatowanie, odczyt API z czytelnym błędem. Style panelu: app/keystatic/panel.css (PK).
import * as React from 'react'


export function kiedy(iso: string | null | undefined): string {
    if (!iso) return '—'
    const t = Date.parse(iso)
    if (!Number.isFinite(t)) return '—'
    const s = (Date.now() - t) / 1000
    if (s < 60) return 'przed chwilą'
    if (s < 3600) return `${Math.floor(s / 60)} min temu`
    const d = new Date(t), dzis = new Date()
    if (d.toDateString() === dzis.toDateString()) return `dziś ${d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
    const wczoraj = new Date(Date.now() - 864e5)
    if (d.toDateString() === wczoraj.toDateString()) return `wczoraj ${d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: d.getFullYear() === dzis.getFullYear() ? undefined : 'numeric' })
}

export function bajty(n: number): string {
    if (n < 1024) return `${n} B`
    const j = ['kB', 'MB', 'GB', 'TB']
    let i = -1
    do { n /= 1024; i++ } while (n >= 1024 && i < j.length - 1)
    return `${n.toFixed(n < 10 ? 1 : 0)} ${j[i]}`
}

export function odmiana(n: number, f: [string, string, string]): string {
    const d = n % 10, s = n % 100
    return `${n} ${n === 1 ? f[0] : d >= 2 && d <= 4 && (s < 12 || s > 14) ? f[1] : f[2]}`
}

/** Odczyt API panelu; 401/403 → komunikat o haśle panelu. */
export function useDane<T>(url: string): { dane: T | null; blad: string; odswiez: () => void } {
    const [dane, ustaw] = React.useState<T | null>(null)
    const [blad, ustawBlad] = React.useState('')
    const [n, ustawN] = React.useState(0)
    React.useEffect(() => {
        let zywy = true
        fetch(url, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((j) => { if (zywy) { ustaw(j); ustawBlad('') } })
            .catch((s) => { if (zywy) ustawBlad(s === 401 || s === 403 ? 'Brak dostępu – panel działa tylko za hasłem panelu. Odśwież stronę.' : 'Nie udało się wczytać danych panelu.') })
        return () => { zywy = false }
    }, [url, n])
    return { dane, blad, odswiez: () => ustawN((x) => x + 1) }
}

export async function wyslijJson(url: string, metoda: string, body?: unknown): Promise<string | null> {
    const r = await fetch(url, { method: metoda, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }).catch(() => null)
    if (!r) return 'Brak połączenia z serwerem.'
    if (r.ok) return null
    const j = await r.json().catch(() => ({}))
    return (j as { blad?: string }).blad ?? (r.status === 401 ? 'Brak hasła panelu – odśwież stronę.' : `Błąd serwera ${r.status}`)
}
