'use client'

import { useMemo, useState } from 'react'
import { Link } from 'next-view-transitions'
import type { Ksiega } from '@/lib/archiwum'
import { filtrujKatalog, grupujWedlugMiejsc, grupujWedlugParafii, ksiegiDotyczaceMiejsc, szukajMiejscowosci, widokKatalogu, czyFiltrowacMiejsca } from '@/lib/ksiegi-katalog'
import { WYZNANIA_PARAFII } from '@/lib/ksiegi'
import { formatujEdtf } from '@/lib/edtf'
import { PasekLat, TabelaKsiag } from './Ksiegi'
import OtworzGrupeKsiegi from './OtworzGrupeKsiegi'
import PoleSzukania from './PoleSzukania'

type Miejsce = { id: string; nazwa: string; inneNazwy: string[]; formy: string[]; parafie: { parafia: string; od: number | null; do: number | null }[] }
type Parafia = { id: string; nazwa: string; wyznanie: string; siedziba: string | null; czas: string; diecezja: string }
type Props = {
    ksiegi: Ksiega[]; miejscowosci: Miejsce[]; parafie: Parafia[]; wyznaniaObecne: string[]
    widokPoczatkowy?: string; wyznaniePoczatkowe?: string
    skanyPoczatkowe: boolean; miejscePoczatkowe?: string; frazaPoczatkowa?: string
}
const male = { fontSize: 'calc(13px * var(--font-scale, 1))' }
const liczbaKsieg = (n: number) => `${n} ${n === 1 ? 'księga' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'księgi' : 'ksiąg'}`

