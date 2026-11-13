// Odczyt i zapis drzewa na serwerze (content/osoby). Kopia w pamięci odświeżana, gdy zmienią się katalogi.

import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import {
    czyZyje, ID_OSOBY, indeksRelacji, OBRZADEK_PARAFII, poprawOsobe, poprawRodzine, szacowaneLata, widocznoscOsoby, ZDARZENIA_Z_OBRZADKIEM,
    type Drzewo, type Obrzadek, type Osoba, type Relacje, type Rodzina, type Zrodlo, type Zdarzenie,
} from './model'
import type { PodsumowanieImportu } from './gedcom'

const KATALOG = () => path.resolve(process.cwd(), 'content', 'osoby')
const RODZINY = () => path.join(KATALOG(), '_rodziny')
const ID_RODZINY = /^r[a-z0-9-]{1,40}$/

async function zapiszAtomowo(plik: string, dane: string) {
    await fs.promises.mkdir(path.dirname(plik), { recursive: true })
    const tmp = `${plik}.${randomBytes(4).toString('hex')}.tmp`
    await fs.promises.writeFile(tmp, dane)
    await fs.promises.rename(tmp, plik)
}

async function znacznikCzasu(): Promise<string> {
    const czasy: number[] = []
    for (const p of [KATALOG(), RODZINY(), path.join(KATALOG(), '_zrodla.json')]) {
        try { czasy.push((await fs.promises.stat(/*turbopackIgnore: true*/ p)).mtimeMs) } catch { czasy.push(0) }
    }
    return czasy.join('|')
}

let pamiec: { klucz: string; drzewo: Drzewo } | null = null

async function czytajKatalog<T>(kat: string, popraw: (x: T & { id: string }) => T): Promise<Map<string, T>> {
    const m = new Map<string, T>()
    let pliki: string[] = []
    try { pliki = await fs.promises.readdir(kat) } catch { return m }
    await Promise.all(pliki.filter((p) => p.endsWith('.json') && !p.startsWith('_')).map(async (p) => {
        try {
            const id = p.slice(0, -5)
            const x = JSON.parse(await fs.promises.readFile(path.join(kat, p), 'utf8'))
            m.set(id, popraw({ ...x, id }))
        } catch { /* uszkodzony plik pomijamy */ }
    }))
    return m
}

export async function wczytajDrzewo(): Promise<Drzewo> {
    const klucz = await znacznikCzasu()
    if (pamiec && pamiec.klucz === klucz) return pamiec.drzewo
    const [osoby, rodziny] = await Promise.all([czytajKatalog<Osoba>(KATALOG(), poprawOsobe), czytajKatalog<Rodzina>(RODZINY(), poprawRodzine)])
    let zrodla = new Map<string, Zrodlo>()
    try {
        const z = JSON.parse(await fs.promises.readFile(path.join(KATALOG(), '_zrodla.json'), 'utf8')) as Zrodlo[]
        zrodla = new Map(z.map((x) => [x.id, x]))
    } catch { /* brak źródeł */ }
    const drzewo = { osoby, rodziny, zrodla }
    pamiec = { klucz, drzewo }
    return drzewo
}

export const uniewaznij = () => { pamiec = null }

export class Konflikt extends Error {}

export async function zapiszOsobe(o: Osoba, wersjaWczytana?: number): Promise<Osoba> {
    if (!ID_OSOBY.test(o.id)) throw new Error('zły identyfikator osoby')
    const plik = path.join(KATALOG(), `${o.id}.json`)
    if (wersjaWczytana != null) {
        try {
            const ist = JSON.parse(await fs.promises.readFile(plik, 'utf8')) as Osoba
            if ((ist.wersja ?? 0) !== wersjaWczytana) throw new Konflikt('Ktoś zmienił tę osobę w międzyczasie – odśwież stronę.')
        } catch (e) { if (e instanceof Konflikt) throw e }
    }
    const p = poprawOsobe({ ...o, wersja: (o.wersja ?? 0) + 1, zmieniono: new Date().toISOString() })
    const { id: _id, ...bezId } = p
    await zapiszAtomowo(plik, JSON.stringify(bezId, null, 1))
    uniewaznij()
    return p
}

export async function zapiszRodzine(f: Rodzina): Promise<Rodzina> {
    if (!ID_RODZINY.test(f.id)) throw new Error('zły identyfikator rodziny')
    const p = poprawRodzine({ ...f, wersja: (f.wersja ?? 0) + 1, zmieniono: new Date().toISOString() })
    const { id: _id, ...bezId } = p
    await zapiszAtomowo(path.join(RODZINY(), `${f.id}.json`), JSON.stringify(bezId, null, 1))
    uniewaznij()
    return p
}

export async function usunRodzine(id: string) {
    if (!ID_RODZINY.test(id)) return
    const kosz = path.join(KATALOG(), '_kosz')
    await fs.promises.mkdir(kosz, { recursive: true })
    await fs.promises.rename(path.join(RODZINY(), `${id}.json`), path.join(kosz, `rodzina-${id}-${Date.now()}.json`)).catch(() => {})
    uniewaznij()
}

