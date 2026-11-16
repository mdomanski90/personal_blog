// PH2: czysta część odwrotnych odnośników (bez Next/React – testowalna); serwer: lib/plany/wystapienia.ts
import type { Cel } from '../odnosniki'
import type { Plan } from './model'

export interface Wystapienie { nazwa: string; adres: string }
export interface Wystapienia { plany: Wystapienie[]; skany: Wystapienie[] }

/** Czysta część: indeks klucz celu („obiekt:obj-a”) → wystąpienia. */
export function indeksWystapien(
    plany: { pelny: Plan; wydany: Plan; adres: (elementId: string) => string; nazwaTypu: (typ: string) => string }[],
    skany: { id: string; nazwa: string; objasnienia: { id: string; tekst: string; powiazania: string[] }[] }[],
    rozwiaz: (id: string) => Cel | null,
): Map<string, Wystapienia> {
    const ix = new Map<string, Wystapienia>()
    const dodaj = (c: Cel, gdzie: 'plany' | 'skany', w: Wystapienie) => {
        const k = `${c.rodzaj}:${c.id}`
        const v = ix.get(k) ?? { plany: [], skany: [] }
        if (!v[gdzie].some((x) => x.adres === w.adres)) v[gdzie].push(w)
        ix.set(k, v)
    }
    for (const { pelny, wydany, adres, nazwaTypu } of plany) {
        const widoczne = new Map(wydany.elementy.filter((e) => !e.ograniczony).map((e) => [e.id, e]))
        for (const e of pelny.elementy) {
            const w = widoczne.get(e.id)
            if (!w || !e.powiazania?.length) continue
            const nazwa = `${wydany.tytul} – ${w.nazwa || w.nazwaZrodlowa || nazwaTypu(w.typ)}`
            for (const p of e.powiazania) { const c = rozwiaz(p); if (c) dodaj(c, 'plany', { nazwa, adres: adres(e.id) }) }
        }
    }
    for (const m of skany) for (const o of m.objasnienia) {
        if (!o.powiazania.length) continue
        const krotki = o.tekst.replace(/\s+/g, ' ').trim()
        const nazwa = `${m.nazwa}${krotki ? ` – „${krotki.length > 40 ? `${krotki.slice(0, 40)}…` : krotki}”` : ''}`
        for (const p of o.powiazania) { const c = rozwiaz(p); if (c) dodaj(c, 'skany', { nazwa, adres: `/archiwum/${m.id}#${o.id}` }) }
    }
    return ix
}

