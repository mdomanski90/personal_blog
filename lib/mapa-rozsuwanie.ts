// Rozsuwanie znaczników, które na danym przybliżeniu nachodzą na siebie (np. cerkiew i dzwonnica
// w jednym punkcie albo obiekt w samym punkcie wsi). Liczone w pikselach ekranu dla bieżącego
// przybliżenia: gdy po przybliżeniu znaczniki już się nie stykają, wracają na swoje miejsca.

export interface Znacznik {
    id: string
    /** położenie w pikselach (świat w bieżącym przybliżeniu) */
    x: number
    y: number
    /** stały znacznik (tarcza wsi) – nie przesuwa się, obiekty układają się wokół niego */
    staly?: boolean
}

export interface Przesuniecie {
    dx: number
    dy: number
    /** po której stronie znacznika stawiać podpis, żeby nie wchodził na sąsiada */
    strona: 'l' | 'p'
}

/**
 * @param prog odległość (px), poniżej której znaczniki uznajemy za nachodzące na siebie
 * @param odstep odległość (px) między środkami rozsuniętych znaczników
 * @returns przesunięcia tylko dla znaczników ruchomych, które trzeba odsunąć
 */
export function rozsun(znaczniki: Znacznik[], prog = 26, odstep = 32): Map<string, Przesuniecie> {
    const n = znaczniki.length
    const rodzic = znaczniki.map((_, i) => i)
    const szukaj = (i: number): number => (rodzic[i] === i ? i : (rodzic[i] = szukaj(rodzic[i])))
    // siatka kubełków, żeby nie porównywać każdego z każdym
    const kubelki = new Map<string, number[]>()
    const klucz = (x: number, y: number) => `${Math.floor(x / prog)},${Math.floor(y / prog)}`
    znaczniki.forEach((z, i) => { const k = klucz(z.x, z.y); const l = kubelki.get(k); if (l) l.push(i); else kubelki.set(k, [i]) })
    for (let i = 0; i < n; i++) {
        const a = znaczniki[i]
        const kx = Math.floor(a.x / prog), ky = Math.floor(a.y / prog)
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
            for (const j of kubelki.get(`${kx + ox},${ky + oy}`) ?? []) {
                if (j <= i) continue
                const b = znaczniki[j]
                if (a.staly && b.staly) continue
                if (Math.hypot(a.x - b.x, a.y - b.y) < prog) rodzic[szukaj(i)] = szukaj(j)
            }
        }
    }
    // rozsunięte grupy mogą wejść na sąsiadów – wtedy łączymy je i układamy jeszcze raz
    let wynik = new Map<string, Przesuniecie>()
    for (let proba = 0; proba < 6; proba++) {
        const grupy = new Map<number, number[]>()
        for (let i = 0; i < n; i++) { const r = szukaj(i); const g = grupy.get(r); if (g) g.push(i); else grupy.set(r, [i]) }
        wynik = uloz(znaczniki, [...grupy.values()], odstep)
        const poz = znaczniki.map((z) => { const r = wynik.get(z.id); return r ? [z.x + r.dx, z.y + r.dy] : [z.x, z.y] })
        let zmiana = false
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            if (szukaj(i) === szukaj(j) || (znaczniki[i].staly && znaczniki[j].staly)) continue
            if (Math.hypot(poz[i][0] - poz[j][0], poz[i][1] - poz[j][1]) < prog) { rodzic[szukaj(i)] = szukaj(j); zmiana = true }
        }
        if (!zmiana) break
    }
    return wynik
}

function uloz(znaczniki: Znacznik[], grupy: number[][], odstep: number): Map<string, Przesuniecie> {
    const wynik = new Map<string, Przesuniecie>()
    for (const g of grupy) {
        if (g.length < 2) continue
        const stale = g.filter((i) => znaczniki[i].staly)
        // kolejność stała między przeliczeniami (po id), żeby znaczniki nie skakały przy przybliżaniu
        const ruchome = g.filter((i) => !znaczniki[i].staly).sort((a, b) => znaczniki[a].id.localeCompare(znaczniki[b].id))
        if (!ruchome.length) continue
        let cx: number, cy: number
        const cele: [number, number][] = []
        const k = ruchome.length
        if (stale.length) {
            // obok tarczy wsi: łuk nad tarczą (podpis wsi jest z prawej, więc obiekty nie wchodzą na niego)
            const s = znaczniki[stale[0]]
            cx = s.x; cy = s.y
            const R = Math.max(odstep * 1.05, (k * odstep) / Math.PI)
            const krok = odstep / R
            for (let i = 0; i < k; i++) {
                const kat = -Math.PI / 2 + (i - (k - 1) / 2) * krok
                cele.push([cx + R * Math.cos(kat), cy + R * Math.sin(kat)])
            }
        } else {
            cx = ruchome.reduce((a, i) => a + znaczniki[i].x, 0) / k
            cy = ruchome.reduce((a, i) => a + znaczniki[i].y, 0) / k
            if (k === 2) {
                // para obok siebie
                cele.push([cx - odstep / 2, cy], [cx + odstep / 2, cy])
            } else {
                // łuk / koło wokół wspólnego środka
                const R = Math.max(odstep / 2 / Math.sin(Math.PI / k), odstep * 0.6)
                for (let i = 0; i < k; i++) {
                    const kat = -Math.PI / 2 + (2 * Math.PI * i) / k
                    cele.push([cx + R * Math.cos(kat), cy + R * Math.sin(kat)])
                }
            }
        }
        ruchome.forEach((i, j) => {
            const z = znaczniki[i]
            const [tx, ty] = cele[j]
            wynik.set(z.id, { dx: tx - z.x, dy: ty - z.y, strona: tx < cx - 1 ? 'l' : 'p' })
        })
    }
    return wynik
}

/** „1 obiekt”, „3 obiekty”, „5 obiektów” */
export function ileObiektow(n: number): string {
    const d = n % 10, s = n % 100
    if (n === 1) return '1 obiekt'
    if (d >= 2 && d <= 4 && (s < 12 || s > 14)) return `${n} obiekty`
    return `${n} obiektów`
}
