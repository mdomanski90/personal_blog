// Jedyny punkt odczytu danych archiwum. Strony korzystają tylko z tych funkcji, nigdy z Keystatic wprost –
// przy ewentualnym przejściu na Omeka S zmienia się wnętrze tego pliku, a strony zostają bez zmian.

import * as React from 'react'
import { createReader } from '@keystatic/core/reader'
import type { Node } from '@markdoc/markdoc'
import keystaticConfig from '../keystatic.config'
import { kluczSortowania } from './edtf'
import { naTekst, zajawka, type KontekstTresci, type MaterialWstawki } from './markdoc'
import { RODZAJE_MATERIALOW } from './materialy'
import { zakresIso } from './edtf'
import { bezNawiasow, fragment, ODNOSNIK, slownikOdnosnikow, wzorzecWzmianek, znajdzWzmianki, type Cel, type Fragment, type PozycjaSieci, type RodzajCelu, type Rozwiaz } from './odnosniki'
import { normalizuj, porownajPl } from './tekst'

const reader = createReader(process.cwd(), keystaticConfig)

// React.cache (jeden odczyt na żądanie) działa w Next.js; w skryptach (eksport) go nie ma – wtedy bez pamięci.
const cache: <T extends (...a: never[]) => unknown>(fn: T) => T =
    (React as unknown as { cache?: <T>(fn: T) => T }).cache ?? ((fn) => fn)

export type Widocznosc = 'publiczne' | 'bliscy' | 'ja'

/**
 * Poziom dostępu czytelnika: „bliscy” po zalogowaniu wspólnym hasłem (lib/sesja), inaczej „publiczne”.
 * „Tylko ja” widać wyłącznie w panelu.
 */
export async function poziomCzytelnika(): Promise<Widocznosc> {
    try {
        const { cookies } = await import('next/headers')
        const { CIASTECZKO, sesjaWazna } = await import('./sesja')
        return sesjaWazna((await cookies()).get(CIASTECZKO)?.value) ? 'bliscy' : 'publiczne'
    } catch {
        // poza żądaniem (skrypty) – tylko publiczne
        return 'publiczne'
    }
}

export function widoczne(w: Widocznosc | string | null | undefined, poziom: Widocznosc): boolean {
    const v = (w || 'publiczne') as Widocznosc
    if (v === 'publiczne') return true
    if (v === 'bliscy') return poziom === 'bliscy' || poziom === 'ja'
    return poziom === 'ja'
}

export interface Miejsce {
    id: string
    nazwa: string
    inneNazwy: string[]
    /** formy odmiany – tylko do wyszukiwania i wzmianek, nie do wyświetlania */
    formy: string[]
    rodzaj: string
    wspolrzedne: [number, number] | null
    przyblizone: boolean
    /** wyznanie mieszkańców przed 1875: '' | unicka | katolicka | mieszana | prawoslawna */
    wyznanie: string
    nalezyDo: string | null
    sameAs: string | null
    widocznosc: Widocznosc
    dodano: string | null
    opis: Node | null
}

export interface Temat {
    id: string
    nazwa: string
    inneNazwy: string[]
    formy: string[]
    rodzaj: string
    czas: string
    miejsca: string[]
    widocznosc: Widocznosc
    dodano: string | null
    opis: Node | null
}

export interface Opowiesc {
    id: string
    tytul: string
    data: string | null
    rodzaj: string
    miejsca: string[]
    tematy: string[]
    widocznosc: Widocznosc
    tresc: Node | null
    zajawka: string
}

export const RODZAJE_MIEJSC: Record<string, string> = {
    wies: 'wieś', miasto: 'miasto', kraina: 'kraina', gmina: 'gmina', parafia: 'parafia', cmentarz: 'cmentarz', folwark: 'folwark', inne: 'inne',
}
/** Rodzaje miejsc, które są obszarami (dzielą spis), a nie punktami na mapie. */
export const OBSZARY = ['kraina', 'gmina']
export { NAZWY_OBIEKTOW as RODZAJE_OBIEKTOW } from './tarcze'
import { NAZWY_OBIEKTOW } from './tarcze'
export const WYZNANIA_MIEJSC: Record<string, string> = {
    unicka: 'unickie', katolicka: 'katolickie', mieszana: 'mieszane (unici i katolicy)', prawoslawna: 'prawosławne',
}

