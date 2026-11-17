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
    { id: 'wpisy', nazwa: 'wpisy i tematy', formy: ['wpis lub temat', 'wpisy i tematy', 'wpisów i tematów'], rodzaje: ['wpis', 'temat'] },
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
