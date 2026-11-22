// Decyzja 22.11: rozwiązywanie wpisów w polach osoby po stronie serwera – rejestr numerów katalogowych i pliki osób (content/osoby).
import fs from 'node:fs'
import path from 'node:path'
import { wczytajRejestr } from '../katalog/dane'
import { idOsoby } from './powiazane'

const BEZPIECZNY = /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u

/** Funkcja wpis → identyfikator osoby (rejestr czytany raz, przy utworzeniu). */
export function rozwiazywaczOsob(): (wpis: string) => string | null {
    let pozycje: Record<string, { rodzaj: string; id: string }> = {}
    try { pozycje = wczytajRejestr()?.pozycje ?? {} } catch { /* bez rejestru – tylko identyfikatory */ }
    const kat = path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', 'osoby')
    const istnieje = (id: string) => BEZPIECZNY.test(id) && fs.existsSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ kat, `${id}.json`))
    return (wpis) => idOsoby(wpis, istnieje, (nr) => pozycje[nr])
}
