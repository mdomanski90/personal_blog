// PH1 · jeden widok dokumentu: plan zrekonstruowany ze skanu jako warstwa na stronie materiału.
// Czyste funkcje (bez plików): wybór planu i podkładu, odwrócenie macierzy podkładu (jednostki planu → piksele skanu).
import { jednostka, pole, punktyElementu, wWielokacie, type Plan } from './model'
import { planyWKolejnosci } from './metadane'

export interface PodkladWarstwy { strona: number; szer: number; wys: number; macierz: [number, number, number, number, number, number] }

/** Macierz SVG odwrotna: podkład zapisuje piksel obrazu → jednostki planu; warstwa rysuje plan w pikselach skanu. */
export function odwrocMacierz([a, b, c, d, e, f]: PodkladWarstwy['macierz']): PodkladWarstwy['macierz'] | null {
    const det = a * d - b * c
    if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null
    return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det]
}

/**
 * Plan rekonstrukcji materiału: pierwszy (wg kolejności listy) plan wskazujący materiał jako źródło, który ma podkład
 * z tej strony materiału. `pelne` – plany z pliku (geometria podkładu); `dlaCzytelnika` – te same plany po filtrze czytelnika
 * (to one są rysowane). Plan niewidoczny dla czytelnika nie ma warstwy.
 */
export function wybierzRekonstrukcje(materialId: string, pelne: Plan[], dlaCzytelnika: Plan[]): { plan: Plan; podklad: PodkladWarstwy } | null {
    const widoczne = new Map(dlaCzytelnika.map((p) => [p.slug, p]))
    for (const p of planyWKolejnosci(pelne.filter((x) => x.zrodlo?.material === materialId && widoczne.has(x.slug)))) {
        const d = p.podklady.find((x) => x.material?.id === materialId)
        if (d && d.szer > 0 && d.wys > 0 && odwrocMacierz(d.macierz)) return { plan: widoczne.get(p.slug)!, podklad: { strona: d.material!.strona, szer: d.szer, wys: d.wys, macierz: d.macierz } }
    }
    return null
}

/** Piksel strony skanu (ułamek szerokości i wysokości obrazu) → jednostki planu (macierz podkładu). */
export function naPlan(podklad: PodkladWarstwy, fx: number, fy: number): [number, number] {
    const [a, b, c, d, e, f] = podklad.macierz, x = fx * podklad.szer, y = fy * podklad.wys
    return [a * x + c * y + e, b * x + d * y + f]
}

/** Element pod punktem (jednostki planu): najpierw znaki i linie w pobliżu, potem najmniejszy obszar; tylko `wybieralne`. */
export function elementPod(plan: Plan, x: number, y: number, wybieralne: (id: string) => boolean = () => true): string | null {
    const u = jednostka(plan)
    let najlepszy: { id: string; waga: number } | null = null
    const kandydat = (id: string, waga: number) => { if (!najlepszy || waga < najlepszy.waga) najlepszy = { id, waga } }
    for (const e of plan.elementy) {
        if (!wybieralne(e.id)) continue
        const g = e.g
        if (g.k === 'p' || g.k === 't') { const d = Math.hypot(g.x - x, g.y - y); if (d <= u * 1.2) kandydat(e.id, d - 1e9); continue }
        const P = punktyElementu(g)
        if (g.k === 'l') {
            const prog = Math.max((e.szer ?? 0) / 2, u * 0.5)
            for (let i = 1; i < P.length; i++) {
                const [x1, y1] = P[i - 1], [x2, y2] = P[i], dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy
                const t = L ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L)) : 0
                const d = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
                if (d <= prog) { kandydat(e.id, d - 1e6); break }
            }
            continue
        }
        if (wWielokacie(x, y, P)) kandydat(e.id, pole(P))
    }
    return (najlepszy as { id: string } | null)?.id ?? null
}
