// PH1 (PH-03, 10, 11, 14): metadane planu – rodzaj, dwie daty, źródło, dokładność, kolejność na liście planów miejscowości.
// Wszystkie pola opcjonalne; brak pola = dzisiejsze zachowanie (plan grobowy, bez dat). Czyste funkcje – bez plików.
import { czyPoprawnaEdtf, kluczSortowania } from '../edtf'

export const RODZAJE_PLANU = { cmentarz: 'plan cmentarza', historyczny: 'plan historyczny', schemat: 'schemat (plan wsi, szkic terenowy)' } as const
export type RodzajPlanu = keyof typeof RODZAJE_PLANU
export const RODZAJE_ZRODLA = { pomiarowy: 'pomiar w terenie', wspomnieniowy: 'szkic z pamięci', archiwalny: 'plan archiwalny', rekonstrukcja: 'rekonstrukcja z kilku źródeł' } as const
export type RodzajZrodla = keyof typeof RODZAJE_ZRODLA
export const DOKLADNOSCI = { schematyczny: 'schematyczny (bez skali)', przyblizony: 'przybliżony', geodezyjny: 'geodezyjny' } as const
export type Dokladnosc = keyof typeof DOKLADNOSCI
/** PH-17: styl rysunku na stronie – „atrament” = tokeny --pla-* (papier sepia, kreska atramentu, napisy kursywą); brak = styl współczesny */
export const STYLE_PLANU = { atrament: 'atrament (styl dawnego planu)' } as const
export type StylPlanu = keyof typeof STYLE_PLANU

/** Filtry spisu planów miejscowości pokazują się od tylu planów (decyzja 16.11; zmiana w ustawieniach planów). */
export const PROG_FILTROW_DOMYSLNY = 7

export interface MetadanePlanu {
    /** brak = cmentarz (dzisiejszy interfejs grobowy) */
    rodzaj?: RodzajPlanu
    /** stan przedstawiony na planie (EDTF, np. 1939, 193X) */
    okres?: string
    /** kiedy plan sporządzono (EDTF) – osobno od stanu przedstawionego */
    sporzadzono?: string
    rodzajZrodla?: RodzajZrodla
    tworca?: string
    /** materiał archiwum, z którego zrekonstruowano plan (jeden widok dokumentu: /plany/<slug> → /archiwum/<material>) */
    zrodlo?: { material?: string; opis?: string }
    prawa?: string
    /** schematyczny → bez paska skali (szkic nie udaje pomiaru) */
    dokladnosc?: Dokladnosc
    /** zasięg opisem, np. „centrum miasta” */
    zasieg?: string
    /** plan reprezentacyjny miejscowości – pierwszy na liście */
    wyrozniony?: boolean
    /** ręczna kolejność na liście planów miejscowości (mniejsza = wyżej) */
    kolejnosc?: number
    /** CEM-07: kadr startowy przeglądarki [x, y, szer, wys] w układzie planu (przed obrotem), ustawiany w edytorze; brak = groby i kwatery */
    kadr?: [number, number, number, number]
    /** CEM-14: skąd pochodzi numeracja grobów (np. „numeracja robocza wg oględzin 2024”) – pokazywane w panelu „o planie” */
    zrodloNumeracji?: string
    /** PH-17: styl rysunku na stronie */
    styl?: StylPlanu
    /** KRT-01 (P3): „zgłosił(a)” – podpis za zgodą, bez e-maila */
    zglosil?: string
}

/** Podkład wskazujący stronę materiału archiwum (jedno przechowywanie skanu i praw, K6). */
export interface PodkladZMaterialu { id: string; strona: number }

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const tekst = (v: unknown, max = 2000) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)
const zListy = <T extends string>(v: unknown, lista: Record<T, string>): T | undefined => (typeof v === 'string' && v in lista ? (v as T) : undefined)
const bezPustych = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T

export const rodzajPlanu = (p: { rodzaj?: RodzajPlanu }): RodzajPlanu => p.rodzaj ?? 'cmentarz'
export const planGrobowy = (p: { rodzaj?: RodzajPlanu }) => rodzajPlanu(p) === 'cmentarz'

/** Normalizacja przy odczycie: zostają tylko pola w dobrym kształcie (daty sprawdza walidacja przy zapisie). */
export function poprawMetadane(p: Record<string, unknown>): MetadanePlanu {
    const z = p.zrodlo && typeof p.zrodlo === 'object' ? (p.zrodlo as Record<string, unknown>) : null
    const material = z && typeof z.material === 'string' && ID.test(z.material) ? z.material : undefined
    const zrodlo = z ? bezPustych({ material, opis: tekst(z.opis) }) : undefined
    return bezPustych({
        rodzaj: zListy(p.rodzaj, RODZAJE_PLANU),
        okres: tekst(p.okres, 100),
        sporzadzono: tekst(p.sporzadzono, 100),
        rodzajZrodla: zListy(p.rodzajZrodla, RODZAJE_ZRODLA),
        tworca: tekst(p.tworca, 300),
        zrodlo: zrodlo && Object.keys(zrodlo).length ? zrodlo : undefined,
        prawa: tekst(p.prawa, 500),
        dokladnosc: zListy(p.dokladnosc, DOKLADNOSCI),
        zasieg: tekst(p.zasieg, 300),
        wyrozniony: p.wyrozniony === true ? true : undefined,
        kolejnosc: typeof p.kolejnosc === 'number' && Number.isFinite(p.kolejnosc) ? p.kolejnosc : undefined,
        kadr: dobryKadr(p.kadr) ? (p.kadr as [number, number, number, number]) : undefined,
        zrodloNumeracji: tekst(p.zrodloNumeracji, 500),
        styl: zListy(p.styl, STYLE_PLANU),
        zglosil: typeof p.zglosil === 'string' && !p.zglosil.includes('@') ? tekst(p.zglosil, 200) : undefined,
    })
}

