// Osoby z drzewa przypięte do grobów planu: krótka informacja o rodzinie i krewni (do „grobów rodziny”).
// Tylko osoby, które czytelnik może zobaczyć – żyjący i „dla bliskich” nie trafiają do przeglądarki niezalogowanego.
import { widoczne, type Widocznosc } from '../archiwum'
import { stanOsob } from '../osoby/dane'
import { lataZycia, nazwaOsoby, type Osoba } from '../osoby/model'
import type { Plan } from './model'

export interface KrewnyNaPlanie { id: string; nazwa: string; lata: string; relacja: string }
export interface OsobaNaPlanie { id: string; nazwa: string; lata: string; zdanie: string; krewni: KrewnyNaPlanie[] }

const rola = (o: Osoba | undefined, m: string, k: string, n: string) => (o?.plec === 'M' ? m : o?.plec === 'K' ? k : n)

export async function osobyPlanu(plan: Plan, poziom: Widocznosc): Promise<Record<string, OsobaNaPlanie>> {
    const ids = new Set(plan.elementy.flatMap((e) => (e.osoby ?? []).map((o) => o.id).filter((x): x is string => !!x)))
    if (!ids.size) return {}
    const s = await stanOsob()
    const widac = (id?: string) => !!id && s.drzewo.osoby.has(id) && widoczne(s.widocznosc(id), poziom)
    const wyn: Record<string, OsobaNaPlanie> = {}
    for (const id of ids) {
        if (!widac(id)) continue
        const o = s.drzewo.osoby.get(id)!
        const rel = s.relacje.get(id)
        const krewni: KrewnyNaPlanie[] = []
        const dodaj = (k: string | undefined, relacja: string) => {
            if (!k || k === id || !widac(k) || krewni.some((x) => x.id === k)) return
            const p = s.drzewo.osoby.get(k)!
            krewni.push({ id: k, nazwa: nazwaOsoby(p), lata: lataZycia(p), relacja })
        }
        const rodzice: string[] = [], malzonkowie: string[] = []
        for (const f of rel?.rodzice ?? []) {
            if (f.maz) { dodaj(f.maz, 'ojciec'); if (widac(f.maz)) rodzice.push(nazwaOsoby(s.drzewo.osoby.get(f.maz)!)) }
            if (f.zona) { dodaj(f.zona, 'matka'); if (widac(f.zona)) rodzice.push(nazwaOsoby(s.drzewo.osoby.get(f.zona)!)) }
            for (const c of f.dzieci) dodaj(c, rola(s.drzewo.osoby.get(c), 'brat', 'siostra', 'rodzeństwo'))
        }
        for (const f of rel?.malzenstwa ?? []) {
            const sp = f.maz === id ? f.zona : f.maz
            const p = sp ? s.drzewo.osoby.get(sp) : undefined
            dodaj(sp, rola(p, 'mąż', 'żona', 'małżonek'))
            if (sp && widac(sp)) malzonkowie.push(`${rola(p, 'mąż', 'żona', 'małżonek')}: ${nazwaOsoby(p!)}`)
            for (const c of f.dzieci) dodaj(c, rola(s.drzewo.osoby.get(c), 'syn', 'córka', 'dziecko'))
        }
        const czesci = [rodzice.length ? `${rola(o, 'syn', 'córka', 'dziecko')}: ${rodzice.join(' i ')}` : '', ...malzonkowie].filter(Boolean)
        wyn[id] = { id, nazwa: nazwaOsoby(o), lata: lataZycia(o), zdanie: czesci.join(' · '), krewni }
    }
    return wyn
}