export interface Obiekt {
    id: string
    nazwa: string
    inneNazwy: string[]
    rodzaj: string
    miejsce: string | null
    wspolrzedne: [number, number] | null
    przyblizone: boolean
    czas: string
    istnieje: boolean
    widocznosc: Widocznosc
    dodano: string | null
    opis: Node | null
}
export { RODZAJE_MATERIALOW }

export interface Material {
    id: string
    nazwa: string
    rodzaj: string
    /** adres pliku: /pliki/<id>/file.<roz> (plik leży w pliki-archiwum/) */
    plik: string | null
    czas: string
    tworca: string
    /** kto udostępnił materiał (dcterms:provenance) */
    przekazal: string
    /** kto opracował opis, transkrypcję, tłumaczenie (dcterms:contributor) */
    opracowal: string
    pochodzenie: string
    sygnatura: string
    prawa: string
    jezyk: string
    miejsca: string[]
    tematy: string[]
    obiekty: string[]
    widocznosc: Widocznosc
    dodano: string | null
    opis: Node | null
}

export const RODZAJE_TEMATOW: Record<string, string> = {
    zjawisko: 'zjawisko', wydarzenie: 'wydarzenie', instytucja: 'instytucja',
}
export const RODZAJE_OPOWIESCI: Record<string, string> = {
    'o-zrodle': 'o źródle', esej: 'esej',
}

export function parsujWspolrzedne(s: string | null | undefined): [number, number] | null {
    const m = /^\s*(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(s ?? '')
    if (!m) return null
    return [Number(m[1]), Number(m[2])]
}

// ---------- surowy odczyt (bez filtra widoczności), raz na żądanie ----------

const wszystkieMiejscaSurowe = cache(async (): Promise<Miejsce[]> => {
    const wpisy = await reader.collections.miejsca.all({ resolveLinkedFiles: true })
    return wpisy
        .map(({ slug, entry }) => ({
            id: slug,
            nazwa: entry.title,
            inneNazwy: [...entry.alternative].filter(Boolean),
            formy: [...entry.inflections].filter(Boolean),
            rodzaj: entry.type,
            wspolrzedne: parsujWspolrzedne(entry.coordinates),
            przyblizone: entry.approximate,
            wyznanie: entry.religion ?? '',
            nalezyDo: entry.isPartOf,
            sameAs: entry.sameAs,
            widocznosc: entry.visibility as Widocznosc,
            dodano: entry.dateSubmitted,
            opis: entry.description?.node ?? null,
        }))
        .sort((a, b) => porownajPl(a.nazwa, b.nazwa))
})

const wszystkieTematySurowe = cache(async (): Promise<Temat[]> => {
    const wpisy = await reader.collections.tematy.all({ resolveLinkedFiles: true })
    return wpisy
        .map(({ slug, entry }) => ({
            id: slug,
            nazwa: entry.title,
            inneNazwy: [...entry.alternative].filter(Boolean),
            formy: [...entry.inflections].filter(Boolean),
            rodzaj: entry.type,
            czas: entry.temporal,
            miejsca: [...entry.spatial],
            widocznosc: entry.visibility as Widocznosc,
            dodano: entry.dateSubmitted,
            opis: entry.description?.node ?? null,
        }))
        .sort((a, b) => porownajPl(a.nazwa, b.nazwa))
})

const wszystkieObiektySurowe = cache(async (): Promise<Obiekt[]> => {
    const wpisy = await reader.collections.obiekty.all({ resolveLinkedFiles: true })
    return wpisy
        .map(({ slug, entry }) => ({
            id: slug,
            nazwa: entry.title,
            inneNazwy: [...entry.alternative].filter(Boolean),
            rodzaj: entry.type,
            miejsce: entry.spatial,
            wspolrzedne: parsujWspolrzedne(entry.coordinates),
            przyblizone: entry.approximate,
            czas: entry.temporal,
            istnieje: entry.exists,
            widocznosc: entry.visibility as Widocznosc,
            dodano: entry.dateSubmitted,
            opis: entry.description?.node ?? null,
        }))
        .sort((a, b) => porownajPl(a.nazwa, b.nazwa))
})

const wszystkieMaterialySurowe = cache(async (): Promise<Material[]> => {
    const wpisy = await reader.collections.materialy.all({ resolveLinkedFiles: true })
    return wpisy
        .map(({ slug, entry }) => ({
            id: slug,
            nazwa: entry.title,
            rodzaj: entry.type,
            plik: typeof entry.file === 'string' && entry.file ? entry.file : null,
            czas: entry.temporal,
            tworca: entry.creator,
            przekazal: entry.provenance ?? '',
            opracowal: entry.contributor ?? '',
            pochodzenie: entry.source,
            sygnatura: entry.identifier,
            prawa: entry.rights,
            jezyk: entry.language,
            miejsca: [...entry.spatial].filter(Boolean) as string[],
            tematy: [...entry.subject].filter(Boolean) as string[],
            obiekty: [...entry.relation].filter(Boolean) as string[],
            widocznosc: entry.visibility as Widocznosc,
            dodano: entry.dateSubmitted,
            opis: entry.description?.node ?? null,
        }))
        .sort((a, b) => kluczSortowania(a.czas) - kluczSortowania(b.czas) || porownajPl(a.nazwa, b.nazwa))
})

const wszystkieOpowiesciSurowe = cache(async (): Promise<Opowiesc[]> => {
    const wpisy = await reader.collections.posts.all({ resolveLinkedFiles: true })
    return wpisy
        .map(({ slug, entry }) => {
            const tresc = entry.content?.node ?? null
            return {
                id: slug,
                tytul: entry.title,
                data: entry.date,
                rodzaj: entry.kind,
                miejsca: [...entry.spatial],
                tematy: [...entry.subject],
                widocznosc: entry.visibility as Widocznosc,
                tresc,
                zajawka: zajawka(tresc),
            }
        })
        .sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''))
})

