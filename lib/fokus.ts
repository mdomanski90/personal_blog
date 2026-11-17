/**
 * P1 · VIEW-01/03: czyste funkcje dla okien na całą stronę i pełnego ekranu (test: lib/fokus.test.ts).
 * Hook uwięzienia fokusu: `useUwiezionyFokus` w lib/ruch.ts (obok `useFokusPowrotu`).
 */

/**
 * Pułapka fokusu: indeks elementu, na który ma trafić Tab (albo Shift+Tab) w oknie z `n` elementami.
 * `biezacy` = indeks elementu z fokusem albo -1, gdy fokus jest poza oknem. Okno bez elementów → null.
 */
export function nastepnyWPulapce(n: number, biezacy: number, wstecz: boolean): number | null {
    if (n <= 0) return null
    if (biezacy < 0) return wstecz ? n - 1 : 0
    return wstecz ? (biezacy - 1 + n) % n : (biezacy + 1) % n
}

export interface Prostokat { x: number; y: number; w: number; h: number }

/** Czy punkt (piksele pola widoku) leży poza prostokątem obrazu – kliknięcie w puste tło pełnego ekranu zamyka go (VIEW-01). Brzeg należy do obrazu. */
export function punktPozaProstokatem(r: Prostokat, x: number, y: number): boolean {
    return x < r.x || y < r.y || x > r.x + r.w || y > r.y + r.h
}
