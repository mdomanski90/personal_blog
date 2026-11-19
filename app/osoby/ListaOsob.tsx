'use client'

// Lista osób z wyszukiwaniem na żywo: każdy wpisany znak zawęża listę, litery z wynikami same się rozwijają.
// Adres strony (?q=…) aktualizowany bez przeładowania – link do wyników da się skopiować.
// P6b (PPL-03): filtry zajęcia, miejscowości (z rodzajem związku) i wyznania – liczone na serwerze z osób widocznych
// dla czytelnika; wybór zmienia adres (filtry łączą się ze sobą, z kręgiem i z wyszukiwaniem).

import * as React from 'react'
import { useRouter } from 'next/navigation'
import PoleSzukania from '../components/PoleSzukania'
import PoleWyboru from '../components/PoleWyboru'
import { normalizujDoSzukania, odmiana } from '@/lib/tekst'
import { adresOsob, type FiltryOsob, type OpcjeFiltrow } from '@/lib/osoby/fasety'
import { PastylkaFiltra, PastylkaOsoby, RzadFiltrow, WybraneFiltry } from '@/app/components/Wzorce'

/** Ile pierwszych liter katalogu jest rozwiniętych na starcie – decyzja 18.11: żadna (wcześniej, 16.11: A i B). */
const ROZWINIETE_LITERY = 0

export interface OsobaNaLiscie { id: string; nazwa: string; plec: string; opis: string; biogram?: string; litera: string; szukaj: string }
export interface KragNaLiscie { id: string; nazwa: string; opis: string; ile: number }

const BEZ_FILTROW: FiltryOsob = { zajecie: '', miejsce: '', zwiazek: '', wyznanie: '' }