// ---------- funkcje dla stron (z filtrem widoczności) ----------

export async function miejsca(poziom: Widocznosc): Promise<Miejsce[]> {
    return (await wszystkieMiejscaSurowe()).filter((m) => widoczne(m.widocznosc, poziom))
}

export async function miejsce(id: string, poziom: Widocznosc): Promise<Miejsce | null> {
    return (await miejsca(poziom)).find((m) => m.id === id) ?? null
}

export async function obiekty(poziom: Widocznosc): Promise<Obiekt[]> {
    return (await wszystkieObiektySurowe()).filter((o) => widoczne(o.widocznosc, poziom))
}

export async function obiekt(id: string, poziom: Widocznosc): Promise<Obiekt | null> {
    return (await obiekty(poziom)).find((o) => o.id === id) ?? null
}

export async function obiektyDlaMiejsca(id: string, poziom: Widocznosc): Promise<Obiekt[]> {
    return (await obiekty(poziom)).filter((o) => o.miejsce === id)
}

export async function materialy(poziom: Widocznosc): Promise<Material[]> {
    return (await wszystkieMaterialySurowe()).filter((m) => widoczne(m.widocznosc, poziom))
}

export async function material(id: string, poziom: Widocznosc): Promise<Material | null> {
    return (await materialy(poziom)).find((m) => m.id === id) ?? null
}

/** Materiały powiązane w panelu z miejscem, tematem albo obiektem. */
export async function materialyDla(rodzaj: 'miejsce' | 'temat' | 'obiekt', id: string, poziom: Widocznosc): Promise<Material[]> {
    const pole = rodzaj === 'miejsce' ? 'miejsca' : rodzaj === 'temat' ? 'tematy' : 'obiekty'
    return (await materialy(poziom)).filter((m) => m[pole].includes(id))
}

/** Lata (od, do) materiału – do filtra okresu; null, gdy bez daty. */
export function lataMaterialu(m: Material): [number, number] | null {
    const z = zakresIso(m.czas)
    const rok = (s: string | null | undefined) => (s ? parseInt(s, 10) : NaN)
    const od = rok(z?.od), dok = rok(z?.do)
    if (Number.isNaN(od) && Number.isNaN(dok)) return null
    return [Number.isNaN(od) ? dok : od, Number.isNaN(dok) ? od : dok]
}

