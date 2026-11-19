// P6b (PD-20): logika okna wyboru materiału w bloku „Materiał z archiwum” (bez React) – widok: app/keystatic/WyborMaterialu.tsx.
import { normalizuj } from '../tekst'

export interface MaterialDoWyboru { id: string; nazwa: string; rodzaj: string; rodzajNazwa?: string; czas: string; widocznosc: string; podglad: string | null; zmieniono: string | null }

export const ILE_OSTATNICH = 5
export const ILE_WYNIKOW = 30

/** 5 ostatnio dodanych lub zmienionych (czas zmiany pliku opisu); bez czasu – na końcu. */
export function ostatnieMaterialy(L: MaterialDoWyboru[], ile = ILE_OSTATNICH): MaterialDoWyboru[] {
    return [...L].filter((m) => m.zmieniono).sort((a, b) => (b.zmieniono! < a.zmieniono! ? -1 : b.zmieniono! > a.zmieniono! ? 1 : 0)).slice(0, ile)
}

/** Szukanie po nazwie, identyfikatorze, rodzaju i dacie – każde słowo musi wystąpić (bez polskich znaków). */
export function szukajMaterialow(L: MaterialDoWyboru[], q: string, ile = ILE_WYNIKOW): MaterialDoWyboru[] {
    const slowa = normalizuj(q).split(' ').filter(Boolean)
    if (!slowa.length) return []
    return L.filter((m) => { const t = normalizuj(`${m.nazwa} ${m.id} ${m.rodzaj} ${m.rodzajNazwa ?? ''} ${m.czas}`); return slowa.every((s) => t.includes(s)) }).slice(0, ile)
}
