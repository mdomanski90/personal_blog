// /szukaj: wyniki w pięciu rodzinach zamiast jedenastu rodzajów (SRCH-D-12). Czytelnik zna działy serwisu, nie nasz podział
// na kolekcje, więc pastylki filtra i kolor znaku wyniku mówią „archiwum”, „miejsca”, „osoby”, „biblioteka”, „wpisy”.
// Rodzaj pozycji (miejscowość, księga, objaśnienie…) zostaje na liście jako szary napis przy znaku.
import type { RodzajWyniku } from './indeks-szukania'

export type RodzinaWynikow = 'archiwum' | 'miejsca' | 'osoby' | 'biblioteka' | 'wpisy'

export const RODZINY: { id: RodzinaWynikow; nazwa: string; formy: [string, string, string]; rodzaje: RodzajWyniku[] }[] = [
    { id: 'archiwum', nazwa: 'archiwum', formy: ['wynik w archiwum', 'wyniki w archiwum', 'wyników w archiwum'], rodzaje: ['materiał', 'zbiór', 'objaśnienie'] },
    { id: 'miejsca', nazwa: 'miejsca i obiekty', formy: ['miejsce lub obiekt', 'miejsca i obiekty', 'miejsc i obiektów'], rodzaje: ['miejsce', 'obiekt'] },
    { id: 'osoby', nazwa: 'osoby', formy: ['osoba', 'osoby', 'osób'], rodzaje: ['osoba'] },
    { id: 'biblioteka', nazwa: 'biblioteka', formy: ['wynik w bibliotece', 'wyniki w bibliotece', 'wyników w bibliotece'], rodzaje: ['księga', 'parafia', 'hasło', 'publikacja'] },
    { id: 'wpisy', nazwa: 'wpisy i leksykon', formy: ['wpis lub pozycja leksykonu', 'wpisy lub pozycje leksykonu', 'wpisów lub pozycji leksykonu'], rodzaje: ['wpis', 'temat'] },
]

/** Rodzina wyniku; każdy rodzaj należy do dokładnie jednej rodziny. */
export function rodzinaRodzaju(r: RodzajWyniku): RodzinaWynikow {
    return (RODZINY.find((x) => x.rodzaje.includes(r)) ?? RODZINY[0]).id
}

/** Parametr ?rodzaj= z adresu: id rodziny albo (stare odnośniki) rodzaj pozycji → jego rodzina; nieznane = brak filtra. */
export function rodzinaZParametru(p: string | undefined): RodzinaWynikow | undefined {
    if (!p) return undefined
    const r = RODZINY.find((x) => x.id === p)
    if (r) return r.id
    const z = RODZINY.find((x) => (x.rodzaje as string[]).includes(p))
    return z?.id
}

/**
 * Pastylki filtra /szukaj – plansza 17.11 i ankieta po odbiorze P3: konkretne rodzaje wyników (w kolejności planszy), nazwa
 * odmieniona przez liczbę („osób · 5”, „hasła · 4”). Rodziny zostają dla koloru znaku i legendy.
 */
export const RODZAJE_FILTRA: { rodzaj: RodzajWyniku; formy: [string, string, string] }[] = [
    { rodzaj: 'miejsce', formy: ['miejscowość', 'miejscowości', 'miejscowości'] },
    { rodzaj: 'osoba', formy: ['osoba', 'osoby', 'osób'] },
    { rodzaj: 'materiał', formy: ['materiał', 'materiały', 'materiałów'] },
    { rodzaj: 'zbiór', formy: ['zbiór', 'zbiory', 'zbiorów'] },
    { rodzaj: 'parafia', formy: ['parafia / urząd', 'parafie i urzędy', 'parafii i urzędów'] },
    { rodzaj: 'hasło', formy: ['hasło', 'hasła', 'haseł'] },
    { rodzaj: 'obiekt', formy: ['obiekt', 'obiekty', 'obiektów'] },
    { rodzaj: 'księga', formy: ['księga', 'księgi', 'ksiąg'] },
    { rodzaj: 'publikacja', formy: ['publikacja', 'publikacje', 'publikacji'] },
    { rodzaj: 'objaśnienie', formy: ['objaśnienie', 'objaśnienia', 'objaśnień'] },
    { rodzaj: 'wpis', formy: ['wpis', 'wpisy', 'wpisów'] },
    { rodzaj: 'temat', formy: ['temat', 'tematy', 'tematów'] },
]

export type FiltrWynikow = { rodzaj: RodzajWyniku } | { rodzina: RodzinaWynikow }

/** ?rodzaj= z adresu: rodzaj wyniku albo (stare odnośniki SRCH-D-12) id rodziny; nieznane = brak filtra. */
export function filtrZParametru(p: string | undefined): FiltrWynikow | undefined {
    if (!p) return undefined
    const r = RODZAJE_FILTRA.find((x) => x.rodzaj === p)
    if (r) return { rodzaj: r.rodzaj }
    const z = RODZINY.find((x) => x.id === p)
    return z ? { rodzina: z.id } : undefined
}

export function pasujeDoFiltra(r: RodzajWyniku, f: FiltrWynikow | undefined): boolean {
    if (!f) return true
    return 'rodzaj' in f ? r === f.rodzaj : rodzinaRodzaju(r) === f.rodzina
}
