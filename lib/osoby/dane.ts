// Odczyt i zapis drzewa na serwerze (content/osoby). Kopia w pamięci odświeżana, gdy zmienią się katalogi.

import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import {
    czyZyje, ID_OSOBY, indeksRelacji, OBRZADEK_PARAFII, poprawOsobe, poprawRodzine, szacowaneLata, widocznoscOsoby, ZDARZENIA_Z_OBRZADKIEM,
    type Drzewo, type Obrzadek, type Osoba, type Relacje, type Rodzina, type Zrodlo, type Zdarzenie,
} from './model'
import type { PodsumowanieImportu } from './gedcom'

const KATALOG = () => path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'content', 'osoby')
const RODZINY = () => path.join(/*turbopackIgnore: true*/ KATALOG(), '_rodziny')
const ID_RODZINY = /^r[a-z0-9-]{1,40}$/

async function zapiszAtomowo(plik: string, dane: string) {
    await fs.promises.mkdir(path.dirname(plik), { recursive: true })
    const tmp = `${plik}.${randomBytes(4).toString('hex')}.tmp`
    await fs.promises.writeFile(tmp, dane)
    await fs.promises.rename(tmp, plik)
}

async function znacznikCzasu(): Promise<string> {
    const czasy: number[] = []
    for (const p of [KATALOG(), RODZINY(), path.join(/*turbopackIgnore: true*/ KATALOG(), '_zrodla.json')]) {
        try { czasy.push((await fs.promises.stat(/*turbopackIgnore: true*/ p)).mtimeMs) } catch { czasy.push(0) }
    }
    return czasy.join('|')
}

let pamiec: { klucz: string; drzewo: Drzewo } | null = null

async function czytajKatalog<T>(kat: string, popraw: (x: T & { id: string }) => T): Promise<Map<string, T>> {
    const m = new Map<string, T>()
    let pliki: string[] = []
    try { pliki = await fs.promises.readdir(/*turbopackIgnore: true*/ kat) } catch { return m }
    await Promise.all(pliki.filter((p) => p.endsWith('.json') && !p.startsWith('_')).map(async (p) => {
        try {
            const id = p.slice(0, -5)
            const x = JSON.parse(await fs.promises.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ kat, p), 'utf8'))
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
        const z = JSON.parse(await fs.promises.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ KATALOG(), '_zrodla.json'), 'utf8')) as Zrodlo[]
        zrodla = new Map(z.map((x) => [x.id, x]))
    } catch { /* brak źródeł */ }
    const drzewo = { osoby, rodziny, zrodla }
    pamiec = { klucz, drzewo }
    return drzewo
}

export const uniewaznij = () => { pamiec = null }

export class Konflikt extends Error {}

/** P5: w trakcie operacji (np. import drzewa) albo po jej przerwaniu zapis ręczny jest wstrzymany – jak w Keystatic. */
async function sprawdzBlokade() {
    const { blokadaZapisu } = await import('../panel/operacje')
    const b = await blokadaZapisu()
    if (b) throw new Konflikt(b)
}

export async function zapiszOsobe(o: Osoba, wersjaWczytana?: number): Promise<Osoba> {
    if (!ID_OSOBY.test(o.id)) throw new Error('zły identyfikator osoby')
    await sprawdzBlokade()
    const plik = path.join(/*turbopackIgnore: true*/ KATALOG(), `${o.id}.json`)
    if (wersjaWczytana != null) {
        try {
            const ist = JSON.parse(await fs.promises.readFile(/*turbopackIgnore: true*/ plik, 'utf8')) as Osoba
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
    await sprawdzBlokade()
    const p = poprawRodzine({ ...f, wersja: (f.wersja ?? 0) + 1, zmieniono: new Date().toISOString() })
    const { id: _id, ...bezId } = p
    await zapiszAtomowo(path.join(/*turbopackIgnore: true*/ RODZINY(), `${f.id}.json`), JSON.stringify(bezId, null, 1))
    uniewaznij()
    return p
}

export async function usunRodzine(id: string) {
    if (!ID_RODZINY.test(id)) return
    const kosz = path.join(/*turbopackIgnore: true*/ KATALOG(), '_kosz')
    await fs.promises.mkdir(kosz, { recursive: true })
    await fs.promises.rename(path.join(/*turbopackIgnore: true*/ RODZINY(), `${id}.json`), path.join(/*turbopackIgnore: true*/ kosz, `rodzina-${id}-${Date.now()}.json`)).catch(() => {})
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
    const kosz = path.join(/*turbopackIgnore: true*/ KATALOG(), '_kosz')
    await fs.promises.mkdir(kosz, { recursive: true })
    await fs.promises.rename(path.join(/*turbopackIgnore: true*/ KATALOG(), `${id}.json`), path.join(/*turbopackIgnore: true*/ kosz, `${id}-${Date.now()}.json`)).catch(() => {})
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
    try { return JSON.parse(await fs.promises.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ KATALOG(), '_import.json'), 'utf8')) } catch { return null }
}

/** Identyfikatory osób dodanych w panelu (bez gedcomId) – import ich nie zastępuje (etap 1, PD-01). */
export function idOsobRecznych(d: Drzewo): Set<string> {
    return new Set([...d.osoby.values()].filter((o) => !o.gedcomId).map((o) => o.id))
}

export interface ZachowaneReczne { osoby: number; rodziny: number; rodzinyPominiete: number }

/**
 * Nowe drzewo z importu + osoby dodane w panelu (bez gedcomId) ze starego drzewa. Rodziny z panelu zostają, gdy
 * wszystkie ich osoby nadal istnieją (przy zajętym identyfikatorze dostają nowy – osoby nie odwołują się do rodzin).
 * Rodzina z GEDCOM, do której w panelu dopisano osobę, wraca w wersji z GEDCOM – osoba zostaje, bez tego powiązania.
 */
