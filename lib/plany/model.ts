// Model planu obiektu i czysta logika (bez plików): geometria, zapisane numery grobów, zasady widoczności.
// Nadawanie i sprawdzanie numerów: lib/plany/numeracja.ts.

import type { Warstwa } from './typy'
import { katalog, typGrobu, type TypElementu, type UstawieniaPlanow } from './typy'
import type { Etap, Polozenie, StanZrodel } from './statusy'
import { poprawPolaPH2, type Identyfikacja, type Odnosnik, type Podstawa } from './podstawa'
import { dobryStopien, poprawMetadane, poprawPodklad, type MetadanePlanu, type PodkladZMaterialu, type Stopien } from './metadane'
import { poprawPolaPH3, type PolaPH3 } from './ph3'

export type Widocznosc = 'publiczne' | 'bliscy' | 'ja'
export type Pkt = [number, number]

export type Geometria =
    | { k: 'p'; x: number; y: number }
    | { k: 'r'; x: number; y: number; w: number; h: number; a: number }
    | { k: 'w'; p: Pkt[] }
    | { k: 'l'; p: Pkt[] }
    | { k: 't'; x: number; y: number; a: number }

export interface Osoba {
    nazwa: string
    ur?: string
    zm?: string
    /** przyszłe powiązanie z działem „osoby” (identyfikator z drzewa) */
    id?: string
}

export interface Zdjecie {
    plik: string
    lat?: number
    lon?: number
    data?: string
}

/** PH3 (PH-04–08): pola narzędzi rekonstrukcji – lib/plany/ph3.ts */
export interface Element extends PolaPH3 {
    id: string
    typ: string
    g: Geometria
    /** napis na planie (np. litera kwatery, nazwa) */
    nazwa?: string
    /** czy pokazywać napis na planie (domyślnie: tak dla napisów, kwater i świątyń) */
    pokazNazwe?: boolean
    /** wielkość napisu w 6 stopniach (PH1); dawne `rozmiar` s/m/l czytane jako 2/3/5 (lib/plany/metadane.ts) */
    stopien?: Stopien
    /** @deprecated dawna wielkość napisu – zostaje w starych plikach, zastępuje ją `stopien` przy następnej zmianie w edytorze */
    rozmiar?: 's' | 'm' | 'l'
    styl?: 'zwykly' | 'kursywa' | 'rozstrzelony'
    /** kolor napisu: tekst | szary | woda | las | teren | pamiec */
    kolor?: 'tekst' | 'szary' | 'woda' | 'las' | 'teren' | 'pamiec'
    /** przesunięcie etykiety względem elementu (jednostki planu) */
    etykieta?: { dx: number; dy: number }
    /** grubość linii (jednostki planu); domyślnie z typu */
    szer?: number
    /** opis (elementy inne niż groby); w grobach dawniej „napis z nagrobka, uwagi” – przenoszone do `napis` */
    opis?: string
    /** grób: napis z nagrobka – transkrypcja dosłowna (z zachowaniem pisowni, języka i podziału na wiersze) */
    napis?: string
    /** grób: weryfikacja w źródłach – co potwierdzają księgi i inne źródła, z ich podaniem */
    zrodla?: string
    stan?: 'istnieje' | 'nie-istnieje' | 'do-sprawdzenia'
    czas?: string
    /** rok śmierci ostatniej pochowanej osoby – do zasady „zmarli niedawno” */
    rokZgonu?: number
    osoby?: Osoba[]
    zdjecia?: Zdjecie[]
    widocznosc?: Widocznosc
    /** na nagrobku są wymienione osoby żyjące – napis tylko dla bliskich */
    ukryjNapis?: boolean
    /** kwatera: kąt rzędów (°) */
    kat?: number
    /** kwatera: rzędy liczbami albo literami i róg, od którego biegnie numeracja (lib/plany/numeracja.ts) */
    numeracjaKwatery?: { rzedy?: 'liczby' | 'litery'; poczatek?: 'lg' | 'pg' | 'ld' | 'pd' }
    /** grób: zapisany numer (kwatera = stały id elementu kwatery); nadawany w edytorze, nie liczony przy wyświetlaniu */
    oznaczenie?: Oznaczenie
    /** wyliczone przy wydawaniu: numer z nazwą kwatery – ten sam dla każdego czytelnika */
    numer?: Numer
    /** robocze (grób): etap opracowania – narysowany / opracowany / sprawdzony (lib/plany/statusy.ts) */
    etap?: Etap
    /** robocze (grób): weryfikacja źródeł – brak / częściowa / potwierdzona; opis w polu `zrodla` */
    zrodlaStan?: StanZrodel
    /** robocze (grób): pewność położenia – rozpoznane automatycznie / przypuszczalne; brak pola = pewne */
    polozenie?: Polozenie
    /** @deprecated dawne jedno pole statusu (auto | przyp | ok) – zastępuje je migracja `npm run plany:statusy` */
    weryfikacja?: 'auto' | 'przyp' | 'ok'
    notatka?: string
    /** wyliczone przy wydawaniu: napis i osoby ukryte przed czytelnikiem */
    ograniczony?: boolean
    /** PH-09: powiązania z kartami (identyfikatory jak w [[…]]) – czytelnik dostaje je rozwiązane w `odnosniki` */
    powiazania?: string[]
    /** PH-02: na czym oparto element – materiał archiwum i (opcjonalnie) objaśnienie na skanie */
    podstawa?: Podstawa[]
    /** PH-19: nazwa / napis w źródle (np. „Magistrat” na szkicu) – publiczne */
    nazwaZrodlowa?: string
    /** PH-19: pewność identyfikacji – publiczne; brak = pewna */
    identyfikacja?: Identyfikacja
    /** wyliczone przy wydawaniu (strona planu): powiązania widoczne dla czytelnika */
    odnosniki?: Odnosnik[]
}

