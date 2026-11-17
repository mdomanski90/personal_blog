'use client'
// P1 · UX-04, D-UX-NEW-04: jedyna lista zakładek serwisu (WAI-ARIA tabs). Skan z tekstem, przeglądarka planu i kolejne miejsca
// używają jej zamiast własnych `role="tab"` (test w lib/dostepnosc.test.ts). Aktywna zakładka w kolejności Tab, pozostałe – strzałki,
// Home i End; wybrana zakładka wskazuje swój panel (aria-controls; panele pozostałych nie są w dokumencie), panel – zakładkę (aria-labelledby, `atrybutyPanelu`).
import * as React from 'react'
import { idZakladki, zakladkaKlawisza } from '@/lib/zakladki'

export function atrybutyPanelu(prefix: string, aktywna: string) {
    return { id: idZakladki(prefix, aktywna, 'panel'), role: 'tabpanel' as const, 'aria-labelledby': idZakladki(prefix, aktywna, 'karta') }
}

export function ListaZakladek<T extends string>({ prefix, etykieta, zakladki, aktywna, ustaw, className = 'dok-grupa' }: {
    /** unikalny w obrębie strony (np. z React.useId) – identyfikatory zakładek i paneli */
    prefix: string
    /** nazwa listy dla czytnika ekranu */
    etykieta: string
    zakladki: readonly { id: T; etykieta: string }[]
    aktywna: T
    ustaw: (id: T) => void
    className?: string
}) {
    const klawisz = (e: React.KeyboardEvent) => {
        const nowa = zakladkaKlawisza(zakladki.map((z) => z.id), aktywna, e.key)
        if (!nowa) return
        e.preventDefault()
        ustaw(nowa)
        document.getElementById(idZakladki(prefix, nowa, 'karta'))?.focus()
    }
    return (
        <span className={className} role="tablist" aria-label={etykieta} onKeyDown={klawisz}>
            {zakladki.map((z) => (
                <button key={z.id} id={idZakladki(prefix, z.id, 'karta')} type="button" role="tab" aria-selected={aktywna === z.id}
                    aria-controls={aktywna === z.id ? idZakladki(prefix, z.id, 'panel') : undefined} tabIndex={aktywna === z.id ? 0 : -1} onClick={() => ustaw(z.id)}>{z.etykieta}</button>
            ))}
        </span>
    )
}
