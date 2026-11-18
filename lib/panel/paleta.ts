// P6a (PNL-07): logika palety poleceń (bez React) – dopasowanie i polecenia z menu; widok: app/keystatic/PaletaPolecen.tsx.
import type { GrupaWgUstawien } from './menu'

export type PozycjaPalety = { t: string; typ: string; href: string; d?: string; grupa?: string; strona?: string; nr?: string }
type Poz = PozycjaPalety
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l')

export const NOWE: Poz[] = [
    { t: '+ nowy wpis', typ: 'polecenie', href: '/keystatic/collection/posts/create' },
    { t: '+ nowe miejsce', typ: 'polecenie', href: '/keystatic/collection/miejsca/create' },
    { t: '+ nowy materiał do archiwum', typ: 'polecenie', href: '/keystatic/collection/materialy/create' },
    { t: '+ nowa osoba', typ: 'polecenie', href: '/keystatic/osoby' },
    { t: '+ nowy plan', typ: 'polecenie', href: '/keystatic/plany' },
    { t: 'pobierz kopię zapasową', typ: 'polecenie', href: '/keystatic/panel/system' },
]

/** Polecenia z menu panelu (także ukryte w menu – paleta to droga na skróty). */
export function poleceniaZMenu(menu: GrupaWgUstawien[]): Poz[] {
    const z = menu.flatMap((g) => (g.pozycje.length ? g.pozycje.map((p) => ({ t: p.nazwa, typ: g.nazwa, href: p.href })) : g.href ? [{ t: g.nazwa, typ: 'panel', href: g.href }] : []))
    return [...NOWE, ...z].map((p) => ({ ...p, grupa: 'polecenia' }))
}

/** Dopasowanie: każde słowo zapytania w tytule, rodzaju, dopisku albo numerze katalogowym. Kolejność: zaczyna się od zapytania, potem reszta. */
export function szukajWPalecie(L: Poz[], q: string): Poz[] {
    const sl = norm(q.trim()).split(/\s+/).filter(Boolean)
    if (!sl.length) return []
    const pasuje = L.filter((x) => { const t = norm(`${x.t} ${x.typ} ${x.d ?? ''} ${x.nr ?? ''}`); return sl.every((s) => t.includes(s)) })
    const pocz = norm(q.trim())
    return [...pasuje.filter((x) => norm(x.t).startsWith(pocz) || norm(x.nr ?? '') === pocz), ...pasuje.filter((x) => !(norm(x.t).startsWith(pocz) || norm(x.nr ?? '') === pocz))]
}


/** Polecenia z wpisanym tekstem (plansza: „+ nowa osoba „Przyk…”” · utwórz). */
export function poleceniaZTekstem(q: string): Poz[] {
    const t = q.trim()
    if (t.length < 2 || t.startsWith('>')) return []
    // plansza: „+ nowa osoba „Przyk…”” – imię i nazwisko wielką literą
    const imie = t.replace(/(^|[\s-])(\p{Ll})/gu, (_, a: string, b: string) => a + b.toLocaleUpperCase('pl-PL'))
    const krotko = imie.length > 28 ? `${imie.slice(0, 27)}…` : imie
    return [{ t: `+ nowa osoba „${krotko}”`, typ: 'utwórz', href: `/keystatic/osoby?nowa=${encodeURIComponent(imie)}`, grupa: 'polecenia' }]
}

/** „>” na początku – same polecenia (plansza: stopka „> polecenia”). */
export const tylkoPolecenia = (q: string) => q.trimStart().startsWith('>')
