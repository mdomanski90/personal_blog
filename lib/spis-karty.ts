/**
 * Spis treści karty (JW-2) i zasada „wstęp” (etap 3, uwaga właściciela 17.11): tekst nad pierwszą tabelą karty
 * (lead w NaglowekKarty) ma id ID_WSTEPU, a spis zaczyna się od pozycji „wstęp”. Osoba: pozycja „biogram”
 * zaczyna się od tekstu nad tabelą (`wstepTo: 'biogram'` – lead dostaje id części „biogram”).
 * Czyste funkcje (bez Reacta) – test: lib/spis-karty.test.ts.
 */
import { identyfikatorZNazwy } from './tekst'

export const ID_WSTEPU = 'wstep'

/** Identyfikator części tabeli z jej tytułu („w terenie” → „cz-w-terenie”) – cel spisu treści. */
export const idCzesci = (tytul: string) => `cz-${identyfikatorZNazwy(tytul)}`

export interface PozycjaSpisu { id: string; tekst: string }

/**
 * Pozycje spisu z tytułów części (pomija puste / wyłączone).
 * `wstep` – nad tabelą jest tekst (lead): „wstęp” na początku; `wstepTo` – tytuł części, która zaczyna się od tego
 * tekstu (osoba: „biogram”) – wtedy bez osobnej pozycji „wstęp”.
 */
export function spisCzesci(tytuly: (string | false | null | undefined)[], opcje: { wstep?: boolean; wstepTo?: string } = {}): PozycjaSpisu[] {
    const czesci = tytuly.filter((t): t is string => !!t).map((t) => ({ id: idCzesci(t), tekst: t }))
    if (!opcje.wstep || (opcje.wstepTo && czesci.some((c) => c.tekst === opcje.wstepTo))) return czesci
    return [{ id: ID_WSTEPU, tekst: 'wstęp' }, ...czesci]
}

/** Id tekstu nad tabelą: „wstep” albo id części, od której zaczyna się ten tekst (osoba – „biogram”). */
export const idWstepu = (wstepTo?: string) => (wstepTo ? idCzesci(wstepTo) : ID_WSTEPU)
