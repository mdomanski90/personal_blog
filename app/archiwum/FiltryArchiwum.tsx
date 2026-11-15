'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import PoleWyboru, { type OpcjaWyboru } from '../components/PoleWyboru'

export type WartosciFiltrow = { q: string; rodzaj: string; miejsce: string; temat: string; obiekt: string; osoba: string; zbior: string; od: string; do: string; sort: string }
const KLUCZE: (keyof WartosciFiltrow)[] = ['q', 'rodzaj', 'miejsce', 'temat', 'obiekt', 'osoba', 'zbior', 'od', 'do', 'sort']
const OPOZNIENIE = 450

const rokPoprawny = (s: string) => s === '' || /^-?\d{1,4}$/.test(s)

/** Ten sam adres co dotychczasowy formularz GET: puste pola pomijamy, numer strony zawsze od nowa. */
function adres(w: WartosciFiltrow): string {
    const p = new URLSearchParams()
    const czyste: WartosciFiltrow = { ...w, q: w.q.trim().length >= 2 ? w.q.trim() : '', od: rokPoprawny(w.od) ? w.od : '', do: rokPoprawny(w.do) ? w.do : '' }
    for (const k of KLUCZE) if (czyste[k] && !(k === 'sort' && czyste[k] === 'data_rosnaco')) p.set(k, czyste[k])
    const s = p.toString()
    return s ? `/archiwum?${s}` : '/archiwum'
}

/**
 * P7A-2b: filtrowanie archiwum na żywo. Wybór z listy lub podpowiedzi – od razu; fraza i lata – po
 * krótkiej przerwie w pisaniu (fraza od 2 liter). Adres strony zmienia się tak jak przy formularzu,
 * więc odnośniki i „wstecz” działają. Bez JavaScriptu działa zwykły przycisk „filtruj”.
 */
export default function FiltryArchiwum({ poczatkowe, rodzaje, miejscowosci, tematy, obiekty, osoby, zbiory }: {
    poczatkowe: WartosciFiltrow
    rodzaje: [string, string][]
    miejscowosci: OpcjaWyboru[]
    tematy: OpcjaWyboru[]
    obiekty: OpcjaWyboru[]
    osoby: OpcjaWyboru[]
    zbiory: OpcjaWyboru[]
}) {
    const router = useRouter()
    const [w, ustawW] = React.useState(poczatkowe)
    const [czeka, startTransition] = React.useTransition()
    const zegar = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const ostatni = React.useRef(adres(poczatkowe))

    // po „wstecz” serwer przysyła inne wartości – formularz idzie za adresem (ale nie nadpisuje tego, co właśnie piszesz)
    const adresSerwera = adres(poczatkowe)
    React.useEffect(() => {
        if (adresSerwera !== ostatni.current) { ustawW(poczatkowe); ostatni.current = adresSerwera }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adresSerwera])

    const zastosuj = React.useCallback((nowe: WartosciFiltrow, zastap = false) => {
        const cel = adres(nowe)
        if (cel === ostatni.current) return
        ostatni.current = cel
        // wybór z listy = nowy krok w historii („wstecz” go cofa); pisanie = podmiana adresu, bez zaśmiecania historii
        startTransition(() => (zastap ? router.replace(cel, { scroll: false }) : router.push(cel, { scroll: false })))
    }, [router])

    const zmien = (k: keyof WartosciFiltrow, v: string, zaraz = true) => {
        const nowe = { ...w, [k]: v }
        ustawW(nowe)
        if (zegar.current) clearTimeout(zegar.current)
        if (zaraz) { zastosuj(nowe); return }
        zegar.current = setTimeout(() => {
            const fraza = nowe.q.trim()
            if (fraza.length === 1) return
            if (!rokPoprawny(nowe.od) || !rokPoprawny(nowe.do)) return
            zastosuj({ ...nowe, q: fraza }, true)
        }, OPOZNIENIE)
    }
    React.useEffect(() => () => { if (zegar.current) clearTimeout(zegar.current) }, [])

    return (
        <form method="get" action="/archiwum" className="k-filtry" aria-busy={czeka}
            onSubmit={(e) => { e.preventDefault(); if (zegar.current) clearTimeout(zegar.current); zastosuj({ ...w, q: w.q.trim() }) }}>
            <label className="k-etykieta k-filtry-szeroki">szukaj w metadanych i transkrypcjach
                <input name="q" type="search" value={w.q} onChange={(e) => zmien('q', e.target.value, false)} className="k-pole" placeholder="wpisz frazę (min. 2 litery)…" />
            </label>
            <label className="k-etykieta">rodzaj
                <select name="rodzaj" value={w.rodzaj} onChange={(e) => zmien('rodzaj', e.target.value)} className="k-pole">
                    <option value="">wszystkie</option>{rodzaje.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </label>
            <PoleWyboru name="miejsce" etykieta="miejscowość" opcje={miejscowosci} wartosc={w.miejsce} naZmiane={(v) => zmien('miejsce', v)} />
            <PoleWyboru name="obiekt" etykieta="obiekt" opcje={obiekty} wartosc={w.obiekt} naZmiane={(v) => zmien('obiekt', v)} />
            <PoleWyboru name="osoba" etykieta="osoba" opcje={osoby} wartosc={w.osoba} naZmiane={(v) => zmien('osoba', v)} />
            <PoleWyboru name="temat" etykieta="temat" opcje={tematy} wartosc={w.temat} naZmiane={(v) => zmien('temat', v)} />
            <PoleWyboru name="zbior" etykieta="zbiór" opcje={zbiory} wartosc={w.zbior} naZmiane={(v) => zmien('zbior', v)} />
            <span className="k-filtry-lata">
                <label className="k-etykieta">od roku<input name="od" value={w.od} onChange={(e) => zmien('od', e.target.value.trim(), false)} inputMode="numeric" className="k-pole" placeholder="1750" /></label>
                <label className="k-etykieta">do roku<input name="do" value={w.do} onChange={(e) => zmien('do', e.target.value.trim(), false)} inputMode="numeric" className="k-pole" placeholder="1918" /></label>
            </span>
            <label className="k-etykieta">sortowanie
                <select name="sort" value={w.sort || 'data_rosnaco'} onChange={(e) => zmien('sort', e.target.value)} className="k-pole">
                    <option value="data_rosnaco">chronologicznie</option><option value="data_malejaco">od najnowszych</option>
                    <option value="tytul">tytuł A–Z</option><option value="dodano">ostatnio dodane</option>
                </select>
            </label>
            <span className="k-filtry-akcje">
                <noscript><button type="submit" className="k-btn k-btn--glowny">filtruj</button></noscript>
                <button type="button" className="odn k-filtry-wyczysc" onClick={() => { const puste = Object.fromEntries(KLUCZE.map((k) => [k, ''])) as WartosciFiltrow; ustawW(puste); zastosuj(puste) }}>wyczyść wszystko</button>
                {czeka && <span className="k-podpowiedz" role="status">wczytuję…</span>}
            </span>
        </form>
    )
}
