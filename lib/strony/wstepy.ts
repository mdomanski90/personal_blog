/** P6C: redakcyjne wstępy działów z Keystatic; bez nadpisywania katalogów i danych. */
import fs from 'node:fs/promises'
import path from 'node:path'

export const DZIALY = ['wpisy', 'miejsca', 'osoby', 'tematy', 'archiwum', 'zbiory', 'biblioteka', 'publikacje', 'instytucje', 'obiekty'] as const
export type Dzial = typeof DZIALY[number]
export type UstawienieDzialu = { tytul: string; wstep: string; linkTekst: string; linkAdres: string }
const puste = (): UstawienieDzialu => ({ tytul: '', wstep: '', linkTekst: '', linkAdres: '' })
export function bezpiecznyAdres(s: string): boolean {
    if (!s) return false
    if (s.startsWith('/') && !s.startsWith('//') && !/[\s\\]/.test(s)) return true
    try { const u = new URL(s); return u.protocol === 'https:' && Boolean(u.hostname) } catch { return false }
}
export function znormalizujWstep(dane: unknown, dzial: Dzial): UstawienieDzialu {
    if (!dane || typeof dane !== 'object') return puste()
    const w = (dane as Record<string, unknown>)[dzial]
    if (!w || typeof w !== 'object') return puste()
    const r = w as Record<string, unknown>
    const tekst = (k: string, limit: number): string => typeof r[k] === 'string' ? (r[k] as string).trim().slice(0, limit) : ''
    const adres = tekst('linkAdres', 500)
    return { tytul: tekst('tytul', 120), wstep: tekst('wstep', 3000), linkTekst: tekst('linkTekst', 120), linkAdres: bezpiecznyAdres(adres) ? adres : '' }
}
export async function wczytajWstep(dzial: Dzial): Promise<UstawienieDzialu> {
    try {
        const plik = path.join(process.cwd(), 'content', '_panel', 'wstepy-dzialow.json')
        return znormalizujWstep(JSON.parse(await fs.readFile(plik, 'utf8')), dzial)
    } catch { return puste() }
}
