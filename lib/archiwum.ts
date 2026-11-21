// Jedyny punkt odczytu danych archiwum. Strony korzystają tylko z tych funkcji, nigdy z Keystatic wprost –
// przy ewentualnym przejściu na Omeka S zmienia się wnętrze tego pliku, a strony zostają bez zmian.

import { miejscaObiektu } from './obiekty-miejsca'
import * as React from 'react'
import { createReader } from '@keystatic/core/reader'
import type { Node } from '@markdoc/markdoc'
import keystaticConfig, { WSTEP_DOMYSLNY } from '../keystatic.config'
import { kluczSortowania } from './edtf'
import { naHtml, naTekst, rozdzielZrodla, zajawka, type KontekstTresci, type MaterialWstawki } from './markdoc'
import { RODZAJE_MATERIALOW } from './materialy'
import { formatujEdtf, zakresIso } from './edtf'
import { odpornyCzytnik, wczytajOdpornie, type BladWpisu } from './kolekcja-odporna'
import { bezNawiasow, fragment, ODNOSNIK, slownikOdnosnikow, wzorzecWzmianek, znajdzWzmianki, type Cel, type Fragment, type PozycjaSieci, type RodzajCelu, type Rozwiaz } from './odnosniki'
import { porownajPl } from './tekst'
import { adresStrony, stronyMaterialu } from './strony-materialow'
import { JEZYKI, RODZAJE_OBJASNIEN, objasnieniaMaterialu, wKolejnosci } from './objasnienia'
import type { ObjasnienieWidoku } from './objasnienia-widok'
import { typPliku } from './pliki'

import { zakresyLat, scalZakresy, zakresyTekst, KOLEJNOSC_KSIAG } from './ksiegi'
import { adresHasla } from './slownik'
import { szukajIndeksowo, type DokumentSzukania, type Wynik } from './indeks-szukania'
import { grupaNaKarcie, ksiegaDotyczyMiejsca } from './ksiegi-powiazania'

// P5: jeden błędny wpis nie wyłącza stron czytających kolekcję (lib/kolekcja-odporna.ts)
const reader = odpornyCzytnik(createReader(process.cwd(), keystaticConfig))

// React.cache (jeden odczyt na żądanie) działa w Next.js; w skryptach (eksport) go nie ma – wtedy bez pamięci.
const cache: <T extends (...a: never[]) => unknown>(fn: T) => T =
    (React as unknown as { cache?: <T>(fn: T) => T }).cache ?? ((fn) => fn)

export type Widocznosc = 'publiczne' | 'bliscy' | 'ja'

/**
 * Poziom dostępu czytelnika: „bliscy” po zalogowaniu wspólnym hasłem (lib/sesja) albo kontem (P7a, lib/konta), inaczej „publiczne”.
 * „Tylko ja” widać wyłącznie w panelu.
 */
