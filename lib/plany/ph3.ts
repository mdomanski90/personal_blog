// PH3 (PH-04–08): narzędzia rekonstrukcji – czyste funkcje bez plików i bez Reacta.
// Model wg PH0 §3 (decyzje 16.11 i ankieta 17.11): szerokość w węzłach osi (S1), gładka linia z ostrymi węzłami (K5),
// napisy wielowierszowe z wyrównaniem, tłem i biegiem wzdłuż linii, etykieta z linią / strzałką (K2),
// numer legendy jako pole elementu (K3) i element „położenie nieznane” (tylko w legendzie). Wszystkie pola opcjonalne:
// brak pola = rysunek jak przed PH3.

export type P2 = [number, number]
export const WYROWNANIA = { l: 'do lewej', s: 'do środka', p: 'do prawej' } as const
export type Wyrownanie = keyof typeof WYROWNANIA
export const WSKAZNIKI = { linia: 'linia', strzalka: 'strzałka' } as const
export type Wskaznik = keyof typeof WSKAZNIKI

export interface PolaPH3 {
    /** PH-04: szerokość w węzłach osi linii (jednostki planu), tyle wartości co węzłów */
    s?: number[]
    /** PH-05: linia / obrys gładki (krzywa przez węzły) */
    gladka?: boolean
    /** PH-05: numery węzłów będących ostrymi narożnikami gładkiej linii */
    ostre?: number[]
    /** PH-06: wyrównanie wielowierszowego napisu */
    wyrownanie?: Wyrownanie
    /** PH-06: jasne tło pod napisem */
    tlo?: boolean
    /** PH-06: napis biegnie wzdłuż linii o tym identyfikatorze (brak linii – napis prosty) */
    wzdluz?: string
    /** PH-07: linia albo strzałka od odsuniętej etykiety do elementu */
    wskaznik?: Wskaznik
    /** PH-07: punkt wskazania w obwiedni elementu (0–1); brak = środek */
    kotwica?: P2
    /** PH-08: numer w legendzie planu – unikalny w planie (walidacja przy zapisie) */
    nrLegendy?: string
    /** PH-08 (K3): obiekt znany tylko z legendy – nie rysowany na planie, tylko w legendzie */
    nieznanePolozenie?: boolean
}

const ID = /^[a-z0-9]{4,24}$/
const NR = /^[\p{L}\p{N}][\p{L}\p{N}.\-/]{0,7}$/u

/** Pola PH3 w dobrym kształcie (zły kształt → pole pominięte). `liczbaWezlow` – dla linii i obrysów, inaczej 0. */
export function poprawPolaPH3(e: Record<string, unknown>, liczbaWezlow: number): PolaPH3 {
    const w: PolaPH3 = {}
    if (Array.isArray(e.s) && liczbaWezlow > 1 && e.s.length === liczbaWezlow && e.s.every((x) => typeof x === 'number' && Number.isFinite(x) && x > 0)) w.s = (e.s as number[]).map((x) => Math.min(x, 1e4))
    if (e.gladka === true && liczbaWezlow > 2) w.gladka = true
    if (Array.isArray(e.ostre) && liczbaWezlow > 0) {
        const L = [...new Set(e.ostre.filter((x): x is number => Number.isInteger(x) && x >= 0 && x < liczbaWezlow))].sort((a, b) => a - b)
        if (L.length) w.ostre = L
    }
    if (typeof e.wyrownanie === 'string' && e.wyrownanie in WYROWNANIA) w.wyrownanie = e.wyrownanie as Wyrownanie
    if (e.tlo === true) w.tlo = true
    if (typeof e.wzdluz === 'string' && ID.test(e.wzdluz)) w.wzdluz = e.wzdluz
    if (typeof e.wskaznik === 'string' && e.wskaznik in WSKAZNIKI) w.wskaznik = e.wskaznik as Wskaznik
    if (Array.isArray(e.kotwica) && e.kotwica.length === 2 && e.kotwica.every((x) => typeof x === 'number' && x >= 0 && x <= 1)) w.kotwica = [e.kotwica[0] as number, e.kotwica[1] as number]
    if (typeof e.nrLegendy === 'string' && NR.test(e.nrLegendy.trim())) w.nrLegendy = e.nrLegendy.trim()
    if (e.nieznanePolozenie === true) w.nieznanePolozenie = true
    return w
}

