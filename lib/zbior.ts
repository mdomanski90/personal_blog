// ARC-09 / D-AR-07/14 (P3, makieta zbioru 17.11): wiersze karty zbioru liczone z materiałów, bez nowych pól (AR-14).
// Wejście: materiały już przefiltrowane dla czytelnika; osoby – tylko te, których karta jest widoczna (zasada 1.5/1.6: bez liczb ukrytych).

export type MaterialZbioru = { rodzaj: string; lata: [number, number] | null; miejsca: string[]; tematy: string[]; osobyIds: string[] }

export function wierszeZbioru(mats: MaterialZbioru[], osobaWidoczna: (id: string) => boolean) {
    const rodzaje = new Map<string, number>()
    for (const m of mats) rodzaje.set(m.rodzaj, (rodzaje.get(m.rodzaj) ?? 0) + 1)
    const lata = mats.map((m) => m.lata).filter((l): l is [number, number] => !!l)
    const unik = (l: string[]) => [...new Set(l)]
    return {
        rodzaje: [...rodzaje].map(([rodzaj, ile]) => ({ rodzaj, ile })).sort((a, b) => b.ile - a.ile || a.rodzaj.localeCompare(b.rodzaj, 'pl')),
        lata: lata.length ? ([Math.min(...lata.map((l) => l[0])), Math.max(...lata.map((l) => l[1]))] as [number, number]) : null,
        miejsca: unik(mats.flatMap((m) => m.miejsca)),
        tematy: unik(mats.flatMap((m) => m.tematy)),
        osoby: unik(mats.flatMap((m) => m.osobyIds)).filter(osobaWidoczna),
    }
}

const FORMY: Record<string, [string, string, string]> = {
    dokument: ['dokument', 'dokumenty', 'dokumentów'], akt: ['akt metrykalny', 'akty metrykalne', 'aktów metrykalnych'], zdjecie: ['zdjęcie', 'zdjęcia', 'zdjęć'],
    nagranie: ['nagranie', 'nagrania', 'nagrań'], mapa: ['mapa', 'mapy', 'map'], wspomnienie: ['wspomnienie', 'wspomnienia', 'wspomnień'],
}

/** Łatka P3 (plansza zbioru): „6 – 2 dokumenty, 2 zdjęcia, akt metrykalny, wspomnienie” – suma, potem rodzaje (pojedynczy bez liczby). */
export function opisRodzajow(rodzaje: { rodzaj: string; ile: number }[], odmiana: (n: number, f: [string, string, string]) => string): string {
    const razem = rodzaje.reduce((a, r) => a + r.ile, 0)
    if (!razem) return ''
    const czesci = rodzaje.map((r) => { const f = FORMY[r.rodzaj] ?? [r.rodzaj, r.rodzaj, r.rodzaj]; return r.ile === 1 ? f[0] : odmiana(r.ile, f) })
    return `${razem} – ${czesci.join(', ')}`
}
