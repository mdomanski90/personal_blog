'use client'
import * as React from 'react'
import { dataWydruku, napisCss } from '@/lib/druk'

// JW-1 · JW-17: wspólne części wydruku. Reguły druku – blok „WSPÓLNY ARKUSZ DRUKU” w app/globals.css.

/**
 * Przed drukiem (także Ctrl+P) ustawia na :root zmienne: --data-wydruku, --tytul-druku (tytuł h1 strony), --adres-druku.
 * Stopka każdej kartki (pola marginesu @page, Chromium) i blok na końcu treści (każda przeglądarka) czytają je przez var().
 */
export function UstawieniaDruku() {
    React.useEffect(() => {
        const ustaw = () => {
            const s = document.documentElement.style
            const h1 = document.querySelector('main#tresc h1')
            const tytul = h1?.textContent?.trim() || document.title.replace(/\s*[·|–-]\s*odniepamieci\.pl$/, '')
            s.setProperty('--data-wydruku', napisCss(dataWydruku()))
            s.setProperty('--tytul-druku', napisCss(tytul))
            s.setProperty('--adres-druku', napisCss(location.origin + location.pathname + location.search))
        }
        window.addEventListener('beforeprint', ustaw)
        return () => window.removeEventListener('beforeprint', ustaw)
    }, [])
    return null
}

/** Przycisk „drukuj” w pasku akcji karty (obok „kopiuj link”, „jak cytować”) – jeden komponent dla wszystkich kart. */
export function PrzyciskDrukuj() {
    return (
        <button type="button" className="k-btn k-btn--s lowercase" onClick={() => window.print()} aria-label="drukuj tę stronę">
            <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 6V2.5h7V6M4.5 11.5h-2v-5h11v5h-2M4.5 9.5h7v4h-7z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
            drukuj
        </button>
    )
}
