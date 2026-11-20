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
import { RamkaFiltrow } from './RamkaFiltrow'
import Komunikat from './Komunikat'
import { odmiana } from '@/lib/tekst'

type Miejsce = { id: string; nazwa: string; inneNazwy: string[]; formy: string[]; parafie: { parafia: string; od: number | null; do: number | null }[] }
type Parafia = { id: string; nazwa: string; wyznanie: string; siedziba: string | null; czas: string; diecezja: string }
type Props = {
    ksiegi: Ksiega[]; miejscowosci: Miejsce[]; parafie: Parafia[]; wyznaniaObecne: string[]
    widokPoczatkowy?: string; wyznaniePoczatkowe?: string
    skanyPoczatkowe: boolean; miejscePoczatkowe?: string; frazaPoczatkowa?: string
}
const liczbaKsieg = (n: number) => odmiana(n, ['księga', 'księgi', 'ksiąg'])

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

    const [filtryOtwarte, ustawFiltryOtwarte] = useState(true)
    return (
        <div>
            {/* DZL-01 (P2): panel „szukaj i filtruj w księgach” w tej samej ramce co w pozostałych katalogach; filtrowanie nadal lokalne */}
            {/* 20.11 (wariant A): pole miejscowości w pasku ramki, filtry (widok, wyznanie, digitalizacja) pod „filtry ▾” – domyślnie rozwinięte */}
            <RamkaFiltrow otwarte={filtryOtwarte} naZmiane={ustawFiltryOtwarte} aktywnych={[wyznanie, tylkoSkany].filter(Boolean).length}
                pole={(waski) => miejscowosci.length > 0 ? <>
                    <PoleSzukania
                        id="ks-miejsce-szukaj" etykieta="szukaj" obszar="szukaj miejscowości w księgach"
                        value={fraza} onChange={zmienFraze} onSubmit={zmienFraze}
                        placeholder={waski ? 'szukaj w księgach: miejscowość…' : 'szukaj w księgach: miejscowość (min. 2 litery)…'}
                        className="k-filtry-pole"
                    />
                    {fraza && <span className="k-filtry-pasek-info">
                        <button type="button" onClick={() => zmienFraze('')} className="szukaj-filtr" aria-label="wyczyść wyszukiwanie miejscowości">wyczyść</button>
                        {aktywneSzukanie && <span className="kk-male">{znalezioneMiejsca.length === 1 ? '1 miejscowość' : odmiana(znalezioneMiejsca.length, ['miejscowość', 'pasujące miejscowości', 'pasujących miejscowości'])}</span>}
                        {fraza.trim() && !aktywneSzukanie && <span className="kk-male">wpisz co najmniej 2 litery</span>}
                    </span>}
                </> : <span className="k-filtry-tytul">szukaj i filtruj w księgach</span>}>
                    <div className="k-filtry kk-panel">
                        <nav aria-label="sposób przeglądania ksiąg" className="k-seg kk-widok">
                            <Link href={adres({ widok: undefined })} aria-current={widok === 'miejscowosci' ? 'page' : undefined}>według miejscowości</Link>
                            <Link href={adres({ widok: 'parafie' })} aria-current={widok === 'parafie' ? 'page' : undefined}>według parafii / urzędu</Link>
                        </nav>
                        {wyznaniaObecne.length > 1 && (
                            <div className="kk-rzad">
                                <span className="kk-male">wyznanie:</span>
                                <div className="kk-wyznania">
                                    <Link href={adres({ wyznanie: undefined })} className="szukaj-filtr" aria-current={!wyznanie ? 'true' : undefined}>wszystkie</Link>
                                    {wyznaniaObecne.map((w) => <Link key={w} href={adres({ wyznanie: w })} className="szukaj-filtr" aria-current={wyznanie === w ? 'true' : undefined}>{WYZNANIA_PARAFII[w]}</Link>)}
                                </div>
                            </div>
                        )}
                        <div className="kk-rzad">
                            <span className="kk-male">digitalizacja:</span>
                            <Link href={adres({ skany: tylkoSkany ? undefined : '1' })} className="szukaj-filtr" aria-current={tylkoSkany ? 'true' : undefined}>{tylkoSkany ? '✓ ' : ''}tylko ze skanami online</Link>
                        </div>
                    </div>
            </RamkaFiltrow>
            <p className="ot-drobne" aria-live="polite">
                {liczbaKsieg(ksiegiFiltrowane.length)} · {odmiana(bloki.length, ['grupa', 'grupy', 'grup'])}
                {widok === 'miejscowosci' && ksiegiFiltrowane.length > 0 && ' · jedna księga może dotyczyć kilku miejscowości'}
            </p>
            {!ksiegiFiltrowane.length && (
                <Komunikat rodzaj="pusto" tytul={aktywneSzukanie ? 'nie znaleziono ksiąg przypisanych do wpisanej miejscowości.' : 'dla wybranych filtrów nie ma jeszcze opisanych ksiąg.'}>
                    <p>{aktywneSzukanie ? 'Spróbuj krótszej nazwy lub innej pisowni.' : 'Brak wpisu nie oznacza, że księga się nie zachowała.'}</p>
                    <p className="k-kom-akcje"><Link href="/biblioteka/ksiegi">wyczyść filtry</Link><Link href="/szukaj">szukaj w całym serwisie</Link></p>
                </Komunikat>
            )}
            <OtworzGrupeKsiegi idParafii={idParafii} />
            <div className="kk-lista">
                {bloki.map((g, i) => {
                    const par = widok === 'parafie' && !g.nieprzypisane ? parafiePoId.get(g.id) : null
                    const nazwa = g.nieprzypisane
                        ? (widok === 'miejscowosci' ? 'bez ustalonej miejscowości' : 'instytucja nieustalona')
                        : g.element?.nazwa ?? g.id
                    return (
                        <details key={`${widok}-${g.id}`} id={widok === 'parafie' && par ? par.id : `grupa-${g.id}`}
                            open={aktywneSzukanie || (bloki.length === 1 && i === 0)}
                            className="border-b border-[var(--linia-podzialu)]">
                            <summary className="kk-grupa-naglowek">
                                <strong>{nazwa}</strong>
                                <span className="kk-male kk-grupa-liczba">{liczbaKsieg(g.ksiegi.length)}</span>
                            </summary>
                            <div className="rozwin-tresc">
                            <div className="kk-grupa-tresc">
                                {g.nieprzypisane && <p className="kk-male">Brak potwierdzonego powiązania w danych. Księgi pozostają dostępne w katalogu, zamiast znikać z wyników.</p>}
                                {par && (
                                    <p className="kk-male">
                                        {[WYZNANIA_PARAFII[par.wyznanie] ?? par.wyznanie, par.czas && `okres: ${formatujEdtf(par.czas)}`, par.diecezja].filter(Boolean).join(' · ')}
                                        {par.siedziba && nazwyMiejsc[par.siedziba] && <> · siedziba: <Link href={`/miejsca/${par.siedziba}`} className="odn">{nazwyMiejsc[par.siedziba]}</Link></>}
                                        {' · '}<Link href={`/parafie/${par.id}`} className="odn">karta parafii / urzędu →</Link>
                                    </p>
                                )}
                                <PasekLat ksiegi={g.ksiegi} />
                                <TabelaKsiag ksiegi={g.ksiegi} nazwyMiejsc={nazwyMiejsc} nazwyParafii={nazwyParafii} kotwiceKsieg={g.kotwice}
                                    kontekst={g.nieprzypisane ? undefined : widok === 'miejscowosci' ? { miejsce: g.id } : { instytucja: g.id }} />
                            </div>
                            </div>
                        </details>
                    )
                })}
            </div>
        </div>
    )
}