export interface FiltrArchiwum {
    rodzaj?: string
    miejsce?: string
    temat?: string
    od?: number
    do?: number
}

export async function archiwum(poziom: Widocznosc, f: FiltrArchiwum): Promise<Material[]> {
    return (await materialy(poziom)).filter((m) => {
        if (f.rodzaj && m.rodzaj !== f.rodzaj) return false
        if (f.miejsce && !m.miejsca.includes(f.miejsce)) return false
        if (f.temat && !m.tematy.includes(f.temat)) return false
        if (f.od !== undefined || f.do !== undefined) {
            const l = lataMaterialu(m)
            if (!l) return false
            if (f.od !== undefined && l[1] < f.od) return false
            if (f.do !== undefined && l[0] > f.do) return false
        }
        return true
    })
}

export interface GrupaMiejsc {
    obszar: Miejsce | null
    miejsca: Miejsce[]
    podgrupy: { obszar: Miejsce; miejsca: Miejsce[] }[]
}

/**
 * Spis miejscowości podzielony według „należy do”: kraina → (gmina →) miejscowość.
 * Miejscowości bez krainy trafiają do grupy „inne” (obszar: null, na końcu).
 */
export async function miejscaWedlugObszarow(poziom: Widocznosc): Promise<GrupaMiejsc[]> {
    const lista = await miejsca(poziom)
    const po = new Map(lista.map((m) => [m.id, m]))
    const krainaDla = (m: Miejsce): Miejsce | null => {
        let biezace: Miejsce | undefined = m
        const odwiedzone = new Set<string>()
        while (biezace?.nalezyDo && !odwiedzone.has(biezace.id)) {
            odwiedzone.add(biezace.id)
            biezace = po.get(biezace.nalezyDo)
            if (biezace?.rodzaj === 'kraina') return biezace
        }
        return null
    }
    // najbliższa gmina w górę łańcucha „należy do” (np. przysiółek → wieś → gmina)
    const gminaDla = (m: Miejsce): Miejsce | null => {
        let biezace: Miejsce | undefined = m
        const odwiedzone = new Set<string>()
        while (biezace?.nalezyDo && !odwiedzone.has(biezace.id)) {
            odwiedzone.add(biezace.id)
            biezace = po.get(biezace.nalezyDo)
            if (biezace?.rodzaj === 'gmina') return biezace
            if (biezace?.rodzaj === 'kraina') return null
        }
        return null
    }
    const grupy = new Map<string, GrupaMiejsc>()
    const inne: GrupaMiejsc = { obszar: null, miejsca: [], podgrupy: [] }
    for (const k of lista.filter((m) => m.rodzaj === 'kraina')) grupy.set(k.id, { obszar: k, miejsca: [], podgrupy: [] })
    for (const m of lista) {
        if (OBSZARY.includes(m.rodzaj)) continue
        const kraina = krainaDla(m)
        const grupa = kraina ? grupy.get(kraina.id)! : inne
        const rodzic = gminaDla(m)
        if (rodzic) {
            let pg = grupa.podgrupy.find((p) => p.obszar.id === rodzic.id)
            if (!pg) grupa.podgrupy.push((pg = { obszar: rodzic, miejsca: [] }))
            pg.miejsca.push(m)
        } else grupa.miejsca.push(m)
    }
    const wynik = [...grupy.values()].filter((g) => g.miejsca.length || g.podgrupy.length)
    for (const g of wynik) g.podgrupy.sort((a, b) => porownajPl(a.obszar.nazwa, b.obszar.nazwa))
    if (inne.miejsca.length || inne.podgrupy.length) wynik.push(inne)
    return wynik
}

export async function tematy(poziom: Widocznosc): Promise<Temat[]> {
    return (await wszystkieTematySurowe()).filter((t) => widoczne(t.widocznosc, poziom))
}

export async function temat(id: string, poziom: Widocznosc): Promise<Temat | null> {
    return (await tematy(poziom)).find((t) => t.id === id) ?? null
}