export function polaczZRecznymi(stare: Drzewo, nowe: Drzewo): { drzewo: Drzewo; zachowane: ZachowaneReczne } {
    const osoby = new Map(nowe.osoby), rodziny = new Map(nowe.rodziny)
    const zachowane: ZachowaneReczne = { osoby: 0, rodziny: 0, rodzinyPominiete: 0 }
    for (const o of stare.osoby.values()) {
        if (o.gedcomId) continue
        if (osoby.has(o.id)) throw new Error(`Import nadpisałby osobę dodaną w panelu (${o.id}) – przerwano, nic nie zapisano.`)
        osoby.set(o.id, o); zachowane.osoby++
    }
    let n = rodziny.size + 1
    for (const f of stare.rodziny.values()) {
        if (f.gedcomId) continue
        const czlonkowie = [f.maz, f.zona, ...f.dzieci].filter((x): x is string => !!x)
        if (!czlonkowie.length || !czlonkowie.every((x) => osoby.has(x))) { zachowane.rodzinyPominiete++; continue }
        let id = f.id
        if (rodziny.has(id)) { while (rodziny.has(`r${n}`)) n++; id = `r${n}` }
        rodziny.set(id, { ...f, id }); zachowane.rodziny++
    }
    return { drzewo: { osoby, rodziny, zrodla: nowe.zrodla }, zachowane }
}

/**
 * Zapis całego drzewa z importu (P5): jedna operacja z lib/panel/operacje.ts – blokada, kopia poprzednich plików
 * w content/_operacje, zapis atomowy, przy błędzie cofnięcie całości, potem „cofnij” w panelu. Osoby dodane w panelu
 * zostają (polaczZRecznymi). Dotyczy plików content/osoby/*.json (osoby, _zrodla.json, _import.json) i _rodziny/*.json;
 * inne pliki i katalogi (np. _kosz) bez zmian. Pliki identyczne z poprzednimi nie są przepisywane.
 */
export async function zapiszImport(nowe: Drzewo, slad: SladImportu, korzen = process.cwd()): Promise<ZachowaneReczne & { operacja: string | null }> {
    const { wykonajOperacje } = await import('../panel/operacje')
    uniewaznij()
    const kat = path.join(/*turbopackIgnore: true*/ korzen, 'content', 'osoby')
    const stare = korzen === process.cwd() ? await wczytajDrzewo() : await wczytajDrzewoZ(kat)
    const { drzewo: d, zachowane } = polaczZRecznymi(stare, nowe)
    const docelowe = new Map<string, string>()
    for (const o of d.osoby.values()) { const { id, ...bez } = o; docelowe.set(`osoby/${id}.json`, JSON.stringify(bez, null, 1)) }
    for (const f of d.rodziny.values()) { const { id, ...bez } = f; docelowe.set(`osoby/_rodziny/${id}.json`, JSON.stringify(bez, null, 1)) }
    docelowe.set('osoby/_zrodla.json', JSON.stringify([...d.zrodla.values()], null, 1))
    docelowe.set('osoby/_import.json', JSON.stringify(slad, null, 1))
    const obecne = new Map<string, string>()
    const czytajKat = async (k: string, rel: string, filtr: (n: string) => boolean) => {
        let n: string[] = []
        try { n = await fs.promises.readdir(/*turbopackIgnore: true*/ k) } catch { return }
        for (const x of n.filter(filtr)) {
            const p = path.join(/*turbopackIgnore: true*/ k, x)
            try { if ((await fs.promises.stat(/*turbopackIgnore: true*/ p)).isFile()) obecne.set(`${rel}/${x}`, await fs.promises.readFile(/*turbopackIgnore: true*/ p, 'utf8')) } catch { /* zniknął */ }
        }
    }
    await czytajKat(kat, 'osoby', (n) => n.endsWith('.json') && (!n.startsWith('_') || n === '_zrodla.json' || n === '_import.json'))
    await czytajKat(path.join(/*turbopackIgnore: true*/ kat, '_rodziny'), 'osoby/_rodziny', (n) => n.endsWith('.json'))
    const pliki = new Set([...obecne.keys(), ...docelowe.keys()])
    const zmiany = [...pliki].sort().map((plik) => ({ plik, poprzedni: obecne.get(plik) ?? null, wynik: docelowe.get(plik) ?? null }))
    try {
        const w = await wykonajOperacje({
            korzen, rodzaj: 'import-drzewa', zmiany,
            opis: `import drzewa z pliku ${slad.plik || '(bez nazwy)'}: ${slad.podsumowanie.osoby} osób, ${slad.podsumowanie.rodziny} rodzin`,
            szczegoly: { plik: slad.plik, ...slad.podsumowanie, zachowaneReczne: zachowane.osoby },
        })
        return { ...zachowane, operacja: w.id }
    } finally { uniewaznij() }
}

/** Odczyt drzewa z innego katalogu (testy na danych syntetycznych). */
async function wczytajDrzewoZ(kat: string): Promise<Drzewo> {
    const osoby = await czytajKatalog<Osoba>(kat, poprawOsobe)
    const rodziny = await czytajKatalog<Rodzina>(path.join(/*turbopackIgnore: true*/ kat, '_rodziny'), poprawRodzine)
    let zrodla: Zrodlo[] = []
    try { zrodla = JSON.parse(await fs.promises.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ kat, '_zrodla.json'), 'utf8')) } catch { /* brak */ }
    return { osoby, rodziny, zrodla: new Map(zrodla.map((z) => [z.id, z])) }
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
            return o ? widocznoscOsoby(o, lata.get(id)) : 'ja'
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
