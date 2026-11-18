// PK: dane ramy panelu po stronie serwera – ustawienie „Menu panelu” i liczby planów według rodzaju (liczniki w menu).
import fs from 'node:fs'
import path from 'node:path'
import { rodzajPlanu, RODZAJE_PLANU, type RodzajPlanu } from '../plany/metadane'
import type { UstawieniaMenu } from './menu'

const PLIK_MENU = () => path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', '_panel', 'menu-panelu.json')
const KATALOG_PLANOW = () => path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', 'plany')

/** Ustawienie menu z Keystatic; brak pliku albo błędny plik = menu domyślne (błąd nie wyłącza panelu). */
export async function ustawieniaMenu(): Promise<UstawieniaMenu | null> {
    try {
        const j = JSON.parse(await fs.promises.readFile(PLIK_MENU(), 'utf8')) as Record<string, unknown>
        const lista = (x: unknown) => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : [])
        return { ukryte: lista(j.ukryte), kolejnosc: lista(j.kolejnosc) }
    } catch {
        return null
    }
}

// pamięć podręczna po czasach zmian plików – plan cmentarza bywa duży, a liczniki są na każdej stronie panelu
let pamiec: { odcisk: string; liczby: Record<RodzajPlanu, number> } | null = null

export async function liczbyPlanow(): Promise<Record<RodzajPlanu, number>> {
    const zero = Object.fromEntries(Object.keys(RODZAJE_PLANU).map((k) => [k, 0])) as Record<RodzajPlanu, number>
    let pliki: string[] = []
    try { pliki = (await fs.promises.readdir(KATALOG_PLANOW())).filter((p) => p.endsWith('.json') && !p.startsWith('_')).sort() } catch { return zero }
    const staty = await Promise.all(pliki.map((p) => fs.promises.stat(path.join(KATALOG_PLANOW(), p)).then((s) => `${p}:${s.mtimeMs}:${s.size}`, () => p)))
    const odcisk = staty.join('|')
    if (pamiec?.odcisk === odcisk) return pamiec.liczby
    const liczby = { ...zero }
    for (const p of pliki) {
        try {
            const plan = JSON.parse(await fs.promises.readFile(path.join(KATALOG_PLANOW(), p), 'utf8')) as { rodzaj?: RodzajPlanu }
            const r = rodzajPlanu(plan)
            if (r in liczby) liczby[r]++
        } catch { /* plik nieczytelny – pomijany jak w liście planów */ }
    }
    pamiec = { odcisk, liczby }
    return liczby
}
