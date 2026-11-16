// PH1 · jeden widok dokumentu: plan zrekonstruowany ze skanu jako warstwa na stronie materiału.
// Czyste funkcje (bez plików): wybór planu i podkładu, odwrócenie macierzy podkładu (jednostki planu → piksele skanu).
import type { Plan } from './model'
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
