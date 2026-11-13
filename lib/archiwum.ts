// Jedyny punkt odczytu danych archiwum. Strony korzystają tylko z tych funkcji, nigdy z Keystatic wprost –
// przy ewentualnym przejściu na Omeka S zmienia się wnętrze tego pliku, a strony zostają bez zmian.

import * as React from 'react'
import { createReader } from '@keystatic/core/reader'
import type { Node } from '@markdoc/markdoc'
import keystaticConfig, { WSTEP_DOMYSLNY } from '../keystatic.config'
import { kluczSortowania } from './edtf'
import { naTekst, zajawka, type KontekstTresci, type MaterialWstawki } from './markdoc'
import { RODZAJE_MATERIALOW } from './materialy'
import { formatujEdtf, zakresIso } from './edtf'
import { bezNawiasow, fragment, ODNOSNIK, slownikOdnosnikow, wzorzecWzmianek, znajdzWzmianki, type Cel, type Fragment, type PozycjaSieci, type RodzajCelu, type Rozwiaz } from './odnosniki'
import { normalizuj, porownajPl } from './tekst'
import { pasuje, pozycjaTrafienia, przygotujZapytanie, type Zapytanie } from './szukanie'
import { adresStrony, stronyMaterialu } from './strony-materialow'
import { JEZYKI, objasnieniaMaterialu, wKolejnosci } from './objasnienia'
import type { ObjasnienieWidoku } from './objasnienia-widok'
import { typPliku } from './pliki'

import { zakresyLat, nakladaSie, scalZakresy, zakresyTekst, KOLEJNOSC_KSIAG } from './ksiegi'

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
    /** wyznania mieszkańców przed 1875 (pierwsze = przeważające, chyba że wyznaniaRowne) */
    wyznania: string[]
    wyznaniaRowne: boolean
    nalezyDo: string | null
    /** parafie (okręgi bóżnicze, USC), do których należała wieś, z latami */
    parafie: { parafia: string; od: number | null; do: number | null }[]
    sameAs: string | null
    widocznosc: Widocznosc
    dodano: string | null
    /** skąd pochodzi opis (np. Wikipedia, CC BY-SA) */
    zrodloOpisu: string
    opis: Node | null
}

export interface Parafia {
    id: string
    nazwa: string
    wyznanie: string
    siedziba: string | null
    czas: string
    diecezja: string
    sameAs: string | null
    opis: string
}

export interface Ksiega {
    id: string
    nazwa: string
    parafia: string
    /** rodzaje aktów w księdze (np. małżeństwa i zgony razem); pierwszy decyduje o kolejności */
    rodzaje: string[]
    lata: string
    zakresy: [number, number][]
    /** wsie, których dotyczą akty; puste = cała parafia */
    miejsca: string[]
    /** osobne tomy zespołu (np. rok po roku) */
    jednostki: { lata: string; zakresy: [number, number][]; sygnatura: string; skany: string | null; uwagi: string }[]
    braki: string
    jezyk: string
    gdzie: string
    sygnatura: string
    dostep: string
    skany: string | null
    indeks: string | null
    widocznosc: Widocznosc
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
    /** dzień, którego dotyczy wpis (RRRR-MM-DD) – do „ten dzień w historii” */
    dzien: string | null
}

export const RODZAJE_MIEJSC: Record<string, string> = {
    wies: 'wieś', miasto: 'miasto', kraina: 'kraina', gmina: 'gmina', parafia: 'parafia', cmentarz: 'cmentarz', folwark: 'folwark', inne: 'inne',
}
/** Rodzaje miejsc, które są obszarami (dzielą spis), a nie punktami na mapie. */
export const OBSZARY = ['kraina', 'gmina']
export { NAZWY_OBIEKTOW as RODZAJE_OBIEKTOW } from './tarcze'
import { NAZWY_OBIEKTOW } from './tarcze'
export { opisWyznan } from './tarcze'

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
    zdjecia: ZdjecieObiektu[]
}
export interface ZdjecieObiektu { plik: string; podpis: string; data: string; autor: string; prawa: string }
export { RODZAJE_MATERIALOW }

