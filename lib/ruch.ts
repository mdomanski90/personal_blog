/**
 * 5A · system ruchu (UX-01, PD-18) – jedno źródło czasów ruchu dla kodu w przeglądarce.
 * Tokeny są w app/globals.css (:root): --ruch-szybki 0,25 s, --ruch-sredni 0,4 s, --ruch-wolny 0,5 s,
 * --ruch-krzywa cubic-bezier(.4, 0, .2, 1); przy ograniczeniu ruchu (prefers-reduced-motion) wszystkie 0 s.
 * Tu: czas tokenu odczytany z CSS (0 przy ograniczeniu ruchu), krzywa dla animacji liczonych w JS (widok planu),
 * przewijanie z warunkiem, zmiana motywu jednym wygaszeniem i powrót fokusu po zamknięciu okna na całą stronę.
 * Test: lib/ruch.test.ts (także „zero czasów ruchu spoza tokenów” w CSS i plikach publicznych).
 */
import * as React from 'react'

export type TokenRuchu = 'szybki' | 'sredni' | 'wolny'

/** Wartości tokenów w ms – muszą być równe app/globals.css (test); używane, gdy CSS nie jest dostępny. */
export const TOKENY_MS: Record<TokenRuchu, number> = { szybki: 250, sredni: 400, wolny: 500 }
/** Punkty kontrolne --ruch-krzywa (cubic-bezier). */
export const KRZYWA: readonly [number, number, number, number] = [0.4, 0, 0.2, 1]

/** "0.25s" / "250ms" / " 0s " → ms; nieczytelna wartość → null. */
export function naMilisekundy(wartosc: string): number | null {
    const m = /^\s*(-?\d*\.?\d+)\s*(ms|s)\s*$/.exec(wartosc)
    if (!m) return null
    const n = parseFloat(m[1]) * (m[2] === 's' ? 1000 : 1)
    return Number.isFinite(n) && n >= 0 ? n : null
}

