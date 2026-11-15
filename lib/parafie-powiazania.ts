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
