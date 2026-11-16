// PH1: migracja pola `rodzaj` istniejących planów (reguła ogólna, bez nazw planów – zasada 2.7).
// Plan z choć jednym grobem → cmentarz; bez grobów → plan historyczny. Plan z zapisanym rodzajem pomijany (powtórka nic nie zmienia).
// „schemat” nadaje się ręcznie w edytorze (dziś nie ma takiego planu).
import type { Plan } from './model'
import type { RodzajPlanu } from './metadane'
import { typGrobu, type TypElementu } from './typy'

export interface PropozycjaRodzaju { slug: string; wersja: number; obecny?: RodzajPlanu; nowy: RodzajPlanu | null; grobow: number; elementow: number }

export function propozycjaRodzaju(p: Plan, typy: Map<string, TypElementu>): PropozycjaRodzaju {
    const grobow = p.elementy.filter((e) => typGrobu(typy.get(e.typ))).length
    return { slug: p.slug, wersja: p.wersja, obecny: p.rodzaj, nowy: p.rodzaj ? null : grobow > 0 ? 'cmentarz' : 'historyczny', grobow, elementow: p.elementy.length }
}