export interface Podklad {
    id: string
    plik: string
    nazwa: string
    szer: number
    wys: number
    /** przekształcenie piksel obrazu → jednostki planu: [a, b, c, d, e, f] jak w SVG matrix() */
    macierz: [number, number, number, number, number, number]
    krycie: number
    /** kto może zobaczyć podkład na stronie */
    widocznosc: 'edycja' | 'bliscy' | 'publiczne'
    /** PH1: podkład = strona materiału archiwum (obraz i prawa z materiału; `plik` pusty) */
    material?: PodkladZMaterialu
}

export interface PunktGeo {
    x: number
    y: number
    lat: number
    lon: number
}

export interface Plan extends MetadanePlanu {
    slug: string
    tytul: string
    miejsce?: string
    obiekt?: string
    opis?: string
    widocznosc: Widocznosc
    szer: number
    wys: number
    /** metrów na jednostkę planu (z kalibracji); null – nieznana */
    skala: number | null
    /** obrót całego rysunku (°), żeby północ była u góry */
    obrot: number
    geo: PunktGeo[]
    podklady: Podklad[]
    warstwy: Partial<Record<Warstwa, { ukryta?: boolean; zablokowana?: boolean }>>
    elementy: Element[]
    wersja: number
    zmieniono: string
}

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function nowyPlan(slug: string, tytul: string, szer = 1600, wys = 1100): Plan {
    return { slug, tytul, widocznosc: 'ja', szer, wys, skala: null, obrot: 0, geo: [], podklady: [], warstwy: {}, elementy: [], wersja: 1, zmieniono: new Date().toISOString() }
}

export function noweId(): string {
    const c = 'abcdefghijkmnpqrstuvwxyz23456789'
    let s = ''
    for (let i = 0; i < 10; i++) s += c[Math.floor(Math.random() * c.length)]
    return s
}

// ---------- geometria ----------
export const rad = (d: number) => (d * Math.PI) / 180

export function punktyElementu(g: Geometria): Pkt[] {
    switch (g.k) {
        case 'p':
        case 't':
            return [[g.x, g.y]]
        case 'r': {
            const a = rad(g.a), c = Math.cos(a), s = Math.sin(a)
            return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as Pkt[]).map(([sx, sy]) => {
                const lx = (sx * g.w) / 2, ly = (sy * g.h) / 2
                return [g.x + lx * c - ly * s, g.y + lx * s + ly * c] as Pkt
            })
        }
        default:
            return g.p
    }
}

export function srodek(g: Geometria): Pkt {
    if (g.k === 'p' || g.k === 't' || g.k === 'r') return [g.x, g.y]
    const p = g.p
    if (g.k === 'l') {
        // środek długości linii
        let L = 0
        for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])
        let acc = 0
        for (let i = 1; i < p.length; i++) {
            const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])
            if (acc + d >= L / 2 && d > 0) { const t = (L / 2 - acc) / d; return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t] }
            acc += d
        }
        return p[0] ?? [0, 0]
    }
    // środek ciężkości wielokąta
    let A = 0, cx = 0, cy = 0
    for (let i = 0; i < p.length; i++) {
        const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length], f = x0 * y1 - x1 * y0
        A += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f
    }
    if (Math.abs(A) < 1e-9) return [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length]
    return [cx / (3 * A), cy / (3 * A)]
}

