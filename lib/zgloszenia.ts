// Zgłoszenia czytelników ze stron: poprawka, nowe miejsce w terenie, propozycja materiału, odczyt, wspomnienie, rozpoznanie.
// Pliki w content/zgloszenia/ (nigdy w repozytorium); nic nie jest publikowane – lista w panelu (/keystatic/panel/zgloszenia).
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import type { IdBraku, RodzajFormularza } from './wspoltworz-reguly'

export type RodzajZgloszenia = RodzajFormularza
export const RODZAJE_ZGLOSZEN: Record<RodzajZgloszenia, string> = {
    poprawka: 'poprawka lub uzupełnienie', miejsce: 'nowe miejsce w terenie', material: 'propozycja materiału',
    // WSP-03 (etap R)
    odczyt: 'odczyt albo tłumaczenie', wspomnienie: 'wspomnienie', rozpoznanie: 'rozpoznanie osoby, miejsca albo daty',
    // SLW-01 (P2)
    haslo: 'hasło do słownika',
}
/** WSP-03: rodzaje braków, które zgłoszenie może wskazać (te same identyfikatory co reguły – lib/wspoltworz-reguly.ts). */
export const BRAKI_ZGLOSZEN: IdBraku[] = ['brak-transkrypcji', 'brak-tlumaczenia', 'zdjecie-do-rozpoznania', 'bez-opisu', 'brak-wspolrzednych', 'brak-zdjecia-obiektu']

export interface ZgloszenieStrony {
    id: string; rodzaj: RodzajZgloszenia; adres: string; tytul: string; tresc: string; kontakt: string; data: string
    /** WSP-03: rodzaj braku, którego dotyczy (z zadania „uzupełnij” albo z karty) */
    brak?: IdBraku
    /** WSP-03: zgoda na podpis w „opracował(a)” */
    podpis?: boolean
}

const KATALOG = () => path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', 'zgloszenia')

/** Sprawdza i przycina dane z formularza; null = odrzucone (400). */
export function zgloszenieZDanych(d: unknown): Omit<ZgloszenieStrony, 'id' | 'data'> | null {
    if (!d || typeof d !== 'object') return null
    const x = d as Record<string, unknown>
    const rodzaj = String(x.rodzaj ?? '') as RodzajZgloszenia
    const adres = String(x.adres ?? ''), tresc = String(x.tresc ?? '').trim().slice(0, 4000)
    if (!(rodzaj in RODZAJE_ZGLOSZEN) || !adres.startsWith('/') || adres.startsWith('//') || tresc.length < 3 || x.www) return null
    const brak = BRAKI_ZGLOSZEN.includes(x.brak as IdBraku) ? (x.brak as IdBraku) : undefined
    return {
        rodzaj, adres: adres.slice(0, 300), tytul: String(x.tytul ?? '').slice(0, 200), tresc, kontakt: String(x.kontakt ?? '').trim().slice(0, 200),
        ...(brak ? { brak } : {}), ...(x.podpis === true ? { podpis: true } : {}),
    }
}

/** Zapis atomowy (.tmp → rename), zasada 2.5. */
export async function zapiszZgloszenieStrony(z: Omit<ZgloszenieStrony, 'id' | 'data'>) {
    const id = `${Date.now()}-${randomBytes(3).toString('hex')}`
    await fs.promises.mkdir(KATALOG(), { recursive: true })
    const plik = path.join(KATALOG(), `${id}.json`), tmp = `${plik}.${randomBytes(4).toString('hex')}.tmp`
    try {
        await fs.promises.writeFile(tmp, JSON.stringify({ ...z, id, data: new Date().toISOString() }, null, 1), { flag: 'wx' })
        await fs.promises.rename(tmp, plik)
    } finally { await fs.promises.unlink(tmp).catch(() => {}) }
    return id
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