export interface Material {
    id: string
    nazwa: string
    rodzaj: string
    /** adres pliku: /pliki/<id>/file.<roz> (plik leży w pliki-archiwum/) */
    plik: string | null
    /** strony skanu do przeglądarki: z panelu „strony materiału”, a gdy ich nie ma – sam plik, jeśli jest obrazem */
    strony: { adres: string; podpis?: string }[]
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
            wyznania: [...(entry.religions ?? [])].filter((w, i, a) => w && a.indexOf(w) === i),
            wyznaniaRowne: entry.religionsEqual ?? false,
            nalezyDo: entry.isPartOf,
            parafie: (entry.parishes ?? [])
                .filter((p) => p.parish)
                .map((p) => ({ parafia: p.parish as string, od: p.from ?? null, do: p.to ?? null })),
            sameAs: entry.sameAs,
            widocznosc: entry.visibility as Widocznosc,
            dodano: entry.dateSubmitted,
            zrodloOpisu: entry.descriptionSource ?? '',
            opis: entry.description?.node ?? null,
        }))
        .sort((a, b) => porownajPl(a.nazwa, b.nazwa))
})

const wszystkieParafie = cache(async (): Promise<Parafia[]> => {
    const wpisy = await reader.collections.parafie.all()
    return wpisy
        .map(({ slug, entry }) => ({
            id: slug,
            nazwa: entry.title,
            wyznanie: entry.religion,
            siedziba: entry.seat,
            czas: entry.temporal ?? '',
            diecezja: entry.diocese ?? '',
            sameAs: entry.sameAs,
            opis: entry.description ?? '',
        }))
        .sort((a, b) => porownajPl(a.nazwa, b.nazwa))
})

const wszystkieKsiegiSurowe = cache(async (): Promise<Ksiega[]> => {
    const wpisy = await reader.collections.ksiegi.all()
    return wpisy.map(({ slug, entry }) => {
        const jednostki = (entry.volumes ?? [])
            .map((j) => ({ lata: j.years, zakresy: zakresyLat(j.years), sygnatura: j.identifier ?? '', skany: j.scans || null, uwagi: j.gaps ?? '' }))
            .sort((a, b) => (a.zakresy[0]?.[0] ?? 0) - (b.zakresy[0]?.[0] ?? 0))
        // przy tomach pasek lat z samych tomów (widać brakujące roczniki); „Lata” zostaje jako podpis
        const zakresy = scalZakresy(jednostki.some((j) => j.zakresy.length) ? jednostki.flatMap((j) => j.zakresy) : zakresyLat(entry.years))
        return {
            id: slug,
            nazwa: entry.title,
            parafia: entry.parish ?? '',
            rodzaje: entry.types.length ? [...entry.types].sort((a, b) => KOLEJNOSC_KSIAG.indexOf(a) - KOLEJNOSC_KSIAG.indexOf(b)) : ['inne'],
            lata: entry.years?.trim() || zakresyTekst(zakresy),
            zakresy,
            miejsca: [...(entry.spatial ?? [])].filter((x): x is string => !!x),
            jednostki,
            braki: entry.gaps ?? '',
            jezyk: entry.language ?? '',
            gdzie: entry.repository ?? '',
            sygnatura: entry.identifier ?? '',
            dostep: entry.access,
            skany: entry.scans,
            indeks: entry.index,
            widocznosc: entry.visibility as Widocznosc,
        }
    })
})

export async function parafie(): Promise<Parafia[]> {
    return wszystkieParafie()
}

/** Księgi widoczne dla czytelnika, posortowane: parafia, rodzaj, pierwszy rok. */
export async function ksiegi(poziom: Widocznosc): Promise<Ksiega[]> {
    const kol = KOLEJNOSC_KSIAG
    return (await wszystkieKsiegiSurowe())
        .filter((k) => widoczne(k.widocznosc, poziom))
        .sort((a, b) => a.parafia.localeCompare(b.parafia) || kol.indexOf(a.rodzaje[0]) - kol.indexOf(b.rodzaje[0]) || (a.zakresy[0]?.[0] ?? 0) - (b.zakresy[0]?.[0] ?? 0))
}

