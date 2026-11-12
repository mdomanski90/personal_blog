// Zgłoszenia czytelników ze stron: poprawka, nowe miejsce w terenie, propozycja materiału.
// Pliki w content/zgloszenia/ (nigdy w repozytorium); nic nie jest publikowane – lista w panelu (/keystatic/zgloszenia).
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

export type RodzajZgloszenia = 'poprawka' | 'miejsce' | 'material'
export const RODZAJE_ZGLOSZEN: Record<RodzajZgloszenia, string> = { poprawka: 'poprawka lub uzupełnienie', miejsce: 'nowe miejsce w terenie', material: 'propozycja materiału' }

export interface ZgloszenieStrony { id: string; rodzaj: RodzajZgloszenia; adres: string; tytul: string; tresc: string; kontakt: string; data: string }

const KATALOG = () => path.join(process.cwd(), 'content', 'zgloszenia')

export async function zapiszZgloszenieStrony(z: Omit<ZgloszenieStrony, 'id' | 'data'>) {
    const id = `${Date.now()}-${randomBytes(3).toString('hex')}`
    await fs.promises.mkdir(KATALOG(), { recursive: true })
    await fs.promises.writeFile(path.join(KATALOG(), `${id}.json`), JSON.stringify({ ...z, id, data: new Date().toISOString() }, null, 1))
}

export async function listaZgloszenStrony(): Promise<ZgloszenieStrony[]> {
    let pliki: string[] = []
    try { pliki = await fs.promises.readdir(KATALOG()) } catch { return [] }
    const wyn: ZgloszenieStrony[] = []
    for (const p of pliki) if (p.endsWith('.json')) { try { wyn.push(JSON.parse(await fs.promises.readFile(path.join(KATALOG(), p), 'utf8'))) } catch { /* pomiń */ } }
    return wyn.sort((a, b) => b.data.localeCompare(a.data))
}

export async function usunZgloszenieStrony(id: string) {
    if (/^\d+-[0-9a-f]+$/.test(id)) await fs.promises.unlink(path.join(KATALOG(), `${id}.json`)).catch(() => {})
}
