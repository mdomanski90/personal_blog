// KRT-03 (P3, rekomendacja przyjęta 17.11): lista pochowanych – nazwisko z napisu nagrobka (wersaliki, jak na kamieniu) obok zapisu z drzewa,
// tylko gdy się różnią. Czysta funkcja (bez Reacta) – wspólna dla listy i testów.

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')

/** Pierwsza linia napisu z nazwą (pomija „Ś.P.”, „Tu spoczywa”). */
export function liniaNazwyNapisu(napis: string | undefined): string | null {
    if (!napis?.trim()) return null
    const linie = napis.split('\n').map((l) => l.trim()).filter(Boolean)
    return linie.find((l) => /\p{L}{3,}/u.test(l) && !/^(ś\.?\s*†?\s*p\.?|tu spoczywa|tu spoczywaj[ąa])/i.test(l)) ?? null
}

/** Zapis z napisu do pokazania obok nazwiska z drzewa – null, gdy napis zawiera to nazwisko (bez polskich znaków i wielkości liter). */
export function napisObok(napis: string | undefined, nazwisko: string): string | null {
    const linia = liniaNazwyNapisu(napis)
    if (!linia || !nazwisko.trim()) return null
    const slowa = norm(linia).split(/[^a-z0-9-]+/).filter(Boolean)
    return slowa.includes(norm(nazwisko.trim())) ? null : linia
}
