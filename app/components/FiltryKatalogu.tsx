'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import PoleWyboru, { type OpcjaWyboru } from './PoleWyboru'
import { pojaw } from '@/lib/ruch'
import { odmiana } from '@/lib/tekst'

export type WartosciFiltrow = { q: string; rodzaj: string; miejsce: string; temat: string; obiekt: string; osoba: string; zbior: string; od: string; do: string; sort: string }
const KLUCZE: (keyof WartosciFiltrow)[] = ['q', 'rodzaj', 'miejsce', 'temat', 'obiekt', 'osoba', 'zbior', 'od', 'do', 'sort']
const PUSTE = Object.fromEntries(KLUCZE.map((k) => [k, ''])) as WartosciFiltrow
const OPOZNIENIE = 450
/** 5A: wynik filtrów pod ramką (siatka materiałów, lista pozycji, komunikat „nic nie pasuje”) – wchodzi wygaszeniem */
const WYNIK = '.siatka-miniatur, .lista-pozycji, .k-kom'

const rokPoprawny = (s: string) => s === '' || /^-?\d{1,4}$/.test(s)

/** Ten sam adres co dotychczasowy formularz GET: puste pola pomijamy, numer strony zawsze od nowa. */
function adres(baza: string, w: WartosciFiltrow, parametrDzialu: string): string {
    const p = new URLSearchParams()
    const czyste: WartosciFiltrow = { ...w, q: w.q.trim().length >= 2 ? w.q.trim() : '', od: rokPoprawny(w.od) ? w.od : '', do: rokPoprawny(w.do) ? w.do : '' }
    for (const k of KLUCZE) if (czyste[k] && !(k === 'sort' && czyste[k] === 'data_rosnaco')) p.set(k === 'rodzaj' ? parametrDzialu : k, czyste[k])
    const s = p.toString()
    return s ? `${baza}?${s}` : baza
}

/**
 * Wspólny panel „szukaj i filtruj” katalogów (archiwum, biblioteka) – jeden komponent, pola włączane ustawieniami
 * (pole bez listy opcji się nie pokazuje). P7A-2b: filtrowanie na żywo. Wybór z listy lub podpowiedzi – od razu; fraza i lata – po
 * krótkiej przerwie w pisaniu (fraza od 2 liter). Adres strony zmienia się tak jak przy formularzu,
 * więc odnośniki i „wstecz” działają. Bez JavaScriptu działa zwykły przycisk „filtruj”.
 */
