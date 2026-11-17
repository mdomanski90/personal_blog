import * as React from 'react'

/**
 * DZL-01 (P2, decyzja 17.11): jedna kolejność strony działu we wszystkich katalogach – archiwum, biblioteka,
 * publikacje, księgi, słownik: (tytuł) → spis działów → wstęp → panel „szukaj i filtruj w …” → wybrane filtry →
 * licznik → lista / siatka → strony. Kolejność żyje tylko tutaj; strony przekazują elementy w nazwanych miejscach.
 * Część czysta (bez Next.js), żeby test mógł sprawdzić kolejność renderem.
 */
export const KOLEJNOSC_DZIALU = ['spis', 'wstep', 'panel', 'wybrane', 'licznik', 'tresc', 'stronicowanie'] as const
export type ElementDzialu = typeof KOLEJNOSC_DZIALU[number]
export type ElementyDzialuProps = Partial<Record<ElementDzialu, React.ReactNode>>

export function ElementyDzialu(props: ElementyDzialuProps) {
    return <>{KOLEJNOSC_DZIALU.map((k) => props[k] ? <React.Fragment key={k}>{props[k]}</React.Fragment> : null)}</>
}
