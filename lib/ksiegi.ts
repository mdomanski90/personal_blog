// Inwentarz ksiąg metrykalnych: słowniki i odczyt zakresów lat („1826–1875, 1880, 1885-1890”).

export const WYZNANIA_PARAFII: Record<string, string> = {
    unicka: 'greckokatolicka (unicka)',
    rzymskokatolicka: 'rzymskokatolicka',
    prawoslawna: 'prawosławna',
    ewangelicka: 'ewangelicka',
    zydowska: 'żydowska (okręg bóżniczy)',
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

/** Zakresy lat z zapisu „1826–1875, 1880, 1885-1890”. Pomija to, czego nie da się odczytać. */
export function zakresyLat(tekst: string | null | undefined): [number, number][] {
    if (!tekst) return []
    const wynik: [number, number][] = []
    for (const kawalek of tekst.split(/[,;]/)) {
        const m = kawalek.trim().match(/^(\d{4})\s*(?:[–—-]\s*(\d{4}))?/)
        if (!m) continue
        const od = Number(m[1])
        const doRoku = m[2] ? Number(m[2]) : od
        wynik.push(od <= doRoku ? [od, doRoku] : [doRoku, od])
    }
    return wynik.sort((a, b) => a[0] - b[0])
}

/** Czy któryś zakres zahacza o przedział [od, do] (np. lata przynależności wsi do parafii). */
export function nakladaSie(zakresy: [number, number][], od: number | null, doRoku: number | null): boolean {
    if (od == null && doRoku == null) return true
    const a = od ?? -Infinity
    const b = doRoku ?? Infinity
    return zakresy.some(([x, y]) => x <= b && y >= a)
}
