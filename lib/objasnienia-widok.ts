// Objaśnienia na skanach – część wspólna dla serwera i przeglądarki (bez dostępu do plików).

export type RodzajObjasnienia = 'odczyt' | 'tlumaczenie' | 'objasnienie' | 'pieczec'
export type WidocznoscObjasnienia = 'publiczne' | 'bliscy' | 'ja'

/** Rodzaj → nazwa na stronie i „purpose” ciała adnotacji W3C. */
export const RODZAJE_OBJASNIEN: Record<RodzajObjasnienia, { nazwa: string; cel: string; opis: string }> = {
    odczyt: { nazwa: 'odczyt', cel: 'transcribing', opis: 'tekst dosłownie, z zachowaniem pisowni; luki w nawiasach […]' },
    tlumaczenie: { nazwa: 'tłumaczenie', cel: 'translating', opis: 'przekład na polski' },
    objasnienie: { nazwa: 'objaśnienie', cel: 'commenting', opis: 'co to jest, kto, co znaczy skrót' },
    pieczec: { nazwa: 'pieczęć', cel: 'identifying', opis: 'pieczęć, stempel, podpis, znak' },
}
/** Języki tekstu – kod BCP 47 (jak wymaga W3C) → nazwa. */
export const JEZYKI: Record<string, string> = {
    pl: 'polski', la: 'łacina', ru: 'rosyjski', uk: 'ukraiński', be: 'białoruski', cu: 'cerkiewnosłowiański',
    de: 'niemiecki', yi: 'jidysz', he: 'hebrajski', fr: 'francuski',
}
/** Objaśnienie przygotowane dla czytelnika (lib/archiwum objasnieniaDoWidoku). */
export interface ObjasnienieWidoku {
    id: string
    /** numer strony w przeglądarce (od 0) */
    strona: number
    x: number
    y: number
    w: number
    h: number
    rodzaj: RodzajObjasnienia
    tekst: string
    /** nazwa języka */
    jezyk?: string
    powiazania: { nazwa: string; adres: string }[]
    opracowal: string
    weryfikacja?: string
    /** PH-01: wielokąt albo punkt w % strony (brak = prostokąt) */
    ksztalt?: Ksztalt
}

// ---------- PH-01: kształty na skanie (bez zależności serwerowych – także w przeglądarce) ----------
export type Ksztalt = { k: 'w'; p: [number, number][] } | { k: 'p'; x: number; y: number }
/** obrys punktu: kwadrat 1% × 1% wokół punktu (sortowanie, przybliżenie do objaśnienia) */
const POL_PUNKTU = 0.5

/** Kształt w dobrym kształcie (punkty w 0–100, wielokąt 3–200 wierzchołków) albo null. */
export function poprawKsztalt(k: unknown): Ksztalt | null {
    if (!k || typeof k !== 'object') return null
    const z = k as Record<string, unknown>
    const ok = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100
    const r = (n: number) => Math.round(n * 1000) / 1000
    if (z.k === 'p' && ok(z.x) && ok(z.y)) return { k: 'p', x: r(z.x as number), y: r(z.y as number) }
    if (z.k === 'w' && Array.isArray(z.p) && z.p.length >= 3 && z.p.length <= 200 && z.p.every((q) => Array.isArray(q) && q.length === 2 && ok(q[0]) && ok(q[1])))
        return { k: 'w', p: (z.p as [number, number][]).map(([x, y]) => [r(x), r(y)] as [number, number]) }
    return null
}

/** Obrys kształtu w % strony. */
export function obrysKsztaltu(k: Ksztalt): { x: number; y: number; w: number; h: number } {
    if (k.k === 'p') {
        const x = Math.max(0, k.x - POL_PUNKTU), y = Math.max(0, k.y - POL_PUNKTU)
        return { x, y, w: Math.min(100, k.x + POL_PUNKTU) - x, h: Math.min(100, k.y + POL_PUNKTU) - y }
    }
    const xs = k.p.map((q) => q[0]), ys = k.p.map((q) => q[1])
    const x = Math.min(...xs), y = Math.min(...ys)
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

/** Trafienie w objaśnienie (współrzędne w % strony); punkt – w promieniu `promien` (%). */
export function wKsztalcie(o: { x: number; y: number; w: number; h: number; ksztalt?: Ksztalt }, x: number, y: number, promien = 1.2): boolean {
    const k = o.ksztalt
    if (!k) return x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h
    if (k.k === 'p') return Math.hypot(x - k.x, y - k.y) <= promien
    let w = false
    for (let i = 0, j = k.p.length - 1; i < k.p.length; j = i++) {
        const [xi, yi] = k.p[i], [xj, yj] = k.p[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) w = !w
    }
    return w
}

