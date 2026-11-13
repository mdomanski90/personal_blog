// Miejscowości projektu w ustalonej kolejności: trzy wiersze stopki i dwa „kręgi” (filtr na stronie osób).
// Krąg 1 – okolice Olszanki i Łosic; krąg 2 – okolice Międzyrzeca i Krzesk. Kręgi mogą się przenikać:
// osoba związana z wsiami z obu kręgów pokazuje się w obu.

import { normalizuj } from './tekst'

export const WIERSZE_STOPKI: string[][] = [
    ['Aleksandrówka', 'Bejdy', 'Bolesty', 'Dawidy', 'Hadynów', 'Klimy', 'Korczówka', 'Korczówka-Kolonia', 'Łepki Nowe', 'Łepki Stare', 'Mszanna', 'Olszanka', 'Pietrusy', 'Próchenki', 'Radlnia', 'Szawły', 'Szydłówka', 'Wyczółki', 'Łosice'],
    ['Kożuszki', 'Krawce', 'Krzewica', 'Łuby', 'Łuniew', 'Pościsze', 'Międzyrzec Podlaski'],
    ['Krzesk-Majątek', 'Krzesk Stary', 'Krzesk-Królowa Niwa'],
]

export const KREGI = [
    { id: '1', nazwa: 'krąg 1', opis: 'okolice Olszanki i Łosic', miejsca: WIERSZE_STOPKI[0] },
    { id: '2', nazwa: 'krąg 2', opis: 'okolice Międzyrzeca i Krzesk', miejsca: [...WIERSZE_STOPKI[1], ...WIERSZE_STOPKI[2]] },
] as const

/** Klucz porównania nazw miejscowości: bez znaków diakrytycznych, wielkości liter i łączników („Krzesk-Majątek” = „krzesk majatek”). */
export const kluczMiejsca = (s: string) => normalizuj(s)