export async function poziomCzytelnika(): Promise<Widocznosc> {
    try {
        const { cookies } = await import('next/headers')
        const { CIASTECZKO, sesjaWazna } = await import('./sesja')
        if (sesjaWazna((await cookies()).get(CIASTECZKO)?.value)) return 'bliscy'
        // P7a (KON-01): zalogowane konto z uprawnieniem „treści dla bliskich” czyta jak bliski; „tylko ja” zostaje w panelu
        const { zalogowanyTeraz } = await import('./konta/straz')
        return (await zalogowanyTeraz())?.uprawnienia.has('bliscy') ? 'bliscy' : 'publiczne'
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
    /** łatka 21.11: zapowiedź na stronie głównej wśród ostatnio dodanych (domyślnie tak) */
    naGlownej?: boolean
    /** skąd pochodzi opis (np. Wikipedia, CC BY-SA) */
    zrodloOpisu: string
    /** etap 3 (ankieta 2, 17.11): krótki wstęp nad tabelą karty, pisany ręcznie; pusty – nad tabelą nic (bez skrótu historii) */
    wstep: string
    /** źródła karty (pole „Źródła” w panelu) – pokazywane na dole, numerowane */
    zrodla: string[]
    opis: Node | null
    /** WSP-02: pole „nie pokazuj w współtwórz” */
    bezWspoltworz: boolean
    /** KRT-02 (P3): pochodzenie nazwy i jego źródło */
    pochodzenieNazwy?: string
    pochodzenieNazwyZrodlo?: string
    /** okresy przy wyznaniach (P3): wyznania mieszkańców w kolejnych okresach – osobno od „przed 1875” */
    wyznaniaWCzasie?: { wyznanie: string; od: number | null; do: number | null; zrodlo: string }[]
    /** KRT-01 (P3): „zgłosił(a)” – podpis za zgodą, bez e-maila */
    zglosil?: string
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
    zrodla?: string[]
    osoby?: { nazwa: string; rola: string; okres: string; idOsoby: string; zrodlo: string }[]
    zglosil?: string
}

/** Jedno źródło prawdy o powiązaniu obiektu z parafią/urzędem: karta obiektu. */
export interface RelacjaObiektuZInstytucja {
    parafia: string
    od: number | null
    do: number | null
    zrodlo: string
}

export interface ZespolArchiwalny {
    id: string
    nazwa: string
    sygnatura: string
    archiwum: string
    adres: string | null
    opis: string
}

export interface Ksiega {
    id: string
    nazwa: string
    parafia: string
    zespolArchiwalny: string | null
    /** Instytucja główna i instytucje dodatkowe — jeden rekord może dotyczyć wielu. */
    instytucje: string[]
    wyznania: string[]
    /** rodzaje aktów w księdze (np. małżeństwa i zgony razem); pierwszy decyduje o kolejności */
    rodzaje: string[]
    lata: string
    zakresy: [number, number][]
    /** wsie, których dotyczą akty; puste = cała parafia */
    miejsca: string[]
    /** osobne tomy zespołu (np. rok po roku) */
    jednostki: { lata: string; zakresy: [number, number][]; sygnatura: string; skany: string | null; uwagi: string; tytul: string; liczbaSkanow: number | null; digitalizacja: 'online' | 'brak' | 'nieustalone' }[]
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
    /** łatka 21.11: zapowiedź na stronie głównej wśród ostatnio dodanych (domyślnie tak) */
    naGlownej?: boolean
    zrodla: string[]
    opis: Node | null
    /** KRT-01 (P3): „zgłosił(a)” */
    zglosil?: string
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
    /** P7E-1: zapowiedź redakcyjna (pole „lead”) – pusta, gdy autor jej nie napisał */
    zapowiedz: string
    /** D-SG-14: autorskie zaproszenie pod wpisem (pole „invitation”) – puste = brak sekcji */
    zaproszenie: string
    /** P7E-1: materiał na miniaturę – wybrany („cover”) albo pierwszy wstawiony w tekst */
    miniatura: string | null
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
    /** miejscowość główna (okruszki, kolejność) */
    miejsce: string | null
    /** OBJ-06: wszystkie miejscowości obiektu – główna pierwsza (lib/obiekty-miejsca.ts) */
    miejsca: string[]
    wspolrzedne: [number, number] | null
    przyblizone: boolean
    czas: string
    istnieje: boolean
    instytucje?: RelacjaObiektuZInstytucja[]
    widocznosc: Widocznosc
    dodano: string | null
    /** łatka 21.11: zapowiedź na stronie głównej wśród ostatnio dodanych (domyślnie tak) */
    naGlownej?: boolean
    opis: Node | null
    /** WSP-02: pole „nie pokazuj w współtwórz” */
    bezWspoltworz: boolean
    zdjecia: ZdjecieObiektu[]
    zrodla: string[]
    /** KRT-01 (P3): „zgłosił(a)” */
    zglosil?: string
}
export interface ZdjecieObiektu { plik: string; podpis: string; data: string; autor: string; prawa: string; kadr?: string }
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
    // PACZKA5_2026: powiązania i pola dodatkowe bez zmiany istniejących rekordów.
    zbiory: string[]
    instytucje: string[]
    osobyIds: string[]
    miejscePrzechowywania: string
    /** P7C-1: krótki podpis źródła widoczny pod skanem/mapą (pole „credit”) */
    podpisZrodla: string
    kadr: string
    transkrypcja: string
    widocznosc: Widocznosc
    dodano: string | null
    /** łatka 21.11: zapowiedź na stronie głównej wśród ostatnio dodanych (domyślnie tak) */
    naGlownej?: boolean
    zrodla: string[]
    opis: Node | null
    /** WSP-02: pole „nie pokazuj w współtwórz” */
    bezWspoltworz: boolean
    /** KRT-01 (P3): „zgłosił(a)” */
    zglosil?: string
}

/** SRC-01: jeden kanoniczny podpis źródła materiału (pole „credit”, a gdy puste – miejsce przechowywania · sygnatura · prawa) – karta i wstawki we wpisach. */
export function podpisZrodlaMaterialu(m: Pick<Material, 'podpisZrodla' | 'miejscePrzechowywania' | 'sygnatura' | 'prawa'>): string {
    return m.podpisZrodla.trim() || [m.miejscePrzechowywania, m.sygnatura, m.prawa].map((x) => x.trim()).filter(Boolean).join(' · ')
}

export const RODZAJE_TEMATOW: Record<string, string> = {
    zjawisko: 'zjawisko', wydarzenie: 'wydarzenie', instytucja: 'instytucja',
}
export const RODZAJE_OPOWIESCI: Record<string, string> = {
    'o-zrodle': 'o źródle', esej: 'esej', wywiad: 'wywiad', reportaz: 'reportaż', wspomnienie: 'wspomnienie',
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
            naGlownej: (entry as { onHomepage?: boolean }).onHomepage !== false,
            zrodloOpisu: entry.descriptionSource ?? '',
            wstep: (entry.intro ?? '').trim(),
            zrodla: [...(entry.sources ?? [])].map((x) => String(x).trim()).filter(Boolean),
            opis: entry.description?.node ?? null,
            bezWspoltworz: !!(entry as { contributeHide?: boolean }).contributeHide,
            pochodzenieNazwy: (entry.nameOrigin ?? '').trim(),
            pochodzenieNazwyZrodlo: (entry.nameOriginSource ?? '').trim(),
            wyznaniaWCzasie: (entry.religionsOverTime ?? []).filter((w) => w.religion).map((w) => ({ wyznanie: w.religion, od: w.from ?? null, do: w.to ?? null, zrodlo: (w.source ?? '').trim() })),
            zglosil: (entry.reportedBy ?? '').trim(),
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
            zrodla: [...(entry.sources ?? [])].map((x) => String(x).trim()).filter(Boolean),
            osoby: (entry.people ?? []).filter((x) => x.name).map((x) => ({
                nazwa: x.name, rola: x.role ?? '', okres: x.period ?? '', idOsoby: x.personId ?? '', zrodlo: (x.source ?? '').trim(),
            })),
            zglosil: (entry.reportedBy ?? '').trim(),
        }))
        .sort((a, b) => porownajPl(a.nazwa, b.nazwa))
})

