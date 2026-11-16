// PH2 (PH-02, PH-09, PH-19): element planu – na czym go oparto (podstawa: materiał i objaśnienie), powiązania z kartami
// (format [[…]] jak w objaśnieniach), nazwa ze źródła i publiczna pewność identyfikacji. Czyste funkcje – bez plików.
// Surowe identyfikatory powiązań i podstawy NIE trafiają do czytelnika (dlaCzytelnika je usuwa) – na stronie planu
// serwer wydaje je rozwiązane (odnosnikiElementu, podstawaDlaCzytelnika), tylko widoczne pozycje.

export const IDENTYFIKACJE = { pewna: 'pewna', przypuszczalna: 'przypuszczalnie', nieustalona: 'nie ustalono' } as const
export type Identyfikacja = keyof typeof IDENTYFIKACJE
export interface Podstawa { material: string; objasnienie?: string }
export interface Odnosnik { nazwa: string; adres: string }

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ID_OBJ = /^o-[a-z0-9]{4,24}$/
const CEL = /^[\p{L}\p{N}][\p{L}\p{N} .,'’-]*$/u

/** Pola PH2 elementu w dobrym kształcie (brak / zły kształt → pole pominięte). */
export function poprawPolaPH2(e: Record<string, unknown>): { powiazania?: string[]; podstawa?: Podstawa[]; nazwaZrodlowa?: string; identyfikacja?: Identyfikacja } {
    const wyn: ReturnType<typeof poprawPolaPH2> = {}
    if (Array.isArray(e.powiazania)) {
        const L = [...new Set(e.powiazania.filter((p): p is string => typeof p === 'string').map((p) => p.trim().slice(0, 120)).filter((p) => CEL.test(p)))].slice(0, 30)
        if (L.length) wyn.powiazania = L
    }
    if (Array.isArray(e.podstawa)) {
        const L: Podstawa[] = []
        for (const q of e.podstawa) {
            const z = q as Record<string, unknown> | null
            if (!z || typeof z.material !== 'string' || !ID.test(z.material)) continue
            L.push(typeof z.objasnienie === 'string' && ID_OBJ.test(z.objasnienie) ? { material: z.material, objasnienie: z.objasnienie } : { material: z.material })
        }
        if (L.length) wyn.podstawa = L.slice(0, 20)
    }
    if (typeof e.nazwaZrodlowa === 'string' && e.nazwaZrodlowa.trim()) wyn.nazwaZrodlowa = e.nazwaZrodlowa.trim().slice(0, 300)
    if (typeof e.identyfikacja === 'string' && e.identyfikacja in IDENTYFIKACJE) wyn.identyfikacja = e.identyfikacja as Identyfikacja
    return wyn
}

/** Powiązania elementu zamienione na nazwy i adresy – niewidoczne cele pominięte (rozwiaz z lib/archiwum). */
export function odnosnikiElementu(powiazania: string[] | undefined, rozwiaz: (id: string) => Odnosnik | null): Odnosnik[] {
    return (powiazania ?? []).map(rozwiaz).filter((c): c is Odnosnik => !!c).map((c) => ({ nazwa: c.nazwa, adres: c.adres }))
}

/** Podstawa widoczna dla czytelnika: materiał, który widzi; objaśnienie – tylko widoczne (inaczej sam materiał). */
export function podstawaDlaCzytelnika(podstawa: Podstawa[] | undefined, materialy: ReadonlySet<string>, objasnienia: ReadonlySet<string>): Podstawa[] {
    const wyn: Podstawa[] = []
    for (const p of podstawa ?? []) {
        if (!materialy.has(p.material)) continue
        const q: Podstawa = p.objasnienie && objasnienia.has(p.objasnienie) ? { material: p.material, objasnienie: p.objasnienie } : { material: p.material }
        if (!wyn.some((x) => x.material === q.material && x.objasnienie === q.objasnienie)) wyn.push(q)
    }
    return wyn
}
