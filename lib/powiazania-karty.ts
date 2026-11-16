// JW-16: odnośniki do osób i instytucji w wierszach karty – zawsze z nazwą, nigdy z samym identyfikatorem
// (błąd stwierdzony w renderze 16.11: karta materiału pokazywała identyfikatory w wierszach „osoby” i „instytucje”).
import { nazwaOsoby, type Osoba } from './osoby/model'

export interface OdnosnikOsoby { id: string; href: string; nazwa: string; plec: string }
export interface OdnosnikInstytucji { id: string; href: string; nazwa: string }

/** Osoby z listy identyfikatorów: tylko istniejące i widoczne dla czytelnika, z imieniem i nazwiskiem. */
export function odnosnikiOsob(ids: readonly string[], osoby: ReadonlyMap<string, Pick<Osoba, 'imiona' | 'nazwisko' | 'plec'>>, widoczna: (id: string) => boolean): OdnosnikOsoby[] {
    const wyn: OdnosnikOsoby[] = []
    for (const id of new Set(ids)) {
        const o = osoby.get(id)
        if (!o || !widoczna(id)) continue
        wyn.push({ id, href: `/osoby/${id}`, nazwa: nazwaOsoby(o), plec: o.plec })
    }
    return wyn
}

/** Instytucje (parafie / urzędy) z listy identyfikatorów: tylko znane, z nazwą. */
export function odnosnikiInstytucji(ids: readonly string[], instytucje: readonly { id: string; nazwa: string }[]): OdnosnikInstytucji[] {
    const m = new Map(instytucje.map((p) => [p.id, p.nazwa]))
    const wyn: OdnosnikInstytucji[] = []
    for (const id of new Set(ids)) {
        const nazwa = m.get(id)
        if (nazwa) wyn.push({ id, href: `/parafie/${id}`, nazwa })
    }
    return wyn
}