/** Księgi parafii, do których należała wieś, z lat jej przynależności. */
export async function ksiegiDlaMiejsca(m: Miejsce, poziom: Widocznosc): Promise<{ parafia: Parafia; od: number | null; do: number | null; ksiegi: Ksiega[] }[]> {
    const wszystkiePar = await wszystkieParafie()
    const wszystkieKs = await ksiegi(poziom)
    // księga z zaznaczonymi wsiami dotyczy tylko ich; bez zaznaczenia – całej parafii
    const dotyczy = (k: Ksiega) => !k.miejsca.length || k.miejsca.includes(m.id)
    const zParafii = m.parafie
        .map((p) => {
            const parafia = wszystkiePar.find((x) => x.id === p.parafia)
            if (!parafia) return null
            return { parafia, od: p.od, do: p.do, ksiegi: wszystkieKs.filter((k) => k.parafia === p.parafia && dotyczy(k) && nakladaSie(k.zakresy, p.od, p.do)) }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    // księgi innych parafii, w których wieś zaznaczono wprost
    const inne = new Map<string, Ksiega[]>()
    for (const k of wszystkieKs) if (k.miejsca.includes(m.id) && !m.parafie.some((p) => p.parafia === k.parafia)) inne.set(k.parafia, [...(inne.get(k.parafia) ?? []), k])
    for (const [id, ks] of inne) {
        const parafia = wszystkiePar.find((x) => x.id === id)
        if (parafia) zParafii.push({ parafia, od: null, do: null, ksiegi: ks })
    }
    return zParafii
}

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
            zdjecia: (entry.photos ?? []).filter((z) => z.image).map((z) => ({ plik: String(z.image), podpis: z.caption, data: z.date, autor: z.creator, prawa: z.rights })),
        }))
        .sort((a, b) => porownajPl(a.nazwa, b.nazwa))
})

function stronyDoPokazania(id: string, plik: string | null): { adres: string; podpis?: string }[] {
    const s = stronyMaterialu(id)
    if (s.length) return s.map((x) => ({ adres: adresStrony(id, x.plik), ...(x.podpis ? { podpis: x.podpis } : {}) }))
    return plik && typPliku(plik) === 'obraz' ? [{ adres: plik }] : []
}

