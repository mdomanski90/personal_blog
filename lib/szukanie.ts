// Dopasowanie słów w wyszukiwarce ogólnej: bez polskich znaków, z prostą odmianą.
// Słowo zapytania skracamy do rdzenia (bez końcówki fleksyjnej) i szukamy wyrazów zaczynających się od rdzenia,
// z typowymi obocznościami na końcu rdzenia (Olszanka → Olszance, Łuby → Łubach, bieżeństwo → bieżeństwie).

import { normalizuj } from './tekst'

const KONCOWKI = ['owie', 'ami', 'ach', 'ami', 'owi', 'ego', 'emu', 'ich', 'ych', 'imi', 'ymi', 'iem', 'om', 'ow', 'ie', 'em', 'ej', 'im', 'ym', 'a', 'e', 'i', 'o', 'u', 'y']
// oboczności spółgłosek na końcu rdzenia (po normalizacji: bez polskich znaków)
const OBOCZNOSCI: [string, string[]][] = [['ch', ['sz']], ['k', ['c', 'cz']], ['g', ['dz', 'z']], ['r', ['rz']], ['t', ['ci', 'c']], ['d', ['dzi', 'dz']], ['l', ['l']], ['s', ['si', 's']], ['z', ['zi']], ['n', ['ni']], ['w', ['wi']], ['m', ['mi']], ['p', ['pi']], ['b', ['bi']]]

const WSTECZ: [string, string[]][] = [['cz', ['k']], ['dzi', ['d']], ['dz', ['g', 'd']], ['sz', ['ch']], ['rz', ['r']], ['ci', ['t']], ['c', ['k', 't']], ['zi', ['z', 'g']], ['si', ['s']], ['ni', ['n']]]

/** Rdzenie słowa: samo słowo (dla krótkich) albo słowo bez końcówki + warianty z obocznością. */
export function rdzenie(slowo: string): string[] {
    const s = normalizuj(slowo).replace(/\s+/g, '')
    if (s.length < 5) return [s]
    let r = s
    for (const k of KONCOWKI) {
        if (s.endsWith(k) && s.length - k.length >= 4) { r = s.slice(0, -k.length); break }
    }
    const wyn = new Set([r])
    for (const [z, na] of OBOCZNOSCI) if (r.endsWith(z)) for (const n of na) wyn.add(r.slice(0, -z.length) + n)
    // i w drugą stronę: z formy odmienionej do podstawowej (Olszance → Olszank-, Łosicach → Łosic-)
    for (const [z, na] of WSTECZ) if (r.endsWith(z)) for (const n of na) wyn.add(r.slice(0, -z.length) + n)
    return [...wyn]
}

const ucieczka = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export interface Zapytanie {
    /** całe zapytanie po normalizacji (bez przyimka na początku) */
    fraza: string
    /** dla każdego słowa: wyrażenie „wyraz zaczyna się od rdzenia” */
    slowa: RegExp[]
}

export function przygotujZapytanie(tekst: string): Zapytanie | null {
    // „w Korczówce”, „z Olszanki” – przyimek pomijamy
    const fraza = normalizuj(tekst).replace(/^(w|we|z|ze|do|na|od|po|pod|przy|nad|ku|kolo)\s+(?=\S)/, '')
    if (fraza.length < 2) return null
    const slowa = fraza.split(' ').filter(Boolean).map((w) => new RegExp(`(?:^|\\s)(?:${rdzenie(w).map(ucieczka).join('|')})`))
    return { fraza, slowa }
}

/** Czy każde słowo zapytania występuje (z odmianą) w tekście. */
export function pasuje(z: Zapytanie, tekst: string): boolean {
    const t = normalizuj(tekst)
    return z.slowa.every((r) => r.test(t))
}

/** Pierwsze miejsce w tekście, gdzie występuje któreś słowo zapytania (do fragmentu wokół trafienia). */
export function pozycjaTrafienia(z: Zapytanie, tekst: string): number {
    const t = normalizuj(tekst)
    let min = -1
    for (const r of z.slowa) {
        const m = r.exec(t)
        if (m && (min < 0 || m.index < min)) min = m.index
    }
    return min
}

/** Podpowiedź przy braku wyników: krótsze słowo (sam rdzeń). */
export function krotszeZapytanie(tekst: string): string | null {
    const s = tekst.trim()
    const slowa = s.split(/\s+/)
    if (slowa.length > 1) return slowa.slice(0, -1).join(' ')
    const r = rdzenie(s)[0]
    return r.length >= 4 && r.length < normalizuj(s).length ? s.slice(0, r.length) : null
}