const wszystkieZespolyArchiwalne = cache(async (): Promise<ZespolArchiwalny[]> => {
    // Nowa kolekcja: katalog może jeszcze nie istnieć po instalacji, przed pierwszym zapisem.
    const fs = await import('node:fs/promises')
    try { await fs.access(/*turbopackIgnore: true*/ (await import('node:path')).join(/*turbopackIgnore: true*/ process.cwd(), 'content', 'zespoly')) }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []; throw e }
    const wpisy = await reader.collections.zespoly.all()
    return wpisy.map(({ slug, entry }) => ({
        id: slug, nazwa: entry.title, sygnatura: entry.identifier ?? '',
        archiwum: entry.repository ?? '', adres: entry.source ?? null, opis: entry.description ?? '',
    }))
})
export async function zespolyArchiwalne(): Promise<ZespolArchiwalny[]> {
    return wszystkieZespolyArchiwalne()
}

const wszystkieKsiegiSurowe = cache(async (): Promise<Ksiega[]> => {
    const wpisy = await reader.collections.ksiegi.all()
    return wpisy.map(({ slug, entry }) => {
        const jednostki = (entry.volumes ?? [])
            .map((j) => ({
                lata: j.years, zakresy: zakresyLat(j.years), sygnatura: j.identifier ?? '', skany: j.scans || null,
                uwagi: j.gaps ?? '', tytul: j.title ?? '', liczbaSkanow: j.scanCount ?? null,
                digitalizacja: (j.scans ? 'online' : j.digitization ?? 'nieustalone') as 'online' | 'brak' | 'nieustalone',
            }))
            .sort((a, b) => (a.zakresy[0]?.[0] ?? 0) - (b.zakresy[0]?.[0] ?? 0))
        // przy tomach pasek lat z samych tomów (widać brakujące roczniki); „Lata” zostaje jako podpis
        const zakresy = scalZakresy(jednostki.some((j) => j.zakresy.length) ? jednostki.flatMap((j) => j.zakresy) : zakresyLat(entry.years))
        return {
            id: slug,
            nazwa: entry.title,
            parafia: entry.parish ?? '',
            zespolArchiwalny: entry.fonds ?? null,
            instytucje: [...new Set([entry.parish, ...(entry.relatedParishes ?? [])].filter((x): x is string => !!x))],
            wyznania: [...(entry.relatedReligions ?? [])],
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

/** Księgi dotyczące miejscowości: jedna reguła dla jej karty, katalogu i wyszukiwarki. */
export async function ksiegiDlaMiejsca(m: Miejsce, poziom: Widocznosc): Promise<{ parafia: Parafia; od: number | null; do: number | null; ksiegi: Ksiega[] }[]> {
    const wszystkiePar = await wszystkieParafie()
    const pasujace = (await ksiegi(poziom)).filter((k) => ksiegaDotyczyMiejsca(k, m))
    const grupy = new Map<string, { parafia: Parafia; od: number | null; do: number | null; ksiegi: Ksiega[] }>()
    const znane = new Set(wszystkiePar.map((p) => p.id))
    for (const k of pasujace) {
        // jedna reguła z raportem ksiąg w panelu (REL-07); zerwana relacja → księgi nie ma na karcie, raport ją wskazuje
        const idGrupy = grupaNaKarcie(k, m, znane)
        if (!idGrupy) continue
        const parafia = wszystkiePar.find((p) => p.id === idGrupy) ?? {
            id: 'nieustalona-instytucja', nazwa: 'instytucja nieustalona', wyznanie: '',
            siedziba: null, czas: '', diecezja: '', sameAs: null, opis: '', zrodla: [], osoby: [],
        }
        let grupa = grupy.get(parafia.id)
        if (!grupa) {
            const relacja = m.parafie.find((p) => p.parafia === parafia.id)
            grupa = { parafia, od: relacja?.od ?? null, do: relacja?.do ?? null, ksiegi: [] }
            grupy.set(parafia.id, grupa)
        }
        grupa.ksiegi.push(k)
    }
    return [...grupy.values()]
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
            naGlownej: (entry as { onHomepage?: boolean }).onHomepage !== false,
            zrodla: [...(entry.sources ?? [])].map((x) => String(x).trim()).filter(Boolean),
            zglosil: String((entry as { reportedBy?: string }).reportedBy ?? '').trim(),
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
            miejsce: miejscaObiektu(entry.spatial, entry.spatialAlso)[0] ?? null,
            miejsca: miejscaObiektu(entry.spatial, entry.spatialAlso),
            wspolrzedne: parsujWspolrzedne(entry.coordinates),
            przyblizone: entry.approximate,
            czas: entry.temporal,
            istnieje: entry.exists,
            instytucje: (entry.institutions ?? []).filter((r) => r.parish).map((r) => ({
                parafia: r.parish as string, od: r.from ?? null, do: r.to ?? null, zrodlo: r.source ?? '',
            })),
            widocznosc: entry.visibility as Widocznosc,
            dodano: entry.dateSubmitted,
            naGlownej: (entry as { onHomepage?: boolean }).onHomepage !== false,
            zrodla: [...(entry.sources ?? [])].map((x) => String(x).trim()).filter(Boolean),
            zglosil: String((entry as { reportedBy?: string }).reportedBy ?? '').trim(),
            opis: entry.description?.node ?? null,
            bezWspoltworz: !!(entry as { contributeHide?: boolean }).contributeHide,
            zdjecia: (entry.photos ?? []).filter((z) => z.image).map((z) => ({ plik: String(z.image), podpis: z.caption, data: z.date, autor: z.creator, prawa: z.rights, kadr: z.focus })),
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
            zbiory: [...(entry.collections ?? [])].filter((x): x is string => !!x),
            instytucje: [...(entry.institutions ?? [])].filter((x): x is string => !!x),
            osobyIds: [...(entry.peopleIds ?? [])].filter(Boolean),
            miejscePrzechowywania: entry.repository ?? '',
            podpisZrodla: entry.credit ?? '',
            kadr: entry.focus ?? 'srodek',
            transkrypcja: entry.transcription ?? '',
            widocznosc: entry.visibility as Widocznosc,
            dodano: entry.dateSubmitted,
            naGlownej: (entry as { onHomepage?: boolean }).onHomepage !== false,
            zrodla: [...(entry.sources ?? [])].map((x) => String(x).trim()).filter(Boolean),
            zglosil: String((entry as { reportedBy?: string }).reportedBy ?? '').trim(),
            opis: entry.description?.node ?? null,
            bezWspoltworz: !!(entry as { contributeHide?: boolean }).contributeHide,
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
                zapowiedz: ((entry as { lead?: string }).lead ?? '').trim(),
                zaproszenie: ((entry as { invitation?: string }).invitation ?? '').trim(),
                miniatura: (entry as { cover?: string | null }).cover || pierwszyMaterial(tresc),
            }
        })
        .sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''))
})

