// PK: dane ramy panelu po stronie serwera – ustawienie „Menu panelu” i liczby planów według rodzaju (liczniki w menu).
import fs from 'node:fs'
import path from 'node:path'
import { rodzajPlanu, RODZAJE_PLANU, type RodzajPlanu } from '../plany/metadane'
import { migrujUstawieniaMenu, type UstawieniaMenu } from './menu'
import { ukrytePozycje, ukrytyKlucz } from '../konta/tylko-ja'

const PLIK_MENU = () => path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', '_panel', 'menu-panelu.json')
const KATALOG_PLANOW = () => path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', 'plany')

/** Ustawienie menu z Keystatic; brak pliku albo błędny plik = menu domyślne (błąd nie wyłącza panelu). */
export async function ustawieniaMenu(): Promise<UstawieniaMenu | null> {
    try {
        const j = JSON.parse(await fs.promises.readFile(/*turbopackIgnore: true*/ PLIK_MENU(), 'utf8')) as Record<string, unknown>
        const lista = (x: unknown) => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : [])
        return migrujUstawieniaMenu({ ukryte: lista(j.ukryte), kolejnosc: lista(j.kolejnosc) }) // P7a: dawny klucz „narzedzia” czytany jak „administracja”, zanim migracja przepisze plik
    } catch {
        return null
    }
}

// pamięć podręczna po czasach zmian plików – plan cmentarza bywa duży, a liczniki są na każdej stronie panelu
let pamiec: { odcisk: string; liczby: Record<RodzajPlanu, number> } | null = null

/** `widzi` (P7c, KON-08) – false: bez planów „tylko ja” (konto bez roli administratora). */
export async function liczbyPlanow(widzi = true): Promise<Record<RodzajPlanu, number>> {
    const zero = Object.fromEntries(Object.keys(RODZAJE_PLANU).map((k) => [k, 0])) as Record<RodzajPlanu, number>
    let pliki: string[] = []
    try { pliki = (await fs.promises.readdir(/*turbopackIgnore: true*/ KATALOG_PLANOW())).filter((p) => p.endsWith('.json') && !p.startsWith('_')).sort() } catch { return zero }
    const staty = await Promise.all(pliki.map((p) => fs.promises.stat(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ KATALOG_PLANOW(), p)).then((s) => `${p}:${s.mtimeMs}:${s.size}`, () => p)))
    const odcisk = `${widzi ? 'ja' : 'bez-ja'}|${staty.join('|')}`
    if (pamiec?.odcisk === odcisk) return pamiec.liczby
    const liczby = { ...zero }
    for (const p of pliki) {
        try {
            const plan = JSON.parse(await fs.promises.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ KATALOG_PLANOW(), p), 'utf8')) as { rodzaj?: RodzajPlanu; widocznosc?: string }
            if (!widzi && plan.widocznosc === 'ja') continue
            const r = rodzajPlanu(plan)
            if (r in liczby) liczby[r]++
        } catch { /* plik nieczytelny – pomijany jak w liście planów */ }
    }
    pamiec = { odcisk, liczby }
    return liczby
}

/** P6a (ADM-11): liczba wpisów w kolekcjach list panelu (pliki w content/<kolekcja>) – liczniki w menu zamiast karty „treści w Keystatic”. */
export async function liczbyKolekcji(klucze: string[], widzi = true): Promise<Record<string, number>> {
    const wyn: Record<string, number> = {}
    const u = widzi ? null : await ukrytePozycje()
    await Promise.all(klucze.map(async (k) => {
        try { wyn[k] = (await fs.promises.readdir(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', k))).filter((p) => /\.(mdoc|yaml|yml|json)$/.test(p) && !(u && ukrytyKlucz(k, p.replace(/\.[a-z]+$/, ''), u))).length }
        catch { wyn[k] = 0 }
    }))
    return wyn
}
