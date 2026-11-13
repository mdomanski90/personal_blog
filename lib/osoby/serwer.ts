// Wspólne kawałki API panelu osób i stron czytelnika.

import { miejsca as wszystkieMiejsca } from '../archiwum'
import { lataZycia, nazwaOsoby, ostrzezenia, rokUrodzenia, wiekDoSprawdzenia, zdarzenie, type Osoba } from './model'
export { lataZycia }
import type { StanOsob } from './dane'

export interface SkrotOsoby {
    id: string
    nazwa: string
    imiona: string
    nazwisko: string
    plec: Osoba['plec']
    lata: string
    miejsce: string
    zyje: boolean
    widocznosc: 'publiczne' | 'bliscy' | 'ja'
    uwagi: number
}

export function skrot(s: StanOsob, o: Osoba, ostrz = 0): SkrotOsoby {
    const zu = zdarzenie(o, 'urodzenie', 'chrzest')
    return {
        id: o.id, nazwa: nazwaOsoby(o), imiona: o.imiona, nazwisko: o.nazwisko, plec: o.plec, lata: lataZycia(o),
        miejsce: zu?.miejsce?.split(',')[0] ?? '', zyje: s.zyje(o.id), widocznosc: s.widocznosc(o.id), uwagi: ostrz,
    }
}

export async function miejscaDoDopasowania() {
    return (await wszystkieMiejsca('ja')).map((m) => ({ id: m.id, nazwa: m.nazwa, inneNazwy: m.inneNazwy }))
}

export function ostrzezeniaWgOsob(s: StanOsob): Map<string, string[]> {
    const m = new Map<string, string[]>()
    for (const w of ostrzezenia(s.drzewo, s.relacje)) m.set(w.osoba, [...(m.get(w.osoba) ?? []), w.tekst])
    for (const z of doSprawdzeniaZycia(s)) m.set(z.id, [...(m.get(z.id) ?? []), z.zyje === 'tak'
        ? `oznaczona jako żyjąca, a miałaby ${z.wiek} lat – sprawdź`
        : `${z.szacowany ? 'około ' : ''}${z.wiek} lat i brak daty zgonu – czy żyje?`])
    return m
}

/** Osoby, przy których trzeba sprawdzić, czy żyją (95–104 lata bez daty zgonu albo „żyje” przy 105+). */
export function doSprawdzeniaZycia(s: StanOsob) {
    const wyn: { id: string; nazwa: string; lata: string; wiek: number; szacowany: boolean; zyje: Osoba['zyje'] }[] = []
    for (const o of s.drzewo.osoby.values()) {
        const wiek = wiekDoSprawdzenia(o, s.lata.get(o.id))
        if (wiek != null) wyn.push({ id: o.id, nazwa: nazwaOsoby(o), lata: lataZycia(o), wiek, szacowany: rokUrodzenia(o) == null, zyje: o.zyje })
    }
    return wyn.sort((a, b) => b.wiek - a.wiek)
}