/** Wszystkie materiały wstawione w treść wpisu (znacznik „material”), w kolejności. */
function wszystkieMaterialy(n: Node | null | undefined, wyn: string[] = []): string[] {
    if (!n) return wyn
    if (n.type === 'tag' && n.tag === 'material' && n.attributes?.id) wyn.push(String(n.attributes.id))
    for (const c of n.children ?? []) wszystkieMaterialy(c, wyn)
    return wyn
}

/** Pierwszy materiał wstawiony w treść wpisu (znacznik „material”). */
function pierwszyMaterial(n: Node | null | undefined): string | null {
    if (!n) return null
    if (n.type === 'tag' && n.tag === 'material' && n.attributes?.id) return String(n.attributes.id)
    for (const c of n.children ?? []) { const w = pierwszyMaterial(c); if (w) return w }
    return null
}

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
    return (await obiekty(poziom)).filter((o) => o.miejsca.includes(id))
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
        .map((o) => ({ ...o, zajawka: o.zapowiedz || zajawka(o.tresc, 220, rozwiaz) }))
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

/** Etap R (decyzja 17.11): adres do kontaktu i na pliki – pole w singletonie „O projekcie”, domyślnie kontakt@odniepamieci.pl.
 *  Zwracany w częściach (bez „@” w HTML) – składa je EmailLink w przeglądarce. */
export const ADRES_DOMYSLNY = 'kontakt@odniepamieci.pl'
export async function adresKontaktowy(): Promise<{ u: string; d: string }> {
    const s = await reader.singletons.oProjekcie.read().catch(() => null)
    const a = String((s as { contact?: string } | null)?.contact ?? '').trim()
    const [u, d] = (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(a) ? a : ADRES_DOMYSLNY).split('@')
    return { u, d }
}

/** Wstęp strony głównej (singleton „Strona główna”); bez wpisu – tekst domyślny. Akapity rozdzielone pustym wierszem. */
export async function wstepStronyGlownej(): Promise<string[]> {
    const s = await reader.singletons.stronaGlowna.read().catch(() => null)
    // P6a: dawne miejsce ustawienia (przed przeniesieniem do content/_panel) – tylko odczyt, gdy nowego jeszcze nie ma
    let dawny = ''
    if (!s) try {
        const [{ load }, { readFile }, { join }] = await Promise.all([import('js-yaml'), import('node:fs/promises'), import('node:path')])
        dawny = String((load(await readFile(join(/*turbopackIgnore: true*/ process.cwd(), 'content', 'strona-glowna.yaml'), 'utf8')) as { intro?: unknown } | null)?.intro ?? '')
    } catch { /* brak pliku */ }
    const tekst = s?.intro?.trim() || dawny.trim() || WSTEP_DOMYSLNY
    return tekst.split(/\n\s*\n/).map((a) => a.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)
}

// ---------- sieć powiązań: odnośniki [[…]] i wzmianki (jak w Logseq) ----------

