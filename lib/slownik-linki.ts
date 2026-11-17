// SLW-03 (łatka P3, decyzja 17.11 – plansza „karta materiału”): słowa ze słownika w opisie materiału jako odnośniki do haseł.
// Tylko pierwsze wystąpienie każdego hasła, tylko poza istniejącymi odnośnikami i znacznikami; rozpoznawanie tą samą regułą co
// „słowa ze słownika” (wzorzecWzmianek, bez względu na wielkość liter). Hasła – już przefiltrowane dla czytelnika. Treść pliku bez zmian.
import { wzorzecWzmianek, znajdzWzmianki } from './odnosniki'

export type HasloDoLinku = { id: string; haslo: string; formy: string[]; znaczenie: string; adres: string }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const POMIN = /^<(a|code|pre|mark|h[1-6]|script|style)\b/i

export function linkujHasla(html: string, hasla: HasloDoLinku[]): string {
    if (!html || !hasla.length) return html
    const wzorce = hasla.map((h) => ({ h, w: wzorzecWzmianek([h.haslo, ...h.formy], true) }))
    const uzyte = new Set<string>()
    let glebokosc = 0
    return html.split(/(<[^>]+>)/).map((cz) => {
        if (cz.startsWith('<')) {
            if (POMIN.test(cz)) glebokosc++
            else if (/^<\/(a|code|pre|mark|h[1-6]|script|style)\s*>/i.test(cz)) glebokosc = Math.max(0, glebokosc - 1)
            return cz
        }
        if (glebokosc > 0 || !cz.trim()) return cz
        // trafienia wszystkich haseł w tym kawałku tekstu, pierwsze dla każdego hasła, bez nakładania
        const traf: { start: number; koniec: number; h: HasloDoLinku }[] = []
        for (const { h, w } of wzorce) {
            if (uzyte.has(h.id)) continue
            const t = znajdzWzmianki(cz, w).find((x) => !traf.some((y) => x.start < y.koniec && y.start < x.koniec))
            if (t) { traf.push({ ...t, h }); uzyte.add(h.id) }
        }
        if (!traf.length) return cz
        traf.sort((a, b) => a.start - b.start)
        let wyn = '', i = 0
        for (const t of traf) {
            wyn += cz.slice(i, t.start) + `<a href="${esc(t.h.adres)}" class="odn odn-haslo" title="${esc(t.h.znaczenie.slice(0, 160))}">${cz.slice(t.start, t.koniec)}</a>`
            i = t.koniec
        }
        return wyn + cz.slice(i)
    }).join('')
}