/** Czy czytelnik prosi o ograniczenie ruchu (poza przeglądarką: nie). */
export function bezRuchu(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Czas tokenu w ms, odczytany z CSS; 0 przy ograniczeniu ruchu. */
export function czasRuchu(token: TokenRuchu): number {
    if (bezRuchu()) return 0
    if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return TOKENY_MS[token]
    const z = naMilisekundy(getComputedStyle(document.documentElement).getPropertyValue(`--ruch-${token}`))
    return z ?? TOKENY_MS[token]
}

/** Wartość krzywej cubic-bezier(x1, y1, x2, y2) dla postępu t ∈ [0, 1] (jak w CSS: szukamy parametru dla x = t). */
export function krzywa(t: number, [x1, y1, x2, y2]: readonly [number, number, number, number] = KRZYWA): number {
    if (t <= 0) return 0
    if (t >= 1) return 1
    const bx = (s: number) => 3 * x1 * s * (1 - s) ** 2 + 3 * x2 * s * s * (1 - s) + s ** 3
    const by = (s: number) => 3 * y1 * s * (1 - s) ** 2 + 3 * y2 * s * s * (1 - s) + s ** 3
    let lo = 0, hi = 1, s = t
    for (let i = 0; i < 40; i++) {
        s = (lo + hi) / 2
        if (bx(s) < t) lo = s
        else hi = s
    }
    return by(s)
}

/**
 * Animacja wartości liczonej w JS (np. viewBox planu) w czasie tokenu i po --ruch-krzywa.
 * Czas 0 (ograniczenie ruchu) – od razu wartość końcowa. Zwraca funkcję przerywającą (kółko, palce, przeciąganie).
 */
export function animuj(token: TokenRuchu, krok: (postep: number) => void): () => void {
    const czas = czasRuchu(token)
    if (czas <= 0 || typeof requestAnimationFrame !== 'function') { krok(1); return () => {} }
    let id = 0
    const start = performance.now()
    const klatka = (teraz: number) => {
        const t = Math.min(1, (teraz - start) / czas)
        krok(krzywa(t))
        if (t < 1) id = requestAnimationFrame(klatka)
    }
    id = requestAnimationFrame(klatka)
    return () => cancelAnimationFrame(id)
}

/** --ruch-krzywa jako tekst CSS (dla Web Animations API). */
export function krzywaCss(): string {
    const z = typeof document !== 'undefined' && typeof getComputedStyle === 'function'
        ? getComputedStyle(document.documentElement).getPropertyValue('--ruch-krzywa').trim() : ''
    return z || `cubic-bezier(${KRZYWA.join(', ')})`
}

/** Wejście wygaszeniem elementu, który zmienił treść bez ponownego zamontowania (np. lista po filtrach). */
export function pojaw(el: Element, token: TokenRuchu = 'sredni'): void {
    const czas = czasRuchu(token)
    if (czas <= 0 || typeof (el as HTMLElement).animate !== 'function') return
    ;(el as HTMLElement).animate([{ opacity: 0 }, { opacity: 1 }], { duration: czas, easing: krzywaCss() })
}

/** Płynne przewijanie (spis treści, „do góry”, transkrypcja, drzewo); przy ograniczeniu ruchu – skok. */
export function przewin(cel: Element | Window, opcje: ScrollToOptions = {}): void {
    const behavior: ScrollBehavior = bezRuchu() ? 'auto' : 'smooth'
    cel.scrollTo({ ...opcje, behavior })
}
export function przewinDo(el: Element, opcje: ScrollIntoViewOptions = {}): void {
    el.scrollIntoView({ ...opcje, behavior: bezRuchu() ? 'auto' : 'smooth' })
}
export function przewinO(cel: Element, opcje: ScrollToOptions): void {
    cel.scrollBy({ ...opcje, behavior: bezRuchu() ? 'auto' : 'smooth' })
}

/**
 * Zmiana całej strony jednym wygaszeniem (zmiana motywu) – document.startViewTransition, jak przejście stron;
 * czas z --ruch-wolny w ::view-transition (globals.css). Przy ograniczeniu ruchu i bez View Transitions – od razu.
 * `zmiana` musi zmienić DOM synchronicznie (np. flushSync).
 */
export function zmienZWygaszeniem(zmiana: () => void): void {
    const d = typeof document !== 'undefined' ? (document as Document & { startViewTransition?: (cb: () => void) => unknown }) : null
    if (!d || bezRuchu() || typeof d.startViewTransition !== 'function') { zmiana(); return }
    d.startViewTransition(zmiana)
}

/**
 * Okna na całą stronę i pełny ekran (zasada 5.3): przy otwarciu zapamiętuje element z fokusem i przenosi fokus
 * do okna (`wejscie`, np. „zamknij”), przy zamknięciu (otwarte → false albo odmontowanie) przywraca fokus.
 * `zapasowy` – gdy okno otwarto kliknięciem w element bez fokusu (np. w skan), fokus wraca na wskazany przycisk
 * (szukany przy zamknięciu).
 */
export function useFokusPowrotu(otwarte: boolean, opcje: { wejscie?: () => HTMLElement | null | undefined; zapasowy?: () => HTMLElement | null | undefined } = {}): void {
    const op = React.useRef(opcje)
    op.current = opcje
    React.useEffect(() => {
        if (!otwarte) return
        const aktywny = document.activeElement
        const zrodlo = aktywny instanceof HTMLElement && aktywny !== document.body ? aktywny : null
        op.current.wejscie?.()?.focus({ preventScroll: true })
        return () => { przywrocFokus(zrodlo ?? op.current.zapasowy?.()) }
    }, [otwarte])
}

/** Fokus na element, jeśli nadal jest w dokumencie (bez przewijania strony). */
export function przywrocFokus(el: { isConnected?: boolean; focus: (o?: FocusOptions) => void } | null | undefined): boolean {
    if (!el || el.isConnected === false) return false
    el.focus({ preventScroll: true })
    // wyjście z pełnego ekranu przeglądarki kończy się później i zabiera fokus – po nim jeszcze raz
    if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.addEventListener('fullscreenchange', () => { if (el.isConnected !== false) el.focus({ preventScroll: true }) }, { once: true })
    }
    return true
}
