// Etap 0C (audyt nr 2, PAR-08): stałe adresy po zmianie identyfikatora.
// Tabela „stary → nowy” w content/_panel/przekierowania.json (Keystatic: Strony → Przekierowania adresów).
// Strona bytu, którego nie ma, sprawdza tabelę i przekierowuje na stałe (308); bez wpisu – zwykłe 404.
import fs from 'node:fs/promises'
import path from 'node:path'
import { notFound, permanentRedirect } from 'next/navigation'

export const RODZAJE_PRZEKIEROWAN = {
    miejsca: { etykieta: 'miejscowość', adres: '/miejsca' },
    parafie: { etykieta: 'parafia / urząd', adres: '/parafie' },
    obiekty: { etykieta: 'obiekt', adres: '/obiekty' },
    tematy: { etykieta: 'temat', adres: '/tematy' },
    wpisy: { etykieta: 'wpis', adres: '/wpisy' },
    archiwum: { etykieta: 'materiał archiwalny', adres: '/archiwum' },
} as const
export type RodzajPrzekierowania = keyof typeof RODZAJE_PRZEKIEROWAN
export interface Przekierowanie { rodzaj: string; stary: string; nowy: string; uwaga?: string }

const PLIK = () => path.join(process.cwd(), 'content', '_panel', 'przekierowania.json')

export async function wczytajPrzekierowania(): Promise<Przekierowanie[]> {
    try {
        const j = JSON.parse(await fs.readFile(PLIK(), 'utf8')) as { wpisy?: unknown }
        return Array.isArray(j.wpisy) ? (j.wpisy as Przekierowanie[]).filter((w) => w && typeof w.stary === 'string' && typeof w.nowy === 'string') : []
    } catch { return [] }
}

/** Cel przekierowania z podążaniem za łańcuchem (stary → pośredni → nowy), najwyżej 5 kroków, bez pętli. */
export function celPrzekierowania(lista: Przekierowanie[], rodzaj: string, slug: string): string | null {
    const mapa = new Map(lista.filter((w) => w.rodzaj === rodzaj && w.stary.trim() && w.nowy.trim()).map((w) => [w.stary.trim(), w.nowy.trim()]))
    let obecny = slug, byly = new Set([slug])
    for (let i = 0; i < 5; i++) {
        const n = mapa.get(obecny)
        if (!n || byly.has(n)) break
        byly.add(n); obecny = n
    }
    return obecny === slug ? null : obecny
}

/** Zamiast notFound(): przekierowanie, gdy stary adres jest w tabeli, inaczej 404. */
export async function brakLubPrzekierowanie(rodzaj: RodzajPrzekierowania, slug: string): Promise<never> {
    const cel = celPrzekierowania(await wczytajPrzekierowania(), rodzaj, slug)
    if (cel) permanentRedirect(`${RODZAJE_PRZEKIEROWAN[rodzaj].adres}/${encodeURIComponent(cel)}`)
    notFound()
}
