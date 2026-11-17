// Inwentarz ksiąg metrykalnych: słowniki i odczyt zakresów lat („1826–1875, 1880, 1885-1890”).

export const WYZNANIA_PARAFII: Record<string, string> = {
    unicka: 'greckokatolicka (unicka)',
    rzymskokatolicka: 'rzymskokatolicka',
    prawoslawna: 'prawosławna',
    ewangelicka: 'ewangelicka',
    zydowska: 'mojżeszowa (okręg bóżniczy)',
    cywilna: 'urząd stanu cywilnego',
}

export const RODZAJE_KSIAG: Record<string, string> = {
    urodzenia: 'urodzenia i chrzty',
    malzenstwa: 'małżeństwa',
    zgony: 'zgony',
    zapowiedzi: 'zapowiedzi',
    alegaty: 'alegaty',
    indeksy: 'indeksy',
    ludnosc: 'księgi ludności, spisy',
    inne: 'inne',
}

/** kolejność wierszy w tabeli i na pasku lat */
export const KOLEJNOSC_KSIAG = Object.keys(RODZAJE_KSIAG)

export const DOSTEP_KSIAG: Record<string, string> = {
    skany: 'skany online',
    indeks: 'tylko indeks online',
    archiwum: 'na miejscu w archiwum',
    zaginione: 'zaginione / nieznane',
}

// KI-12 (P2): przedrostki przybliżenia nie zmieniają odczytu roku; rok końcowy może być skrócony („1828–30”).
const LATA_KAWALEK = /^(?:ok\.?|ca\.?|circa|około|po|przed)?\s*(\d{4})\s*(?:(?:[–—\-/])\s*(\d{4}|\d{2}))?/i

/** Zakresy lat z zapisu „1826–1875, 1880, 1885-1890, 1828–30, ok. 1850, 1850/1855”
 * oraz fragmenty, których nie da się odczytać (do zgłoszenia w panelu jakości – nic nie ginie po cichu). */
export function odczytajLata(tekst: string | null | undefined): { zakresy: [number, number][]; nieodczytane: string[] } {
    const zakresy: [number, number][] = []
    const nieodczytane: string[] = []
    if (!tekst) return { zakresy, nieodczytane }
    for (const surowy of tekst.split(/[,;]/)) {
        const kawalek = surowy.trim()
        if (!kawalek) continue
        const m = kawalek.match(LATA_KAWALEK)
        if (!m) { nieodczytane.push(kawalek); continue }
        // odczytany początek, ale coś jeszcze za nim („1830 lub 1831”, „1850 (uszkodzony)”): zakres zostaje, kawałek trafia też do zgłoszenia
        if (kawalek.slice(m[0].length).trim()) nieodczytane.push(kawalek)
        const od = Number(m[1])
        let doRoku = od
        if (m[2]) {
            doRoku = m[2].length === 2 ? Math.floor(od / 100) * 100 + Number(m[2]) : Number(m[2])
            if (m[2].length === 2 && doRoku < od) doRoku += 100
        }
        zakresy.push(od <= doRoku ? [od, doRoku] : [doRoku, od])
    }
    return { zakresy: zakresy.sort((a, b) => a[0] - b[0]), nieodczytane }
}

/** Zakresy lat z zapisu „1826–1875, 1880, 1885-1890”. Pomija to, czego nie da się odczytać (zob. odczytajLata). */
export const zakresyLat = (tekst: string | null | undefined): [number, number][] => odczytajLata(tekst).zakresy

/** Zakresy z kilku źródeł (np. tomy po roku) złączone w ciągłe przedziały: 1810, 1811, 1812 → 1810–1812. */
export function scalZakresy(zakresy: [number, number][]): [number, number][] {
    const w: [number, number][] = []
    for (const [a, b] of [...zakresy].sort((x, y) => x[0] - y[0])) {
        const ost = w.at(-1)
        if (ost && a <= ost[1] + 1) ost[1] = Math.max(ost[1], b)
        else w.push([a, b])
    }
    return w
}

/** Zakresy jako tekst: [[1810,1812],[1815,1815]] → „1810–1812, 1815”. */
export const zakresyTekst = (z: [number, number][]) => z.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(', ')

/** Czy któryś zakres zahacza o przedział [od, do] (np. lata przynależności wsi do parafii). */
export function nakladaSie(zakresy: [number, number][], od: number | null, doRoku: number | null): boolean {
    if (od == null && doRoku == null) return true
    const a = od ?? -Infinity
    const b = doRoku ?? Infinity
    return zakresy.some(([x, y]) => x <= b && y >= a)
}
