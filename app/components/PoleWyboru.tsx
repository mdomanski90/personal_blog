'use client'

import * as React from 'react'
import { normalizuj } from '@/lib/tekst'

/** Jedna pozycja do wyboru. `szukaj` – dodatkowe nazwy (np. dawne), po których też można znaleźć pozycję. */
export type OpcjaWyboru = { id: string; nazwa: string; opis?: string; szukaj?: string[] }

const MIN_LITER = 2
const MAKS_PODPOWIEDZI = 12

/**
 * P7A-2b: pole z podpowiedziami zamiast długiej listy rozwijanej (wzorzec ARIA combobox).
 * Wpisujesz co najmniej 2 litery (polskie znaki bez znaczenia) → lista pasujących pozycji;
 * strzałki wybierają, Enter zatwierdza, Esc zamyka. Wybrana pozycja pokazuje się jako pastylka z ✕.
 * Ukryte pole `name` sprawia, że wartość trafia też do zwykłego formularza GET.
 */
export default function PoleWyboru({ name, etykieta, opcje, wartosc, naZmiane, placeholder = 'wpisz min. 2 litery…' }: {
    name: string
    etykieta: string
    opcje: OpcjaWyboru[]
    wartosc: string
    naZmiane: (id: string) => void
    placeholder?: string
}) {
    const uid = React.useId()
    const idListy = `${uid}-lista`
    const [tekst, ustawTekst] = React.useState('')
    const [otwarta, ustawOtwarta] = React.useState(false)
    const [aktywna, ustawAktywna] = React.useState(-1)
    const pole = React.useRef<HTMLInputElement>(null)

    const indeks = React.useMemo(() => opcje.map((o) => ({ o, klucz: normalizuj([o.nazwa, ...(o.szukaj ?? [])].join(' ')) })), [opcje])
    const wybrana = wartosc ? opcje.find((o) => o.id === wartosc) : undefined

    const zapytanie = normalizuj(tekst)
    const pasujace = React.useMemo(() => {
        if (zapytanie.length < MIN_LITER) return []
        const slowa = zapytanie.split(' ')
        const traf = indeks.filter(({ klucz }) => slowa.every((s) => klucz.includes(s)))
        // najpierw te, których nazwa zaczyna się od wpisanego tekstu
        traf.sort((a, b) => Number(!a.klucz.startsWith(zapytanie)) - Number(!b.klucz.startsWith(zapytanie)))
        return traf.map((t) => t.o)
    }, [indeks, zapytanie])
    const widoczne = pasujace.slice(0, MAKS_PODPOWIEDZI)

    const wybierz = (o: OpcjaWyboru) => {
        naZmiane(o.id)
        ustawTekst('')
        ustawOtwarta(false)
    }
    const wyczysc = () => {
        naZmiane('')
        // po usunięciu wracamy do pola, żeby można było od razu wpisać nową wartość
        requestAnimationFrame(() => pole.current?.focus())
    }

    const klawisz = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); ustawOtwarta(true); ustawAktywna((a) => Math.min(a + 1, widoczne.length - 1)) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); ustawAktywna((a) => Math.max(a - 1, -1)) }
        else if (e.key === 'Enter') { const o = widoczne[Math.max(aktywna, 0)]; if (otwarta && o) { e.preventDefault(); wybierz(o) } }
        else if (e.key === 'Escape') { if (otwarta) { e.preventDefault(); ustawOtwarta(false) } }
    }

    const komunikat = zapytanie.length < MIN_LITER
        ? ''
        : pasujace.length === 0 ? 'brak pasujących pozycji'
            : pasujace.length > MAKS_PODPOWIEDZI ? `${pasujace.length} pasujących – pokazano ${MAKS_PODPOWIEDZI}, wpisz więcej liter`
                : `${pasujace.length} ${pasujace.length === 1 ? 'pozycja' : 'pozycji'}`

    return (
        <div className="k-etykieta k-wybor">
            <label htmlFor={`${uid}-pole`}>{etykieta}</label>
            <input type="hidden" name={name} value={wartosc} />
            {wybrana ? (
                <span className="k-wybor-wartosc">
                    <span className="k-btn k-btn--pastylka k-wybor-pastylka">
                        <span>{wybrana.nazwa}</span>
                        <button type="button" onClick={wyczysc} aria-label={`usuń filtr: ${etykieta} ${wybrana.nazwa}`}>✕</button>
                    </span>
                </span>
            ) : (
                <span className="k-wybor-ramka">
                    <input
                        ref={pole}
                        id={`${uid}-pole`}
                        className="k-pole"
                        type="text"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={otwarta && widoczne.length > 0}
                        aria-controls={idListy}
                        aria-activedescendant={otwarta && widoczne[aktywna] ? `${uid}-o${aktywna}` : undefined}
                        autoComplete="off"
                        placeholder={placeholder}
                        value={tekst}
                        onChange={(e) => { ustawTekst(e.target.value); ustawOtwarta(true); ustawAktywna(-1) }}
                        onFocus={() => ustawOtwarta(true)}
                        onBlur={() => setTimeout(() => ustawOtwarta(false), 120)}
                        onKeyDown={klawisz}
                    />
                    {otwarta && widoczne.length > 0 && (
                        <ul id={idListy} role="listbox" aria-label={etykieta} className="k-wybor-lista">
                            {widoczne.map((o, i) => (
                                <li key={o.id} id={`${uid}-o${i}`} role="option" aria-selected={i === aktywna}
                                    onMouseDown={(e) => { e.preventDefault(); wybierz(o) }}
                                    onMouseEnter={() => ustawAktywna(i)}>
                                    <span>{o.nazwa}</span>{o.opis && <span className="k-wybor-opis">{o.opis}</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                    <span className="sr-only" role="status" aria-live="polite">{otwarta ? komunikat : ''}</span>
                </span>
            )}
        </div>
    )
}
