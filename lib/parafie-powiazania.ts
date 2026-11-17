/** Instytucja (parafia/urząd) jest odrębna od budynku i miejscowości.
 * Miejscowość przechowuje okresy swojej przynależności, a obiekt swoje związki
 * z instytucjami. Widoki parafii odczytują te relacje odwrotnie, niczego nie dublując.
 */
import type { Ksiega, Miejsce, Obiekt } from './archiwum'

export function miejscowosciInstytucji<M extends Pick<Miejsce, 'id' | 'parafie'>>(instytucja: string, miejsca: M[]) {
    return miejsca.map((m) => ({
        miejsce: m,
        okresy: m.parafie.filter((r) => r.parafia === instytucja).map((r) => ({ od: r.od, do: r.do })),
    })).filter((m) => m.okresy.length > 0)
}

export function obiektyInstytucji<O extends Pick<Obiekt, 'id' | 'instytucje'>>(instytucja: string, obiekty: O[]) {
    return obiekty.map((obiekt) => ({
        obiekt,
        relacje: (obiekt.instytucje ?? []).filter((r) => r.parafia === instytucja),
    })).filter((o) => o.relacje.length > 0)
}

/** Księga jest liczona raz, choć może wskazywać wiele instytucji. */
export function ksiegiInstytucji<K extends Pick<Ksiega, 'id' | 'instytucje' | 'parafia'>>(instytucja: string, ksiegi: K[]): K[] {
    const widziane = new Set<string>()
    return ksiegi.filter((k) => {
        if (!(k.instytucje.includes(instytucja) || k.parafia === instytucja) || widziane.has(k.id)) return false
        widziane.add(k.id)
        return true
    })
}

/** Bez dopowiadania dat z okresu istnienia parafii albo roczników ksiąg. */
export function zapiszOkres(od: number | null, doRoku: number | null): string {
    if (od !== null && doRoku !== null) return `${od}–${doRoku}`
    if (od !== null) return `od ${od}`
    if (doRoku !== null) return `do ${doRoku}`
    return 'okres nieustalony'
}

/** Osoba związana z instytucją (pole „Osoby związane z instytucją” w panelu; `zrodlo` – PAR-06, P3). */
export type OsobaInstytucji = { nazwa: string; rola: string; okres: string; idOsoby: string; zrodlo: string }

/** PAR-06 (P3, zasada 1.5): odnośnik do karty osoby tylko wtedy, gdy czytelnik może ją zobaczyć – inaczej samo imię i nazwisko z karty instytucji. */
export function osobyInstytucjiDlaCzytelnika(osoby: OsobaInstytucji[], widoczna: (id: string) => boolean): (OsobaInstytucji & { href?: string })[] {
    return osoby.map((o) => (o.idOsoby && widoczna(o.idOsoby) ? { ...o, href: `/osoby/${encodeURIComponent(o.idOsoby)}` } : o))
}

/** PPL-04/05 (P3): funkcje osoby we wszystkich instytucjach – odnośnik zwrotny na karcie osoby. Wyznanie należy do instytucji (funkcji),
 *  nigdy nie jest przypisywane osobie. Kolejność: instytucje w kolejności listy, w instytucji – kolejność wpisów. */
export function funkcjeOsoby<I extends { id: string; nazwa: string; wyznanie: string; osoby?: OsobaInstytucji[] }>(id: string, instytucje: I[]) {
    return instytucje.flatMap((instytucja) => (instytucja.osoby ?? []).filter((o) => o.idOsoby === id).map((o) => ({ rola: o.rola, okres: o.okres, zrodlo: o.zrodlo, instytucja })))
}
