/**
 * JW-1 (JW-01): zapadka języka wizualnego – liczby naruszeń per plik mogą tylko maleć.
 * Stan zapisany w zapadka.json; test: zapadka.test.ts; obniżenie po porządkach: `npm run jw:zapadka`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { skanujCss, skanujTsx, type Naruszenie, type Rodzaj } from './skaner'

export const ROOT = path.resolve(/*turbopackIgnore: true*/ import.meta.dirname, '..', '..')
export const PLIK_ZAPADKI = path.join(/*turbopackIgnore: true*/ import.meta.dirname, 'zapadka.json')

export type Liczby = Partial<Record<Rodzaj, number>>
export interface Zapadka { opis: string; pliki: Record<string, Liczby> }

/** Pliki publiczne: app/ bez katalogów keystatic (panel poza zakresem JW). */
export function plikiPubliczne(dir = 'app'): string[] {
    const wyn: string[] = []
    for (const w of fs.readdirSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ ROOT, dir), { withFileTypes: true })) {
        const p = `${dir}/${w.name}`
        if (w.isDirectory()) { if (w.name !== 'keystatic' && w.name !== 'node_modules') wyn.push(...plikiPubliczne(p)) }
        else if (/\.(tsx|ts|css)$/.test(w.name) && !/\.test\.tsx?$/.test(w.name)) wyn.push(p)
    }
    return wyn.sort()
}

export function naruszeniaPliku(plik: string): Naruszenie[] {
    const kod = fs.readFileSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ ROOT, plik), 'utf8')
    return plik.endsWith('.css') ? skanujCss(kod) : skanujTsx(kod, plik)
}

export function policz(n: Naruszenie[]): Liczby {
    const l: Liczby = {}
    for (const x of n) l[x.rodzaj] = (l[x.rodzaj] ?? 0) + 1
    return l
}

export const czytajZapadke = (): Zapadka => JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ PLIK_ZAPADKI, 'utf8'))
