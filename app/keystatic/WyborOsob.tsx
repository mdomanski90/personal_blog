'use client'
// Decyzja 22.11: okno wyboru osób z drzewa w Keystatic – „Powiązane osoby” w materiale (lista) i blok „Drzewo osoby” (jedna osoba).
// Zapis bez zmian: identyfikatory osób (lista albo tekst); numer „OS-…” wpisany dawniej ręcznie też działa (lib/osoby/powiazane.ts).
// Lista z /api/keystatic/osoby?wybor=1 – przefiltrowana uprawnieniami konta (osoby żyjące, „tylko ja”). Wygląd: klasy .wm (panel.css),
// jak okno wyboru materiału (WyborMaterialu.tsx).
import * as React from 'react'
import type { FormFieldInputProps } from '@keystatic/core'
import { opisOsoby, szukajOsob, type OsobaDoWyboru } from '@/lib/panel/wybor-osob'
import { parsujNr } from '@/lib/katalog/model'

function useOsoby() {
    const [lista, ustawListe] = React.useState<OsobaDoWyboru[] | null>(null)
    const [blad, ustawBlad] = React.useState('')
    React.useEffect(() => {
        let trwa = true
        fetch('/api/keystatic/osoby?wybor=1', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((d: OsobaDoWyboru[]) => { if (trwa) ustawListe(d) })
            .catch(() => { if (trwa) ustawBlad('Nie udało się wczytać listy osób – odśwież stronę.') })
        return () => { trwa = false }
    }, [])
    return { lista, blad }
}

/** Osoba dla zapisanego wpisu: identyfikator albo nr kat. „OS-…”. */
function znajdz(lista: OsobaDoWyboru[] | null, wpis: string): { o?: OsobaDoWyboru; zNumeru: boolean } {
    if (!lista) return { zNumeru: false }
    const o = lista.find((x) => x.id === wpis)
    if (o) return { o, zNumeru: false }
    const nr = parsujNr(wpis)
    const zn = nr ? lista.find((x) => x.nr === nr) : undefined
    return { o: zn, zNumeru: !!zn }
}

function Wybrana({ wpis, lista, przycisk }: { wpis: string; lista: OsobaDoWyboru[] | null; przycisk: React.ReactNode }) {
    const { o, zNumeru } = znajdz(lista, wpis)
    return (
        <div className="wm-wybrany">
            <span className="wm-tekst">
                <span className="wm-nazwa">{o?.nazwa ?? wpis}</span>
                <span className="wm-linia">
                    {o ? [opisOsoby(o), zNumeru ? `zapisano numerem ${wpis}` : ''].filter(Boolean).join(' · ') : lista ? 'nie ma takiej osoby w drzewie (albo nie masz do niej dostępu) – usuń albo wybierz inną' : 'wczytuję…'}
                </span>
            </span>
            {przycisk}
        </div>
    )
}

function OknoSzukania({ id, lista, blad, wybrane, wybierz, pole }: {
    id: string; lista: OsobaDoWyboru[] | null; blad: string; wybrane: Set<string>; wybierz: (o: OsobaDoWyboru) => void; pole: React.RefObject<HTMLInputElement | null>
}) {
    const [q, ustawQ] = React.useState('')
    const pozycje = lista && q.trim() ? szukajOsob(lista, q) : []
    return (
        <div className="wm-okno" id={`${id}-okno`}>
            <input ref={pole} className="wm-szukaj" type="search" value={q} onChange={(e) => ustawQ(e.target.value)}
                placeholder="szukaj: imię i nazwisko, rok, miejscowość, OS-…" aria-label="szukaj osoby" aria-describedby={`${id}-p`} />
            <span className="wm-podpis" id={`${id}-p`} role="status">
                {!lista ? (blad || 'wczytuję…') : q.trim() ? (pozycje.length ? `wyniki: ${pozycje.length}${pozycje.length === 30 ? ' (pierwsze 30 – zawęź)' : ''}` : 'nic nie pasuje') : `osób w drzewie: ${lista.length} – wpisz, kogo szukasz`}
            </span>
            {pozycje.length > 0 && (
                <ul className="wm-lista">
                    {pozycje.map((o) => (
                        <li key={o.id}>
                            <button type="button" className="wm-poz" aria-pressed={wybrane.has(o.id)} disabled={wybrane.has(o.id)} onClick={() => wybierz(o)}>
                                <span className="wm-tekst"><span className="wm-nazwa">{o.nazwa}</span><span className="wm-linia">{[opisOsoby(o), wybrane.has(o.id) ? 'już wybrana' : ''].filter(Boolean).join(' · ')}</span></span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

/** Materiał – „Powiązane osoby”: lista identyfikatorów. */
export function WyborOsob({ value, onChange, autoFocus }: FormFieldInputProps<string[]>) {
    const { lista, blad } = useOsoby()
    const [otwarte, ustawOtwarte] = React.useState(false)
    const id = React.useId()
    const pole = React.useRef<HTMLInputElement>(null)
    const dodaj = React.useRef<HTMLButtonElement>(null)
    React.useEffect(() => { if (otwarte) pole.current?.focus() }, [otwarte])
    React.useEffect(() => { if (autoFocus) dodaj.current?.focus() }, [autoFocus])
    const wybrane = new Set(value.map((w) => znajdz(lista, w).o?.id ?? w))
    const wybierz = (o: OsobaDoWyboru) => {
        if (!wybrane.has(o.id)) onChange([...value, o.id])
        ustawOtwarte(false)
        requestAnimationFrame(() => dodaj.current?.focus()) // fokus wraca na „dodaj” (zasada 5.3)
    }
    const usun = (i: number) => {
        onChange(value.filter((_, j) => j !== i))
        requestAnimationFrame(() => dodaj.current?.focus())
    }
    return (
        <div className="wm" role="group" aria-labelledby={`${id}-e`} aria-describedby={`${id}-o`}>
            <span className="wm-etykieta" id={`${id}-e`}>Powiązane osoby</span>
            <span className="wm-podpis" id={`${id}-o`}>Osoby z drzewa – karta materiału pokaże je (tylko te, które czytelnik może widzieć), a karta osoby pokaże ten materiał.</span>
            {value.map((w, i) => (
                <Wybrana key={`${w}-${i}`} wpis={w} lista={lista}
                    przycisk={<button type="button" className="wm-btn" onClick={() => usun(i)} aria-label={`usuń: ${znajdz(lista, w).o?.nazwa ?? w}`}>usuń</button>} />
            ))}
            <div>
                <button ref={dodaj} type="button" className="wm-btn" aria-expanded={otwarte} aria-controls={`${id}-okno`} onClick={() => ustawOtwarte((o) => !o)}>
                    {otwarte ? 'zwiń' : value.length ? '+ dodaj kolejną osobę' : '+ dodaj osobę'}
                </button>
            </div>
            {otwarte && <OknoSzukania id={id} lista={lista} blad={blad} wybrane={wybrane} wybierz={wybierz} pole={pole} />}
        </div>
    )
}

/** Blok „Drzewo osoby” – jedna osoba (pole tekstowe z identyfikatorem). */
export function WyborOsoby({ value, onChange, autoFocus, forceValidation }: FormFieldInputProps<string>) {
    const { lista, blad } = useOsoby()
    const [otwarte, ustawOtwarte] = React.useState(!value)
    const id = React.useId()
    const pole = React.useRef<HTMLInputElement>(null)
    const zmien = React.useRef<HTMLButtonElement>(null)
    React.useEffect(() => { if (otwarte && autoFocus) pole.current?.focus() }, [otwarte, autoFocus])
    const wybierz = (o: OsobaDoWyboru) => {
        onChange(o.id); ustawOtwarte(false)
        requestAnimationFrame(() => zmien.current?.focus())
    }
    const biezaca = value ? znajdz(lista, value).o?.id ?? value : ''
    return (
        <div className="wm" role="group" aria-labelledby={`${id}-e`}>
            <span className="wm-etykieta" id={`${id}-e`}>Osoba</span>
            {value && (
                <Wybrana wpis={value} lista={lista}
                    przycisk={<button ref={zmien} type="button" className="wm-btn" aria-expanded={otwarte} aria-controls={`${id}-okno`} onClick={() => { ustawOtwarte((o) => !o); requestAnimationFrame(() => pole.current?.focus()) }}>{otwarte ? 'zwiń' : 'zmień'}</button>} />
            )}
            {otwarte && <OknoSzukania id={id} lista={lista} blad={blad} wybrane={new Set(biezaca ? [biezaca] : [])} wybierz={wybierz} pole={pole} />}
            {forceValidation && !value && <span className="wm-blad" role="alert">Wybierz osobę.</span>}
        </div>
    )
}
