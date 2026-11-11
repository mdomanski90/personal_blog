// Jedyny punkt odczytu danych archiwum. Strony korzystają tylko z tych funkcji, nigdy z Keystatic wprost –
// przy ewentualnym przejściu na Omeka S zmienia się wnętrze tego pliku, a strony zostają bez zmian.

import * as React from 'react'
import { createReader } from '@keystatic/core/reader'
import type { Node } from '@markdoc/markdoc'
import keystaticConfig from '../keystatic.config'
import { kluczSortowania } from './edtf'
import { naTekst, zajawka } from './markdoc'
import { normalizuj, porownajPl } from './tekst'

const reader = createReader(process.cwd(), keystaticConfig)

// React.cache (jeden odczyt na żądanie) działa w Next.js; w skryptach (eksport) go nie ma – wtedy bez pamięci.
const cache: <T extends (...a: never[]) => unknown>(fn: T) => T =
    (React as unknown as { cache?: <T>(fn: T) => T }).cache ?? ((fn) => fn)

export type Widocznosc = 'publiczne' | 'bliscy' | 'ja'

/** Poziom dostępu czytelnika. Etap 2: logowanie „dla bliskich”; na razie wszyscy widzą tylko publiczne. */
export async function poziomCzytelnika(): Promise<Widocznosc> {
    return 'publiczne'
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
export const RODZAJE_OBIEKTOW: Record<string, string> = {
    'cerkiew-unicka': 'cerkiew unicka', 'cerkiew-prawoslawna': 'cerkiew prawosławna', kosciol: 'kościół katolicki', boznica: 'bóżnica',
}
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

export async function opowiesci(poziom: Widocznosc): Promise<Opowiesc[]> {
    return (await wszystkieOpowiesciSurowe()).filter((o) => widoczne(o.widocznosc, poziom))
}

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

// ---------- wyszukiwarka ----------

export interface Wynik {
    rodzaj: 'miejsce' | 'obiekt' | 'temat' | 'wpis'
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
    const fraza = normalizuj(zapytanie)
    if (fraza.length < 2) return []
    const wyniki: (Wynik & { waga: number })[] = []
    const ocen = (nazwy: string[], tekst: string) => {
        if (nazwy.some((n) => normalizuj(n) === fraza)) return 3
        if (nazwy.some((n) => normalizuj(n).includes(fraza))) return 2
        if (normalizuj(tekst).includes(fraza)) return 1
        return 0
    }
    for (const m of await miejsca(poziom)) {
        const tekst = naTekst(m.opis)
        const waga = ocen([m.nazwa, ...m.inneNazwy], tekst)
        if (waga) wyniki.push({ rodzaj: 'miejsce', id: m.id, tytul: m.nazwa, adres: `/miejsca/${m.id}`, fragment: waga === 1 ? fragmentWokol(tekst, fraza) : m.inneNazwy.join(', '), waga })
    }
    for (const o of await obiekty(poziom)) {
        const tekst = naTekst(o.opis)
        const waga = ocen([o.nazwa, ...o.inneNazwy], tekst)
        if (waga) wyniki.push({ rodzaj: 'obiekt', id: o.id, tytul: o.nazwa, adres: `/obiekty/${o.id}`, fragment: waga === 1 ? fragmentWokol(tekst, fraza) : RODZAJE_OBIEKTOW[o.rodzaj] ?? o.rodzaj, waga })
    }
    for (const t of await tematy(poziom)) {
        const tekst = naTekst(t.opis)
        const waga = ocen([t.nazwa, ...t.inneNazwy], tekst)
        if (waga) wyniki.push({ rodzaj: 'temat', id: t.id, tytul: t.nazwa, adres: `/tematy/${t.id}`, fragment: waga === 1 ? fragmentWokol(tekst, fraza) : t.inneNazwy.join(', '), waga })
    }
    for (const o of await opowiesci(poziom)) {
        const tekst = naTekst(o.tresc)
        const waga = ocen([o.tytul], tekst)
        if (waga) wyniki.push({ rodzaj: 'wpis', id: o.id, tytul: o.tytul, adres: `/wpisy/${o.id}`, fragment: waga === 1 ? fragmentWokol(tekst, fraza) : o.zajawka, waga })
    }
    return wyniki.sort((a, b) => b.waga - a.waga || porownajPl(a.tytul, b.tytul))
}

// ---------- surowe dane dla eksportu i sprawdzania spójności (bez filtra) ----------

export const dlaEksportu = {
    miejsca: wszystkieMiejscaSurowe,
    obiekty: wszystkieObiektySurowe,
    tematy: wszystkieTematySurowe,
    opowiesci: wszystkieOpowiesciSurowe,
}
