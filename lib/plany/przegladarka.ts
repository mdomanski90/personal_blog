/**
 * Etap 3 · jedna przeglądarka planów (CEM-07, 08, 09, 13, 24; PH-13) – czyste funkcje dla PanelPlanu i PlanInteraktywny.
 * Wszystko liczone z planu w wersji DLA CZYTELNIKA (dlaCzytelnika): pola robocze (etap, weryfikacja, notatka) są już usunięte,
 * groby z ograniczonym napisem mają sam kształt i numer – nic z treści ukrytej nie przechodzi do liczb ani znaków (zasada 1.6).
 * Test: lib/plany/przegladarka.test.ts.
 */
import { doSzukania, type Element, type Numer, type Plan } from './model'
import { typGrobu, type TypElementu } from './typy'
import { grobyKolejno } from './numeracja'
import { planGrobowy, type RodzajPlanu } from './metadane'

export type VB = [number, number, number, number]
type Typy = Map<string, TypElementu>

/** CEM-09: grób „opisany” – wyłącznie z danych jawnych dla czytelnika (napis, osoby, zdjęcie), nigdy ze statusu pracy (`etap`). */
export function opisany(e: Element): boolean {
    if (e.ograniczony) return false
    return !!(e.napis?.trim() || e.osoby?.some((o) => o.nazwa?.trim()) || e.zdjecia?.length)
}

export interface StanPlanu {
    groby: number
    /** z napisem, osobami albo zdjęciem (dane jawne) */
    opisane: number
    /** napis tylko dla bliskich (próg lat albo „ukryj napis”) – liczba bez żadnej treści */
    dlaBliskich: number
    /** groby z co najmniej jedną osobą, której karta w drzewie jest widoczna dla czytelnika */
    wDrzewie: number
    /** groby bez opisu (do odczytania) */
    bezOpisu: number
}

/** CEM-08: liczby pustego panelu „na tym planie”. `osobyWidoczne` – id osób z drzewa widocznych czytelnikowi (osobyPlanu). */
export function stanPlanu(plan: Pick<Plan, 'elementy'>, typy: Typy, osobyWidoczne: ReadonlySet<string>): StanPlanu {
    const groby = plan.elementy.filter((e) => typGrobu(typy.get(e.typ)) && !e.nieznanePolozenie)
    const opisane = groby.filter(opisany).length
    const dlaBliskich = groby.filter((e) => e.ograniczony).length
    const wDrzewie = groby.filter((e) => !e.ograniczony && e.osoby?.some((o) => o.id && osobyWidoczne.has(o.id))).length
    return { groby: groby.length, opisane, dlaBliskich, wDrzewie, bezOpisu: groby.length - opisane - dlaBliskich }
}

/** CEM-07: elementy kadru startowego – groby i kwatery (sam cmentarz, bez otoczenia); plan bez grobów – wszystkie elementy. */
export function elementyKadruStartowego(plan: Pick<Plan, 'elementy'>, typy: Typy): Element[] {
    const widoczne = plan.elementy.filter((e) => !e.nieznanePolozenie && typy.has(e.typ))
    const cmentarz = widoczne.filter((e) => typGrobu(typy.get(e.typ)) || e.typ === 'kwatera')
    return cmentarz.length >= 3 ? cmentarz : widoczne
}

export interface Kwatera { nazwa: string; ids: string[] }

/** Kwatery z numerów grobów (nazwa kwatery w numerze – ta sama dla każdego czytelnika), w kolejności naturalnej. */
export function kwateryPlanu(plan: Pick<Plan, 'elementy'>, typy: Typy, numery: Map<string, Numer>): Kwatera[] {
    const m = new Map<string, string[]>()
    for (const e of plan.elementy) {
        if (!typGrobu(typy.get(e.typ))) continue
        const k = numery.get(e.id)?.kwatera
        if (!k) continue
        if (!m.has(k)) m.set(k, [])
        m.get(k)!.push(e.id)
    }
    return [...m.entries()].map(([nazwa, ids]) => ({ nazwa, ids })).sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl', { numeric: true }))
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')

/** Szukanie na planie (CEM-04): od 2 znaków; elementy z położeniem; wszystkie słowa frazy muszą wystąpić. */
export function szukajNaPlanie(plan: Pick<Plan, 'elementy'>, fraza: string): Element[] {
    const slowa = norm(fraza.trim()).split(/\s+/).filter(Boolean)
    if (slowa.join('').length < 2) return []
    return plan.elementy.filter((e) => {
        if (e.nieznanePolozenie) return false
        const t = doSzukania(e)
        return !!t && slowa.every((s) => t.includes(s))
    })
}

/**
 * CEM-24 (matryca: „strzałki = poprzedni/następny, Enter = szczegóły, lista tekstowa jako alternatywa”): klawiatura nad planem –
 * ← ↑ poprzedni, → ↓ następny grób (obiekt), Enter – szczegóły w panelu, Shift + strzałki – przesunięcie, + − – przybliżenie,
 * 0 / Home – cały plan. Lista tekstowa = zakładka „lista pochowanych” / „lista obiektów”.
 */
export type RuchKlawisza = { kolejny: -1 | 1 } | { szczegoly: true } | { przesun: [number, number] } | { zoom: number } | { caly: true } | null
export function ruchKlawisza(klawisz: string, shift = false): RuchKlawisza {
    const kier: Record<string, [number, number]> = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] }
    if (kier[klawisz]) return shift ? { przesun: kier[klawisz] } : { kolejny: klawisz === 'ArrowLeft' || klawisz === 'ArrowUp' ? -1 : 1 }
    switch (klawisz) {
        case 'Enter': return { szczegoly: true }
        case '+': case '=': return { zoom: 1 / 1.4 }
        case '-': case '_': return { zoom: 1.4 }
        case '0': case 'Home': return { caly: true }
        default: return null
    }
}