export default function FiltryKatalogu({ adresBazowy, tytul, etykietaFrazy = 'szukaj w metadanych i transkrypcjach', poczatkowe: poczatkoweCzesc, miejscowosci, tematy, obiekty, osoby, zbiory, lata = true, sortowanie = true, parametrDzialu = 'rodzaj', dodatek }: {
    /** np. „/archiwum”, „/biblioteka” */
    adresBazowy: string
    /** np. „szukaj i filtruj w archiwum” */
    tytul: string
    etykietaFrazy?: string
    /** pola nieobecne = puste */
    poczatkowe: Partial<WartosciFiltrow>
    /** nazwa parametru adresu, pod którą zachowujemy wybrany dział (archiwum: „rodzaj”, biblioteka: „dzial”) */
    parametrDzialu?: string
    miejscowosci?: OpcjaWyboru[]
    tematy?: OpcjaWyboru[]
    obiekty?: OpcjaWyboru[]
    osoby?: OpcjaWyboru[]
    zbiory?: OpcjaWyboru[]
    lata?: boolean
    sortowanie?: boolean
    /** łatka P3 (plansza słownika): dodatkowe pole wewnątrz panelu pod frazą – np. pastylki rodzaju hasła */
    dodatek?: React.ReactNode
}) {
    const adresDla = (w: WartosciFiltrow) => adres(adresBazowy, w, parametrDzialu)
    const poczatkowe = { ...PUSTE, ...poczatkoweCzesc }
    const router = useRouter()
    const idFrazy = React.useId()
    const [w, ustawW] = React.useState(poczatkowe)
    const [czeka, startTransition] = React.useTransition()
    const zegar = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const ostatni = React.useRef(adresDla(poczatkowe))

    // po „wstecz” serwer przysyła inne wartości – formularz idzie za adresem (ale nie nadpisuje tego, co właśnie piszesz)
    const adresSerwera = adresDla(poczatkowe)
    React.useEffect(() => {
        if (adresSerwera !== ostatni.current) { ustawW(poczatkowe); ostatni.current = adresSerwera }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adresSerwera])

    // 5A (scena 3): po przeliczeniu filtrów nowa lista wchodzi wygaszeniem (--ruch-sredni), bez przesuwania pozycji;
    // przy ograniczeniu ruchu – od razu
    const ramka = React.useRef<HTMLDetailsElement>(null)
    const czekal = React.useRef(false)
    React.useEffect(() => {
        if (czekal.current && !czeka) {
            for (let el = ramka.current?.nextElementSibling; el; el = el.nextElementSibling) if (el.matches(WYNIK)) pojaw(el, 'sredni')
        }
        czekal.current = czeka
    }, [czeka])

    const zastosuj = React.useCallback((nowe: WartosciFiltrow, zastap = false) => {
        const cel = adresDla(nowe)
        if (cel === ostatni.current) return
        ostatni.current = cel
        // wybór z listy = nowy krok w historii („wstecz” go cofa); pisanie = podmiana adresu, bez zaśmiecania historii
        startTransition(() => (zastap ? router.replace(cel, { scroll: false }) : router.push(cel, { scroll: false })))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router, adresBazowy, parametrDzialu])

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

    // P7A-4: panel domyślnie zwinięty (zajmował za dużo miejsca); otwarty, gdy jakiś filtr jest ustawiony
    const aktywnych = KLUCZE.filter((k) => k !== 'rodzaj' && k !== 'sort' && poczatkowe[k]).length
    const [otwarte, ustawOtwarte] = React.useState(aktywnych > 0)

    return (
        <details ref={ramka} className="k-filtry-ramka" open={otwarte} onToggle={(e) => ustawOtwarte((e.currentTarget as HTMLDetailsElement).open)}>
        <summary className="k-filtry-naglowek">
            <span className="k-filtry-tytul">{tytul}</span>
            {aktywnych > 0 && <span className="k-filtry-licznik">{odmiana(aktywnych, ['filtr', 'filtry', 'filtrów'])}</span>}
            <span className="k-btn k-filtry-przelacz">{otwarte ? 'zwiń' : 'rozwiń'} <span aria-hidden="true">{otwarte ? '▴' : '▾'}</span></span>
        </summary>
        <div className="rozwin-tresc">
        <form method="get" action={adresBazowy} className="k-filtry" aria-busy={czeka}
            onSubmit={(e) => { e.preventDefault(); if (zegar.current) clearTimeout(zegar.current); zastosuj({ ...w, q: w.q.trim() }) }}>
            {/* PD-03 (P2): „szukaj” jako przycisk w ramce pola – jak PoleSzukania; klik = Enter */}
            <div className="k-etykieta k-filtry-szeroki">
                <label htmlFor={idFrazy}>{etykietaFrazy}</label>
                <span className="pole-szukania">
                    <button type="submit">szukaj</button>
                    <input id={idFrazy} name="q" type="search" value={w.q} onChange={(e) => zmien('q', e.target.value, false)} placeholder="wpisz frazę (min. 2 litery)…" />
                </span>
            </div>
            {dodatek && <div className="k-filtry-szeroki">{dodatek}</div>}
            {/* dział (rodzaj) wybiera się w spisie działów nad filtrami; tu tylko go zachowujemy */}
            <input type="hidden" name={parametrDzialu} value={w.rodzaj} />
            {miejscowosci && <PoleWyboru name="miejsce" etykieta="miejscowość" opcje={miejscowosci} wartosc={w.miejsce} naZmiane={(v) => zmien('miejsce', v)} />}
            {obiekty && <PoleWyboru name="obiekt" etykieta="obiekt" opcje={obiekty} wartosc={w.obiekt} naZmiane={(v) => zmien('obiekt', v)} />}
            {osoby && <PoleWyboru name="osoba" etykieta="osoba" opcje={osoby} wartosc={w.osoba} naZmiane={(v) => zmien('osoba', v)} />}
            {tematy && <PoleWyboru name="temat" etykieta="temat" opcje={tematy} wartosc={w.temat} naZmiane={(v) => zmien('temat', v)} />}
            {zbiory && <PoleWyboru name="zbior" etykieta="zbiór" opcje={zbiory} wartosc={w.zbior} naZmiane={(v) => zmien('zbior', v)} />}
            {lata && <span className="k-filtry-lata">
                <label className="k-etykieta">od roku<input name="od" value={w.od} onChange={(e) => zmien('od', e.target.value.trim(), false)} inputMode="numeric" className="k-pole" placeholder="1750" /></label>
                <label className="k-etykieta">do roku<input name="do" value={w.do} onChange={(e) => zmien('do', e.target.value.trim(), false)} inputMode="numeric" className="k-pole" placeholder="1918" /></label>
            </span>}
            {sortowanie && <label className="k-etykieta">sortowanie
                <select name="sort" value={w.sort || 'data_rosnaco'} onChange={(e) => zmien('sort', e.target.value)} className="k-pole">
                    <option value="data_rosnaco">chronologicznie</option><option value="data_malejaco">od najnowszych</option>
                    <option value="tytul">tytuł A–Z</option><option value="dodano">ostatnio dodane</option>
                </select>
            </label>}
            <span className="k-filtry-akcje">
                <noscript><button type="submit" className="k-btn k-btn--glowny">filtruj</button></noscript>
                <button type="button" className="odn k-filtry-wyczysc" onClick={() => { const puste = { ...PUSTE, rodzaj: w.rodzaj }; ustawW(puste); zastosuj(puste) }}>wyczyść wszystko</button>
                {czeka && <span className="k-podpowiedz" role="status">wczytuję…</span>}
            </span>
        </form>
        </div>
        </details>
    )
}
