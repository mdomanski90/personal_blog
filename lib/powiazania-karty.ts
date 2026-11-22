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

/** Decyzja 22.11: zdjęcie osoby z archiwum (gdy brak portretu) – fotografia ze skanem przypięta do osoby, najstarsza (bez daty – na końcu). */
export function zdjecieOsoby<M extends { id: string; nazwa: string; rodzaj: string; strony: { adres: string }[] }>(mats: M[], lata: (m: M) => [number, number] | null): { material: M; adres: string } | null {
    const zdj = mats.filter((m) => m.rodzaj === 'zdjecie' && m.strony.some((s) => s.adres.startsWith('/pliki/strony/')))
        .sort((a, b) => (lata(a)?.[0] ?? Infinity) - (lata(b)?.[0] ?? Infinity) || a.nazwa.localeCompare(b.nazwa, 'pl'))
    const m = zdj[0]
    return m ? { material: m, adres: m.strony.find((s) => s.adres.startsWith('/pliki/strony/'))!.adres } : null
}