/** JW-2 (JW-11, makiety v2): tytuł → kręgi jako pastylki („wszyscy” pierwszy) i wyszukiwarka → filtry → wstęp (gniazdo) → licznik → lista pastylek osób. */
export default function ListaOsob({ osoby, kregi, krag, filtry = BEZ_FILTROW, opcje, poczatek, wstep }: {
    osoby: OsobaNaLiscie[]; kregi: KragNaLiscie[]; krag: string; filtry?: FiltryOsob; opcje?: OpcjeFiltrow; poczatek: string; wstep?: React.ReactNode
}) {
    const router = useRouter()
    const [q, ustawQ] = React.useState(poczatek)
    const slowa = normalizujDoSzukania(q).split(' ').filter(Boolean)
    const szuka = slowa.length > 0
    const lista = szuka ? osoby.filter((o) => slowa.every((s) => o.szukaj.includes(s))) : osoby
    const grupy = new Map<string, OsobaNaLiscie[]>()
    for (const o of lista) grupy.set(o.litera, [...(grupy.get(o.litera) ?? []), o])

    React.useEffect(() => {
        const u = new URL(window.location.href)
        if (q.trim()) u.searchParams.set('q', q.trim())
        else u.searchParams.delete('q')
        window.history.replaceState(window.history.state, '', u.pathname + u.search)
    }, [q])

    const adres = (k: string, zmiana: Partial<FiltryOsob> = {}) => {
        const w = { ...filtry, ...zmiana }
        if ('miejsce' in zmiana) w.zwiazek = '' // nowa miejscowość – rodzaj związku od nowa
        return adresOsob(k, w, q)
    }
    const idz = (zmiana: Partial<FiltryOsob>) => router.push(adres(krag, zmiana), { scroll: false })
    const nazwa = (lista: { id: string; nazwa: string }[] | undefined, id: string) => lista?.find((o) => o.id === id)?.nazwa ?? id
    const wybrane = [
        filtry.zajecie && { klucz: 'zajecie', etykieta: `zajęcie: ${nazwa(opcje?.zajecie, filtry.zajecie)}`, href: adres(krag, { zajecie: '' }) },
        filtry.miejsce && { klucz: 'miejsce', etykieta: `miejscowość: ${nazwa(opcje?.miejsce, filtry.miejsce)}`, href: adres(krag, { miejsce: '' }) },
        filtry.zwiazek && { klucz: 'zwiazek', etykieta: `związek: ${nazwa(opcje?.zwiazek, filtry.zwiazek)}`, href: adres(krag, { zwiazek: '' }) },
        filtry.wyznanie && { klucz: 'wyznanie', etykieta: `wyznanie: ${nazwa(opcje?.wyznanie, filtry.wyznanie)}`, href: adres(krag, { wyznanie: '' }) },
    ].filter((x): x is { klucz: string; etykieta: string; href: string } => !!x)
    const opcjaWyboru = (o: { id: string; nazwa: string; ile: number }) => ({ id: o.id, nazwa: o.nazwa, opis: odmiana(o.ile, ['osoba', 'osoby', 'osób']) })

    return (
        <>
            <div className="katalog-filtry">
                <RzadFiltrow etykieta="krąg miejscowości">
                    {kregi.map((k) => (
                        <PastylkaFiltra key={k.id} href={adres(k.id)} aktywny={krag === k.id} liczba={k.ile} title={k.opis}>{k.nazwa}</PastylkaFiltra>
                    ))}
                </RzadFiltrow>
                <div className="katalog-szukanie">
                    <PoleSzukania value={q} onChange={ustawQ} onSubmit={ustawQ} placeholder="nazwisko, imię, wieś, zajęcie, rok…" className="katalog-pole" />
                    {szuka && <span className="tekst-opis katalog-licznik" aria-live="polite">{odmiana(lista.length, ['wynik', 'wyniki', 'wyników'])}</span>}
                    {szuka && <button type="button" className="szukaj-filtr" onClick={() => ustawQ('')}>wyczyść</button>}
                </div>
                {opcje && (opcje.zajecie.length > 0 || opcje.miejsce.length > 0 || filtry.zajecie || filtry.miejsce) && (
                    <div className="osoby-filtry-pola">
                        {(opcje.zajecie.length > 0 || filtry.zajecie) && <PoleWyboru name="zajecie" etykieta="zajęcie lub funkcja" opcje={opcje.zajecie.map(opcjaWyboru)} wartosc={filtry.zajecie} naZmiane={(v) => idz({ zajecie: v })} />}
                        {(opcje.miejsce.length > 0 || filtry.miejsce) && <PoleWyboru name="miejsce" etykieta="miejscowość" opcje={opcje.miejsce.map(opcjaWyboru)} wartosc={filtry.miejsce} naZmiane={(v) => idz({ miejsce: v })} />}
                    </div>
                )}
                {/* DOCX §2: rodzaj związku – dopiero po wyborze miejscowości */}
                {filtry.miejsce && opcje && opcje.zwiazek.length > 0 && (
                    <RzadFiltrow podpis="związek z miejscowością:" etykieta="rodzaj związku z miejscowością">
                        <PastylkaFiltra href={adres(krag, { zwiazek: '' })} aktywny={!filtry.zwiazek}>dowolny</PastylkaFiltra>
                        {opcje.zwiazek.map((o) => <PastylkaFiltra key={o.id} href={adres(krag, { zwiazek: o.id })} aktywny={filtry.zwiazek === o.id} liczba={o.ile}>{o.nazwa}</PastylkaFiltra>)}
                    </RzadFiltrow>
                )}
                {opcje && (opcje.wyznanie.length > 0 || filtry.wyznanie) && (
                    <RzadFiltrow podpis="wyznanie (z zapisów i funkcji):" etykieta="wyznanie według zapisów chrztu, ślubu, pogrzebu i funkcji w instytucjach">
                        <PastylkaFiltra href={adres(krag, { wyznanie: '' })} aktywny={!filtry.wyznanie}>dowolne</PastylkaFiltra>
                        {opcje.wyznanie.map((o) => <PastylkaFiltra key={o.id} href={adres(krag, { wyznanie: o.id })} aktywny={filtry.wyznanie === o.id} liczba={o.ile}>{o.nazwa}</PastylkaFiltra>)}
                    </RzadFiltrow>
                )}
                <WybraneFiltry wybrane={wybrane} wyczysc={adresOsob(krag, BEZ_FILTROW, q)} />
            </div>
            {wstep}
            {osoby.length === 0 && wybrane.length > 0 && <p className="text-[var(--tekst-opis)]">Nikogo nie ma przy tych filtrach – zdejmij któryś z nich.</p>}
            {osoby.length > 0 && lista.length === 0 && <p className="text-[var(--tekst-opis)]">Nikogo tu nie ma{szuka ? ' dla tego wyszukiwania' : ''} – spróbuj „wszyscy”.</p>}
            <div className="osoby-litery">
                {[...grupy].map(([litera, os], i) => (
                    // przy wyszukiwaniu i filtrach wszystkie litery z wynikami otwarte; bez – wszystkie zwinięte
                    <details key={`${litera}-${szuka || wybrane.length ? 's' : 'n'}`} className="osoba-litera" open={szuka || wybrane.length > 0 || i < ROZWINIETE_LITERY}>
                        <summary><b>{litera}</b> <span className="text-[var(--tekst-opis)]">· {odmiana(os.length, ['osoba', 'osoby', 'osób'])}</span></summary>
                        <div className="rozwin-tresc">
                        <ul className="osoby-lista">
                            {os.map((o) => (
                                <li key={o.id}>
                                    <PastylkaOsoby href={`/osoby/${o.id}`} plec={o.plec}>{o.nazwa}</PastylkaOsoby>
                                    {o.opis && <span className="text-[var(--tekst-opis)]"> {o.opis}</span>}
                                    {o.biogram !== undefined && <span className="osoba-biogram"> · {o.biogram || 'biogram'}</span>}
                                </li>
                            ))}
                        </ul>
                        </div>
                    </details>
                ))}
            </div>
        </>
    )
}
