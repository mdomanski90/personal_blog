// Łatka P6b (uwaga właściciela 19.11 07:37): przełącznik tytułów pokrewnych stron jak „osoby · całe drzewo” – także w dziale
// „miejsca” (te same strony co podmenu „miejsca ▾”: miejscowości, instytucje, obiekty). Tytuły z „Wstępów działów” (TytulDzialu).
import * as React from 'react'
import type { Dzial } from '@/lib/strony/wstepy'
import { TytulDzialu } from './WstepDzialu'
import type { TytulObok } from './Uklad'

const MIEJSCA: { href: string; dzial: Dzial; domyslny: string }[] = [
    { href: '/miejsca', dzial: 'miejsca', domyslny: 'miejsca' },
    { href: '/parafie', dzial: 'instytucje', domyslny: 'instytucje' },
    { href: '/obiekty', dzial: 'obiekty', domyslny: 'obiekty' },
]

/** Pozostałe tytuły grupy „miejsca” dla strony `href` – wcześniejsze na lewo (`przed`), dalsze na prawo. */
export function obokMiejsc(href: string): TytulObok[] {
    const i = MIEJSCA.findIndex((m) => m.href === href)
    return MIEJSCA.filter((m) => m.href !== href).map((m) => ({ tekst: <TytulDzialu dzial={m.dzial} domyslny={m.domyslny} />, href: m.href, przed: MIEJSCA.indexOf(m) < i }))
}