export function wWielokacie(x: number, y: number, P: Pkt[]): boolean {
    let w = false
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const [xi, yi] = P[i], [xj, yj] = P[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) w = !w
    }
    return w
}

export function pole(P: Pkt[]): number {
    let A = 0
    for (let i = 0; i < P.length; i++) { const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length]; A += x0 * y1 - x1 * y0 }
    return Math.abs(A) / 2
}

export function dlugosc(P: Pkt[], zamkniety = false): number {
    let L = 0
    for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])
    if (zamkniety && P.length > 2) L += Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1])
    return L
}

export function obwiednia(elementy: Element[]): [number, number, number, number] | null {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const e of elementy) for (const [x, y] of punktyElementu(e.g)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
    return x0 < Infinity ? [x0, y0, x1, y1] : null
}

/** Jednostka wielkości znaków i napisów: zależy od rozmiaru planu (żeby wieś i cmentarz wyglądały podobnie). */
export const jednostka = (plan: Pick<Plan, 'szer' | 'wys'>) => Math.max(plan.szer, plan.wys) / 80

/** Pseudolosowość powtarzalna (ten sam las na serwerze i w przeglądarce). */
export function losowe(ziarno: string): () => number {
    let h = 1779033703 ^ ziarno.length
    for (let i = 0; i < ziarno.length; i++) { h = Math.imul(h ^ ziarno.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
    let a = h >>> 0
    return () => {
        a |= 0; a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// ---------- przekształcenia (kalibracja) ----------
export type Macierz = [number, number, number, number, number, number]
export const JEDNOSTKOWA: Macierz = [1, 0, 0, 1, 0, 0]
export const zastosuj = (m: Macierz, [x, y]: Pkt): Pkt => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]

/** Przekształcenie afiniczne z 3 par punktów (źródło → cel). */
export function afiniczna(zr: Pkt[], cel: Pkt[]): Macierz | null {
    if (zr.length < 3 || cel.length < 3) return podobienstwo(zr, cel)
    const [[x1, y1], [x2, y2], [x3, y3]] = zr
    const det = x1 * (y2 - y3) - y1 * (x2 - x3) + (x2 * y3 - x3 * y2)
    if (Math.abs(det) < 1e-9) return null
    const rozw = (u1: number, u2: number, u3: number) => [
        (u1 * (y2 - y3) - y1 * (u2 - u3) + (u2 * y3 - u3 * y2)) / det,
        (x1 * (u2 - u3) - u1 * (x2 - x3) + (x2 * u3 - x3 * u2)) / det,
        (x1 * (y2 * u3 - y3 * u2) - y1 * (x2 * u3 - x3 * u2) + u1 * (x2 * y3 - x3 * y2)) / det,
    ]
    const [a, c, e] = rozw(cel[0][0], cel[1][0], cel[2][0])
    const [b, d, f] = rozw(cel[0][1], cel[1][1], cel[2][1])
    return [a, b, c, d, e, f]
}

/** Podobieństwo (przesunięcie, obrót, skala) z 2 par punktów. */
export function podobienstwo(zr: Pkt[], cel: Pkt[]): Macierz | null {
    if (zr.length < 2 || cel.length < 2) return null
    const [p1, p2] = zr, [q1, q2] = cel
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1], ex = q2[0] - q1[0], ey = q2[1] - q1[1]
    const L = dx * dx + dy * dy
    if (L < 1e-9) return null
    const a = (dx * ex + dy * ey) / L, b = (dx * ey - dy * ex) / L
    return [a, b, -b, a, q1[0] - a * p1[0] + b * p1[1], q1[1] - b * p1[0] - a * p1[1]]
}

/** Współrzędne geograficzne → jednostki planu (z 2–3 punktów kalibracji). Liczone w metrach lokalnie. */
export function geoNaPlan(geo: PunktGeo[]): ((lat: number, lon: number) => Pkt) | null {
    if (geo.length < 2) return null
    const lat0 = geo[0].lat, lon0 = geo[0].lon, kx = 111320 * Math.cos(rad(lat0)), ky = 110540
    const m = (lat: number, lon: number): Pkt => [(lon - lon0) * kx, -(lat - lat0) * ky]
    const T = geo.length >= 3 ? afiniczna(geo.slice(0, 3).map((g) => m(g.lat, g.lon)), geo.slice(0, 3).map((g) => [g.x, g.y])) : podobienstwo(geo.map((g) => m(g.lat, g.lon)), geo.map((g) => [g.x, g.y]))
    if (!T) return null
    return (lat, lon) => zastosuj(T, m(lat, lon))
}

/** Jednostki planu → [długość, szerokość geograficzna] (odwrotność geoNaPlan), np. do położenia obrazu planu na mapie. */
export function planNaGeo(geo: PunktGeo[]): ((p: Pkt) => [number, number]) | null {
    if (geo.length < 2) return null
    const lat0 = geo[0].lat, lon0 = geo[0].lon, kx = 111320 * Math.cos(rad(lat0)), ky = 110540
    const m = (lat: number, lon: number): Pkt => [(lon - lon0) * kx, -(lat - lat0) * ky]
    const T = geo.length >= 3 ? afiniczna(geo.slice(0, 3).map((g) => m(g.lat, g.lon)), geo.slice(0, 3).map((g) => [g.x, g.y])) : podobienstwo(geo.map((g) => m(g.lat, g.lon)), geo.map((g) => [g.x, g.y]))
    if (!T) return null
    const [a, b, c, d, e, f] = T, det = a * d - b * c
    if (Math.abs(det) < 1e-12) return null
    return ([x, y]) => {
        const X = (d * (x - e) - c * (y - f)) / det, Y = (-b * (x - e) + a * (y - f)) / det
        return [lon0 + X / kx, lat0 - Y / ky]
    }
}

/** Skala (m na jednostkę) wynikająca z punktów geo – gdy nie ustawiono jej ręcznie. */
export function skalaZGeo(geo: PunktGeo[]): number | null {
    if (geo.length < 2) return null
    const [a, b] = geo, kx = 111320 * Math.cos(rad(a.lat))
    const m = Math.hypot((b.lon - a.lon) * kx, (b.lat - a.lat) * 110540), u = Math.hypot(b.x - a.x, b.y - a.y)
    return u > 0 ? m / u : null
}

// ---------- cmentarz: kwatery, rzędy, miejsca ----------
/** Zapisany numer grobu: kwatera (id elementu kwatery; brak – grób poza kwaterami), rząd (liczba albo litery), miejsce. */
export interface Oznaczenie { kwatera?: string; rzad: string; miejsce: string }
/** Numer do wyświetlenia: nazwa kwatery zamiast jej id. */
export interface Numer { kwatera: string; rzad: string; miejsce: string }

export function kwateraDla(x: number, y: number, kwatery: Element[]): Element | null {
    for (const k of kwatery) if (k.g.k === 'w' && wWielokacie(x, y, k.g.p)) return k
    for (const k of kwatery) if (k.g.k === 'r' && wWielokacie(x, y, punktyElementu(k.g))) return k
    return null
}

/**
 * Numery grobów do wyświetlenia – z ZAPISANYCH oznaczeń (etap 2; dawniej liczone z położenia przy każdym renderze,
 * po filtrze czytelnika – A2-01). Plan wydany czytelnikowi ma numery już rozwiązane w polu `numer`.
 */
export function numeryPlanu(plan: Pick<Plan, 'elementy'>): Map<string, Numer> {
    const nazwy = new Map(plan.elementy.filter((e) => e.typ === 'kwatera').map((k) => [k.id, (k.nazwa ?? '').trim()]))
    const wyn = new Map<string, Numer>()
    for (const e of plan.elementy) {
        if (e.numer) wyn.set(e.id, e.numer)
        else if (e.oznaczenie) wyn.set(e.id, { kwatera: e.oznaczenie.kwatera ? nazwy.get(e.oznaczenie.kwatera) ?? '' : '', rzad: e.oznaczenie.rzad, miejsce: e.oznaczenie.miejsce })
    }
    return wyn
}

/** Skąd wziął się rok śmierci przyjęty do zasady „zmarli niedawno” – pokazywane w edytorze (A2-09). */
export type ZrodloRoku = 'pole' | 'osoby' | 'napis'

/**
 * Rok śmierci: z pola, inaczej najpóźniejszy rok z dat osób i z napisu. Reguła bez zmian (decyzja 16.11, A2-09):
 * rok odnowienia z napisu może ukryć napis niepotrzebnie, ale nigdy go nie odsłoni – edytor pokazuje przyjęty rok
 * i jego źródło, a pole „rok śmierci” pozwala go poprawić.
 */
export function rokZgonuZeZrodlem(e: Element): { rok: number; zrodlo: ZrodloRoku } | null {
    if (e.rokZgonu) return { rok: e.rokZgonu, zrodlo: 'pole' }
    let os: number | null = null, np: number | null = null
    for (const o of e.osoby ?? []) { const m = (o.zm ?? '').match(/(1[6-9]|20)\d\d/); if (m) os = Math.max(os ?? 0, +m[0]) }
    for (const m of `${e.napis ?? ''} ${e.opis ?? ''}`.matchAll(/(?<!\d)(1[6-9]\d\d|20\d\d)(?!\d)/g)) np = Math.max(np ?? 0, +m[1])
    if (os === null && np === null) return null
    return (np ?? 0) > (os ?? 0) ? { rok: np!, zrodlo: 'napis' } : { rok: os!, zrodlo: 'osoby' }
}
export function rokZgonu(e: Element): number | null {
    return rokZgonuZeZrodlem(e)?.rok ?? null
}

/** Czy treść grobu ma być ukryta przed czytelnikiem bez logowania. */
export function grobOgraniczony(e: Element, typ: TypElementu | undefined, progLat: number, rok = new Date().getFullYear()): boolean {
    if (!typGrobu(typ)) return false
    if (e.ukryjNapis) return true
    const r = rokZgonu(e)
    return r !== null && r > rok - progLat
}

export function widoczne(w: Widocznosc | undefined, poziom: Widocznosc): boolean {
    const v = w || 'publiczne'
    if (v === 'publiczne') return true
    if (v === 'bliscy') return poziom !== 'publiczne'
    return poziom === 'ja'
}

/**
 * Plan przygotowany dla czytelnika: bez elementów, których nie może widzieć, bez typów ukrytych,
 * bez podkładów „tylko do edycji”, bez pól roboczych; groby zmarłych niedawno – sam kształt.
 */
export function dlaCzytelnika(plan: Plan, poziom: Widocznosc, u: UstawieniaPlanow): Plan {
    const typy = katalog(u), ukryte = new Set(u.ukryteTypy ?? [])
    // numery z PEŁNEGO planu (przed filtrem) – ten sam numer dla anonima i redaktora (A2-01, zasada 2.3)
    const numery = numeryPlanu(plan)
    const elementy: Element[] = []
    for (const e of plan.elementy) {
        if (ukryte.has(e.typ) || !typy.has(e.typ) || !widoczne(e.widocznosc, poziom)) continue
        // statusy pracy i notatki są robocze; współrzędne GPS zdjęć – tylko dla zalogowanych (decyzja 16.11),
        // bo punkty geo planu też są przed czytelnikiem publicznym ukryte
        // PH2: surowe powiązania i podstawa mogą wskazywać pozycje ukryte – czytelnik dostaje je rozwiązane (lib/plany/serwer.ts)
        const { weryfikacja: _w, notatka: _n, etap: _e, zrodlaStan: _z, polozenie: _p, oznaczenie: _o, numer: _nr, powiazania: _pw, podstawa: _ps, odnosniki: _od, ...bezNumeru } = e
        const nr = numery.get(e.id), czysty: Element = nr ? { ...bezNumeru, numer: nr } : bezNumeru
        if (poziom === 'publiczne' && grobOgraniczony(e, typy.get(e.typ), u.progLat)) {
            elementy.push({ id: e.id, typ: e.typ, g: e.g, stan: e.stan, ograniczony: true, ...(nr ? { numer: nr } : {}) })
        } else if (poziom === 'publiczne' && czysty.zdjecia?.length) {
            elementy.push({ ...czysty, zdjecia: czysty.zdjecia.map(({ lat: _la, lon: _lo, ...z }) => z) })
        } else elementy.push(czysty)
    }
    const podklady = plan.podklady.filter((p) => p.widocznosc === 'publiczne' || (p.widocznosc === 'bliscy' && poziom !== 'publiczne'))
    return { ...plan, geo: poziom === 'publiczne' ? [] : plan.geo, podklady, elementy }
}

/** Tekst do wyszukiwania nazwisk (bez polskich znaków, małe litery). */
export function doSzukania(e: Element): string {
    // etap 3 / PH4: także nazwa w źródle (szukanie „Church” na planie ze szkicu – test PH-20)
    return [e.nazwa, e.nazwaZrodlowa, e.napis, e.opis, ...(e.osoby ?? []).map((o) => o.nazwa)].filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
}

/** Groby: dawne pole „opis” (napis z nagrobka, uwagi) → `napis` (transkrypcja). */
function przeniesNapisy(L: Element[]): Element[] {
    const typy = katalog()
    return L.map((e) => {
        if (e.opis === undefined || e.napis !== undefined || !typy.get(e.typ)?.grob) return e
        const { opis, ...reszta } = e
        return { ...reszta, napis: opis }
    })
}

/** Zapisany numer w złym kształcie (ręczna edycja pliku) – usuwany; `numer` jest tylko wyliczany przy wydawaniu. */
function poprawNumery(L: Element[]): Element[] {
    return L.map((e) => {
        const o = e.oznaczenie, zly = o !== undefined && !(o && typeof o.rzad === 'string' && typeof o.miejsce === 'string' && o.rzad.trim() && o.miejsce.trim() && (o.kwatera === undefined || typeof o.kwatera === 'string'))
        if (!zly && e.numer === undefined) return e
        const { oznaczenie, numer: _n, ...reszta } = e
        return zly ? reszta : { ...reszta, oznaczenie }
    })
}

/** Kontrola i naprawa wczytanego pliku (stare wersje, braki). */
export function popraw(p: Partial<Plan> & { slug: string }): Plan {
    return {
        slug: p.slug,
        tytul: p.tytul || p.slug,
        miejsce: p.miejsce || undefined,
        obiekt: p.obiekt || undefined,
        opis: p.opis || undefined,
        widocznosc: (['publiczne', 'bliscy', 'ja'] as const).includes(p.widocznosc as Widocznosc) ? (p.widocznosc as Widocznosc) : 'ja',
        szer: Number(p.szer) > 0 ? Number(p.szer) : 1600,
        wys: Number(p.wys) > 0 ? Number(p.wys) : 1100,
        skala: typeof p.skala === 'number' && p.skala > 0 ? p.skala : null,
        obrot: Number(p.obrot) || 0,
        geo: Array.isArray(p.geo) ? p.geo.filter((g) => [g.x, g.y, g.lat, g.lon].every((v) => typeof v === 'number')) : [],
        podklady: Array.isArray(p.podklady) ? p.podklady.map(poprawPodklad) : [],
        warstwy: p.warstwy && typeof p.warstwy === 'object' ? p.warstwy : {},
        elementy: Array.isArray(p.elementy) ? poprawStopnie(poprawNumery(przeniesNapisy(p.elementy.filter((e) => e && typeof e.id === 'string' && e.g && typeof e.typ === 'string')))) : [],
        wersja: Number(p.wersja) || 1,
        zmieniono: p.zmieniono || new Date().toISOString(),
        ...poprawMetadane(p as Record<string, unknown>),
    }
}

/** PH2: powiązania, podstawa, nazwa ze źródła, identyfikacja – tylko w dobrym kształcie; `odnosniki` nigdy z pliku. */
function poprawPH2(e: Element): Element {
    const { powiazania: _a, podstawa: _b, nazwaZrodlowa: _c, identyfikacja: _d, odnosniki: _f, ...reszta } = e
    return poprawPH3({ ...reszta, ...poprawPolaPH2(e as unknown as Record<string, unknown>) })
}

/** PH3: szerokości w węzłach, gładkość, napisy, wskaźnik, numer legendy – tylko w dobrym kształcie (lib/plany/ph3.ts). */
function poprawPH3(e: Element): Element {
    const { s: _s, gladka: _g, ostre: _o, wyrownanie: _w, tlo: _t, wzdluz: _z, wskaznik: _k, kotwica: _a, nrLegendy: _n, nieznanePolozenie: _p, ...reszta } = e
    const wezly = e.g.k === 'l' || e.g.k === 'w' ? e.g.p.length : 0
    return { ...reszta, ...poprawPolaPH3(e as unknown as Record<string, unknown>, wezly) }
}

/** Stopień napisu spoza 1–6 (ręczna edycja pliku) – usuwany; napis wraca do wielkości domyślnej albo dawnego `rozmiar`. */
function poprawStopnie(L: Element[]): Element[] {
    return L.map((e) => {
        e = poprawPH2(e)
        if (e.stopien === undefined || dobryStopien(e.stopien)) return e
        const { stopien: _s, ...reszta } = e
        return reszta
    })
}