/** Tematy z datą, od najstarszych – oś czasu. */
export async function osCzasu(poziom: Widocznosc): Promise<Temat[]> {
    return (await tematy(poziom))
        .filter((t) => t.czas)
        .sort((a, b) => kluczSortowania(a.czas) - kluczSortowania(b.czas))
}

export const opowiesci = cache(async (poziom: Widocznosc): Promise<Opowiesc[]> => {
    // zajawka z nazwami zamiast identyfikatorów w [[…]] (tylko pozycje widoczne dla czytelnika)
    const rozwiaz = slownikOdnosnikow([
        ...(await miejsca(poziom)).map((m) => ({ cel: { rodzaj: 'miejsce' as const, id: m.id, nazwa: m.nazwa, adres: '' }, nazwy: [] })),
        ...(await tematy(poziom)).map((t) => ({ cel: { rodzaj: 'temat' as const, id: t.id, nazwa: t.nazwa, adres: '' }, nazwy: [] })),
        ...(await obiekty(poziom)).map((o) => ({ cel: { rodzaj: 'obiekt' as const, id: o.id, nazwa: o.nazwa, adres: '' }, nazwy: [] })),
    ])
    return (await wszystkieOpowiesciSurowe())
        .filter((o) => widoczne(o.widocznosc, poziom))
        .map((o) => ({ ...o, zajawka: zajawka(o.tresc, 220, rozwiaz) }))
})

export async function opowiesc(id: string, poziom: Widocznosc): Promise<Opowiesc | null> {
    return (await opowiesci(poziom)).find((o) => o.id === id) ?? null
}

export async function opowiesciDlaMiejsca(id: string, poziom: Widocznosc): Promise<Opowiesc[]> {
    return (await opowiesci(poziom)).filter((o) => o.miejsca.includes(id))
}

export async function opowiesciDlaTematu(id: string, poziom: Widocznosc): Promise<Opowiesc[]> {
    return (await opowiesci(poziom)).filter((o) => o.tematy.includes(id))
}

export async function tematyDlaMiejsca(id: string, poziom: Widocznosc): Promise<Temat[]> {
    return (await tematy(poziom))
        .filter((t) => t.miejsca.includes(id))
        .sort((a, b) => kluczSortowania(a.czas) - kluczSortowania(b.czas))
}

/** Słownik id → nazwa, tylko dla pozycji widocznych (odnośnik do niewidocznej nie powstaje). */
export async function nazwy(poziom: Widocznosc): Promise<{ miejsca: Map<string, string>; tematy: Map<string, string> }> {
    return {
        miejsca: new Map((await miejsca(poziom)).map((m) => [m.id, m.nazwa])),
        tematy: new Map((await tematy(poziom)).map((t) => [t.id, t.nazwa])),
    }
}

/** Liczby powiązań dla spisu miejsc. */
export async function licznikiMiejsc(poziom: Widocznosc): Promise<Map<string, { opowiesci: number; tematy: number }>> {
    const wynik = new Map<string, { opowiesci: number; tematy: number }>()
    const dodaj = (id: string, klucz: 'opowiesci' | 'tematy') => {
        const w = wynik.get(id) ?? { opowiesci: 0, tematy: 0 }
        w[klucz]++
        wynik.set(id, w)
    }
    for (const o of await opowiesci(poziom)) o.miejsca.forEach((id) => dodaj(id, 'opowiesci'))
    for (const t of await tematy(poziom)) t.miejsca.forEach((id) => dodaj(id, 'tematy'))
    return wynik
}

/** Treść strony „o projekcie” (singleton w panelu). */
export async function oProjekcie(): Promise<Node | null> {
    const s = await reader.singletons.oProjekcie.read({ resolveLinkedFiles: true })
    return s?.content?.node ?? null
}

// ---------- sieć powiązań: odnośniki [[…]] i wzmianki (jak w Logseq) ----------