/** Przesunięcie widoku o ułamek jego szerokości / wysokości. */
export const przesunVB = ([x, y, w, h]: VB, [fx, fy]: [number, number]): VB => [x + w * fx, y + h * fy, w, h]

/** CEM-24: zakładki (role=tab) – strzałki w lewo / prawo, Home, End; null – klawisz bez znaczenia. */
export { zakladkaKlawisza } from '../zakladki'

/** CEM-13: adres strony z wybranym grobem (?grob=<id>) – podmieniany przy wyborze (history.replaceState), bez innych parametrów. */
export function adresZGrobem(href: string, id: string | null): string {
    const u = new URL(href)
    if (id) u.searchParams.set('grob', id)
    else u.searchParams.delete('grob')
    return `${u.pathname}${u.search}${u.hash}`
}

/**
 * PH-13: interfejs przeglądarki według rodzaju planu – cmentarz: groby (lista pochowanych, karta grobu, próg lat);
 * plan historyczny / schemat: obiekty (lista obiektów, opis elementu, „o planie”), bez tekstów o grobach.
 */
export interface Interfejs { grobowy: boolean; zakladkaListy: string; czescSzukania: string; podpowiedz: string }
export function interfejsPlanu(plan: { rodzaj?: RodzajPlanu }): Interfejs {
    return planGrobowy(plan)
        ? { grobowy: true, zakladkaListy: 'lista pochowanych', czescSzukania: 'szukaj i opis planu', podpowiedz: 'nazwisko, imię, rok' }
        : { grobowy: false, zakladkaListy: 'lista obiektów', czescSzukania: 'szukaj i opis planu', podpowiedz: 'nazwa obiektu' }
}

/**
 * Kolejność ‹ › i klawiszy strzałek: groby wg zapisanych numerów (kwatera → rząd → miejsce); plan bez grobów – obiekty
 * z nazwą albo numerem legendy (wg numeru, potem nazwy). Ta sama kolejność co lista pochowanych / lista obiektów.
 */
export function elementyNawigacji(plan: Pick<Plan, 'elementy'>, typy: Typy, numery: Map<string, Numer>): Element[] {
    const groby = plan.elementy.filter((e) => typGrobu(typy.get(e.typ)) && !e.nieznanePolozenie)
    if (!groby.length) return obiektyListy(plan, typy)
    // groby bez numeru (jeszcze nie ponumerowane) – na końcu, w kolejności z planu
    return [...grobyKolejno({ elementy: groby }, numery), ...groby.filter((e) => !numery.has(e.id))]
}

/** PH-13: lista obiektów planu bez grobów – elementy z nazwą, nazwą w źródle albo numerem legendy (bez samych napisów). */
export function obiektyListy(plan: Pick<Plan, 'elementy'>, typy: Typy): Element[] {
    return plan.elementy
        .filter((e) => !e.nieznanePolozenie && typy.has(e.typ) && typy.get(e.typ)!.rys !== 'napis' && (e.nazwa?.trim() || e.nazwaZrodlowa?.trim() || e.nrLegendy))
        .sort((a, b) => (a.nrLegendy && b.nrLegendy ? a.nrLegendy.localeCompare(b.nrLegendy, 'pl', { numeric: true }) : a.nrLegendy ? -1 : b.nrLegendy ? 1 : 0)
            || (a.nazwa || a.nazwaZrodlowa || '').localeCompare(b.nazwa || b.nazwaZrodlowa || '', 'pl'))
}

/**
 * WSP-06: groby, których napis czeka na odczyt – ze zdjęciem nagrobka, bez odczytanego napisu, tylko z napisem jawnym
 * (grób z progiem lat albo „ukryj napis” ma w wersji dla czytelnika sam kształt – nie trafia tu nigdy).
 */
export function napisyDoOdczytania(plan: Pick<Plan, 'elementy'>, typy: Typy): Element[] {
    return plan.elementy.filter((e) => typGrobu(typy.get(e.typ)) && !e.ograniczony && !e.nieznanePolozenie && (e.zdjecia?.length ?? 0) > 0 && !e.napis?.trim())
}

/**
 * PH4 (rekomendacja przyjęta 17.11): znaki objaśnień skanu – litery (a, b, …, z, aa, ab, …), gdy plan rekonstrukcji ma
 * numerowaną legendę (dwa ciągi numerów na jednym skanie myliłyby się); bez legendy – numery jak dotąd.
 */
export function znakObjasnienia(i: number, litery: boolean): string {
    if (!litery) return String(i + 1)
    let n = i, s = ''
    do { s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } while (n >= 0)
    return s
}