/** Podkład: `material` tylko w dobrym kształcie; reszta bez zmian (stare podkłady z `plik`). */
export function poprawPodklad<T extends { material?: unknown }>(d: T): T {
    const m = d.material as Record<string, unknown> | undefined
    if (m === undefined) return d
    const { material: _m, ...reszta } = d
    return m && typeof m.id === 'string' && ID.test(m.id) && Number.isInteger(m.strona) && (m.strona as number) >= 0
        ? ({ ...reszta, material: { id: m.id, strona: m.strona } } as T)
        : (reszta as T)
}

/** CEM-07: kadr = 4 liczby skończone, szerokość i wysokość dodatnie. */
export const dobryKadr = (v: unknown): boolean => Array.isArray(v) && v.length === 4 && v.every((x) => typeof x === 'number' && Number.isFinite(x)) && v[2] > 0 && v[3] > 0

/** Walidacja przy zapisie (zasada 2.6) – błędny zapis odrzucony z opisem po polsku, nie zignorowany. */
export function bladMetadanych(p: MetadanePlanu & { podklady?: { material?: unknown }[] }): string | null {
    if (p.okres && !czyPoprawnaEdtf(p.okres)) return `Data „stan przedstawiony” (${p.okres}) nie jest zapisem EDTF, np. 1939, 193X, 1930/1939.`
    if (p.sporzadzono && !czyPoprawnaEdtf(p.sporzadzono)) return `Data „sporządzono” (${p.sporzadzono}) nie jest zapisem EDTF, np. 1985, 198X.`
    if (p.zrodlo?.material !== undefined && !ID.test(p.zrodlo.material)) return 'Identyfikator materiału źródłowego ma zły kształt.'
    if (p.kadr !== undefined && !dobryKadr(p.kadr)) return 'Kadr startowy ma zły kształt (cztery liczby: x, y, szerokość i wysokość większe od zera).'
    if (p.styl !== undefined && !(p.styl in STYLE_PLANU)) return `Nieznany styl planu „${String(p.styl)}”.`
    for (const d of p.podklady ?? []) {
        const m = d.material as { id?: unknown; strona?: unknown } | undefined
        if (m !== undefined && !(typeof m.id === 'string' && ID.test(m.id) && Number.isInteger(m.strona) && (m.strona as number) >= 0)) return 'Podkład wskazuje materiał w złym kształcie (identyfikator materiału i numer strony od 0).'
    }
    return null
}

// ---------- napisy w 6 stopniach (decyzja 16.11) ----------
/** Wielkość napisu w jednostkach planu. Stopnie 2, 3 i 5 = dawne S, M, L – stare plany wyglądają tak samo. */
export const ROZMIAR_STOPNIA: Record<1 | 2 | 3 | 4 | 5 | 6, number> = { 1: 0.65, 2: 0.8, 3: 1.05, 4: 1.25, 5: 1.5, 6: 2 }
export type Stopien = keyof typeof ROZMIAR_STOPNIA
const ZE_STAREGO: Record<string, Stopien> = { s: 2, m: 3, l: 5 }
export const dobryStopien = (v: unknown): v is Stopien => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 6
export function stopienNapisu(e: { stopien?: Stopien; rozmiar?: string }, domyslny: Stopien = 2): Stopien {
    if (dobryStopien(e.stopien)) return e.stopien
    return (e.rozmiar && ZE_STAREGO[e.rozmiar]) || domyslny
}

// ---------- lista planów miejscowości ----------
/** Wyróżniony → ręczna kolejność → stan przedstawiony (od najstarszego) → tytuł. */
export function planyWKolejnosci<T extends MetadanePlanu & { tytul: string }>(L: T[]): T[] {
    const okres = (p: T) => (p.okres ? kluczSortowania(p.okres) : Number.POSITIVE_INFINITY)
    return [...L].sort((a, b) =>
        Number(!!b.wyrozniony) - Number(!!a.wyrozniony) ||
        (a.kolejnosc ?? Number.POSITIVE_INFINITY) - (b.kolejnosc ?? Number.POSITIVE_INFINITY) ||
        okres(a) - okres(b) ||
        a.tytul.localeCompare(b.tytul, 'pl'))
}
