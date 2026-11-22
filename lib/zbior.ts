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

// ---------- ARC-14 (22.11, decyzja właściciela: pole w zbiorze, świadomie poza ARC-09/D-AR-14) ----------
// Mapa zbioru: punkty wpisane w zbiorze (miejscowości spoza okolicy, bez kart w „Miejscach”) + miejscowości z okolicy,
// do których przypięte są materiały zbioru. Wejście: materiały już przefiltrowane dla czytelnika – punkt, którego wszystkie
// materiały są ukryte, znika (zasada 1.6); zbiór bez własnych punktów nie ma mapy (pozostałe zbiory bez zmian).

export type PunktZbioru = { nazwa: string; opis: string; rodzaj: string; lat: number; lng: number; przyblizone: boolean; materialy: string[] }
export type PunktMapyZbioru = { id: string; nazwa: string; opis: string; rodzaj: string; lat: number; lng: number; przyblizone: boolean; href: string; materialy: { id: string; nazwa: string }[] }
type MiejsceDlaMapy = { nazwa: string; rodzaj: string; wspolrzedne: [number, number] | null; przyblizone: boolean }

const kluczNazwy = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[łŁ]/g, 'l').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function punktyMapyZbioru(we: { punkty: PunktZbioru[]; materialy: { id: string; nazwa: string; miejsca: string[] }[]; miejsca: Map<string, MiejsceDlaMapy>; kotwicaListy: string }): PunktMapyZbioru[] {
    if (!we.punkty.length) return []
    const mat = new Map(we.materialy.map((m) => [m.id, m]))
    const odnosnik = (l: { id: string }[]) => (l.length === 1 ? `/archiwum/${l[0].id}` : l.length > 1 ? we.kotwicaListy : '')
    const wyn: PunktMapyZbioru[] = []
    const byly = new Set<string>()
    we.punkty.forEach((p, i) => {
        const widoczne = p.materialy.filter((id) => mat.has(id)).map((id) => ({ id, nazwa: mat.get(id)!.nazwa }))
        if (p.materialy.length && !widoczne.length) return
        const k = kluczNazwy(p.nazwa)
        if (!k || byly.has(k)) return
        byly.add(k)
        wyn.push({ id: `pz-${i}`, nazwa: p.nazwa, opis: p.opis, rodzaj: p.rodzaj, lat: p.lat, lng: p.lng, przyblizone: p.przyblizone, href: odnosnik(widoczne), materialy: widoczne })
    })
    for (const id of [...new Set(we.materialy.flatMap((m) => m.miejsca))]) {
        const m = we.miejsca.get(id)
        if (!m?.wspolrzedne || byly.has(kluczNazwy(m.nazwa))) continue
        byly.add(kluczNazwy(m.nazwa))
        wyn.push({ id, nazwa: m.nazwa, opis: '', rodzaj: m.rodzaj, lat: m.wspolrzedne[0], lng: m.wspolrzedne[1], przyblizone: m.przyblizone, href: `/miejsca/${id}`,
            materialy: we.materialy.filter((x) => x.miejsca.includes(id)).map((x) => ({ id: x.id, nazwa: x.nazwa })) })
    }
    return wyn
}

/** Karta materiału: „miejsca powiązane” – punkty widocznych zbiorów, które wskazują ten materiał (każda nazwa raz, pierwszy zbiór). */
export function miejscaPowiazane(materialId: string, zbiory: { id: string; punkty: PunktZbioru[] }[]): { nazwa: string; opis: string; zbior: string }[] {
    const wyn: { nazwa: string; opis: string; zbior: string }[] = []
    const byly = new Set<string>()
    for (const z of zbiory) for (const p of z.punkty) {
        if (!p.materialy.includes(materialId) || byly.has(kluczNazwy(p.nazwa))) continue
        byly.add(kluczNazwy(p.nazwa))
        wyn.push({ nazwa: p.nazwa, opis: p.opis, zbior: z.id })
    }
    return wyn
}
