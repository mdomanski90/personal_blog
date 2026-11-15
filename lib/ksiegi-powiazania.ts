// Jedyna reguła relacji księga ↔ miejscowość; używana przez bibliotekę, kartę miejsca i wyszukiwarkę.
// Niezależne od komponentów React/Next – można testować bez połączenia z serwerem.
import { nakladaSie } from './ksiegi'

export interface KsiegaPowiazania {
    parafia: string
    instytucje?: string[]
    miejsca: string[]
    zakresy: [number, number][]
}
export interface MiejscePowiazania {
    id: string
    parafie: { parafia: string; od: number | null; do: number | null }[]
}

/**
 * Jawny wybór wsi przy księdze ma pierwszeństwo (także poza datami przynależności).
 * Gdy lista miejsc jest pusta, księga dotyczy wsi tylko podczas udokumentowanej
 * przynależności do parafii/urzędu. Brak OBU granic nie jest dowodem przynależności.
 * Nie wnioskujemy przynależności z istnienia parafii ani z samych dat ksiąg.
 */
export function ksiegaDotyczyMiejsca(k: KsiegaPowiazania, m: MiejscePowiazania): boolean {
    if (k.miejsca.length > 0) return k.miejsca.includes(m.id)
    return m.parafie.some((p) =>
        (p.parafia === k.parafia || (k.instytucje ?? []).includes(p.parafia)) &&
        (p.od !== null || p.do !== null) &&
        k.zakresy.length > 0 &&
        nakladaSie(k.zakresy, p.od, p.do),
    )
}
