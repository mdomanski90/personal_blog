// P4 (VIEW-06): poruszanie się po drzewie strzałkami – w górę rodzice, w dół dzieci, w bok rodzeństwo i małżonek.
// Czysta funkcja na opisie kart (dane z atrybutów data-* na kartach); obsługa zdarzeń – w DrzewaLinie.

export interface KartaNaw {
    /** osoba na karcie */
    id: string
    /** numer pokolenia (wiersza) – rośnie w dół */
    rzad: number
    /** położenie w poziomie */
    x: number
    /** rodzice osoby widoczni w drzewie */
    rodzice: string[]
    /** rodzina, z której osoba pochodzi (wspólna dla rodzeństwa); pusta, gdy nie znamy rodziców */
    rodzina: string
    /** osoba, której małżonkiem jest ta karta (u osoby głównej pusta); pusta, gdy nie dotyczy */
    partner: string
}
export type KlawiszStrzalki = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

/** Rodzeństwo (wspólna rodzina) albo małżonkowie tej samej osoby – krąg, w którym poruszamy się na boki. */
function wKregu(a: KartaNaw, b: KartaNaw, wszystkie: KartaNaw[]): boolean {
    if (a === b) return false
    const rodzinaKarty = (k: KartaNaw) => k.rodzina || (k.partner ? wszystkie.find((x) => x.id === k.partner)?.rodzina ?? '' : '')
    const ra = rodzinaKarty(a), rb = rodzinaKarty(b)
    if (ra && ra === rb) return true
    return a.partner === b.id || b.partner === a.id || (!!a.partner && a.partner === b.partner)
}

/** Karta, na którą przechodzi fokus po strzałce; null, gdy w tę stronę nic nie ma. */
export function nastepnaKarta(karty: KartaNaw[], odId: string, klawisz: KlawiszStrzalki): KartaNaw | null {
    const od = karty.find((k) => k.id === odId)
    if (!od) return null
    const najblizsza = (lista: KartaNaw[]) => lista.reduce<KartaNaw | null>((n, k) => (!n || Math.abs(k.x - od.x) < Math.abs(n.x - od.x) ? k : n), null)
    if (klawisz === 'ArrowUp') return najblizsza(karty.filter((k) => k.rzad === od.rzad - 1 && od.rodzice.includes(k.id)))
    if (klawisz === 'ArrowDown') {
        const dzieci = karty.filter((k) => k.rzad === od.rzad + 1 && k.rodzice.includes(od.id))
        return dzieci.reduce<KartaNaw | null>((n, k) => (!n || k.x < n.x ? k : n), null)
    }
    const wRzedzie = karty.filter((k) => k.rzad === od.rzad && wKregu(od, k, karty))
    if (klawisz === 'ArrowRight') return wRzedzie.filter((k) => k.x > od.x).reduce<KartaNaw | null>((n, k) => (!n || k.x < n.x ? k : n), null)
    return wRzedzie.filter((k) => k.x < od.x).reduce<KartaNaw | null>((n, k) => (!n || k.x > n.x ? k : n), null)
}
