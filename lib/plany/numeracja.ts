// Numeracja grobów (etap 2, CEM-18/19/20/21/26) – jeden moduł dla edytora, przeglądarki planu, listy pochowanych i serwera.
//
// Zasady (zasady pracy 2.3, decyzje 16.11):
// - stały identyfikator elementu (`id`) nigdy się nie zmienia; oznaczenie (kwatera, rząd, miejsce) jest ZAPISANE w grobie
//   (`oznaczenie`), nie liczone przy wyświetlaniu – i identyczne dla każdego poziomu czytelnika (luki po grobach
//   niewidocznych dla czytelnika są akceptowane – decyzja 16.11);
// - kwatera wskazana stałym id elementu kwatery – zmiana nazwy kwatery nie wymaga przenumerowania;
// - nowy grób nie ma numeru, dopóki redaktor nie uruchomi „uzupełnij brakujące” albo „przenumeruj kwaterę”
//   (zawsze z tabelą różnic przed zapisem);
// - w jednej kwaterze para (rząd, miejsce) jest unikalna – edytor nie pozwala jej powtórzyć, serwer odrzuca zapis,
//   który dodaje powtórzenie.

import { dlaCzytelnika, kwateraDla, numeryPlanu, rad, srodek, type Element, type Numer, type Oznaczenie, type Plan, type Widocznosc } from './model'
import { typGrobu, type TypElementu, type UstawieniaPlanow } from './typy'

export { numeryPlanu, type Numer, type Oznaczenie }

/** Róg, od którego biegnie numeracja kwatery – w układzie obróconym o kąt rzędów kwatery. */
export type Poczatek = 'lg' | 'pg' | 'ld' | 'pd'
export const NAZWY_POCZATKU: Record<Poczatek, string> = { lg: 'lewy górny róg', pg: 'prawy górny róg', ld: 'lewy dolny róg', pd: 'prawy dolny róg' }
export type Rzedy = 'liczby' | 'litery'

// ---------- wyświetlanie ----------

/** „kwatera A · rząd 3 · miejsce 12” – karta grobu, galeria, edytor. */
export const numerTekst = (n?: Numer | null) => (n ? `${n.kwatera ? `kwatera ${n.kwatera} · ` : ''}rząd ${n.rzad} · miejsce ${n.miejsce}` : '')
/** „A/3/12” – listy, podpowiedzi, wyniki wyszukiwania. */
export const numerKrotki = (n?: Numer | null) => (n ? `${n.kwatera ? n.kwatera + '/' : ''}${n.rzad}/${n.miejsce}` : '')

/** Rząd literami: 1 → A, 26 → Z, 27 → AA. */
export function literaRzedu(i: number): string {
    let s = ''
    for (let n = i; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
    return s
}

/** Wartość porządkowa części oznaczenia: liczba („12”, „12a”) albo litery (A=1 … Z=26, AA=27). */
function wartosc(s: string): [number, string] {
    const t = s.trim().toUpperCase()
    const m = t.match(/^(\d+)(.*)$/)
    if (m) return [+m[1], m[2]]
    if (/^[A-Z]+$/.test(t)) return [[...t].reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0), '']
    return [Number.MAX_SAFE_INTEGER, t]
}
export function porownajCzesc(a: string, b: string): number {
    const [x, xs] = wartosc(a), [y, ys] = wartosc(b)
    return x - y || xs.localeCompare(ys, 'pl')
}
/** Kolejność grobów: kwatera → rząd → miejsce (poprzedni / następny, listy). */
export function porownajNumery(a: Numer, b: Numer): number {
    return a.kwatera.localeCompare(b.kwatera, 'pl', { numeric: true }) || porownajCzesc(a.rzad, b.rzad) || porownajCzesc(a.miejsce, b.miejsce)
}

/** Groby planu z numerem, w kolejności numeracji. */
export function grobyKolejno(plan: Pick<Plan, 'elementy'>, numery: Map<string, Numer>): Element[] {
    return plan.elementy.filter((e) => numery.has(e.id)).sort((a, b) => porownajNumery(numery.get(a.id)!, numery.get(b.id)!))
}

// ---------- unikalność ----------

const norm = (s: string) => s.trim().toUpperCase()
/** Klucz unikalności: kwatera (id) + rząd + miejsce, bez rozróżniania wielkości liter i spacji na brzegach. */
export const kluczOznaczenia = (o: Oznaczenie) => `${o.kwatera ?? ''}|${norm(o.rzad)}|${norm(o.miejsce)}`

/** Powtórzone oznaczenia: klucz → id grobów (co najmniej dwa). */
export function duplikaty(plan: Pick<Plan, 'elementy'>): Map<string, string[]> {
    const m = new Map<string, string[]>()
    for (const e of plan.elementy) if (e.oznaczenie) { const k = kluczOznaczenia(e.oznaczenie); m.set(k, [...(m.get(k) ?? []), e.id]) }
    for (const [k, v] of m) if (v.length < 2) m.delete(k)
    return m
}

