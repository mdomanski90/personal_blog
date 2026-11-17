// Grupowanie ksiąg do dwóch widoków jednego katalogu. Nie tworzy kopii rekordów
// ani osobnych zasad przypisania – korzysta z reguły paczki 1.
import { ksiegaDotyczyMiejsca, type KsiegaPowiazania, type MiejscePowiazania } from './ksiegi-powiazania'
import { scalZakresy, zakresyTekst } from './ksiegi'

/** REL-05/CAT-05: po filtrze „ze skanami”, gdy tomy ze skanami nie mają własnych lat. */
export const LATA_TOMOW_NIEZNANE = 'lata tomów ze skanami nieznane'

export type WidokKatalogu = 'miejscowosci' | 'parafie'
export type KsiegaKatalogu = KsiegaPowiazania & {
    id: string
    wyznania: string[]
    skany: string | null
    lata?: string
    jednostki: { skany: string | null; liczbaSkanow: number | null; digitalizacja: 'online' | 'brak' | 'nieustalone'; zakresy?: [number, number][] }[]
}
export type MiejsceKatalogu = MiejscePowiazania & { nazwa: string }
export type ParafiaKatalogu = { id: string; nazwa: string; wyznanie: string }

export const widokKatalogu = (wartosc: string | undefined): WidokKatalogu => wartosc === 'parafie' ? 'parafie' : 'miejscowosci'

export function tomMaSkany(j: KsiegaKatalogu['jednostki'][number]): boolean {
    return Boolean(j.skany) || j.digitalizacja === 'online' || (j.liczbaSkanow ?? 0) > 0
}

export function ksiegaMaSkany(k: KsiegaKatalogu): boolean {
    return Boolean(k.skany) || k.jednostki.some(tomMaSkany)
}

/** Ograniczenie po wyznaniu i miejscowości – identyczne w obu widokach. */
export function filtrujKatalog<K extends KsiegaKatalogu>(
    ksiegi: K[], parafie: ParafiaKatalogu[],
    wyznanie: string | undefined, miejsce: MiejscePowiazania | null,
    tylkoSkany: boolean,
): K[] {
    const wyznaniaParafii = new Map(parafie.map((p) => [p.id, p.wyznanie]))
    return ksiegi.filter((k) =>
        (!wyznanie || k.wyznania.includes(wyznanie) || (k.instytucje ?? []).some((id) => wyznaniaParafii.get(id) === wyznanie)) &&
        (!miejsce || ksiegaDotyczyMiejsca(k, miejsce)) &&
        (!tylkoSkany || ksiegaMaSkany(k)),
    ).map((k) => {
        if (!tylkoSkany || !k.jednostki.length) return k
        // Filtr „ze skanami” dotyczy również tomów, podpisu lat i paska roczników.
        const jednostki = k.jednostki.filter(tomMaSkany)
        const zakresy = scalZakresy(jednostki.flatMap((j) => j.zakresy ?? []))
        // KI-13: tomy ze skanami bez własnych lat → nie pokazujemy lat całego zespołu (wprowadzałyby w błąd)
        return { ...k, jednostki, zakresy, lata: zakresy.length ? zakresyTekst(zakresy) : LATA_TOMOW_NIEZNANE } as K
    })
}

/** Księga może wystąpić w wielu miejscowościach, ale pozostaje jednym rekordem. */
export function grupujWedlugMiejsc<K extends KsiegaKatalogu, M extends MiejsceKatalogu>(
    ksiegi: K[], miejsca: M[],
): { grupy: { id: string; element: M | null; ksiegi: K[] }[]; bezPrzypisania: K[] } {
    const przypisane = new Set<string>()
    const grupy = miejsca.map((m) => {
        const powiazane = ksiegi.filter((k) => ksiegaDotyczyMiejsca(k, m))
        for (const k of powiazane) przypisane.add(k.id)
        return { id: m.id, element: m, ksiegi: powiazane }
    }).filter((g) => g.ksiegi.length > 0)
    return { grupy, bezPrzypisania: ksiegi.filter((k) => !przypisane.has(k.id)) }
}

/** Uwzględnia wszystkie instytucje rekordu; brak znanej instytucji ≠ brak księgi. */
export function grupujWedlugParafii<K extends KsiegaKatalogu, P extends ParafiaKatalogu>(
    ksiegi: K[], parafie: P[],
): { grupy: { id: string; element: P | null; ksiegi: K[] }[]; bezPrzypisania: K[] } {
    const przypisane = new Set<string>()
    const grupy = parafie.map((p) => {
        const powiazane = ksiegi.filter((k) => (k.instytucje ?? []).includes(p.id))
        for (const k of powiazane) przypisane.add(k.id)
        return { id: p.id, element: p, ksiegi: powiazane }
    }).filter((g) => g.ksiegi.length > 0)
    return { grupy, bezPrzypisania: ksiegi.filter((k) => !przypisane.has(k.id)) }
}


/** Filtrowanie części nazw i form historycznych, bez rozróżniania wielkości liter i polskich znaków. */
export function normalizujNazweMiejsca(tekst: string): string {
    return tekst.toLocaleLowerCase('pl-PL').replace(/ł/g, 'l')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ').trim()
}
/** Rozpocznij filtrowanie dopiero po co najmniej dwóch LITERACH.
 * Linki ?miejsce=slug pozostają dokładnym filtrem także bez wpisywania frazy.
 */
export function czyFiltrowacMiejsca(fraza: string, dokladneId: string | null = null): boolean {
    if (dokladneId) return true
    return normalizujNazweMiejsca(fraza).replace(/[^\p{L}]/gu, '').length >= 2
}
export function szukajMiejscowosci<M extends { nazwa: string; inneNazwy?: string[]; formy?: string[] }>(miejsca: M[], fraza: string): M[] {
    const q = normalizujNazweMiejsca(fraza)
    if (!q) return miejsca
    return miejsca.filter((m) => [m.nazwa, ...(m.inneNazwy ?? []), ...(m.formy ?? [])]
        .some((n) => normalizujNazweMiejsca(n).includes(q)))
}

/** Na żywo: dopasowanie miejsc, następnie TA SAMA reguła relacji co w katalogu i na kartach wsi. */
export function ksiegiDotyczaceMiejsc<K extends KsiegaPowiazania, M extends MiejscePowiazania>(ksiegi: K[], miejsca: M[]): K[] {
    if (!miejsca.length) return []
    return ksiegi.filter((k) => miejsca.some((m) => ksiegaDotyczyMiejsca(k, m)))
}