const pozycjeSieci = cache(async (poziom: Widocznosc): Promise<PozycjaSieci[]> => [
    ...(await miejsca(poziom)).map((m) => ({ cel: { rodzaj: 'miejsce' as const, id: m.id, nazwa: m.nazwa, adres: `/miejsca/${m.id}` }, nazwy: [m.nazwa, ...m.inneNazwy, ...m.formy] })),
    ...(await tematy(poziom)).map((t) => ({ cel: { rodzaj: 'temat' as const, id: t.id, nazwa: t.nazwa, adres: `/leksykon/${t.id}` }, nazwy: [t.nazwa, ...t.inneNazwy, ...t.formy] })),
    ...(await obiekty(poziom)).map((o) => ({ cel: { rodzaj: 'obiekt' as const, id: o.id, nazwa: o.nazwa, adres: `/obiekty/${o.id}` }, nazwy: [o.nazwa, ...o.inneNazwy] })),
    ...(await opowiesci(poziom)).map((o) => ({ cel: { rodzaj: 'wpis' as const, id: o.id, nazwa: o.tytul, adres: `/wpisy/${o.id}` }, nazwy: [o.tytul] })),
    ...(await materialy(poziom)).map((m) => ({ cel: { rodzaj: 'material' as const, id: m.id, nazwa: m.nazwa, adres: `/archiwum/${m.id}` }, nazwy: [m.nazwa] })),
    ...(await osobyWSieci(poziom)),
    // SLW-03 (P3): hasła słownika – ostatnie, żeby nazwa hasła nie zasłoniła miejsca, tematu ani osoby o tej samej nazwie
    ...(await hasla(poziom)).map((h) => ({ cel: { rodzaj: 'haslo' as const, id: h.id, nazwa: h.haslo, adres: adresHasla(h.id) }, nazwy: [h.haslo, ...h.formy] })),
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
    const lista = objasnieniaMaterialu(id)
    // łatka 21.11: płeć osoby do pastylki – drzewo wczytujemy tylko, gdy któreś objaśnienie ma powiązania
    const drzewo = lista.some((o) => o.powiazania.length) ? (await (await import('./osoby/dane')).stanOsob()).drzewo : null
    const plecOsoby = (oid: string): 'K' | 'M' | 'U' => { const p = drzewo?.osoby.get(oid)?.plec; return p === 'K' || p === 'M' ? p : 'U' }
    return wKolejnosci(lista.filter((o) => widoczne(o.widocznosc, poziom) && strony.includes(o.strona)), strony).map((o) => ({
        id: o.id, strona: strony.indexOf(o.strona), x: o.x, y: o.y, w: o.w, h: o.h, rodzaj: o.rodzaj, tekst: o.tekst,
        ...(o.jezyki?.length ? { jezyk: o.jezyki.map((j) => JEZYKI[j] ?? j).join(', ') } : {}),
        powiazania: o.powiazania.map((p) => rozwiaz(p)).filter((c): c is Cel => !!c).map((c) => ({ nazwa: c.nazwa, adres: c.adres, ...(c.rodzaj === 'osoba' ? { plec: plecOsoby(c.id) } : {}) })),
        opracowal: o.opracowal,
        ...(o.weryfikacja ? { weryfikacja: o.weryfikacja } : {}),
        ...(o.ksztalt ? { ksztalt: o.ksztalt } : {}),
    }))
}

/** Zamiana [[…]] na cele – tylko pozycje widoczne dla czytelnika. Do naHtml(treść, rozwiaz). */
export const rozwiazOdnosniki = cache(async (poziom: Widocznosc): Promise<Rozwiaz> => slownikOdnosnikow(await pozycjeSieci(poziom)))

/** Wszystko, czego treść potrzebuje przy renderowaniu: odnośniki [[…]] i wstawione materiały. */
export const kontekstTresci = cache(async (poziom: Widocznosc): Promise<KontekstTresci> => {
    const mat = new Map<string, MaterialWstawki>(await Promise.all((await materialy(poziom)).map(async (m) => [m.id, { id: m.id, nazwa: m.nazwa, rodzaj: m.rodzaj, plik: m.plik, strony: m.strony, objasnienia: await objasnieniaDoWidoku(m.id, poziom), transkrypcja: naHtml(rozdzielZrodla(m.opis).transkrypcja) || undefined, zrodlo: podpisZrodlaMaterialu(m) || undefined }] as const)))
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
    for (const o of await obiekty(poziom)) dodaj('obiekt', o.id, 'obiekty', o.opis, o.miejsca.map((id) => `miejsce:${id}`))
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
    const wzorce = pozycje.filter((p) => p.cel.rodzaj !== 'wpis' && p.cel.rodzaj !== 'material' && p.nazwy.length > 0).map((p) => ({ klucz: kluczCelu(p.cel), wzorzec: wzorzecWzmianek(p.nazwy, p.cel.rodzaj === 'temat' || p.cel.rodzaj === 'haslo') }))
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
    // P7E-1 (SG-04, HOME-06): materiał wstawiony we wpis to też powiązanie – karta materiału pokazuje „we wpisach”
    const cele = new Map(pozycje.map((p) => [kluczCelu(p.cel), p.cel]))
    for (const o of await opowiesci(poziom)) {
        const zrodlo = cele.get(`wpis:${o.id}`)
        if (!zrodlo) continue
        for (const id of new Set(wszystkieMaterialy(o.tresc))) {
            const klucz = `material:${id}`
            if (!cele.has(klucz) || indeks.get(klucz)?.odnosniki.some((z) => kluczCelu(z.zrodlo) === kluczCelu(zrodlo))) continue
            dodaj('odnosniki', klucz, zrodlo, { przed: '', trafienie: 'materiał wstawiony we wpis', po: '' })
        }
    }
    // najpierw wpisy, potem reszta; w grupie alfabetycznie
    const kolejnosc = (z: ZrodloPowiazania) => (z.zrodlo.rodzaj === 'wpis' ? 0 : z.zrodlo.rodzaj === 'material' ? 1 : 2)
    for (const p of indeks.values()) {
        for (const lista of [p.odnosniki, p.wzmianki]) lista.sort((a, b) => kolejnosc(a) - kolejnosc(b) || porownajPl(a.zrodlo.nazwa, b.zrodlo.nazwa))
    }
    return indeks
})

/** SLW-03 (P3): hasła słownika obecne w tekście pozycji (odnośnik [[hasło]] albo samo słowo) – wiersz „słowa ze słownika” na karcie materiału. */
export async function haslaWTekscie(rodzaj: RodzajCelu, id: string, poziom: Widocznosc): Promise<Haslo[]> {
    const indeks = await indeksPowiazan(poziom)
    const klucz = `${rodzaj}:${id}`
    const ids = new Set<string>()
    for (const [cel, p] of indeks) {
        if (!cel.startsWith('haslo:')) continue
        if ([...p.odnosniki, ...p.wzmianki].some((z) => kluczCelu(z.zrodlo) === klucz)) ids.add(cel.slice('haslo:'.length))
    }
    return (await hasla(poziom)).filter((h) => ids.has(h.id))
}

/** Odnośniki zwrotne i wzmianki dla strony miejsca, tematu, obiektu albo wpisu. */
export async function powiazania(rodzaj: RodzajCelu, id: string, poziom: Widocznosc): Promise<Powiazania> {
    return (await indeksPowiazan(poziom)).get(`${rodzaj}:${id}`) ?? { odnosniki: [], wzmianki: [] }
}

// ---------- wyszukiwarka ----------

export type { RodzajWyniku, Wynik } from './indeks-szukania'

/**
 * Dokumenty do wyszukania – wszystko, co czytelnik może zobaczyć na danym poziomie (loadery już filtrują widoczność).
 * Z tego powstaje indeks poziomu (lib/indeks-szukania.ts); tu tylko wyciągamy nazwy, tekst i fragmenty – bez oceny trafień.
 * Kolejność dokumentów = kolejność źródeł (remisy w wynikach ją zachowują).
 */
export async function dokumentySzukania(poziom: Widocznosc): Promise<DokumentSzukania[]> {
    const dok: DokumentSzukania[] = []
    const msc = await miejsca(poziom)
    for (const m of msc) {
        const tekst = bezNawiasow(naTekst(m.opis))
        dok.push({ rodzaj: 'miejsce', etykieta: RODZAJE_MIEJSC[m.rodzaj] ?? 'miejscowość', id: m.id, tytul: m.nazwa, adres: `/miejsca/${m.id}`, nazwy: [m.nazwa, ...m.inneNazwy, ...m.formy], tekst, tekstFragmentu: tekst, fragment: m.inneNazwy.join(', '), bonus: 0.3 })
    }
    // osoby: tylko te, które czytelnik może zobaczyć; imię i nazwisko, inne nazwiska i zapisy, przydomek
    const { stanOsob } = await import('./osoby/dane')
    const { nazwaOsoby, nazwiskaPoMezu, dopiskiPoMezu } = await import('./osoby/model')
    const { fasetyOsoby, opisOsoby } = await import('./osoby/fasety')
    const { funkcjeOsoby } = await import('./parafie-powiazania')
    const { miejscaGrobowOsob } = await import('./plany/serwer')
    const s = await stanOsob()
    const rozwiaz = slownikOdnosnikow(await pozycjeSieci(poziom))
    // PPL-07 (P6b): z biogramu także pełna treść, nie tylko wstęp
    const bio = new Map((await biogramy(poziom)).map((b) => [b.id, { lead: bezNawiasow(b.lead, rozwiaz), pelny: bezNawiasow(naTekst(b.tresc), rozwiaz) }]))
    const nazwyMsc = new Map(msc.map((m) => [m.id, m.nazwa]))
    const [instytucje, groby] = await Promise.all([parafie(), miejscaGrobowOsob()])
    for (const o of s.drzewo.osoby.values()) {
        if (!widoczne(s.widocznosc(o.id), poziom)) continue
        // nazwisko po mężu (P2, decyzja 17.11): także gdy mąż jest niewidoczny – ukryta jest jego karta, nie nazwisko żony
        const poMezu = nazwiskaPoMezu(s.drzewo, o)
        const nazwy = [nazwaOsoby(o), `${o.imiona} ${o.nazwisko}`, ...(o.inneNazwiska ?? []).map((n) => `${o.imiona} ${n}`), ...poMezu.map((n) => `${o.imiona} ${n}`), ...(o.inneZapisy ?? []), ...(o.przydomek ? [o.przydomek] : [])]
        const poMezuDopisek = dopiskiPoMezu(s.drzewo, o) // SRCH-D-20: „Kowalska (Kowalski)”, „Nowakowa (Nowak)”
        // PPL-02 (P6b): lata · miejscowość · zajęcie – ta sama funkcja co lista osób
        const f = fasetyOsoby(o, { zdarzeniaMalzenstw: (s.relacje.get(o.id)?.malzenstwa ?? []).flatMap((r) => r.zdarzenia), funkcje: funkcjeOsoby(o.id, instytucje), groby: groby.get(o.id) ?? [], nazwaMiejsca: (id) => nazwyMsc.get(id) })
        const b = bio.get(o.id)
        const tekstBio = [b?.lead, b?.pelny].filter(Boolean).join(' ')
        dok.push({ rodzaj: 'osoba', etykieta: 'osoba', id: o.id, tytul: nazwaOsoby(o), adres: `/osoby/${o.id}`, nazwy,
            tekst: `${tekstBio} ${f.zajecia.map((z) => z.nazwa).join(' ')} ${f.miejsca.map((m) => m.nazwa).join(' ')}`, tekstFragmentu: tekstBio, fragmentGdyBrak: true,
            fragment: [opisOsoby(o, f), poMezuDopisek.length > 0 && `po mężu: ${poMezuDopisek.join(', ')}`, b?.lead].filter(Boolean).join(' · ') })
    }
    const obj = await obiekty(poziom)
    for (const o of obj) {
        const tekst = bezNawiasow(naTekst(o.opis))
        dok.push({ rodzaj: 'obiekt', etykieta: NAZWY_OBIEKTOW[o.rodzaj] ?? 'obiekt', id: o.id, tytul: o.nazwa, adres: `/obiekty/${o.id}`, nazwy: [o.nazwa, ...o.inneNazwy], tekst, tekstFragmentu: tekst, fragment: '', miejsca: o.miejsca, fragmentPrzez: '' })
    }
    const tem = await tematy(poziom)
    for (const t of tem) {
        const tekst = bezNawiasow(naTekst(t.opis))
        dok.push({ rodzaj: 'temat', etykieta: 'leksykon', id: t.id, tytul: t.nazwa, adres: `/leksykon/${t.id}`, nazwy: [t.nazwa, ...t.inneNazwy, ...t.formy], tekst, tekstFragmentu: tekst, fragment: t.inneNazwy.join(', '), miejsca: t.miejsca, fragmentPrzez: '' })
    }
    const wp = await opowiesci(poziom)
    for (const o of wp) {
        const tekst = bezNawiasow(naTekst(o.tresc))
        dok.push({ rodzaj: 'wpis', etykieta: 'wpis', id: o.id, tytul: o.tytul, adres: `/wpisy/${o.id}`, nazwy: [o.tytul], tekst, tekstFragmentu: tekst, fragment: o.zajawka, miejsca: o.miejsca, fragmentPrzez: o.zajawka })
    }
    const mat = await materialy(poziom)
    for (const m of mat) {
        const tekst = bezNawiasow(naTekst(m.opis))
        dok.push({ rodzaj: 'materiał', etykieta: RODZAJE_MATERIALOW[m.rodzaj] ?? 'materiał', id: m.id, tytul: m.nazwa, adres: `/archiwum/${m.id}`, nazwy: [m.nazwa, m.sygnatura],
            tekst: `${tekst} ${m.pochodzenie} ${m.tworca} ${m.transkrypcja} ${m.miejscePrzechowywania}`, tekstFragmentu: tekst,
            fragment: [m.czas && formatujEdtf(m.czas), m.pochodzenie].filter(Boolean).join(' · '), miejsca: m.miejsca,
            fragmentPrzez: [m.czas && formatujEdtf(m.czas), m.pochodzenie].filter(Boolean).join(' · ') })
    }
    // PACZKA5_2026: publikacje i zbiory (wagi i dopasowanie jak dotąd – tryb „p5”)
    const { publikacje, zbiory } = await import('./paczka5')
    for (const p of await publikacje(poziom)) {
        dok.push({ rodzaj: 'publikacja', etykieta: 'publikacja', id: p.id, tytul: p.nazwa, adres: `/biblioteka/publikacje/${p.id}`, tryb: 'p5', nazwy: [p.nazwa],
            tekst: [p.nazwa, p.autor, p.opis, p.rok, p.wydawca, p.isbn].join(' '), fragment: [p.autor, p.rok].filter(Boolean).join(' · ') })
    }
    for (const k of await zbiory(poziom)) {
        dok.push({ rodzaj: 'zbiór', etykieta: 'zbiór archiwalny', id: k.id, tytul: k.nazwa, adres: `/archiwum/zbiory/${k.id}`, tryb: 'p5', nazwy: [k.nazwa],
            tekst: [k.nazwa, k.pochodzenie, naTekst(k.opis)].join(' '), fragment: k.pochodzenie })
    }
    // Biblioteka: księgi (również po sygnaturach tomów), parafie/urzędy i słownik – te same poziomy widoczności co katalogi.
    const par = await parafie()
    for (const p of par) {
        dok.push({ rodzaj: 'parafia', etykieta: 'parafia / urząd', id: p.id, tytul: p.nazwa, adres: `/parafie/${p.id}`, nazwy: [p.nazwa], tekst: `${p.czas} ${p.diecezja} ${p.opis}`, stalyFragment: true,
            fragment: [p.czas && formatujEdtf(p.czas), p.diecezja].filter(Boolean).join(' · ') })
    }
    const wszystkieKs = await ksiegi(poziom)
    const nazwyParafii = new Map(par.map((p) => [p.id, p.nazwa]))
    for (const k of wszystkieKs) {
        const nazwaParafii = k.instytucje.map((id) => nazwyParafii.get(id) ?? id).join(' · ')
        const zwiazaneMsc = msc.filter((m) => ksiegaDotyczyMiejsca(k, m))
        const tomy = k.jednostki.map((j) => `${j.sygnatura} ${j.lata}`)
        dok.push({ rodzaj: 'księga', etykieta: 'księga metrykalna', id: k.id, tytul: k.nazwa, adres: `/biblioteka/ksiegi#ksiega-${k.id}`,
            nazwy: [k.nazwa, k.sygnatura, ...k.jednostki.map((j) => j.sygnatura).filter(Boolean)],
            tekst: [k.lata, k.sygnatura, k.gdzie, k.braki, k.jezyk, nazwaParafii, ...zwiazaneMsc.map((m) => m.nazwa), ...tomy].join(' '), stalyFragment: true,
            fragment: [k.lata, k.sygnatura, nazwaParafii].filter(Boolean).join(' · '), miejsca: zwiazaneMsc.map((m) => m.id), fragmentPrzez: [k.lata, k.sygnatura].filter(Boolean).join(' · ') })
    }
    for (const h of await hasla(poziom)) {
        dok.push({ rodzaj: 'hasło', etykieta: 'słownik', id: h.id, tytul: h.haslo, adres: adresHasla(h.id), nazwy: [h.haslo, ...h.formy], tekst: `${h.znaczenie} ${h.przyklad} ${h.zrodlo}`, stalyFragment: true, fragment: h.znaczenie.slice(0, 160) })
    }
    // PD-13 (P2): objaśnienia na skanach – tekst odczytu, tłumaczenia, objaśnienia i pieczęci; widoczne, gdy widoczny jest materiał
    // (loader materiałów) i samo objaśnienie (widoczność każdego prostokąta osobno). Pole „weryfikacja” nie trafia do indeksu.
    for (const m of mat) {
        // objasnieniaDoWidoku = dokładnie to, co widzi czytelnik w przeglądarce dokumentu (widoczność prostokąta, strona na liście)
        for (const o of await objasnieniaDoWidoku(m.id, poziom)) {
            if (!o.tekst.trim()) continue
            dok.push({ rodzaj: 'objaśnienie', etykieta: `${RODZAJE_OBJASNIEN[o.rodzaj]?.nazwa ?? 'objaśnienie'} na skanie`, id: `${m.id}/${o.id}`, tytul: m.nazwa, adres: `/archiwum/${m.id}`,
                nazwy: [], tekst: o.tekst, tekstFragmentu: o.tekst, fragment: '' })
        }
    }
    return dok
}

/**
 * Wyszukiwarka ogólna (PD-13): indeks SQLite poziomu czytelnika – miejscowości, osoby (tylko widoczne), obiekty, tematy, wpisy, materiały,
 * objaśnienia skanów, publikacje, zbiory, księgi, parafie i hasła. Słowa z odmianą (lib/szukanie), bez polskich znaków;
 * przy trafieniu w miejscowość – także to, co jest z nią powiązane.
 */
export async function szukaj(zapytanie: string, poziom: Widocznosc): Promise<Wynik[]> {
    return szukajIndeksowo(zapytanie, poziom, () => dokumentySzukania(poziom))
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
    for (const t of await tematy(poziom)) { const r = trafia(t.czas); if (r) wyn.push({ rok: r, tytul: t.nazwa, href: `/leksykon/${t.id}`, rodzaj: `leksykon · ${RODZAJE_TEMATOW[t.rodzaj] ?? t.rodzaj}` }) }
    for (const m of await materialy(poziom)) { const r = trafia(m.czas); if (r) wyn.push({ rok: r, tytul: m.nazwa, href: `/archiwum/${m.id}`, rodzaj: `archiwum · ${RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj}` }) }
    for (const o of await opowiesci(poziom)) { const r = trafia(o.dzien); if (r) wyn.push({ rok: r, tytul: o.tytul, href: `/wpisy/${o.id}`, rodzaj: 'wpis' }) }
    return wyn.sort((a, b) => a.rok - b.rok)
}

// ---------- słownik ----------
export { RODZAJE_HASEL } from './biblioteka'
export interface Haslo {
    id: string; haslo: string; rodzaj: string; znaczenie: string; przyklad: string; zrodlo: string; formy: string[]; widocznosc: Widocznosc
    /** SLW-02 (P3) */
    etymologia?: string; wystepowanie?: string[]; zobaczTez?: string[]; opracowal?: string; dataOpracowania?: string | null; zglosil?: string
}

type WpisHasla = Record<string, unknown>
/** SLW-04 (P3): kolekcja haseł czytana wpis po wpisie – błędny wpis pomijany (i zgłaszany w panelu jakości), reszta słownika działa. */
const odczytHasel = cache(async () => {
    const r = reader as unknown as { collections: { hasla?: { list: () => Promise<string[]>; read: (s: string) => Promise<WpisHasla | null> } } }
    if (!r.collections.hasla) return { wpisy: [] as { slug: string; entry: WpisHasla }[], bledy: [] as BladWpisu[] }
    return wczytajOdpornie(r.collections.hasla)
})

const wszystkieHasla = cache(async (): Promise<Haslo[]> => {
    const lista = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).map(String).filter(Boolean) : [])
    return (await odczytHasel()).wpisy
        .map(({ slug, entry }) => ({
            id: slug, haslo: String(entry.title ?? slug), rodzaj: String(entry.kind ?? 'pojecie'), znaczenie: String(entry.meaning ?? ''), przyklad: String(entry.example ?? ''),
            zrodlo: String(entry.source ?? ''), formy: lista(entry.variants), widocznosc: (entry.visibility as Widocznosc) ?? 'publiczne',
            etymologia: String(entry.etymology ?? '').trim(), wystepowanie: lista(entry.occurrence), zobaczTez: lista(entry.seeAlso),
            opracowal: String(entry.contributor ?? '').trim(), dataOpracowania: typeof entry.contributed === 'string' ? entry.contributed : null, zglosil: String(entry.reportedBy ?? '').trim(),
        }))
        .sort((a, b) => porownajPl(a.haslo, b.haslo))
})

