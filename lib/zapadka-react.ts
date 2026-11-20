/**
 * P7c (SRW-01): zapadka ostrzeżeń reguł kompilatora React (`react-hooks/*` z eslint-plugin-react-hooks 6+).
 * Decyzja właściciela 20.11.2026: bez masowych poprawek – liczba ostrzeżeń w pliku nie może rosnąć, nowy plik ma 0;
 * poprawiamy przy okazji zmian w danym pliku i wtedy obniżamy zapadkę (`npm run lint -- --zapisz`).
 * Czysta logika (bez fs i bez eslint) – sprawdza ją test jednostkowy; liczy scripts/lint.ts w jednym przebiegu eslint.
 */
export const PREFIKS_REGUL = 'react-hooks/'

/** plik (ścieżka względna, z „/”) → reguła → liczba ostrzeżeń */
export type Liczby = Record<string, Record<string, number>>
export interface ZapadkaReact { opis: string; pliki: Liczby }

export interface Komunikat { ruleId: string | null; severity: number }
export interface WynikPliku { plik: string; komunikaty: Komunikat[] }

/** Liczby ostrzeżeń `react-hooks/*` w plikach (pliki bez ostrzeżeń pominięte, klucze posortowane – stabilny zapis). */
export function policzReact(wyniki: WynikPliku[]): Liczby {
    const L: Liczby = {}
    for (const w of [...wyniki].sort((a, b) => a.plik.localeCompare(b.plik))) {
        const r: Record<string, number> = {}
        for (const k of w.komunikaty) if (k.ruleId?.startsWith(PREFIKS_REGUL)) r[k.ruleId] = (r[k.ruleId] ?? 0) + 1
        const klucze = Object.keys(r).sort()
        if (klucze.length) L[w.plik] = Object.fromEntries(klucze.map((x) => [x, r[x]]))
    }
    return L
}

export const suma = (L: Liczby) => Object.values(L).reduce((s, r) => s + Object.values(r).reduce((a, b) => a + b, 0), 0)

/** Porównanie z zapadką: `wzrost` – pliki/reguły, w których przybyło (błąd budowania); `spadek` – można obniżyć zapadkę. */
export function porownaj(zapadka: Liczby, teraz: Liczby): { wzrost: string[]; spadek: string[] } {
    const wzrost: string[] = [], spadek: string[] = []
    for (const [plik, r] of Object.entries(teraz)) {
        for (const [regula, n] of Object.entries(r)) {
            const bylo = zapadka[plik]?.[regula] ?? 0
            if (n > bylo) wzrost.push(`${plik} ${regula}: ${bylo} → ${n}`)
        }
    }
    for (const [plik, r] of Object.entries(zapadka)) {
        for (const [regula, bylo] of Object.entries(r)) {
            const n = teraz[plik]?.[regula] ?? 0
            if (n < bylo) spadek.push(`${plik} ${regula}: ${bylo} → ${n}`)
        }
    }
    return { wzrost, spadek }
}