const pozycjeSieci = cache(async (poziom: Widocznosc): Promise<PozycjaSieci[]> => [
    ...(await miejsca(poziom)).map((m) => ({ cel: { rodzaj: 'miejsce' as const, id: m.id, nazwa: m.nazwa, adres: `/miejsca/${m.id}` }, nazwy: [m.nazwa, ...m.inneNazwy, ...m.formy] })),
    ...(await tematy(poziom)).map((t) => ({ cel: { rodzaj: 'temat' as const, id: t.id, nazwa: t.nazwa, adres: `/tematy/${t.id}` }, nazwy: [t.nazwa, ...t.inneNazwy, ...t.formy] })),
    ...(await obiekty(poziom)).map((o) => ({ cel: { rodzaj: 'obiekt' as const, id: o.id, nazwa: o.nazwa, adres: `/obiekty/${o.id}` }, nazwy: [o.nazwa, ...o.inneNazwy] })),
    ...(await opowiesci(poziom)).map((o) => ({ cel: { rodzaj: 'wpis' as const, id: o.id, nazwa: o.tytul, adres: `/wpisy/${o.id}` }, nazwy: [o.tytul] })),
    ...(await materialy(poziom)).map((m) => ({ cel: { rodzaj: 'material' as const, id: m.id, nazwa: m.nazwa, adres: `/archiwum/${m.id}` }, nazwy: [m.nazwa] })),
])

/** Zamiana [[…]] na cele – tylko pozycje widoczne dla czytelnika. Do naHtml(treść, rozwiaz). */
export const rozwiazOdnosniki = cache(async (poziom: Widocznosc): Promise<Rozwiaz> => slownikOdnosnikow(await pozycjeSieci(poziom)))

/** Wszystko, czego treść potrzebuje przy renderowaniu: odnośniki [[…]] i wstawione materiały. */
export const kontekstTresci = cache(async (poziom: Widocznosc): Promise<KontekstTresci> => {
    const mat = new Map<string, MaterialWstawki>((await materialy(poziom)).map((m) => [m.id, { id: m.id, nazwa: m.nazwa, rodzaj: m.rodzaj, plik: m.plik }]))
    return { rozwiaz: await rozwiazOdnosniki(poziom), material: (id) => mat.get(id) ?? null }
})

const kluczCelu = (c: { rodzaj: string; id: string }) => `${c.rodzaj}:${c.id}`

export interface TekstSieci {
    zrodlo: Cel
    tekst: string
    /** plik w content/ (do skryptu łączącego wzmianki) */
    plik: string
    /** pozycje już powiązane polami w panelu („miejsca”, „tematy”, „należy do”…) */
    zwiazane: Set<string>
}

/** Pozycje sieci i teksty, w których szukamy odnośników i wzmianek (opisy miejsc, tematów, obiektów i wpisy). */
export async function daneSieci(poziom: Widocznosc): Promise<{ pozycje: PozycjaSieci[]; teksty: TekstSieci[] }> {
    const pozycje = await pozycjeSieci(poziom)
    const cel = new Map(pozycje.map((p) => [kluczCelu(p.cel), p.cel]))
    const teksty: TekstSieci[] = []
    const dodaj = (rodzaj: RodzajCelu, id: string, katalog: string, node: Node | null, zwiazane: string[]) => {
        const c = cel.get(`${rodzaj}:${id}`)
        const tekst = naTekst(node)
        if (c && tekst) teksty.push({ zrodlo: c, tekst, plik: `content/${katalog}/${id}.mdoc`, zwiazane: new Set(zwiazane) })
    }
    for (const m of await miejsca(poziom)) dodaj('miejsce', m.id, 'miejsca', m.opis, m.nalezyDo ? [`miejsce:${m.nalezyDo}`] : [])
    for (const t of await tematy(poziom)) dodaj('temat', t.id, 'tematy', t.opis, t.miejsca.map((id) => `miejsce:${id}`))
    for (const o of await obiekty(poziom)) dodaj('obiekt', o.id, 'obiekty', o.opis, o.miejsce ? [`miejsce:${o.miejsce}`] : [])
    for (const o of await opowiesci(poziom)) dodaj('wpis', o.id, 'posts', o.tresc, [...o.miejsca.map((id) => `miejsce:${id}`), ...o.tematy.map((id) => `temat:${id}`)])
    for (const m of await materialy(poziom)) dodaj('material', m.id, 'materialy', m.opis, [...m.miejsca.map((id) => `miejsce:${id}`), ...m.tematy.map((id) => `temat:${id}`), ...m.obiekty.map((id) => `obiekt:${id}`)])
    return { pozycje, teksty }
}