/** Grób, który już ma to oznaczenie (inny niż `id`) – do ręcznej korekty. */
export function zajety(plan: Pick<Plan, 'elementy'>, id: string, o: Oznaczenie): Element | null {
    const k = kluczOznaczenia(o)
    return plan.elementy.find((e) => e.id !== id && e.oznaczenie && kluczOznaczenia(e.oznaczenie) === k) ?? null
}

/**
 * Walidacja przy zapisie (zasada 2.6): zapis nie może DODAĆ powtórzonego oznaczenia. Powtórzenia, które już były
 * w zapisanej wersji, nie blokują pracy (pokazuje je panel jakości). Zwraca opis błędu albo null.
 */
export function nowePowtorzenie(przed: Pick<Plan, 'elementy'> | null, po: Pick<Plan, 'elementy'>): string | null {
    const stare = przed ? duplikaty(przed) : new Map<string, string[]>()
    const nr = numeryPlanu(po)
    for (const [k, ids] of duplikaty(po)) {
        const bylo = stare.get(k)
        if (bylo && ids.every((id) => bylo.includes(id))) continue
        return `powtórzony numer grobu: ${numerTekst(nr.get(ids[0])) || k} (${ids.length} groby) – zapis odrzucony`
    }
    return null
}

/** Nazwy kwater użyte więcej niż raz – numery wyglądałyby tak samo w dwóch miejscach planu. */
export function powtorzoneNazwyKwater(plan: Pick<Plan, 'elementy'>): string[] {
    const ile = new Map<string, number>()
    for (const e of plan.elementy) if (e.typ === 'kwatera' && e.nazwa?.trim()) ile.set(norm(e.nazwa), (ile.get(norm(e.nazwa)) ?? 0) + 1)
    return [...ile].filter(([, n]) => n > 1).map(([k]) => k)
}

// ---------- położenie a kwatera ----------

/** Groby według kwatery, w której leżą (id kwatery albo null – poza kwaterami). */
export function grobyWKwaterach(plan: Pick<Plan, 'elementy'>, typy: Map<string, TypElementu>): Map<string | null, Element[]> {
    const kwatery = plan.elementy.filter((e) => e.typ === 'kwatera')
    const wg = new Map<string | null, Element[]>()
    for (const e of plan.elementy) {
        if (!typGrobu(typy.get(e.typ))) continue
        const [x, y] = srodek(e.g), k = kwateraDla(x, y, kwatery)?.id ?? null
        wg.set(k, [...(wg.get(k) ?? []), e])
    }
    return wg
}

/** Groby bez numeru i groby, których zapisana kwatera nie zgadza się z położeniem (np. po przesunięciu). */
export function stanNumeracji(plan: Pick<Plan, 'elementy'>, typy: Map<string, TypElementu>): { bezNumeru: Element[]; pozaKwatera: Element[]; powtorzone: Map<string, string[]>; nazwyKwater: string[] } {
    const bezNumeru: Element[] = [], pozaKwatera: Element[] = []
    for (const [k, L] of grobyWKwaterach(plan, typy)) for (const e of L) {
        if (!e.oznaczenie) bezNumeru.push(e)
        else if ((e.oznaczenie.kwatera ?? null) !== k) pozaKwatera.push(e)
    }
    return { bezNumeru, pozaKwatera, powtorzone: duplikaty(plan), nazwyKwater: powtorzoneNazwyKwater(plan) }
}

// ---------- propozycja numeracji z położenia ----------

/**
 * Oznaczenia z położenia grobów w kwaterze (dawna numeracja liczona przy wyświetlaniu, model.ts do v1.90):
 * rzędy prostopadle do kąta kwatery, miejsca wzdłuż niego; groby, których środki różnią się o mniej niż
 * 3/4 typowej długości grobu, są w jednym rzędzie. Początek i litery rzędów – z ustawień kwatery.
 */