/** Osoba do kosza (content/osoby/_kosz) i wypisana z rodzin. */
export async function usunOsobe(id: string) {
    if (!ID_OSOBY.test(id)) return
    const d = await wczytajDrzewo()
    for (const f of d.rodziny.values()) {
        if (f.maz === id || f.zona === id || f.dzieci.includes(id)) {
            const n = { ...f, maz: f.maz === id ? undefined : f.maz, zona: f.zona === id ? undefined : f.zona, dzieci: f.dzieci.filter((x) => x !== id) }
            if (!n.maz && !n.zona && n.dzieci.length === 0) await usunRodzine(f.id)
            else await zapiszRodzine(n)
        }
    }
    const kosz = path.join(KATALOG(), '_kosz')
    await fs.promises.mkdir(kosz, { recursive: true })
    await fs.promises.rename(path.join(KATALOG(), `${id}.json`), path.join(kosz, `${id}-${Date.now()}.json`)).catch(() => {})
    uniewaznij()
}

export async function noweIdRodziny(): Promise<string> {
    const d = await wczytajDrzewo()
    let n = d.rodziny.size + 1
    while (d.rodziny.has(`r${n}`)) n++
    return `r${n}`
}

// ---------- import ----------
export interface SladImportu {
    data: string
    plik: string
    podsumowanie: Pick<PodsumowanieImportu, 'osoby' | 'rodziny' | 'zdarzenia' | 'zrodla' | 'cytaty' | 'multimedia'>
}

export async function sladImportu(): Promise<SladImportu | null> {
    try { return JSON.parse(await fs.promises.readFile(path.join(KATALOG(), '_import.json'), 'utf8')) } catch { return null }
}

/** Zapis całego drzewa z importu. Poprzednie dane (jeśli są) idą do content/osoby/_kosz/<czas>/. */
export async function zapiszImport(d: Drzewo, slad: SladImportu) {
    const kat = KATALOG()
    let pliki: string[] = []
    try { pliki = await fs.promises.readdir(kat) } catch { /* pusty */ }
    const stare = pliki.filter((p) => p.endsWith('.json') || p === '_rodziny')
    if (stare.length) {
        const kosz = path.join(kat, '_kosz', `przed-importem-${Date.now()}`)
        await fs.promises.mkdir(kosz, { recursive: true })
        for (const p of stare) await fs.promises.rename(path.join(kat, p), path.join(kosz, p))
    }
    await fs.promises.mkdir(RODZINY(), { recursive: true })
    for (const o of d.osoby.values()) {
        const { id, ...bez } = o
        await fs.promises.writeFile(path.join(kat, `${id}.json`), JSON.stringify(bez, null, 1))
    }
    for (const f of d.rodziny.values()) {
        const { id, ...bez } = f
        await fs.promises.writeFile(path.join(RODZINY(), `${id}.json`), JSON.stringify(bez, null, 1))
    }
    await zapiszAtomowo(path.join(kat, '_zrodla.json'), JSON.stringify([...d.zrodla.values()], null, 1))
    await zapiszAtomowo(path.join(kat, '_import.json'), JSON.stringify(slad, null, 1))
    uniewaznij()
}

// ---------- widok dla czytelnika ----------
export interface StanOsob {
    drzewo: Drzewo
    relacje: Map<string, Relacje>
    zyje: (id: string) => boolean
    widocznosc: (id: string) => 'publiczne' | 'bliscy' | 'ja'
    lata: Map<string, number>
}

let pamiecStanu: { drzewo: Drzewo; stan: StanOsob } | null = null

export async function stanOsob(): Promise<StanOsob> {
    const drzewo = await wczytajDrzewo()
    if (pamiecStanu?.drzewo === drzewo) return pamiecStanu.stan
    const relacje = indeksRelacji(drzewo)
    const lata = szacowaneLata(drzewo, relacje)
    const zyjeM = new Map([...drzewo.osoby.values()].map((o) => [o.id, czyZyje(o, lata.get(o.id))]))
    const stan: StanOsob = {
        drzewo, relacje, lata,
        zyje: (id) => zyjeM.get(id) ?? true,
        widocznosc: (id) => {
            const o = drzewo.osoby.get(id)
            return o ? widocznoscOsoby(o, zyjeM.get(id) ?? true) : 'ja'
        },
    }
    pamiecStanu = { drzewo, stan }
    return stan
}

/** Obrządek zdarzenia: wpisany albo z wyznania parafii w miejscowości zdarzenia (gdy jest tam jedna parafia). */
export function obrzadekZdarzenia(z: Zdarzenie, parafie: { siedziba: string | null; wyznanie: string }[]): { obrzadek: Obrzadek; wywnioskowany: boolean } | null {
    if (z.obrzadek) return { obrzadek: z.obrzadek, wywnioskowany: false }
    if (!ZDARZENIA_Z_OBRZADKIEM.includes(z.rodzaj) || !z.miejsceId) return null
    const tu = parafie.filter((p) => p.siedziba === z.miejsceId && OBRZADEK_PARAFII[p.wyznanie])
    const rodzaje = [...new Set(tu.map((p) => OBRZADEK_PARAFII[p.wyznanie]))]
    return rodzaje.length === 1 ? { obrzadek: rodzaje[0], wywnioskowany: true } : null
}
