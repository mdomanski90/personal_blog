/**
 * P1 · UX-04, D-UX-NEW-04: jeden wzorzec zakładek (WAI-ARIA tabs) dla skanu z tekstem, planu i kolejnych miejsc.
 * Czyste funkcje (test: lib/dostepnosc.test.ts); komponent: app/components/Zakladki.tsx.
 * Aktywna zakładka jest w kolejności Tab (tabIndex 0), pozostałe osiągalne strzałkami, Home i End.
 */

/** Zakładka po naciśnięciu klawisza (strzałki zawijają, Home/End na krańce); inny klawisz → null. */
export function zakladkaKlawisza<T>(lista: readonly T[], biezaca: T, klawisz: string): T | null {
    const i = lista.indexOf(biezaca), n = lista.length
    if (!n) return null
    if (klawisz === 'ArrowRight' || klawisz === 'ArrowDown') return lista[(i + 1) % n]
    if (klawisz === 'ArrowLeft' || klawisz === 'ArrowUp') return lista[(i - 1 + n) % n]
    if (klawisz === 'Home') return lista[0]
    if (klawisz === 'End') return lista[n - 1]
    return null
}

/** Identyfikator zakładki (`karta`) albo jej panelu (`panel`) – powiązane przez aria-controls / aria-labelledby. */
export function idZakladki(prefix: string, id: string, rola: 'karta' | 'panel'): string {
    return rola === 'karta' ? `${prefix}-zakl-${id}` : `${prefix}-panel-${id}`
}