export interface ZrodloPowiazania {
    zrodlo: Cel
    fragmenty: Fragment[]
    /** ile razy w sumie (fragmentów pokazujemy najwyżej 3) */
    ile: number
}

export interface Powiazania {
    /** teksty z odnośnikiem [[…]] do tej pozycji */
    odnosniki: ZrodloPowiazania[]
    /** teksty, w których nazwa (albo jej forma) pada bez odnośnika i bez powiązania w panelu */
    wzmianki: ZrodloPowiazania[]
}

const MAKS_FRAGMENTOW = 3

const indeksPowiazan = cache(async (poziom: Widocznosc): Promise<Map<string, Powiazania>> => {
    const { pozycje, teksty } = await daneSieci(poziom)
    const rozwiaz = slownikOdnosnikow(pozycje)
    const indeks = new Map<string, Powiazania>()
    const dodaj = (rodzaj: keyof Powiazania, cel: string, zrodlo: Cel, f: Fragment) => {
        const p = indeks.get(cel) ?? { odnosniki: [], wzmianki: [] }
        indeks.set(cel, p)
        let z = p[rodzaj].find((x) => kluczCelu(x.zrodlo) === kluczCelu(zrodlo))
        if (!z) p[rodzaj].push((z = { zrodlo, fragmenty: [], ile: 0 }))
        z.ile++
        if (z.fragmenty.length < MAKS_FRAGMENTOW) z.fragmenty.push(f)
    }
    const wzorce = pozycje.filter((p) => p.cel.rodzaj !== 'wpis' && p.cel.rodzaj !== 'material').map((p) => ({ klucz: kluczCelu(p.cel), wzorzec: wzorzecWzmianek(p.nazwy, p.cel.rodzaj === 'temat') }))
    for (const t of teksty) {
        const wlasny = kluczCelu(t.zrodlo)
        const linie = t.tekst.split('\n')
        const polaczone = new Set<string>()
        for (const linia of linie) {
            for (const m of linia.matchAll(ODNOSNIK)) {
                const c = rozwiaz(m[1])
                if (!c || kluczCelu(c) === wlasny) continue
                polaczone.add(kluczCelu(c))
                dodaj('odnosniki', kluczCelu(c), t.zrodlo, fragment(linia, m.index!, m.index! + m[0].length, rozwiaz))
            }
        }
        for (const { klucz, wzorzec } of wzorce) {
            if (klucz === wlasny || polaczone.has(klucz) || t.zwiazane.has(klucz)) continue
            for (const linia of linie) {
                for (const tr of znajdzWzmianki(linia, wzorzec)) dodaj('wzmianki', klucz, t.zrodlo, fragment(linia, tr.start, tr.koniec, rozwiaz))
            }
        }
    }
    // najpierw wpisy, potem reszta; w grupie alfabetycznie
    const kolejnosc = (z: ZrodloPowiazania) => (z.zrodlo.rodzaj === 'wpis' ? 0 : z.zrodlo.rodzaj === 'material' ? 1 : 2)
    for (const p of indeks.values()) {
        for (const lista of [p.odnosniki, p.wzmianki]) lista.sort((a, b) => kolejnosc(a) - kolejnosc(b) || porownajPl(a.zrodlo.nazwa, b.zrodlo.nazwa))
    }
    return indeks
})

/** Odnośniki zwrotne i wzmianki dla strony miejsca, tematu, obiektu albo wpisu. */
export async function powiazania(rodzaj: RodzajCelu, id: string, poziom: Widocznosc): Promise<Powiazania> {
    return (await indeksPowiazan(poziom)).get(`${rodzaj}:${id}`) ?? { odnosniki: [], wzmianki: [] }
}

// ---------- wyszukiwarka ----------

export interface Wynik {
    rodzaj: 'miejsce' | 'obiekt' | 'temat' | 'wpis' | 'materiał'
    id: string
    tytul: string
    adres: string
    fragment: string
}

