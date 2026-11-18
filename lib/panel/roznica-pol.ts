// P6a wg plansz (funkcja 4): różnica wersji pole po polu – nazwy pól z formularza Keystatic, w polach tekstowych różnica słów.
// Czyste funkcje (testy); etykiety pól podaje wywołujący (lib/panel/historia-adresy.ts – z konfiguracji Keystatic).
import { load } from 'js-yaml'

export type Fragment = { t: '=' | '-' | '+'; s: string }
export interface ZmianaPola { pole: string; etykieta: string; fragmenty: Fragment[]; skrot: boolean }

/** Treść pliku Keystatic → obiekt pól; ciało .mdoc jako pole „__tresc”. Nieczytelny plik → null. */
export function polaPliku(plik: string, tekst: string | null): Record<string, unknown> | null {
    if (tekst === null) return {}
    try {
        if (plik.endsWith('.json')) return JSON.parse(tekst) as Record<string, unknown>
        if (plik.endsWith('.mdoc') || plik.endsWith('.md')) {
            const t = tekst.replace(/^﻿/, '')
            const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(t)
            if (!m) return { __tresc: t }
            return { ...((load(m[1]) as Record<string, unknown> | null) ?? {}), __tresc: m[2] }
        }
        return (load(tekst) as Record<string, unknown> | null) ?? {}
    } catch { return null }
}

/** Wartość pola jako tekst do porównania: tekst bez zmian, lista po przecinku, obiekt { name } – nazwa, reszta – JSON. */
export function tekstWartosci(v: unknown): string {
    if (v === undefined || v === null) return ''
    if (typeof v === 'string') return v
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    if (Array.isArray(v)) return v.map(tekstWartosci).join(', ')
    if (typeof v === 'object' && typeof (v as { name?: unknown }).name === 'string') return (v as { name: string }).name
    return JSON.stringify(v)
}

/** Różnica słów (LCS na słowach z odstępami); długie wspólne odcinki skrócone do „…”. */
export function roznicaSlow(z: string, na: string, maks = 12): Fragment[] {
    const A = z.split(/(\s+)/).filter((x) => x !== ''), B = na.split(/(\s+)/).filter((x) => x !== '')
    const out: Fragment[] = []
    if (A.length * B.length > 1_000_000) return [{ t: '-', s: z }, { t: '+', s: na }]
    const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
    const dodaj = (t: Fragment['t'], s: string) => { const o = out[out.length - 1]; if (o && o.t === t) o.s += s; else out.push({ t, s }) }
    let i = 0, j = 0
    while (i < n || j < m) {
        if (i < n && j < m && A[i] === B[j]) { dodaj('=', A[i]); i++; j++ }
        else if (i < n && (j === m || L[i + 1][j] >= L[i][j + 1])) { dodaj('-', A[i]); i++ }
        else { dodaj('+', B[j]); j++ }
    }
    // skracanie wspólnych odcinków (słowa wokół zmian zostają)
    return out.map((f, k) => {
        if (f.t !== '=') return f
        const slowa = f.s.split(/(\s+)/)
        if (slowa.length <= maks * 2) return f
        const pocz = k === 0 ? [] : slowa.slice(0, maks), kon = k === out.length - 1 ? [] : slowa.slice(-maks)
        return { t: '=', s: `${pocz.join('')}${pocz.length || kon.length ? ' … ' : '…'}${kon.join('')}` }
    })
}

/** Zmiany pól z → na (kolejność pól jak w nowszej wersji, potem usunięte). `etykiety` – nazwy pól z formularza. */
export function zmianyPol(plik: string, z: string | null, na: string | null, etykiety: Record<string, string> = {}): ZmianaPola[] | null {
    const a = polaPliku(plik, z), b = polaPliku(plik, na)
    if (!a || !b) return null
    const klucze = [...new Set([...Object.keys(b), ...Object.keys(a)])]
    const wyn: ZmianaPola[] = []
    for (const k of klucze) {
        const x = tekstWartosci(a[k]), y = tekstWartosci(b[k])
        if (x === y) continue
        const fr = roznicaSlow(x, y)
        wyn.push({ pole: k, etykieta: k === '__tresc' ? 'treść' : (etykiety[k] ?? k), fragmenty: fr, skrot: fr.some((f) => f.t === '=' && f.s.includes(' … ')) })
    }
    return wyn
}
