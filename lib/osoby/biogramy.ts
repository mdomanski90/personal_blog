// Biogramy osób z drzewa: pliki content/biogramy/<id osoby>.mdoc (kolekcja „Osoby – biogramy” w Keystatic).
// Nazwa pliku = identyfikator osoby z drzewa – po nim biogram łączy się z kartą osoby.

import fs from 'node:fs'
import path from 'node:path'
import { ID_OSOBY } from './model'

const KATALOG = () => path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', 'biogramy')
const plik = (id: string) => path.join(/*turbopackIgnore: true*/ KATALOG(), `${id}.mdoc`)

export function maBiogram(id: string): boolean {
    return ID_OSOBY.test(id) && fs.existsSync(plik(id))
}

/** Zakłada pusty biogram (gdy go nie ma) i zwraca adres edycji w Keystatic. */
export async function zalozBiogram(id: string, podpis: string): Promise<string> {
    if (!ID_OSOBY.test(id)) throw new Error('zły identyfikator')
    if (!fs.existsSync(plik(id))) {
        await fs.promises.mkdir(KATALOG(), { recursive: true })
        const bezpieczny = podpis.replace(/["\\\n]/g, ' ').trim() || id
        await fs.promises.writeFile(plik(id), `---\ntitle: "${bezpieczny}"\nlead: ''\n---\n`, { flag: 'wx' }).catch((e) => { if (e.code !== 'EEXIST') throw e })
    }
    return `/keystatic/collection/biogramy/item/${id}`
}
