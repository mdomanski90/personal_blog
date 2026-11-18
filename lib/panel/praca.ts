// P6a (PNL-08): „wróć do pracy” na pulpicie – ostatnio edytowane (z miejscem pracy), przypięte pozycje i zapisane widoki list.
// Jeden plik content/_panel/praca.json (katalog _panel należy do usługi – Krok 0 P6), zapis atomowy. Same adresy panelu i nazwy –
// bez treści wpisów. Ostatnio edytowane dopisuje serwer po udanym zapisie (Keystatic, edytor planu, edytor osoby).
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { opisPlikuZTytulem } from './historia-adresy'
import { stronaZAdresuKeystatic } from './menu'

/** P6a wg plansz: `strona` – strona publiczna, `zmiany` – nazwy zmienionych pól, `grob` – krótki numer („A/1/2”) dla „wróć do grobu”, `rodzaj`, `szkic` – widoczność „tylko ja” (plansza: „wpis · tylko ja”). */
export interface PozycjaPracy { href: string; nazwa: string; czas?: string; miejsce?: string; strona?: string; zmiany?: string[]; grob?: string; rodzaj?: string; szkic?: boolean }
export interface Praca { wersja: 1; ostatnie: PozycjaPracy[]; przypiete: PozycjaPracy[]; widoki: PozycjaPracy[] }

export const MAKS_OSTATNICH = 12
export const MAKS_PRZYPIETYCH = 30
const plik = (korzen: string) => path.join(/*turbopackIgnore: true*/ korzen, 'content', '_panel', 'praca.json')
const pusta = (): Praca => ({ wersja: 1, ostatnie: [], przypiete: [], widoki: [] })

/** Adres w panelu: tylko ścieżki /keystatic…, bez protokołu i podwójnych ukośników. */
export const adresPanelu = (s: unknown): s is string => typeof s === 'string' && s.length < 500 && /^\/keystatic(\/|$|\?)/.test(s) && !s.includes('//') && !/[\s<>"]/.test(s)
const pozycja = (x: unknown): PozycjaPracy | null => {
    if (!x || typeof x !== 'object') return null
    const o = x as Record<string, unknown>
    if (!adresPanelu(o.href) || typeof o.nazwa !== 'string' || !o.nazwa.trim()) return null
    const strona = typeof o.strona === 'string' && /^\/(?!\/)[^\s<>"]*$/.test(o.strona) && !o.strona.startsWith('/keystatic') ? o.strona.slice(0, 300) : undefined
    const zmiany = Array.isArray(o.zmiany) ? o.zmiany.filter((x): x is string => typeof x === 'string').slice(0, 8).map((x) => x.slice(0, 60)) : undefined
    return { href: o.href, nazwa: o.nazwa.trim().slice(0, 160), ...(typeof o.czas === 'string' ? { czas: o.czas } : {}), ...(typeof o.miejsce === 'string' && o.miejsce ? { miejsce: o.miejsce.slice(0, 120) } : {}),
        ...(strona ? { strona } : {}), ...(zmiany?.length ? { zmiany } : {}), ...(typeof o.grob === 'string' && o.grob ? { grob: o.grob.slice(0, 40) } : {}), ...(typeof o.rodzaj === 'string' && o.rodzaj ? { rodzaj: o.rodzaj.slice(0, 40) } : {}), ...(o.szkic === true ? { szkic: true } : {}) }
}

export async function wczytajPrace(korzen = process.cwd()): Promise<Praca> {
    try {
        const j = JSON.parse(await fs.readFile(plik(korzen), 'utf8')) as Record<string, unknown>
        const lista = (k: string) => (Array.isArray(j[k]) ? (j[k] as unknown[]).map(pozycja).filter((x): x is PozycjaPracy => !!x) : [])
        return { wersja: 1, ostatnie: lista('ostatnie'), przypiete: lista('przypiete'), widoki: lista('widoki') }
    } catch { return pusta() }
}

// zapisy kolejno w jednym procesie – dwa równoczesne zapisy nie gubią się nawzajem
let kolejka: Promise<unknown> = Promise.resolve()
async function zmien(korzen: string, f: (p: Praca) => Praca): Promise<Praca> {
    const krok = kolejka.then(async () => {
        const nowa = f(await wczytajPrace(korzen))
        const p = plik(korzen), tmp = `${p}.${randomBytes(4).toString('hex')}.tmp`
        await fs.mkdir(path.dirname(p), { recursive: true })
        await fs.writeFile(tmp, JSON.stringify(nowa, null, 1), { mode: 0o640 })
        await fs.rename(tmp, p)
        return nowa
    })
    kolejka = krok.catch(() => {})
    return krok
}

/** Dopisuje pozycje na początek „ostatnio edytowanych” (bez powtórzeń adresu; miejsce pracy w adresie, np. ?el=). */
export function dopiszOstatnie(L: PozycjaPracy[], nowe: PozycjaPracy[], czas = new Date().toISOString()): PozycjaPracy[] {
    const wyn = [...nowe.map((n) => ({ ...n, czas })), ...L]
    const bazowy = (h: string) => h.split('?')[0]
    const byly = new Set<string>()
    return wyn.filter((x) => { const k = bazowy(x.href); if (byly.has(k)) return false; byly.add(k); return true }).slice(0, MAKS_OSTATNICH)
}

export async function zapiszOstatniePozycje(nowe: PozycjaPracy[], korzen = process.cwd()): Promise<void> {
    const ok = nowe.map(pozycja).filter((x): x is PozycjaPracy => !!x)
    if (ok.length) await zmien(korzen, (p) => ({ ...p, ostatnie: dopiszOstatnie(p.ostatnie, ok) }))
}

/** Po zapisie Keystatic: ścieżki plików (względem projektu) → wpisy z adresem edycji, stroną publiczną i zmienionymi polami. */
export async function zapiszOstatnie(sciezki: string[], korzen = process.cwd(), pola: Record<string, string[]> = {}): Promise<void> {
    const poz: PozycjaPracy[] = []
    for (const s of sciezki) {
        if (!s.startsWith('content/')) continue
        const o = await opisPlikuZTytulem(korzen, s.slice('content/'.length))
        if (!o.edycja || poz.some((x) => x.href === o.edycja)) continue
        const strona = o.widocznosc !== 'ja' ? stronaZAdresuKeystatic(o.edycja) ?? undefined : undefined
        poz.push({ href: o.edycja, nazwa: o.nazwa, ...(o.rodzaj ? { rodzaj: o.rodzaj } : {}), ...(strona ? { strona } : {}), ...(pola[s]?.length ? { zmiany: pola[s] } : {}), ...(o.widocznosc === 'ja' ? { szkic: true } : {}) })
    }
    await zapiszOstatniePozycje(poz, korzen)
}

export type RodzajListy = 'przypiete' | 'widoki'
export async function dodajDoListy(rodzaj: RodzajListy, x: unknown, korzen = process.cwd()): Promise<Praca | null> {
    const p = pozycja(x)
    if (!p) return null
    return zmien(korzen, (s) => ({ ...s, [rodzaj]: [{ href: p.href, nazwa: p.nazwa }, ...s[rodzaj].filter((y) => y.href !== p.href)].slice(0, MAKS_PRZYPIETYCH) }))
}
export async function usunZListy(rodzaj: RodzajListy | 'ostatnie', href: string, korzen = process.cwd()): Promise<Praca> {
    return zmien(korzen, (s) => ({ ...s, [rodzaj]: s[rodzaj].filter((y) => y.href !== href) }))
}
