// Strony materiałów archiwum (skany wielostronicowych dokumentów).
// Pliki: pliki-archiwum/strony/<materiał>/<plik> (poza public/, wydawane przez /pliki/strony/… po sprawdzeniu widoczności).
// Kolejność i podpisy: content/strony/<materiał>.json – zapisuje je panel (/keystatic/panel/materialy/<id>),
// Keystatic tych plików nie dotyka.

import fs from 'node:fs'
import path from 'node:path'
import { ADRES_PLIKOW, KATALOG_PLIKOW } from './pliki'

export interface StronaMaterialu { plik: string; podpis?: string }

export const ID_MATERIALU = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const NAZWA_STRONY = /^s-[a-z0-9-]+\.(jpg|png|webp)$/

const KAT_PLIKOW = () => path.join(/*turbopackIgnore: true*/ process.cwd(), KATALOG_PLIKOW, 'strony')
const KAT_LIST = () => path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', 'strony')

export const katalogStron = (id: string) => path.join(/*turbopackIgnore: true*/ KAT_PLIKOW(), id)
const plikListy = (id: string) => path.join(/*turbopackIgnore: true*/ KAT_LIST(), `${id}.json`)

/** Adres strony na stronie www (przez /pliki/strony/…). */
export const adresStrony = (id: string, plik: string) => `${ADRES_PLIKOW}strony/${id}/${plik}`

export function stronyMaterialu(id: string): StronaMaterialu[] {
    if (!ID_MATERIALU.test(id)) return []
    try {
        const d = JSON.parse(fs.readFileSync(plikListy(id), 'utf8')) as { strony?: StronaMaterialu[] }
        return (d.strony ?? []).filter((s) => s && NAZWA_STRONY.test(s.plik)).map((s) => ({ plik: s.plik, ...(s.podpis?.trim() ? { podpis: s.podpis.trim().slice(0, 200) } : {}) }))
    } catch {
        return []
    }
}

export async function zapiszStrony(id: string, strony: StronaMaterialu[]): Promise<void> {
    await fs.promises.mkdir(KAT_LIST(), { recursive: true })
    const tmp = `${plikListy(id)}.${process.pid}.tmp`
    await fs.promises.writeFile(tmp, JSON.stringify({ strony }, null, 2) + '\n')
    await fs.promises.rename(tmp, plikListy(id))
}
