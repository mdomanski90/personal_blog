'use client'
// P6b (PD-20): własne okno wyboru w bloku „Materiał z archiwum” – zamiast wbudowanej listy A–Z Keystatic.
// Na górze 5 ostatnio dodanych/zmienionych materiałów z miniaturami, pod spodem szukanie (też z miniaturami).
// Zapis bez zmian: pole „id” to dalej fields.relationship (parse / serialize / validate / reader), podmieniony jest tylko widok
// (keystatic.config.ts). Okno jest częścią formularza bloku (bez drugiego okna modalnego nad oknem Keystatic).
// Typ BasicFormField jest eksportowany przez @keystatic/core, ale nieudokumentowany – test zrzutów po każdej aktualizacji Keystatic.
import * as React from 'react'
import type { FormFieldInputProps } from '@keystatic/core'
import { ostatnieMaterialy, szukajMaterialow, type MaterialDoWyboru } from '@/lib/panel/wybor-materialu'

const WIDOCZNOSC: Record<string, string> = { publiczne: 'publiczny', bliscy: 'dla bliskich', ja: 'tylko ja' }

function Miniatura({ m }: { m: Pick<MaterialDoWyboru, 'podglad'> | undefined }) {
    const [blad, ustawBlad] = React.useState(false)
    if (!m?.podglad || blad) return <span className="wm-mini wm-mini-brak" aria-hidden="true">bez podglądu</span>
    // eslint-disable-next-line @next/next/no-img-element -- podgląd z API panelu (za hasłem), bez optymalizacji Next
    return <img className="wm-mini" src={m.podglad} alt="" loading="lazy" onError={() => ustawBlad(true)} />
}

const linia = (m: MaterialDoWyboru) => [m.rodzaj, m.czas, WIDOCZNOSC[m.widocznosc] ?? m.widocznosc].filter(Boolean).join(' · ')

export function WyborMaterialu({ value, onChange, autoFocus, forceValidation }: FormFieldInputProps<string | null>) {
    const [lista, ustawListe] = React.useState<MaterialDoWyboru[] | null>(null)
    const [blad, ustawBlad] = React.useState('')
    const [otwarte, ustawOtwarte] = React.useState(value === null)
    const [q, ustawQ] = React.useState('')
    const id = React.useId()
    const pole = React.useRef<HTMLInputElement>(null)
    const zmien = React.useRef<HTMLButtonElement>(null)

    React.useEffect(() => {
        let trwa = true
        fetch('/api/keystatic/materialy', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((d: MaterialDoWyboru[]) => { if (trwa) ustawListe(d) })
            .catch(() => { if (trwa) ustawBlad('Nie udało się wczytać listy materiałów – odśwież stronę.') })
        return () => { trwa = false }
    }, [])
    React.useEffect(() => { if (otwarte && autoFocus) pole.current?.focus() }, [otwarte, autoFocus])

    const wybrany = value ? lista?.find((m) => m.id === value) : undefined
    const pozycje = lista ? (q.trim() ? szukajMaterialow(lista, q) : ostatnieMaterialy(lista)) : []
    const wybierz = (m: MaterialDoWyboru) => {
        onChange(m.id); ustawOtwarte(false); ustawQ('')
        requestAnimationFrame(() => zmien.current?.focus()) // fokus na „zmień” – nie ginie po zamknięciu listy (zasada 5.3)
    }

    return (
        <div className="wm" role="group" aria-labelledby={`${id}-e`}>
            <span className="wm-etykieta" id={`${id}-e`}>Materiał</span>
            {value && (
                <div className="wm-wybrany">
                    <Miniatura m={wybrany} />
                    <span className="wm-tekst">
                        <span className="wm-nazwa">{wybrany?.nazwa ?? value}</span>
                        <span className="wm-linia">{wybrany ? linia(wybrany) : lista ? 'nie ma takiego materiału – wybierz inny' : 'wczytuję…'}</span>
                    </span>
                    <button ref={zmien} type="button" className="wm-btn" aria-expanded={otwarte} aria-controls={`${id}-okno`} onClick={() => { ustawOtwarte((o) => !o); requestAnimationFrame(() => pole.current?.focus()) }}>
                        {otwarte ? 'zwiń' : 'zmień'}
                    </button>
                </div>
            )}
            {otwarte && (
                <div className="wm-okno" id={`${id}-okno`}>
                    <input ref={pole} className="wm-szukaj" type="search" value={q} onChange={(e) => ustawQ(e.target.value)}
                        placeholder="szukaj: nazwa, rok, rodzaj…" aria-label="szukaj materiału" aria-describedby={`${id}-p`} />
                    <span className="wm-podpis" id={`${id}-p`} role="status">
                        {!lista ? (blad || 'wczytuję…') : q.trim() ? (pozycje.length ? `wyniki: ${pozycje.length}${pozycje.length === 30 ? ' (pierwsze 30 – zawęź)' : ''}` : 'nic nie pasuje') : 'ostatnio dodane lub zmienione'}
                    </span>
                    {pozycje.length > 0 && (
                        <ul className="wm-lista">
                            {pozycje.map((m) => (
                                <li key={m.id}>
                                    <button type="button" className="wm-poz" aria-pressed={m.id === value} onClick={() => wybierz(m)}>
                                        <Miniatura m={m} />
                                        <span className="wm-tekst"><span className="wm-nazwa">{m.nazwa}</span><span className="wm-linia">{linia(m)}</span></span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            {forceValidation && !value && <span className="wm-blad" role="alert">Wybierz materiał.</span>}
        </div>
    )
}
