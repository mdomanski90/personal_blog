'use client'

// Lista osób z wyszukiwaniem na żywo: każdy wpisany znak zawęża listę, litery z wynikami same się rozwijają.
// Adres strony (?q=…) aktualizowany bez przeładowania – link do wyników da się skopiować.
// P6b (PPL-03): filtry zajęcia, miejscowości (z rodzajem związku) i wyznania – liczone na serwerze z osób widocznych
// dla czytelnika; wybór zmienia adres (filtry łączą się ze sobą, z kręgiem i z wyszukiwaniem).
// Łatka P6b (uwaga właściciela 19.11 07:17): układ jak słownik i archiwum – kolejność strony działu (DZL-01, ElementyDzialu):
// wstęp → panel „szukaj i filtruj w osobach” (k-filtry-ramka, jak FiltryKatalogu) → wybrane → licznik + litery A–Ż → lista.

import * as React from 'react'
import { useRouter } from 'next/navigation'
import PoleSzukania from '../components/PoleSzukania'
import { RamkaFiltrow } from '../components/RamkaFiltrow'
import PoleWyboru from '../components/PoleWyboru'
import { ElementyDzialu } from '../components/ElementyDzialu'
import { normalizujDoSzukania, odmiana } from '@/lib/tekst'
import { ALFABET } from '@/lib/slownik'
import { przewinDo } from '@/lib/ruch'
import { adresOsob, type FiltryOsob, type OpcjeFiltrow } from '@/lib/osoby/fasety'
import { PastylkaFiltra, PastylkaOsoby, RzadFiltrow, WybraneFiltry } from '@/app/components/Wzorce'

/** Ile pierwszych liter katalogu jest rozwiniętych na starcie – decyzja 18.11: żadna (wcześniej, 16.11: A i B). */
const ROZWINIETE_LITERY = 0

export interface OsobaNaLiscie { id: string; nazwa: string; plec: string; opis: string; biogram?: string; litera: string; szukaj: string }
export interface KragNaLiscie { id: string; nazwa: string; opis: string; ile: number }

const BEZ_FILTROW: FiltryOsob = { zajecie: '', miejsce: '', zwiazek: '', wyznanie: '' }
const idLitery = (l: string) => `litera-${encodeURIComponent(l)}`