/** Lokalny filtr: bez wysyłania zapytań, przeładowywania strony ani drugiego indeksu. */
export default function KatalogKsiegiNaZywo({ ksiegi, miejscowosci, parafie, wyznaniaObecne, widokPoczatkowy, wyznaniePoczatkowe, skanyPoczatkowe, miejscePoczatkowe, frazaPoczatkowa }: Props) {
    const widok = widokKatalogu(widokPoczatkowy)
    const wyznanie = wyznaniePoczatkowe
    const tylkoSkany = skanyPoczatkowe
    const poczatkoweMiejsce = miejscowosci.find((m) => m.id === miejscePoczatkowe)
    const [fraza, setFraza] = useState(frazaPoczatkowa ?? poczatkoweMiejsce?.nazwa ?? '')
    // ?miejsce=slug ze starszych odnośników pozostaje dokładnym filtrem do czasu edycji pola.
    const [dokladneId, setDokladneId] = useState(frazaPoczatkowa === undefined && poczatkoweMiejsce ? poczatkoweMiejsce.id : null)

    const aktywneSzukanie = czyFiltrowacMiejsca(fraza, dokladneId)
    const znalezioneMiejsca = useMemo(() => {
        if (!aktywneSzukanie) return miejscowosci
        return dokladneId ? miejscowosci.filter((m) => m.id === dokladneId) : szukajMiejscowosci(miejscowosci, fraza)
    }, [aktywneSzukanie, dokladneId, fraza, miejscowosci])
    const ksiegiFiltrowane = useMemo(() => {
        const baza = filtrujKatalog(ksiegi, parafie, wyznanie, null, tylkoSkany)
        return aktywneSzukanie ? ksiegiDotyczaceMiejsc(baza, znalezioneMiejsca) : baza
    }, [ksiegi, parafie, wyznanie, tylkoSkany, aktywneSzukanie, znalezioneMiejsca])
    const bloki = useMemo(() => {
        const w = widok === 'miejscowosci'
            ? grupujWedlugMiejsc(ksiegiFiltrowane, aktywneSzukanie ? znalezioneMiejsca : miejscowosci)
            : grupujWedlugParafii(ksiegiFiltrowane, parafie)
        const grupy = [
            ...w.grupy.map((g) => ({ ...g, nieprzypisane: false })),
            ...(w.bezPrzypisania.length ? [{ id: 'nieprzypisane', element: null, ksiegi: w.bezPrzypisania, nieprzypisane: true }] : []),
        ]
        // Bez powtarzania id HTML dla ksiąg należących do wielu grup.
        const zKotwicami = new Set<string>()
        return grupy.map((g) => {
            const kotwice = new Set<string>()
            for (const k of g.ksiegi) if (!zKotwicami.has(k.id)) { zKotwicami.add(k.id); kotwice.add(k.id) }
            return { ...g, kotwice }
        })
    }, [widok, ksiegiFiltrowane, aktywneSzukanie, znalezioneMiejsca, miejscowosci, parafie])

    const nazwyMiejsc = useMemo(() => Object.fromEntries(miejscowosci.map((m) => [m.id, m.nazwa])), [miejscowosci])
    const nazwyParafii = useMemo(() => Object.fromEntries(parafie.map((p) => [p.id, p.nazwa])), [parafie])
    const parafiePoId = useMemo(() => new Map(parafie.map((p) => [p.id, p])), [parafie])
    const idParafii = useMemo(() => parafie.map((p) => p.id), [parafie])

    const adres = (zmiany: Record<string, string | undefined>) => {
        const stan = {
            widok: widok === 'parafie' ? 'parafie' : undefined, wyznanie,
            miejsce: dokladneId ?? undefined, q: !dokladneId && fraza.trim() ? fraza.trim() : undefined,
            skany: tylkoSkany ? '1' : undefined, ...zmiany,
        }
        const q = new URLSearchParams()
        for (const [k, v] of Object.entries(stan)) if (v) q.set(k, v)
        return `/biblioteka/ksiegi${q.toString() ? `?${q.toString()}` : ''}`
    }
    const zmienFraze = (nowa: string) => {
        const tekst = nowa.slice(0, 120)
        setFraza(tekst)
        setDokladneId(null)
        // Adres jest użyteczny po odświeżeniu lub podzieleniu się wynikiem.
        // Modyfikacja historii nie wysyła żądania i nie przeładowuje katalogu.
        const url = new URL(window.location.href)
        url.searchParams.delete('miejsce')
        if (tekst.trim()) url.searchParams.set('q', tekst.trim())
        else url.searchParams.delete('q')
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    }

    return (
        <div>
            <nav aria-label="sposób przeglądania ksiąg" className="flex flex-wrap" style={{ gap: 8, marginBottom: 4 }}>
                <Link href={adres({ widok: undefined })} aria-current={widok === 'miejscowosci' ? 'page' : undefined} className="szukaj-filtr" style={{ fontWeight: widok === 'miejscowosci' ? 700 : 400 }}>według miejscowości</Link>
                <Link href={adres({ widok: 'parafie' })} aria-current={widok === 'parafie' ? 'page' : undefined} className="szukaj-filtr" style={{ fontWeight: widok === 'parafie' ? 700 : 400 }}>według parafii / urzędu</Link>
            </nav>
            <div className="flex flex-col" style={{ gap: 10 }}>
                {wyznaniaObecne.length > 1 && (
                    <div className="flex flex-wrap items-center" style={{ gap: 10 }}>
                        <span className="text-gray-600 dark:text-gray-400" style={male}>wyznanie:</span>
                        <div className="flex flex-wrap" style={{ gap: 7 }}>
                            <Link href={adres({ wyznanie: undefined })} className="szukaj-filtr" aria-current={!wyznanie ? 'true' : undefined}>{!wyznanie ? <b>wszystkie</b> : 'wszystkie'}</Link>
                            {wyznaniaObecne.map((w) => <Link key={w} href={adres({ wyznanie: w })} className="szukaj-filtr" aria-current={wyznanie === w ? 'true' : undefined}>{wyznanie === w ? <b>{WYZNANIA_PARAFII[w]}</b> : WYZNANIA_PARAFII[w]}</Link>)}
                        </div>
                    </div>
                )}
                {miejscowosci.length > 0 && (
                    <div className="flex flex-wrap items-center" style={{ gap: 10, fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                        <PoleSzukania
                            id="ks-miejsce-szukaj" etykieta="miejscowość"
                            value={fraza} onChange={zmienFraze} onSubmit={zmienFraze}
                            placeholder="wpisz min. 2 litery miejscowości…"
                            style={{ width: 'min(100%, 420px)' }}
                        />
                        {fraza && <button type="button" onClick={() => zmienFraze('')} className="szukaj-filtr" aria-label="wyczyść wyszukiwanie miejscowości">wyczyść</button>}
                        {aktywneSzukanie && <span className="text-gray-600 dark:text-gray-400" style={male}>{znalezioneMiejsca.length} {znalezioneMiejsca.length === 1 ? 'miejscowość' : 'pasujących miejscowości'}</span>}
                        {fraza.trim() && !aktywneSzukanie && <span className="text-gray-600 dark:text-gray-400" style={male}>wpisz co najmniej 2 litery</span>}
                    </div>
                )}
                <div className="flex flex-wrap items-center" style={{ gap: 10, ...male }}>
                    <span className="text-gray-600 dark:text-gray-400">digitalizacja:</span>
                    <Link href={adres({ skany: tylkoSkany ? undefined : '1' })} className="szukaj-filtr" aria-current={tylkoSkany ? 'true' : undefined}>{tylkoSkany ? '✓ ' : ''}tylko ze skanami online</Link>
                </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400" aria-live="polite" style={{ ...male, margin: '10px 0 4px' }}>
                {liczbaKsieg(ksiegiFiltrowane.length)} · {bloki.length} {bloki.length === 1 ? 'grupa' : 'grup'}
                {widok === 'miejscowosci' && ksiegiFiltrowane.length > 0 && ' · jedna księga może dotyczyć kilku miejscowości'}
            </p>
            {!ksiegiFiltrowane.length && (
                <p className="text-gray-600 dark:text-gray-400" role="status">
                    {aktywneSzukanie ? 'Nie znaleziono ksiąg przypisanych do wpisanej miejscowości. Spróbuj krótszej nazwy lub innej pisowni.' : 'Dla wybranych filtrów nie ma jeszcze opisanych ksiąg. Brak wpisu nie oznacza, że księga się nie zachowała.'}
                    {' '}<Link href="/biblioteka/ksiegi">wyczyść filtry</Link>
                </p>
            )}
            <OtworzGrupeKsiegi idParafii={idParafii} />
            <div className="flex flex-col" style={{ gap: 0 }}>
                {bloki.map((g, i) => {
                    const par = widok === 'parafie' && !g.nieprzypisane ? parafiePoId.get(g.id) : null
                    const nazwa = g.nieprzypisane
                        ? (widok === 'miejscowosci' ? 'bez ustalonej miejscowości' : 'instytucja nieustalona')
                        : g.element?.nazwa ?? g.id
                    return (
                        <details key={`${widok}-${g.id}`} id={widok === 'parafie' && par ? par.id : `grupa-${g.id}`}
                            open={aktywneSzukanie || (bloki.length === 1 && i === 0)}
                            className="border-b border-[#e7e2d8] dark:border-[#374151]">
                            <summary className="cursor-pointer py-3" style={{ fontSize: 'calc(16px * var(--font-scale, 1))' }}>
                                <strong>{nazwa}</strong>
                                <span className="text-gray-600 dark:text-gray-400" style={{ ...male, marginLeft: 12 }}>{liczbaKsieg(g.ksiegi.length)}</span>
                            </summary>
                            <div className="flex flex-col" style={{ gap: 10, padding: '2px 0 18px 14px' }}>
                                {g.nieprzypisane && <p className="text-gray-600 dark:text-gray-400" style={male}>Brak potwierdzonego powiązania w danych. Księgi pozostają dostępne w katalogu, zamiast znikać z wyników.</p>}
                                {par && (
                                    <p className="text-gray-600 dark:text-gray-400" style={{ ...male, margin: 0 }}>
                                        {[WYZNANIA_PARAFII[par.wyznanie] ?? par.wyznanie, par.czas && formatujEdtf(par.czas), par.diecezja].filter(Boolean).join(' · ')}
                                        {par.siedziba && nazwyMiejsc[par.siedziba] && <> · siedziba: <Link href={`/miejsca/${par.siedziba}`} className="odn">{nazwyMiejsc[par.siedziba]}</Link></>}
                                        {' · '}<Link href={`/parafie/${par.id}`} className="odn">karta parafii / urzędu →</Link>
                                    </p>
                                )}
                                <PasekLat ksiegi={g.ksiegi} />
                                <TabelaKsiag ksiegi={g.ksiegi} nazwyMiejsc={nazwyMiejsc} nazwyParafii={nazwyParafii} kotwiceKsieg={g.kotwice} />
                            </div>
                        </details>
                    )
                })}
            </div>
        </div>
    )
}