function fragmentWokol(tekst: string, fraza: string): string {
    const norm = normalizuj(tekst)
    const i = norm.indexOf(fraza)
    if (i < 0) return tekst.slice(0, 160)
    // normalizuj nie zmienia długości liter, ale skleja odstępy – szukamy przybliżonego miejsca w oryginale
    const proporcja = tekst.length / Math.max(norm.length, 1)
    const start = Math.max(0, Math.floor(i * proporcja) - 60)
    return (start > 0 ? '…' : '') + tekst.slice(start, start + 180).trim() + '…'
}

export async function szukaj(zapytanie: string, poziom: Widocznosc): Promise<Wynik[]> {
    // „w Korczówce”, „z Olszanki” – przyimek pomijamy, formy odmiany są przy nazwach
    const fraza = normalizuj(zapytanie).replace(/^(w|we|z|ze|do|na|od|po|pod|przy|nad|ku|koło|kolo)\s+(?=\S)/, '')
    if (fraza.length < 2) return []
    const wyniki: (Wynik & { waga: number })[] = []
    const ocen = (nazwy: string[], tekst: string) => {
        if (nazwy.some((n) => normalizuj(n) === fraza)) return 3
        if (nazwy.some((n) => normalizuj(n).includes(fraza))) return 2
        if (normalizuj(tekst).includes(fraza)) return 1
        return 0
    }
    for (const m of await miejsca(poziom)) {
        const tekst = bezNawiasow(naTekst(m.opis))
        const waga = ocen([m.nazwa, ...m.inneNazwy, ...m.formy], tekst)
        if (waga) wyniki.push({ rodzaj: 'miejsce', id: m.id, tytul: m.nazwa, adres: `/miejsca/${m.id}`, fragment: waga === 1 ? fragmentWokol(tekst, fraza) : m.inneNazwy.join(', '), waga })
    }
    for (const o of await obiekty(poziom)) {
        const tekst = bezNawiasow(naTekst(o.opis))
        const waga = ocen([o.nazwa, ...o.inneNazwy], tekst)
        if (waga) wyniki.push({ rodzaj: 'obiekt', id: o.id, tytul: o.nazwa, adres: `/obiekty/${o.id}`, fragment: waga === 1 ? fragmentWokol(tekst, fraza) : NAZWY_OBIEKTOW[o.rodzaj] ?? o.rodzaj, waga })
    }
    for (const t of await tematy(poziom)) {
        const tekst = bezNawiasow(naTekst(t.opis))
        const waga = ocen([t.nazwa, ...t.inneNazwy, ...t.formy], tekst)
        if (waga) wyniki.push({ rodzaj: 'temat', id: t.id, tytul: t.nazwa, adres: `/tematy/${t.id}`, fragment: waga === 1 ? fragmentWokol(tekst, fraza) : t.inneNazwy.join(', '), waga })
    }
    for (const o of await opowiesci(poziom)) {
        const tekst = bezNawiasow(naTekst(o.tresc))
        const waga = ocen([o.tytul], tekst)
        if (waga) wyniki.push({ rodzaj: 'wpis', id: o.id, tytul: o.tytul, adres: `/wpisy/${o.id}`, fragment: waga === 1 ? fragmentWokol(tekst, fraza) : o.zajawka, waga })
    }
    for (const m of await materialy(poziom)) {
        const tekst = bezNawiasow(naTekst(m.opis))
        const waga = ocen([m.nazwa, m.sygnatura], tekst)
        if (waga) wyniki.push({ rodzaj: 'materiał', id: m.id, tytul: m.nazwa, adres: `/archiwum/${m.id}`, fragment: waga === 1 ? fragmentWokol(tekst, fraza) : RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj, waga })
    }
    return wyniki.sort((a, b) => b.waga - a.waga || porownajPl(a.tytul, b.tytul))
}

// ---------- surowe dane dla eksportu i sprawdzania spójności (bez filtra) ----------

export const dlaEksportu = {
    miejsca: wszystkieMiejscaSurowe,
    obiekty: wszystkieObiektySurowe,
    tematy: wszystkieTematySurowe,
    opowiesci: wszystkieOpowiesciSurowe,
    materialy: wszystkieMaterialySurowe,
}