export default function ListaOsob({ osoby, kregi, krag, filtry = BEZ_FILTROW, opcje, poczatek, wstep }: {
    osoby: OsobaNaLiscie[]; kregi: KragNaLiscie[]; krag: string; filtry?: FiltryOsob; opcje?: OpcjeFiltrow; poczatek: string; wstep?: React.ReactNode
}) {
    const router = useRouter()
    const idFrazy = React.useId()
    const [q, ustawQ] = React.useState(poczatek)
    const [otwarteLitery, ustawOtwarteLitery] = React.useState<Set<string>>(new Set())
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
        krag !== 'wszystkie' && { klucz: 'krag', etykieta: kregi.find((k) => k.id === krag)?.nazwa ?? krag, href: adres('wszystkie') },
        filtry.zajecie && { klucz: 'zajecie', etykieta: `zajęcie: ${nazwa(opcje?.zajecie, filtry.zajecie)}`, href: adres(krag, { zajecie: '' }) },
        filtry.miejsce && { klucz: 'miejsce', etykieta: `miejscowość: ${nazwa(opcje?.miejsce, filtry.miejsce)}`, href: adres(krag, { miejsce: '' }) },
        filtry.zwiazek && { klucz: 'zwiazek', etykieta: `związek: ${nazwa(opcje?.zwiazek, filtry.zwiazek)}`, href: adres(krag, { zwiazek: '' }) },
        filtry.wyznanie && { klucz: 'wyznanie', etykieta: `wyznanie: ${nazwa(opcje?.wyznanie, filtry.wyznanie)}`, href: adres(krag, { wyznanie: '' }) },
    ].filter((x): x is { klucz: string; etykieta: string; href: string } => !!x)
    const opcjaWyboru = (o: { id: string; nazwa: string; ile: number }) => ({ id: o.id, nazwa: o.nazwa, opis: odmiana(o.ile, ['osoba', 'osoby', 'osób']) })
    const filtrow = wybrane.length

    // jak FiltryKatalogu (P7A-4): filtry zwinięte, otwarte, gdy któryś jest wybrany (fraza jest w pasku – 20.11)
    const [panelOtwarty, ustawPanelOtwarty] = React.useState(filtrow > 0)
    // wybór filtra przeładowuje listę (nowy klucz) – panel otwarty przez czytelnika zostaje otwarty także po zdjęciu ostatniego filtra
    React.useEffect(() => { try { if (sessionStorage.getItem('osoby-panel') === '1') ustawPanelOtwarty(true) } catch { /* bez pamięci sesji */ } }, [])
    const przelaczPanel = (otwarty: boolean) => {
        ustawPanelOtwarty(otwarty)
        try { sessionStorage.setItem('osoby-panel', otwarty ? '1' : '0') } catch { /* bez pamięci sesji */ }
    }
    const doLitery = (l: string) => (e: React.MouseEvent) => {
        e.preventDefault()
        ustawOtwarteLitery((s) => new Set(s).add(l))
        requestAnimationFrame(() => {
            const d = document.getElementById(idLitery(l)) as HTMLDetailsElement | null
            if (d) d.open = true // także gdy litera była już otwarta z nawigacji, a potem zwinięta ręcznie
            if (d) przewinDo(d, { block: 'start' })
            d?.querySelector('summary')?.focus({ preventScroll: true })
        })
    }
    // litery spoza alfabetu (nazwiska nieczytelne „?” itd.) – na końcu, jak grupy listy
    const literyNawigacji = [...ALFABET, ...[...grupy.keys()].filter((l) => !ALFABET.includes(l))]

    const panel = (
        // 20.11 (wariant A): pole w pasku ramki, filtry pod „filtry ▾”
        <RamkaFiltrow otwarte={panelOtwarty} naZmiane={przelaczPanel} aktywnych={filtrow}
            pole={(waski) => <PoleSzukania id={idFrazy} value={q} onChange={ustawQ} onSubmit={ustawQ} obszar="szukaj osób"
                placeholder={waski ? 'szukaj w osobach…' : 'szukaj w osobach: nazwisko, imię, wieś, zajęcie, rok…'} className="k-filtry-pole" />}>
                <div className="k-filtry">
                    <div className="k-filtry-szeroki">
                        <RzadFiltrow podpis="krąg" etykieta="krąg miejscowości">
                            {kregi.map((k) => (
                                <PastylkaFiltra key={k.id} href={adres(k.id)} aktywny={krag === k.id} liczba={k.ile} title={k.opis}>{k.nazwa}</PastylkaFiltra>
                            ))}
                        </RzadFiltrow>
                    </div>
                    {opcje && (opcje.zajecie.length > 0 || filtry.zajecie) && <PoleWyboru name="zajecie" etykieta="zajęcie lub funkcja" opcje={opcje.zajecie.map(opcjaWyboru)} wartosc={filtry.zajecie} naZmiane={(v) => idz({ zajecie: v })} />}
                    {opcje && (opcje.miejsce.length > 0 || filtry.miejsce) && <PoleWyboru name="miejsce" etykieta="miejscowość" opcje={opcje.miejsce.map(opcjaWyboru)} wartosc={filtry.miejsce} naZmiane={(v) => idz({ miejsce: v })} />}
                    {/* DOCX §2: rodzaj związku – dopiero po wyborze miejscowości */}
                    {filtry.miejsce && opcje && opcje.zwiazek.length > 0 && (
                        <div className="k-filtry-szeroki">
                            <RzadFiltrow podpis="związek z miejscowością" etykieta="rodzaj związku z miejscowością">
                                <PastylkaFiltra href={adres(krag, { zwiazek: '' })} aktywny={!filtry.zwiazek}>dowolny</PastylkaFiltra>
                                {opcje.zwiazek.map((o) => <PastylkaFiltra key={o.id} href={adres(krag, { zwiazek: o.id })} aktywny={filtry.zwiazek === o.id} liczba={o.ile}>{o.nazwa}</PastylkaFiltra>)}
                            </RzadFiltrow>
                        </div>
                    )}
                    {opcje && (opcje.wyznanie.length > 0 || filtry.wyznanie) && (
                        <div className="k-filtry-szeroki">
                            <RzadFiltrow podpis="wyznanie (z zapisów i funkcji)" etykieta="wyznanie według zapisów chrztu, ślubu, pogrzebu i funkcji w instytucjach">
                                <PastylkaFiltra href={adres(krag, { wyznanie: '' })} aktywny={!filtry.wyznanie}>dowolne</PastylkaFiltra>
                                {opcje.wyznanie.map((o) => <PastylkaFiltra key={o.id} href={adres(krag, { wyznanie: o.id })} aktywny={filtry.wyznanie === o.id} liczba={o.ile}>{o.nazwa}</PastylkaFiltra>)}
                            </RzadFiltrow>
                        </div>
                    )}
                    {(filtrow > 0 || szuka) && (
                        <span className="k-filtry-akcje">
                            <button type="button" className="odn k-filtry-wyczysc" onClick={() => { ustawQ(''); if (filtrow > 0) router.push(adresOsob('wszystkie', BEZ_FILTROW), { scroll: false }) }}>wyczyść wszystko</button>
                        </span>
                    )}
                </div>
        </RamkaFiltrow>
    )

    const licznik = (
        <>
            <p className="ot-drobne" aria-live="polite">{szuka && <>„{q.trim()}” – </>}{szuka ? odmiana(lista.length, ['wynik', 'wyniki', 'wyników']) : odmiana(lista.length, ['osoba', 'osoby', 'osób'])}</p>
            {lista.length > 0 && (
                <nav aria-label="litera nazwiska" className="slownik-litery">
                    {literyNawigacji.map((l) => {
                        const ile = grupy.get(l)?.length ?? 0
                        return ile
                            ? <a key={l} href={`#${idLitery(l)}`} className="lista-litera" title={`${l}: ${odmiana(ile, ['osoba', 'osoby', 'osób'])}`} onClick={doLitery(l)}>{l}</a>
                            : <span key={l} className="lista-litera lista-litera--brak" aria-hidden="true">{l}</span>
                    })}
                </nav>
            )}
        </>
    )

    const tresc = (
        <>
            {osoby.length === 0 && filtrow > 0 && <p className="text-[var(--tekst-opis)]">Nikogo nie ma przy tych filtrach – zdejmij któryś z nich.</p>}
            {osoby.length > 0 && lista.length === 0 && <p className="text-[var(--tekst-opis)]">Nikogo tu nie ma{szuka ? ' dla tego wyszukiwania' : ''} – spróbuj „wszyscy”.</p>}
            <div className="osoby-litery">
                {[...grupy].map(([litera, os], i) => (
                    // przy wyszukiwaniu i filtrach wszystkie litery z wynikami otwarte; bez – zwinięte (litera z nawigacji – otwarta)
                    <details key={`${litera}-${szuka || filtrow ? 's' : 'n'}`} id={idLitery(litera)} className="osoba-litera" open={szuka || filtrow > 0 || otwarteLitery.has(litera) || i < ROZWINIETE_LITERY}>
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

    return <ElementyDzialu wstep={wstep} panel={panel} wybrane={<WybraneFiltry wybrane={wybrane} wyczysc={adresOsob('wszystkie', BEZ_FILTROW, q)} />} licznik={licznik} tresc={tresc} />
}