export function propozycja(plan: Pick<Plan, 'elementy'>, typy: Map<string, TypElementu>, kwateraId: string | null): Map<string, Oznaczenie> {
    const L = grobyWKwaterach(plan, typy).get(kwateraId) ?? []
    const kw = kwateraId ? plan.elementy.find((e) => e.id === kwateraId) : undefined
    const pocz = kw?.numeracjaKwatery?.poczatek ?? 'lg', litery = kw?.numeracjaKwatery?.rzedy === 'litery'
    const sp = pocz === 'ld' || pocz === 'pd' ? -1 : 1, sw = pocz === 'pg' || pocz === 'pd' ? -1 : 1
    const a = rad(kw?.kat ?? 0), ux = Math.cos(a), uy = Math.sin(a)
    const dl = L.map((e) => (e.g.k === 'r' ? e.g.h : 20)).sort((p, q) => p - q)[L.length >> 1] ?? 20
    const prog = dl * 0.75
    const P = L.map((e) => { const [x, y] = srodek(e.g); return { e, p: sp * (-x * uy + y * ux), w: sw * (x * ux + y * uy) } }).sort((p, q) => p.p - q.p)
    const rz: { sr: number; L: typeof P }[] = []
    for (const q of P) {
        const r = rz[rz.length - 1]
        if (r && Math.abs(q.p - r.sr) < prog) { r.L.push(q); r.sr = r.L.reduce((s, v) => s + v.p, 0) / r.L.length }
        else rz.push({ sr: q.p, L: [q] })
    }
    const wyn = new Map<string, Oznaczenie>()
    rz.forEach((r, ri) => r.L.sort((p, q) => p.w - q.w).forEach((q, mi) => {
        wyn.set(q.e.id, { ...(kwateraId ? { kwatera: kwateraId } : {}), rzad: litery ? literaRzedu(ri + 1) : String(ri + 1), miejsce: String(mi + 1) })
    }))
    return wyn
}

/** Zmiana oznaczenia jednego grobu (tabela różnic stary → nowy; `nowe: null` = grób traci numer). */
export interface ZmianaNumeru { id: string; stare?: Oznaczenie; nowe: Oznaczenie | null; powod?: string }

const rowne = (a?: Oznaczenie | null, b?: Oznaczenie | null) => (a?.kwatera ?? null) === (b?.kwatera ?? null) && a?.rzad === b?.rzad && a?.miejsce === b?.miejsce

/**
 * „Przenumeruj kwaterę”: wszystkie groby leżące w kwaterze dostają oznaczenia z położenia. Groby zapisane w tej
 * kwaterze, które leżą już gdzie indziej, tracą numer (żeby nie powstało powtórzenie) – „uzupełnij brakujące”
 * nada im numer w ich obecnym miejscu.
 */
export function przenumeruj(plan: Pick<Plan, 'elementy'>, typy: Map<string, TypElementu>, kwateraId: string | null): ZmianaNumeru[] {
    const nowe = propozycja(plan, typy, kwateraId)
    const zm: ZmianaNumeru[] = []
    for (const e of plan.elementy) {
        const n = nowe.get(e.id)
        if (n) { if (!rowne(e.oznaczenie, n)) zm.push({ id: e.id, stare: e.oznaczenie, nowe: n }) }
        else if (e.oznaczenie && (e.oznaczenie.kwatera ?? null) === kwateraId && typGrobu(typy.get(e.typ))) zm.push({ id: e.id, stare: e.oznaczenie, nowe: null, powod: 'leży poza tą kwaterą' })
    }
    return zm
}

/**
 * „Uzupełnij brakujące”: numer tylko dla grobów bez numeru (w jednej kwaterze albo – `undefined` – w całym planie).
 * Numer z położenia; gdy zajęty – następne wolne miejsce w tym samym rzędzie. Istniejące numery bez zmian.
 */
export function uzupelnij(plan: Pick<Plan, 'elementy'>, typy: Map<string, TypElementu>, kwateraId?: string | null): ZmianaNumeru[] {
    const zm: ZmianaNumeru[] = []
    const zajete = new Set(plan.elementy.filter((e) => e.oznaczenie).map((e) => kluczOznaczenia(e.oznaczenie!)))
    for (const [k, L] of grobyWKwaterach(plan, typy)) {
        if (kwateraId !== undefined && k !== kwateraId) continue
        const brak = L.filter((e) => !e.oznaczenie)
        if (!brak.length) continue
        const prop = propozycja(plan, typy, k)
        for (const e of brak.sort((a, b) => { const p = prop.get(a.id)!, q = prop.get(b.id)!; return porownajCzesc(p.rzad, q.rzad) || porownajCzesc(p.miejsce, q.miejsce) })) {
            let o = prop.get(e.id)!
            if (zajete.has(kluczOznaczenia(o))) {
                const wRzedzie = [...zajete].filter((z) => z.startsWith(`${k ?? ''}|${norm(o.rzad)}|`)).map((z) => wartosc(z.split('|')[2])[0]).filter((v) => v < Number.MAX_SAFE_INTEGER)
                o = { ...o, miejsce: String(Math.max(0, ...wRzedzie) + 1) }
            }
            zajete.add(kluczOznaczenia(o))
            zm.push({ id: e.id, nowe: o })
        }
    }
    return zm
}

/** Zastosowanie tabeli różnic do elementów planu (jedna zmiana planu = jeden krok cofania w edytorze). */
export function zastosujNumery(elementy: Element[], zmiany: ZmianaNumeru[]): Element[] {
    const m = new Map(zmiany.map((z) => [z.id, z.nowe]))
    return elementy.map((e) => {
        if (!m.has(e.id)) return e
        const n = m.get(e.id)
        if (n) return { ...e, oznaczenie: n }
        const bez = { ...e }
        delete bez.oznaczenie
        return bez
    })
}