const wszystkieMaterialySurowe = cache(async (): Promise<Material[]> => {
    const wpisy = await reader.collections.materialy.all({ resolveLinkedFiles: true })
    return wpisy
        .map(({ slug, entry }) => ({
            id: slug,
            nazwa: entry.title,
            rodzaj: entry.type,
            plik: typeof entry.file === 'string' && entry.file ? entry.file : null,
            strony: stronyDoPokazania(slug, typeof entry.file === 'string' ? entry.file : null),
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
                dzien: (entry as { about?: string }).about || null,
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

/** Wstęp strony głównej (singleton „Strona główna”); bez wpisu – tekst domyślny. Akapity rozdzielone pustym wierszem. */
export async function wstepStronyGlownej(): Promise<string[]> {
    const s = await reader.singletons.stronaGlowna.read().catch(() => null)
    const tekst = s?.intro?.trim() || WSTEP_DOMYSLNY
    return tekst.split(/\n\s*\n/).map((a) => a.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)
}

// ---------- sieć powiązań: odnośniki [[…]] i wzmianki (jak w Logseq) ----------

const pozycjeSieci = cache(async (poziom: Widocznosc): Promise<PozycjaSieci[]> => [
    ...(await miejsca(poziom)).map((m) => ({ cel: { rodzaj: 'miejsce' as const, id: m.id, nazwa: m.nazwa, adres: `/miejsca/${m.id}` }, nazwy: [m.nazwa, ...m.inneNazwy, ...m.formy] })),
    ...(await tematy(poziom)).map((t) => ({ cel: { rodzaj: 'temat' as const, id: t.id, nazwa: t.nazwa, adres: `/tematy/${t.id}` }, nazwy: [t.nazwa, ...t.inneNazwy, ...t.formy] })),
    ...(await obiekty(poziom)).map((o) => ({ cel: { rodzaj: 'obiekt' as const, id: o.id, nazwa: o.nazwa, adres: `/obiekty/${o.id}` }, nazwy: [o.nazwa, ...o.inneNazwy] })),
    ...(await opowiesci(poziom)).map((o) => ({ cel: { rodzaj: 'wpis' as const, id: o.id, nazwa: o.tytul, adres: `/wpisy/${o.id}` }, nazwy: [o.tytul] })),
    ...(await materialy(poziom)).map((m) => ({ cel: { rodzaj: 'material' as const, id: m.id, nazwa: m.nazwa, adres: `/archiwum/${m.id}` }, nazwy: [m.nazwa] })),
    ...(await osobyWSieci(poziom)),
])

/** Osoby w sieci powiązań: z biogramem – z wzmiankami (pełne imię i nazwisko); pozostałe widoczne – tylko odnośnik [[identyfikator]]. */
async function osobyWSieci(poziom: Widocznosc): Promise<PozycjaSieci[]> {
    const { stanOsob } = await import('./osoby/dane')
    const { nazwaOsoby } = await import('./osoby/model')
    const s = await stanOsob()
    const zBiogramem = new Set((await biogramy(poziom)).map((b) => b.id))
    const wyn: PozycjaSieci[] = []
    for (const o of s.drzewo.osoby.values()) {
        if (!widoczne(s.widocznosc(o.id), poziom)) continue
        const nazwa = nazwaOsoby(o)
        const nazwy = zBiogramem.has(o.id) && nazwa.includes(' ') ? [nazwa] : []
        wyn.push({ cel: { rodzaj: 'osoba', id: o.id, nazwa, adres: `/osoby/${o.id}` }, nazwy })
    }
    return wyn
}

/** Wszystkie cele sieci (miejsca, tematy, obiekty, wpisy, materiały, osoby) – podpowiedzi powiązań w panelu. */
export async function celeSieci(poziom: Widocznosc): Promise<Cel[]> {
    return (await pozycjeSieci(poziom)).map((p) => p.cel)
}

/** Objaśnienia skanu materiału do pokazania czytelnikowi: tylko widoczne, w kolejności czytania, strona jako numer,
 *  powiązania zamienione na nazwy i adresy (niewidoczne cele pominięte). */
export async function objasnieniaDoWidoku(id: string, poziom: Widocznosc): Promise<ObjasnienieWidoku[]> {
    const strony = stronyMaterialu(id).map((s) => s.plik)
    if (!strony.length) return []
    const rozwiaz = await rozwiazOdnosniki(poziom)
    return wKolejnosci(objasnieniaMaterialu(id).filter((o) => widoczne(o.widocznosc, poziom) && strony.includes(o.strona)), strony).map((o) => ({
        id: o.id, strona: strony.indexOf(o.strona), x: o.x, y: o.y, w: o.w, h: o.h, rodzaj: o.rodzaj, tekst: o.tekst,
        ...(o.jezyk ? { jezyk: JEZYKI[o.jezyk] ?? o.jezyk } : {}),
        powiazania: o.powiazania.map((p) => rozwiaz(p)).filter((c): c is Cel => !!c).map((c) => ({ nazwa: c.nazwa, adres: c.adres })),
        opracowal: o.opracowal,
        ...(o.weryfikacja ? { weryfikacja: o.weryfikacja } : {}),
    }))
}

/** Zamiana [[…]] na cele – tylko pozycje widoczne dla czytelnika. Do naHtml(treść, rozwiaz). */
export const rozwiazOdnosniki = cache(async (poziom: Widocznosc): Promise<Rozwiaz> => slownikOdnosnikow(await pozycjeSieci(poziom)))

/** Wszystko, czego treść potrzebuje przy renderowaniu: odnośniki [[…]] i wstawione materiały. */
export const kontekstTresci = cache(async (poziom: Widocznosc): Promise<KontekstTresci> => {
    const mat = new Map<string, MaterialWstawki>(await Promise.all((await materialy(poziom)).map(async (m) => [m.id, { id: m.id, nazwa: m.nazwa, rodzaj: m.rodzaj, plik: m.plik, strony: m.strony, objasnienia: await objasnieniaDoWidoku(m.id, poziom) }] as const)))
    const { stanOsob } = await import('./osoby/dane')
    const { drzewoOsoby } = await import('./osoby/drzewo')
    const stan = await stanOsob()
    return { rozwiaz: await rozwiazOdnosniki(poziom), material: (id) => mat.get(id) ?? null, drzewo: (id, op) => drzewoOsoby(stan, id, op, poziom) }
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
    for (const b of await biogramy(poziom)) dodaj('osoba', b.id, 'biogramy', b.tresc, [])
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
    const wzorce = pozycje.filter((p) => p.cel.rodzaj !== 'wpis' && p.cel.rodzaj !== 'material' && p.nazwy.length > 0).map((p) => ({ klucz: kluczCelu(p.cel), wzorzec: wzorzecWzmianek(p.nazwy, p.cel.rodzaj === 'temat') }))
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

export type RodzajWyniku = 'osoba' | 'miejsce' | 'obiekt' | 'temat' | 'wpis' | 'materiał'
export interface Wynik {
    rodzaj: RodzajWyniku
    /** etykieta przy wyniku: osoba, wieś, cerkiew unicka, wpis, dokument… */
    etykieta: string
    id: string
    tytul: string
    adres: string
    fragment: string
    /** wynik dołączony przez powiązanie z miejscowością, nie przez sam tekst */
    przez?: string
}

function fragmentWokol(tekst: string, z: Zapytanie): string {
    const i = pozycjaTrafienia(z, tekst)
    if (i < 0) return tekst.slice(0, 160)
    // normalizuj nie zmienia długości liter, ale skleja odstępy – miejsce w oryginale przybliżone
    const proporcja = tekst.length / Math.max(normalizuj(tekst).length, 1)
    const start = Math.max(0, Math.floor(i * proporcja) - 60)
    return (start > 0 ? '…' : '') + tekst.slice(start, start + 180).trim() + '…'
}

/**
 * Wyszukiwarka ogólna: miejscowości, osoby (tylko widoczne dla czytelnika), obiekty, tematy, wpisy, materiały.
 * Słowa z odmianą (lib/szukanie), bez polskich znaków; przy trafieniu w miejscowość – także to, co jest z nią powiązane.
 */
export async function szukaj(zapytanie: string, poziom: Widocznosc): Promise<Wynik[]> {
    const z = przygotujZapytanie(zapytanie)
    if (!z) return []
    const wyniki: (Wynik & { waga: number })[] = []
    // 3 – nazwa dokładnie taka; 2 – wszystkie słowa w nazwie; 1 – w nazwie i tekście razem
    const ocen = (nazwy: string[], tekst: string) => {
        if (nazwy.some((n) => normalizuj(n) === z.fraza)) return 3
        if (nazwy.some((n) => normalizuj(n).includes(z.fraza)) || pasuje(z, nazwy.join(' '))) return 2
        if (pasuje(z, `${nazwy.join(' ')} ${tekst}`)) return 1
        return 0
    }
    const msc = await miejsca(poziom)
    for (const m of msc) {
        const tekst = bezNawiasow(naTekst(m.opis))
        const waga = ocen([m.nazwa, ...m.inneNazwy, ...m.formy], tekst)
        if (waga) wyniki.push({ rodzaj: 'miejsce', etykieta: RODZAJE_MIEJSC[m.rodzaj] ?? 'miejscowość', id: m.id, tytul: m.nazwa, adres: `/miejsca/${m.id}`, fragment: waga === 1 ? fragmentWokol(tekst, z) : m.inneNazwy.join(', '), waga: waga + 0.3 })
    }
    // osoby: tylko te, które czytelnik może zobaczyć; imię i nazwisko, inne nazwiska i zapisy, przydomek
    const { stanOsob } = await import('./osoby/dane')
    const { nazwaOsoby, lataZycia, zdarzenie } = await import('./osoby/model')
    const s = await stanOsob()
    const rozwiaz = slownikOdnosnikow(await pozycjeSieci(poziom))
    const bio = new Map((await biogramy(poziom)).map((b) => [b.id, bezNawiasow(b.lead, rozwiaz)]))
    for (const o of s.drzewo.osoby.values()) {
        if (!widoczne(s.widocznosc(o.id), poziom)) continue
        const nazwy = [nazwaOsoby(o), `${o.imiona} ${o.nazwisko}`, ...(o.inneNazwiska ?? []).map((n) => `${o.imiona} ${n}`), ...(o.inneZapisy ?? []), ...(o.przydomek ? [o.przydomek] : [])]
        const waga = ocen(nazwy, bio.get(o.id) ?? '')
        if (!waga) continue
        const miejsce = zdarzenie(o, 'urodzenie', 'chrzest')?.miejsce?.split(',')[0] ?? ''
        wyniki.push({ rodzaj: 'osoba', etykieta: 'osoba', id: o.id, tytul: nazwaOsoby(o), adres: `/osoby/${o.id}`, fragment: [lataZycia(o), miejsce, o.przydomek && `„${o.przydomek}”`, bio.get(o.id)].filter(Boolean).join(' · '), waga })
    }
    const obj = await obiekty(poziom)
    for (const o of obj) {
        const tekst = bezNawiasow(naTekst(o.opis))
        const waga = ocen([o.nazwa, ...o.inneNazwy], tekst)
        if (waga) wyniki.push({ rodzaj: 'obiekt', etykieta: NAZWY_OBIEKTOW[o.rodzaj] ?? 'obiekt', id: o.id, tytul: o.nazwa, adres: `/obiekty/${o.id}`, fragment: waga === 1 ? fragmentWokol(tekst, z) : '', waga })
    }
    const tem = await tematy(poziom)
    for (const t of tem) {
        const tekst = bezNawiasow(naTekst(t.opis))
        const waga = ocen([t.nazwa, ...t.inneNazwy, ...t.formy], tekst)
        if (waga) wyniki.push({ rodzaj: 'temat', etykieta: 'temat', id: t.id, tytul: t.nazwa, adres: `/tematy/${t.id}`, fragment: waga === 1 ? fragmentWokol(tekst, z) : t.inneNazwy.join(', '), waga })
    }
    const wp = await opowiesci(poziom)
    for (const o of wp) {
        const tekst = bezNawiasow(naTekst(o.tresc))
        const waga = ocen([o.tytul], tekst)
        if (waga) wyniki.push({ rodzaj: 'wpis', etykieta: 'wpis', id: o.id, tytul: o.tytul, adres: `/wpisy/${o.id}`, fragment: waga === 1 ? fragmentWokol(tekst, z) : o.zajawka, waga })
    }
    const mat = await materialy(poziom)
    for (const m of mat) {
        const tekst = bezNawiasow(naTekst(m.opis))
        const waga = ocen([m.nazwa, m.sygnatura], `${tekst} ${m.pochodzenie} ${m.tworca}`)
        if (waga) wyniki.push({ rodzaj: 'materiał', etykieta: RODZAJE_MATERIALOW[m.rodzaj] ?? 'materiał', id: m.id, tytul: m.nazwa, adres: `/archiwum/${m.id}`, fragment: waga === 1 ? fragmentWokol(tekst, z) : [m.czas && formatujEdtf(m.czas), m.pochodzenie].filter(Boolean).join(' · '), waga })
    }
    // trafienie w miejscowość: dołącz wpisy, materiały, obiekty i tematy z nią powiązane (jeśli nie ma ich już w wynikach)
    const znalezione = new Set(wyniki.map((w) => `${w.rodzaj}:${w.id}`))
    for (const m of msc.filter((x) => wyniki.some((w) => w.rodzaj === 'miejsce' && w.id === x.id && w.waga >= 2))) {
        const dodaj = (w: Wynik) => { const k = `${w.rodzaj}:${w.id}`; if (!znalezione.has(k)) { znalezione.add(k); wyniki.push({ ...w, przez: m.nazwa, waga: 0.5 }) } }
        for (const o of wp) if (o.miejsca.includes(m.id)) dodaj({ rodzaj: 'wpis', etykieta: 'wpis', id: o.id, tytul: o.tytul, adres: `/wpisy/${o.id}`, fragment: o.zajawka })
        for (const x of mat) if (x.miejsca.includes(m.id)) dodaj({ rodzaj: 'materiał', etykieta: RODZAJE_MATERIALOW[x.rodzaj] ?? 'materiał', id: x.id, tytul: x.nazwa, adres: `/archiwum/${x.id}`, fragment: [x.czas && formatujEdtf(x.czas), x.pochodzenie].filter(Boolean).join(' · ') })
        for (const o of obj) if (o.miejsce === m.id) dodaj({ rodzaj: 'obiekt', etykieta: NAZWY_OBIEKTOW[o.rodzaj] ?? 'obiekt', id: o.id, tytul: o.nazwa, adres: `/obiekty/${o.id}`, fragment: '' })
        for (const t of tem) if (t.miejsca.includes(m.id)) dodaj({ rodzaj: 'temat', etykieta: 'temat', id: t.id, tytul: t.nazwa, adres: `/tematy/${t.id}`, fragment: '' })
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
    parafie: wszystkieParafie,
    ksiegi: wszystkieKsiegiSurowe,
}

// ---------- ten dzień w historii ----------
export interface PozycjaDnia { rok: number; tytul: string; href: string; rodzaj: string }

/**
 * Wydarzenia z tematów, materiały z dokładną datą i wpisy o konkretnym dniu, które przypadają na dany dzień i miesiąc.
 * Bez urodzin, ślubów i zgonów z drzewa genealogicznego (ustalenie z 12.11.2026).
 */
export async function tenDzien(poziom: Widocznosc, miesiac: number, dzien: number): Promise<PozycjaDnia[]> {
    const md = `-${String(miesiac).padStart(2, '0')}-${String(dzien).padStart(2, '0')}`
    const trafia = (z: string | null | undefined) => {
        const m = /^(\d{4})(-\d{2}-\d{2})/.exec(z ?? '')
        return m && m[2] === md ? Number(m[1]) : null
    }
    const wyn: PozycjaDnia[] = []
    for (const t of await tematy(poziom)) { const r = trafia(t.czas); if (r) wyn.push({ rok: r, tytul: t.nazwa, href: `/tematy/${t.id}`, rodzaj: `temat · ${RODZAJE_TEMATOW[t.rodzaj] ?? t.rodzaj}` }) }
    for (const m of await materialy(poziom)) { const r = trafia(m.czas); if (r) wyn.push({ rok: r, tytul: m.nazwa, href: `/archiwum/${m.id}`, rodzaj: `archiwum · ${RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj}` }) }
    for (const o of await opowiesci(poziom)) { const r = trafia(o.dzien); if (r) wyn.push({ rok: r, tytul: o.tytul, href: `/wpisy/${o.id}`, rodzaj: 'wpis' }) }
    return wyn.sort((a, b) => a.rok - b.rok)
}

// ---------- słownik ----------
export const RODZAJE_HASEL: Record<string, string> = { pojecie: 'pojęcie historyczne', gwara: 'gwara, słowo miejscowe', urzad: 'urząd, urzędnik', miara: 'miara, waluta', wyznanie: 'wyznanie, obrzęd' }
export interface Haslo { id: string; haslo: string; rodzaj: string; znaczenie: string; przyklad: string; zrodlo: string; formy: string[]; widocznosc: Widocznosc }

const wszystkieHasla = cache(async (): Promise<Haslo[]> => {
    const r = reader as unknown as { collections: { hasla?: { all: () => Promise<{ slug: string; entry: Record<string, unknown> }[]> } } }
    if (!r.collections.hasla) return []
    const wpisy = await r.collections.hasla.all().catch(() => [])
    return wpisy
        .map(({ slug, entry }) => ({
            id: slug, haslo: String(entry.title ?? slug), rodzaj: String(entry.kind ?? 'pojecie'), znaczenie: String(entry.meaning ?? ''), przyklad: String(entry.example ?? ''),
            zrodlo: String(entry.source ?? ''), formy: Array.isArray(entry.variants) ? (entry.variants as string[]) : [], widocznosc: (entry.visibility as Widocznosc) ?? 'publiczne',
        }))
        .sort((a, b) => porownajPl(a.haslo, b.haslo))
})

export async function hasla(poziom: Widocznosc): Promise<Haslo[]> {
    return (await wszystkieHasla()).filter((h) => widoczne(h.widocznosc, poziom))
}

/** Pozycja do losowej karty na stronie głównej. */
export interface PozycjaLosowa { klucz: string; rodzaj: string; tytul: string; href: string; tekst: string; zdjecie?: string }

/** Publiczne miejsca, obiekty, tematy, materiały archiwum i osoby z biogramem – do „wylosuj” na stronie głównej. */
export async function pozycjeLosowe(): Promise<PozycjaLosowa[]> {
    const poziom: Widocznosc = 'publiczne'
    const rozwiaz = slownikOdnosnikow(await pozycjeSieci(poziom))
    const wyn: PozycjaLosowa[] = []
    const opis = (n: Node | null) => zajawka(n, 260, rozwiaz).trim()
    for (const m of await miejsca(poziom)) {
        const t = opis(m.opis)
        if (t.length > 40) wyn.push({ klucz: `miejsce:${m.id}`, rodzaj: RODZAJE_MIEJSC[m.rodzaj] ?? 'miejscowość', tytul: m.nazwa, href: `/miejsca/${m.id}`, tekst: t })
    }
    for (const o of await obiekty(poziom)) {
        const t = opis(o.opis)
        if (t.length > 40) wyn.push({ klucz: `obiekt:${o.id}`, rodzaj: `w terenie · ${NAZWY_OBIEKTOW[o.rodzaj] ?? o.rodzaj}`, tytul: o.nazwa, href: `/obiekty/${o.id}`, tekst: t, zdjecie: o.zdjecia[0]?.plik })
    }
    for (const tm of await tematy(poziom)) {
        const t = opis(tm.opis)
        if (t.length > 40) wyn.push({ klucz: `temat:${tm.id}`, rodzaj: `temat · ${RODZAJE_TEMATOW[tm.rodzaj] ?? tm.rodzaj}`, tytul: tm.nazwa, href: `/tematy/${tm.id}`, tekst: t })
    }
    // materiały archiwum; cztery ostatnio dodane z dopiskiem „nowe”
    const mats = await materialy(poziom)
    const najnowsze = new Set([...mats].filter((m) => m.dodano).sort((a, b) => b.dodano!.localeCompare(a.dodano!)).slice(0, 4).map((m) => m.id))
    for (const m of mats) {
        const t = opis(m.opis)
        const skan = m.strony.find((s) => s.adres.startsWith('/pliki/strony/'))?.adres
        if (t.length > 40 || skan) {
            const rodzaj = [`archiwum · ${RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj}`, m.czas && formatujEdtf(m.czas), najnowsze.has(m.id) && 'nowe'].filter(Boolean).join(' · ')
            wyn.push({ klucz: `material:${m.id}`, rodzaj, tytul: m.nazwa, href: `/archiwum/${m.id}`, tekst: t, zdjecie: skan })
        }
    }
    for (const b of await biogramy(poziom)) {
        const t = (bezNawiasow(b.lead, rozwiaz).trim() || opis(b.tresc)).trim()
        if (t.length > 20) wyn.push({ klucz: `osoba:${b.id}`, rodzaj: `osoba${b.lata ? ` · ${b.lata}` : ''}`, tytul: b.nazwa, href: `/osoby/${b.id}`, tekst: t })
    }
    return wyn
}

// ---------- biogramy osób (kolekcja „Osoby – biogramy”, plik = identyfikator osoby z drzewa) ----------

export interface Biogram { id: string; podpis: string; lead: string; tresc: Node | null }

const wszystkieBiogramy = cache(async (): Promise<Biogram[]> => {
    const wpisy = await reader.collections.biogramy.all({ resolveLinkedFiles: true })
    return wpisy.map(({ slug, entry }) => ({ id: slug, podpis: entry.title, lead: entry.lead ?? '', tresc: entry.content?.node ?? null }))
})

/** Biogramy osób, które istnieją w drzewie i są widoczne dla czytelnika (widoczność = widoczność osoby). */
export const biogramy = cache(async (poziom: Widocznosc): Promise<(Biogram & { nazwa: string; lata: string })[]> => {
    const { stanOsob } = await import('./osoby/dane')
    const { nazwaOsoby, lataZycia } = await import('./osoby/model')
    const s = await stanOsob()
    return (await wszystkieBiogramy())
        .filter((b) => s.drzewo.osoby.has(b.id) && widoczne(s.widocznosc(b.id), poziom))
        .map((b) => ({ ...b, nazwa: nazwaOsoby(s.drzewo.osoby.get(b.id)!), lata: lataZycia(s.drzewo.osoby.get(b.id)!) }))
})

export async function biogram(id: string, poziom: Widocznosc) {
    return (await biogramy(poziom)).find((b) => b.id === id) ?? null
}