/** SLW-04: wpisy słownika, których nie da się odczytać (do panelu jakości). */
export async function bledyHasel(): Promise<BladWpisu[]> {
    return (await odczytHasel()).bledy
}

export async function hasla(poziom: Widocznosc): Promise<Haslo[]> {
    return (await wszystkieHasla()).filter((h) => widoczne(h.widocznosc, poziom))
}

/** Pozycja do losowej karty na stronie głównej. */
export interface PozycjaLosowa { klucz: string; rodzaj: string; tytul: string; href: string; tekst: string; zdjecie?: string; kadr?: string }

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
        if (t.length > 40) wyn.push({ klucz: `obiekt:${o.id}`, rodzaj: `w terenie · ${NAZWY_OBIEKTOW[o.rodzaj] ?? o.rodzaj}`, tytul: o.nazwa, href: `/obiekty/${o.id}`, tekst: t, zdjecie: o.zdjecia[0]?.plik, kadr: o.zdjecia[0]?.kadr })
    }
    for (const tm of await tematy(poziom)) {
        const t = opis(tm.opis)
        if (t.length > 40) wyn.push({ klucz: `temat:${tm.id}`, rodzaj: `leksykon · ${RODZAJE_TEMATOW[tm.rodzaj] ?? tm.rodzaj}`, tytul: tm.nazwa, href: `/leksykon/${tm.id}`, tekst: t })
    }
    // materiały archiwum; cztery ostatnio dodane z dopiskiem „nowe”
    const mats = await materialy(poziom)
    const najnowsze = new Set([...mats].filter((m) => m.dodano).sort((a, b) => b.dodano!.localeCompare(a.dodano!)).slice(0, 4).map((m) => m.id))
    for (const m of mats) {
        const t = opis(m.opis)
        const skan = m.strony.find((s) => s.adres.startsWith('/pliki/strony/'))?.adres
        if (t.length > 40 || skan) {
            const rodzaj = [`archiwum · ${RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj}`, m.czas && formatujEdtf(m.czas), najnowsze.has(m.id) && 'nowe'].filter(Boolean).join(' · ')
            wyn.push({ klucz: `material:${m.id}`, rodzaj, tytul: m.nazwa, href: `/archiwum/${m.id}`, tekst: t, zdjecie: skan, kadr: m.kadr })
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
