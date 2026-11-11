// Sieć powiązań jak w Logseq – część bez dostępu do danych (da się ją testować osobno).
//
//   [[Olszanka]]            odnośnik po nazwie, innej nazwie albo formie odmiany („[[Olszance]]”)
//   [[olszanka]]            odnośnik po identyfikatorze – na stronie pokazuje się nazwa („Olszanka”)
//   [[Olszanka|we wsi]]     odnośnik z własnym tekstem
//
// Odnośnik do pozycji, której nie ma albo której czytelnik nie widzi, zostaje zwykłym tekstem.

import { normalizuj } from './tekst'

export type RodzajCelu = 'miejsce' | 'temat' | 'obiekt' | 'wpis'

export interface Cel {
    rodzaj: RodzajCelu
    id: string
    nazwa: string
    adres: string
}

export type Rozwiaz = (tekst: string) => Cel | null

/** [[cel]] albo [[cel|tekst]] */
export const ODNOSNIK = /\[\[([^\[\]|]+?)(?:\|([^\[\]]+?))?\]\]/g

const PRZYIMEK = /^(w|we|z|ze|do|na|od|po|pod|przy|nad|ku|koło)\s/i

export interface PozycjaSieci {
    cel: Cel
    /** nazwa, inne nazwy, formy odmiany */
    nazwy: string[]
}

/** Słownik do rozwiązywania odnośników. Przy powtórzeniu wygrywa wcześniejsza pozycja (miejsca → tematy → obiekty → wpisy). */
export function slownikOdnosnikow(pozycje: PozycjaSieci[]): Rozwiaz {
    const slownik = new Map<string, Cel>()
    const dodaj = (klucz: string, cel: Cel) => {
        const k = normalizuj(klucz)
        if (k && !slownik.has(k)) slownik.set(k, cel)
    }
    // najpierw identyfikatory i nazwy wszystkich, potem formy – forma jednej pozycji nie zasłoni nazwy innej
    for (const { cel } of pozycje) dodaj(cel.id, cel)
    for (const { cel } of pozycje) dodaj(cel.nazwa, cel)
    for (const { cel, nazwy } of pozycje) nazwy.forEach((n) => dodaj(n.replace(PRZYIMEK, ''), cel))
    return (tekst) => slownik.get(normalizuj(tekst.replace(PRZYIMEK, ''))) ?? null
}

/** Tekst odnośnika na stronie: własny tekst, a przy zapisie identyfikatorem („biezenstwo”) – nazwa pozycji. */
export function tekstOdnosnika(cel: Cel | null, wpisany: string, wlasny?: string): string {
    if (wlasny?.trim()) return wlasny.trim()
    const w = wpisany.trim()
    if (cel && w === cel.id && w !== cel.nazwa) return cel.nazwa
    return w
}

/** [[a|b]] → b, [[a]] → a (do zajawek i fragmentów). Z `rozwiaz` identyfikatory zamieniają się na nazwy. */
export function bezNawiasow(tekst: string, rozwiaz?: Rozwiaz): string {
    return tekst.replace(ODNOSNIK, (_, cel: string, wlasny?: string) => tekstOdnosnika(rozwiaz?.(cel) ?? null, cel, wlasny))
}

/** Zastępuje odnośniki [[…]] spacjami tej samej długości – żeby szukać wzmianek tylko poza nimi. */
export function zamaskujOdnosniki(tekst: string): string {
    return tekst.replace(ODNOSNIK, (m) => ' '.repeat(m.length))
}

const escapuj = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export interface Wzorzec {
    /** nazwy pisane wielką literą – wielkość liter ma znaczenie (Łuby ≠ „luby”) */
    duze: RegExp | null
    /** nazwy pisane małą literą (np. tematy: unici, bieżeństwo) – bez względu na wielkość liter */
    male: RegExp | null
}

/**
 * Wzorzec wzmianek: całe słowa, najdłuższe nazwy najpierw, bez nazw z przyimkiem i bardzo krótkich.
 * `bezWielkosci` – wszystkie nazwy bez względu na wielkość liter (tematy: „Bieżeństwo” i „bieżeństwo”).
 */
export function wzorzecWzmianek(nazwy: string[], bezWielkosci = false): Wzorzec {
    const czyste = [...new Set(nazwy.map((n) => n.trim()).filter((n) => n.length >= 3 && !PRZYIMEK.test(n)))].sort((a, b) => b.length - a.length)
    const zbuduj = (lista: string[], flagi: string) =>
        lista.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${lista.map(escapuj).join('|')})(?![\\p{L}\\p{N}])`, flagi) : null
    const duze = bezWielkosci ? [] : czyste.filter((n) => n[0] !== n[0].toLowerCase())
    const male = bezWielkosci ? czyste : czyste.filter((n) => n[0] === n[0].toLowerCase())
    return { duze: zbuduj(duze, 'gu'), male: zbuduj(male, 'giu') }
}

export interface Trafienie {
    start: number
    koniec: number
}

/** Wszystkie wzmianki w tekście (poza odnośnikami [[…]]). */
export function znajdzWzmianki(tekst: string, w: Wzorzec): Trafienie[] {
    const maska = zamaskujOdnosniki(tekst)
    const wynik: Trafienie[] = []
    for (const r of [w.duze, w.male]) {
        if (!r) continue
        r.lastIndex = 0
        for (const m of maska.matchAll(r)) wynik.push({ start: m.index!, koniec: m.index! + m[0].length })
    }
    return wynik.sort((a, b) => a.start - b.start).filter((t, i, a) => i === 0 || t.start >= a[i - 1].koniec)
}

export interface Fragment {
    przed: string
    trafienie: string
    po: string
}

/** Kawałek zdania wokół trafienia (ok. 80 znaków z każdej strony, ucięty na granicy słowa). */
export function fragment(tekst: string, start: number, koniec: number, rozwiaz?: Rozwiaz, zasieg = 80): Fragment {
    let a = Math.max(0, start - zasieg)
    let b = Math.min(tekst.length, koniec + zasieg)
    // nie tniemy w środku odnośnika [[…]]
    const wOdnosniku = (i: number) => tekst.lastIndexOf('[[', i - 1) > tekst.lastIndexOf(']]', i - 1)
    if (a > 0 && wOdnosniku(a)) a = tekst.lastIndexOf('[[', a - 1)
    else if (a > 0) a = tekst.indexOf(' ', a) + 1 || a
    if (b < tekst.length && wOdnosniku(b)) b = Math.min(tekst.length, tekst.indexOf(']]', b) + 2 || tekst.length)
    else if (b < tekst.length) b = Math.max(tekst.lastIndexOf(' ', b), koniec)
    a = Math.min(a, start)
    const czysc = (s: string) => bezNawiasow(s, rozwiaz).replace(/\s+/g, ' ')
    return {
        przed: (a > 0 ? '…' : '') + czysc(tekst.slice(a, start)).trimStart(),
        trafienie: czysc(tekst.slice(start, koniec)),
        po: czysc(tekst.slice(koniec, b)).trimEnd() + (b < tekst.length ? '…' : ''),
    }
}
