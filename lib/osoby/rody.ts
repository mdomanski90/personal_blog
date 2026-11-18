// PK (uwaga właściciela 18.11): strona „całe drzewo” (/osoby/drzewo) – drzewo potomków najstarszej znanej pary.
// Przy kilku niepowiązanych częściach drzewa („rody”) – wybór rodu. Liczone tylko z osób widocznych dla czytelnika
// (zasada 1.5/1.6: liczby i korzenie bez śladów osób ukrytych). Czyste funkcje – bez plików.
import { lataZycia, nazwaOsoby, rokUrodzenia, type Drzewo } from './model'

export interface Rod {
    /** korzeń drzewa potomków: osoba bez widocznych rodziców z największą liczbą widocznych potomków */
    korzen: string
    nazwa: string
    lata: string
    /** widoczne osoby w tej części drzewa (połączone rodzinami) */
    osob: number
}

/** Części drzewa połączone rodzinami (małżonkowie, rodzice, dzieci), tylko z osób widocznych; od największej. Pojedyncze osoby pomijane. */
export function rodyDrzewa(d: Drzewo, widac: (id: string) => boolean): Rod[] {
    const jest = (x: string | undefined): x is string => !!x && d.osoby.has(x) && widac(x)
    const rodzic = new Map<string, string>()
    const znajdz = (x: string): string => { let r = x; while (rodzic.get(r) !== r) r = rodzic.get(r)!; rodzic.set(x, r); return r }
    const polacz = (a: string, b: string) => { const ra = znajdz(a), rb = znajdz(b); if (ra !== rb) rodzic.set(rb, ra) }
    for (const id of d.osoby.keys()) if (jest(id)) rodzic.set(id, id)
    const rodzice = new Map<string, string[]>(), dzieci = new Map<string, string[]>()
    for (const f of d.rodziny.values()) {
        const czlonkowie = [f.maz, f.zona, ...f.dzieci].filter(jest)
        for (let i = 1; i < czlonkowie.length; i++) polacz(czlonkowie[0], czlonkowie[i])
        const rodz = [f.maz, f.zona].filter(jest)
        for (const c of f.dzieci.filter(jest)) {
            rodzice.set(c, [...(rodzice.get(c) ?? []), ...rodz])
            for (const r of rodz) dzieci.set(r, [...(dzieci.get(r) ?? []), c])
        }
    }
    const potomkowie = (x: string): number => {
        const widziani = new Set<string>(), stos = [...(dzieci.get(x) ?? [])]
        while (stos.length) { const c = stos.pop()!; if (widziani.has(c)) continue; widziani.add(c); stos.push(...(dzieci.get(c) ?? [])) }
        return widziani.size
    }
    const czesci = new Map<string, string[]>()
    for (const id of rodzic.keys()) { const r = znajdz(id); czesci.set(r, [...(czesci.get(r) ?? []), id]) }
    const wyn: Rod[] = []
    for (const osoby of czesci.values()) {
        if (osoby.length < 2) continue
        const kandydaci = osoby.filter((x) => !(rodzice.get(x) ?? []).length)
        const ocena = (x: string) => ({ p: potomkowie(x), r: rokUrodzenia(d.osoby.get(x)!) ?? 9999 })
        const korzen = [...(kandydaci.length ? kandydaci : osoby)].sort((a, b) => {
            const A = ocena(a), B = ocena(b)
            return B.p - A.p || A.r - B.r || (d.osoby.get(a)!.plec === 'M' ? -1 : 0) - (d.osoby.get(b)!.plec === 'M' ? -1 : 0) || a.localeCompare(b)
        })[0]
        const o = d.osoby.get(korzen)!
        wyn.push({ korzen, nazwa: nazwaOsoby(o), lata: lataZycia(o), osob: osoby.length })
    }
    return wyn.sort((a, b) => b.osob - a.osob || a.nazwa.localeCompare(b.nazwa, 'pl'))
}

/** Ród z adresu (?od=<id korzenia>), inaczej największy. Nieznany albo niewidoczny id = największy ród. */
export const wybranyRod = (rody: Rod[], od: string | null | undefined): Rod | null => rody.find((r) => r.korzen === od) ?? rody[0] ?? null