/** Oznaczenie wpisane ręcznie: obcięte spacje, rząd i miejsce niepuste. Zwraca opis błędu albo null. */
export function bladOznaczenia(o: Oznaczenie): string | null {
    if (!o.rzad.trim() || !o.miejsce.trim()) return 'Podaj rząd i miejsce.'
    if (o.rzad.trim().length > 6 || o.miejsce.trim().length > 6) return 'Rząd i miejsce – najwyżej 6 znaków.'
    return null
}

/**
 * Kolejność pracy w edytorze (Tab, „następny nieopracowany”, teren): groby z numerem według numeru, groby bez numeru
 * według numeru proponowanego z położenia – żeby nowe groby nie wypadały z obchodu przed nadaniem numerów.
 */
export function kolejnoDoPracy(plan: Pick<Plan, 'elementy'>, typy: Map<string, TypElementu>): Element[] {
    const nr = numeryPlanu(plan), nazwy = new Map(plan.elementy.filter((e) => e.typ === 'kwatera').map((k) => [k.id, (k.nazwa ?? '').trim()]))
    const klucz = new Map<string, Numer>(), wszystkie: Element[] = []
    for (const [k, L] of grobyWKwaterach(plan, typy)) {
        const prop = L.some((e) => !nr.has(e.id)) ? propozycja(plan, typy, k) : null
        for (const e of L) {
            const p = prop?.get(e.id)
            klucz.set(e.id, nr.get(e.id) ?? { kwatera: k ? nazwy.get(k) ?? '' : '', rzad: p?.rzad ?? '', miejsce: p?.miejsce ?? '' })
            wszystkie.push(e)
        }
    }
    return wszystkie.sort((a, b) => porownajNumery(klucz.get(a.id)!, klucz.get(b.id)!))
}

// ---------- migracja (npm run plany:oznaczenia) ----------

/** Numery, jakie czytelnik widział do v1.90: liczone z położenia po filtrze czytelnika (A2-01). */
function dawneNumery(plan: Plan, poziom: Widocznosc, u: UstawieniaPlanow, typy: Map<string, TypElementu>): Map<string, Numer> {
    const p = dlaCzytelnika(plan, poziom, u), nazwy = new Map(p.elementy.filter((e) => e.typ === 'kwatera').map((k) => [k.id, (k.nazwa ?? '').trim()]))
    const wyn = new Map<string, Numer>()
    for (const k of grobyWKwaterach(p, typy).keys()) for (const [id, o] of propozycja(p, typy, k)) wyn.set(id, { kwatera: k ? nazwy.get(k) ?? '' : '', rzad: o.rzad, miejsce: o.miejsce })
    return wyn
}

export interface RaportNumerow {
    grobow: number
    /** plan ma już zapisane numery – migracja go pomija (nowe groby numeruje redaktor w edytorze) */
    poMigracji: boolean
    bezNumeru: number
    zmiany: ZmianaNumeru[]
    /** u ilu grobów widocznych dla czytelnika numer po migracji różni się od dotychczasowego (luki po grobach niewidocznych) */
    inaczejPublicznie: number
    inaczejBliscy: number
    nazwyKwater: string[]
}

/**
 * Migracja: plan bez żadnego zapisanego numeru dostaje numery z położenia, liczone z PEŁNEGO planu – takie, jakie
 * dotąd widział redaktor. Plan, który ma choć jeden zapisany numer, jest pomijany (powtórzenie niczego nie zmienia).
 */
export function raportNumerow(plan: Plan, typy: Map<string, TypElementu>, u: UstawieniaPlanow): RaportNumerow {
    const groby = plan.elementy.filter((e) => typGrobu(typy.get(e.typ)))
    const poMigracji = groby.some((e) => e.oznaczenie)
    const zmiany = poMigracji ? [] : uzupelnij(plan, typy)
    const po = { ...plan, elementy: zastosujNumery(plan.elementy, zmiany) }, nowe = numeryPlanu(po)
    const rozne = (poziom: Widocznosc) => {
        const stare = dawneNumery(plan, poziom, u, typy)
        return [...stare].filter(([id, n]) => numerTekst(nowe.get(id)) !== numerTekst(n)).length
    }
    return {
        grobow: groby.length, poMigracji, bezNumeru: groby.filter((e) => !e.oznaczenie).length, zmiany,
        inaczejPublicznie: poMigracji ? 0 : rozne('publiczne'), inaczejBliscy: poMigracji ? 0 : rozne('bliscy'), nazwyKwater: powtorzoneNazwyKwater(plan),
    }
}