// ---------- PH-05: gładka linia z ostrymi węzłami ----------

/** Odcinki Béziera (p1, c1, c2, p2) przez węzły (Catmull-Rom); przy ostrym węźle styczna zerowa – narożnik. */
export function odcinkiBeziera(p: P2[], zamknieta: boolean, ostre: readonly number[] = []): [P2, P2, P2, P2][] {
    const n = p.length, ostry = new Set(ostre), wyn: [P2, P2, P2, P2][] = []
    if (n < 2) return wyn
    const at = (i: number): P2 => (zamknieta ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))])
    const ile = zamknieta ? n : n - 1
    for (let i = 0; i < ile; i++) {
        const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
        const i1 = zamknieta ? i % n : i, i2 = zamknieta ? (i + 1) % n : i + 1
        const c1: P2 = ostry.has(i1) ? p1 : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
        const c2: P2 = ostry.has(i2) ? p2 : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
        wyn.push([p1, c1, c2, p2])
    }
    return wyn
}

const f = (x: number) => x.toFixed(1)

/** Ścieżka SVG linii albo obrysu: łamana (jak przed PH3) albo gładka krzywa z ostrymi węzłami. */
export function sciezka(p: P2[], o: { zamknieta?: boolean; gladka?: boolean; ostre?: readonly number[] } = {}): string {
    if (!p.length) return ''
    if (!o.gladka || p.length < 3) return 'M' + p.map(([x, y]) => `${f(x)},${f(y)}`).join(' ') + (o.zamknieta ? 'Z' : '')
    let d = `M${f(p[0][0])},${f(p[0][1])}`
    for (const [, c1, c2, q] of odcinkiBeziera(p, !!o.zamknieta, o.ostre)) d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(q[0])},${f(q[1])}`
    return d + (o.zamknieta ? 'Z' : '')
}

const bez = ([a, b, c, d]: [P2, P2, P2, P2], t: number): P2 => {
    const u = 1 - t
    return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]) as P2
}

/**
 * Próbki osi (x, y, szerokość): dla łamanej – węzły (gęściej na długich odcinkach), dla gładkiej – punkty krzywej.
 * Szerokość interpolowana liniowo między węzłami (PH-04 S1: szerokość podąża za osią z definicji).
 */
export function probkiOsi(p: P2[], s: readonly number[] | undefined, szer: number, o: { gladka?: boolean; ostre?: readonly number[] } = {}, k = 10): [number, number, number][] {
    const n = p.length
    if (n < 2) return p.map(([x, y]) => [x, y, s?.[0] ?? szer])
    const W = (i: number) => s?.[i] ?? szer
    const wyn: [number, number, number][] = []
    if (o.gladka && n > 2) {
        odcinkiBeziera(p, false, o.ostre).forEach((odc, i) => {
            for (let j = 0; j < k; j++) { const t = j / k, q = bez(odc, t); wyn.push([q[0], q[1], W(i) + (W(i + 1) - W(i)) * t]) }
        })
    } else {
        for (let i = 0; i < n - 1; i++) for (let j = 0; j < k; j++) { const t = j / k; wyn.push([p[i][0] + (p[i + 1][0] - p[i][0]) * t, p[i][1] + (p[i + 1][1] - p[i][1]) * t, W(i) + (W(i + 1) - W(i)) * t]) }
    }
    wyn.push([p[n - 1][0], p[n - 1][1], W(n - 1)])
    return wyn
}

/** Wstęga o zmiennej szerokości (wielokąt zamknięty) z próbek osi; `dodatek` – poszerzenie o obwódkę / brzeg. */
export function wstega(pr: [number, number, number][], dodatek = 0): string {
    const n = pr.length
    if (n < 2) return ''
    const L: P2[] = [], R: P2[] = []
    for (let i = 0; i < n; i++) {
        const a = pr[Math.max(0, i - 1)], b = pr[Math.min(n - 1, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
        const nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d, h = (pr[i][2] + dodatek) / 2
        L.push([pr[i][0] + nx * h, pr[i][1] + ny * h]); R.push([pr[i][0] - nx * h, pr[i][1] - ny * h])
    }
    // zaokrąglone końce: półokręgi o promieniu połowy szerokości
    const kon = (q: [number, number, number], z: P2) => { const r = (q[2] + dodatek) / 2; return `A${f(r)},${f(r)} 0 0 1 ${f(z[0])},${f(z[1])}` }
    return `M${f(L[0][0])},${f(L[0][1])}` + L.slice(1).map(([x, y]) => `L${f(x)},${f(y)}`).join('') + kon(pr[n - 1], R[n - 1]) + [...R].reverse().slice(1).map(([x, y]) => `L${f(x)},${f(y)}`).join('') + kon(pr[0], L[0]) + 'Z'
}

// ---------- edycja węzłów: szerokości i ostre narożniki idą za węzłami ----------

/** Wstawienie węzła po indeksie i (nowy ma indeks i + 1): szerokość = średnia sąsiadów, ostre przesunięte. */
export function poWstawieniu(pola: Pick<PolaPH3, 's' | 'ostre'>, i: number): Pick<PolaPH3, 's' | 'ostre'> {
    const w: Pick<PolaPH3, 's' | 'ostre'> = {}
    if (pola.s) { const s = [...pola.s]; s.splice(i + 1, 0, ((s[i] ?? s[s.length - 1]) + (s[i + 1] ?? s[i] ?? 0)) / 2); w.s = s }
    if (pola.ostre) w.ostre = pola.ostre.map((j) => (j > i ? j + 1 : j))
    return w
}

/** Usunięcie węzła i: jego szerokość i znacznik narożnika znikają, dalsze indeksy w dół. */
export function poUsunieciu(pola: Pick<PolaPH3, 's' | 'ostre'>, i: number): Pick<PolaPH3, 's' | 'ostre'> {
    const w: Pick<PolaPH3, 's' | 'ostre'> = {}
    if (pola.s) w.s = pola.s.filter((_, j) => j !== i)
    if (pola.ostre) { const o = pola.ostre.filter((j) => j !== i).map((j) => (j > i ? j - 1 : j)); if (o.length) w.ostre = o }
    return w
}

// ---------- PH-06: napisy ----------

/** Wiersze napisu (podział ręczny Enterem; puste końcowe pomijane). */
export const wierszeNapisu = (t: string) => t.replace(/\r/g, '').split('\n').map((x) => x.trimEnd()).filter((x, i, a) => x || i < a.length - 1)

/** Przybliżona szerokość wiersza w jednostkach planu – krój stałej szerokości (JetBrains Mono ≈ 0,6 em). */
export const szerokoscWiersza = (t: string, rozmiar: number, rozstrzelony = false) => t.length * rozmiar * (rozstrzelony ? 1.05 : 0.6)

/** Kierunek do czytania: linia biegnąca w lewo (po uwzględnieniu obrotu planu) – odwrócona, napis nie stoi na głowie. */
export function doCzytania(p: P2[], obrotPlanu = 0): P2[] {
    if (p.length < 2) return p
    const a = p[0], b = p[p.length - 1], kat = Math.atan2(b[1] - a[1], b[0] - a[0]) + (obrotPlanu * Math.PI) / 180
    return Math.cos(kat) < 0 ? [...p].reverse() : p
}

// ---------- PH-07: linia wskazująca ----------

/** Punkt wskazania w obwiedni punktów elementu (kotwica 0–1; brak = środek obwiedni). */
export function punktKotwicy(pts: P2[], kotwica?: P2, srodek?: P2): P2 {
    if (!kotwica && srodek) return srodek
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1])
    const [u, v] = kotwica ?? [0.5, 0.5]
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
    return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * v]
}

/**
 * Linia od krawędzi prostokąta etykiety (środek e, półwymiary hw × hh) do punktu wskazania; null, gdy punkt jest pod etykietą.
 * Strzałka – trójkąt przy punkcie wskazania (grot o długości `grot`).
 */
export function liniaWskazujaca(e: P2, hw: number, hh: number, cel: P2, grot = 0, katEtykiety = 0): { d: string; grot?: string } | null {
    const dx = cel[0] - e[0], dy = cel[1] - e[1]
    // prostokąt etykiety jest obrócony o katEtykiety (napis obrócony, obrót planu) – przecięcie liczone w jego układzie;
    // obrót nie zmienia promienia od środka, więc ten sam parametr t daje punkt na krawędzi w układzie planu
    const a = (-katEtykiety * Math.PI) / 180, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a)
    if (Math.abs(lx) <= hw && Math.abs(ly) <= hh) return null
    const t = Math.min(lx ? hw / Math.abs(lx) : Infinity, ly ? hh / Math.abs(ly) : Infinity)
    const st: P2 = [e[0] + dx * t, e[1] + dy * t]
    const L = Math.hypot(cel[0] - st[0], cel[1] - st[1])
    if (L < 1e-6) return null
    const ux = (cel[0] - st[0]) / L, uy = (cel[1] - st[1]) / L
    if (!grot) return { d: `M${f(st[0])},${f(st[1])}L${f(cel[0])},${f(cel[1])}` }
    const g = Math.min(grot, L * 0.6), b: P2 = [cel[0] - ux * g, cel[1] - uy * g], s = g * 0.45
    return {
        d: `M${f(st[0])},${f(st[1])}L${f(b[0])},${f(b[1])}`,
        grot: `M${f(cel[0])},${f(cel[1])}L${f(b[0] - uy * s)},${f(b[1] + ux * s)}L${f(b[0] + uy * s)},${f(b[1] - ux * s)}Z`,
    }
}

// ---------- PH-08: legenda numerowana ----------

const porownajNr = (a: string, b: string) => a.localeCompare(b, 'pl', { numeric: true, sensitivity: 'base' })

/** Elementy z numerem legendy w kolejności numerów (2, 3, … 10, 11; litery po liczbach). */
export function elementyLegendy<T extends { nrLegendy?: string }>(elementy: T[]): (T & { nrLegendy: string })[] {
    return elementy.filter((e): e is T & { nrLegendy: string } => !!e.nrLegendy).sort((a, b) => porownajNr(a.nrLegendy, b.nrLegendy))
}

/** Numery legendy użyte więcej niż raz → identyfikatory elementów (bez rozróżniania wielkości liter). */
export function powtorzoneNumeryLegendy(elementy: { id: string; nrLegendy?: string }[]): Map<string, string[]> {
    const m = new Map<string, string[]>()
    for (const e of elementy) if (e.nrLegendy) { const k = e.nrLegendy.toLocaleLowerCase('pl'); m.set(k, [...(m.get(k) ?? []), e.id]) }
    return new Map([...m].filter(([, ids]) => ids.length > 1))
}

/** Walidacja przy zapisie (zasada 2.6): zapis nie może DODAĆ powtórzonego numeru legendy (dawne powtórzenia nie blokują). */
export function nowyPowtorzonyNrLegendy(przed: { elementy: { id: string; nrLegendy?: string }[] } | null, po: { elementy: { id: string; nrLegendy?: string }[] }): string | null {
    const stare = przed ? powtorzoneNumeryLegendy(przed.elementy) : new Map<string, string[]>()
    for (const [k, ids] of powtorzoneNumeryLegendy(po.elementy)) {
        const bylo = stare.get(k)
        if (bylo && ids.every((id) => bylo.includes(id))) continue
        const nr = po.elementy.find((e) => e.id === ids[0])?.nrLegendy ?? k
        return `powtórzony numer w legendzie planu: ${nr} (${ids.length} elementy) – zapis odrzucony`
    }
    return null
}
