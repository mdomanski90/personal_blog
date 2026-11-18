// P4 (PD-11): podkłady mapy poza „dziś” i Atlasem IH PAN – np. arkusze map WIG 1:100 000 (1930–1939).
// Podkład pojawia się na mapie dopiero, gdy wpis w public/podklady/podklady.json ma adres kafelków i JAWNIE wpisaną licencję
// (właściciel potwierdza licencję i dostarcza arkusz); do tego czasu plik jest pustą listą [] i przycisku nie ma.
// Czysta funkcja – test: lib/podklady.test.ts.

export interface Podklad {
    id: string
    /** napis na przycisku, np. „mapa WIG 1:100 000 (1930–1939)” */
    etykieta: string
    /** adres kafelków rastrowych z {z}/{x}/{y} (własne, z naszego serwera) */
    kafelki: string
    minzoom?: number
    maxzoom?: number
    /** skąd pochodzi mapa, np. „Wojskowy Instytut Geograficzny, arkusz P40 S36 (1937)” */
    zrodlo: string
    /** licencja skanu – musi być wpisana, inaczej podkład się nie pokazuje */
    licencja: string
}

const niepusty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

/** Podkłady gotowe do pokazania: kompletny wpis (etykieta, kafelki z {z}/{x}/{y}, źródło) i niepusta licencja. */
export function podkladyDoPokazania(lista: unknown): Podklad[] {
    if (!Array.isArray(lista)) return []
    const ids = new Set<string>()
    const wynik: Podklad[] = []
    for (const p of lista as Record<string, unknown>[]) {
        if (!p || typeof p !== 'object') continue
        if (!niepusty(p.id) || !niepusty(p.etykieta) || !niepusty(p.kafelki) || !niepusty(p.zrodlo) || !niepusty(p.licencja)) continue
        if (!/\{z\}/.test(p.kafelki) || !/\{x\}/.test(p.kafelki) || !/\{y\}/.test(p.kafelki)) continue
        if (ids.has(p.id)) continue
        ids.add(p.id)
        wynik.push({
            id: p.id, etykieta: p.etykieta, kafelki: p.kafelki, zrodlo: p.zrodlo, licencja: p.licencja,
            ...(typeof p.minzoom === 'number' ? { minzoom: p.minzoom } : {}), ...(typeof p.maxzoom === 'number' ? { maxzoom: p.maxzoom } : {}),
        })
    }
    return wynik
}

/** Wiersz źródła pod mapą dla wybranego podkładu: „podkład: <źródło> – licencja: <licencja>”. */
export const zrodloPodkladu = (p: Podklad): string => `podkład: ${p.zrodlo} – licencja: ${p.licencja}`
