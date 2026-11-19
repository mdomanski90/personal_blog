// Drzewo osoby jako HTML (Markdoc Tag) – na karcie osoby i we wpisach (znacznik {% drzewo %}).
// Na komputerze: przodkowie nad osobą, potomkowie pod nią, pokolenia w wierszach; na telefonie drzewo tekstowe.
// Osoba, której czytelnik nie może zobaczyć (żyjąca, „dla bliskich”), to szara karta bez danych.
// Opcja „boczni” (strona /osoby/drzewo): rodzeństwo ojca na lewo, matki na prawo – z małżonkami i dziećmi (kuzynostwo),
// dzieci rodzeństwa osoby, krewni boczni bez wypełnienia, plakietki krewnych poza widokiem, podział „rodzina ojca / matki”.

import Markdoc from '@markdoc/markdoc'
import type { Widocznosc } from '../archiwum'
import { lataZycia, nazwaOsoby } from './model'
import type { StanOsob } from './dane'
import { MAKS_POKOLEN } from './drzewo-adres'

export { MAKS_POKOLEN }

const { Tag } = Markdoc

// jak widoczne() z lib/archiwum – tu osobno, żeby archiwum mogło wstawiać drzewa bez zapętlenia importów
function widoczne(w: string, poziom: Widocznosc): boolean {
    if (w === 'publiczne') return true
    if (w === 'bliscy') return poziom === 'bliscy' || poziom === 'ja'
    return poziom === 'ja'
}
type T = InstanceType<typeof Tag>

export type ZakresDrzewa = 'linia' | 'malzonkowie' | 'rodzenstwo'

export interface OpcjeDrzewa {
    wstecz: number
    naprzod: number
    zakres: ZakresDrzewa
    /** na karcie osoby: drzewo jest wierszem tabeli (bez własnej ramki, przycisk pełnego ekranu w nagłówku) */
    wTabeli?: boolean
    idFigury?: string
    /** PK (całe drzewo, decyzja 18.11): rodzeństwo rodziców z małżonkami i kuzynostwem, bratankowie, plakietki ukrytych krewnych */
    boczni?: boolean
    /** DRZ-12 (19.11, „rozwiń w miejscu”): kliknięte plakietki – rodzice (g), rodzeństwo (b), dzieci (d) dołożone bez zmiany układu */
    rozwin?: Rozwiniecie[]
}

export type RodzajRozwiniecia = 'g' | 'b' | 'd'
export interface Rozwiniecie { r: RodzajRozwiniecia; id: string }
/** ?rozwin=g.os-1,d.os-2 → lista (zła pozycja pomijana, najwyżej 40) */
export function rozwinieciaZAdresu(v: string | null | undefined): Rozwiniecie[] {
    if (!v) return []
    const wyn: Rozwiniecie[] = []
    for (const t of v.split(',')) {
        const m = /^([gbd])\.([\w-]{1,80})$/.exec(t.trim())
        if (m && !wyn.some((x) => x.r === m[1] && x.id === m[2])) wyn.push({ r: m[1] as RodzajRozwiniecia, id: m[2] })
        if (wyn.length >= 40) break
    }
    return wyn
}
export const rozwinieciaDoAdresu = (r: Rozwiniecie[]): string => r.map((x) => `${x.r}.${x.id}`).join(',')

// ---------- układ drzewa ----------
// Pokolenia w wierszach po 100 px (jak wiersze tabeli), etykieta pokolenia w lewej kolumnie (164 px – ta sama co
// etykiety na karcie osoby). Para stoi obok siebie, łącznik z ⚭ pośrodku; od łącznika kreska do dzieci tej pary.
// Wszystko liczone tu, na serwerze: położenie kart i linie (SVG) – przeglądarka tylko przewija i powiększa.

// karta 124×60 (do trzech wierszy imienia i nazwiska), w wierszu 100 px – środek karty na wysokości 50
const KW = 124, KH = 60, MALZ = 22, RODZ = 12, GRUPA = 28, WIERSZ = 100, GORA = 20
/** DRZ-12: wolne rzędy nad przodkami na rozwinięcia „↑” (puste rzędy są potem obcinane) */
const ZAPAS = 6
const LEWA = 164, PRAWA = 16

interface KartaU { id: string | null; glowna?: boolean; x: number; r: number; /** małżonek tej osoby z drzewa (dla czytnika: „żona: …”) */ partner?: string; /** drugi z pary rodziców w rzędzie przodków – tylko dla strzałek (VIEW-06) */ para?: string }
interface Jedn { karty: KartaU[]; x: number; szer: number; pad?: number }
interface Grupa { jedn: Jedn[]; ideal: number; x: number; szer: number }

const nowaJedn = (ids: (string | null)[], r: number, glowna?: string): Jedn => ({
    karty: ids.map((id) => ({ id, r, x: 0, ...(id && id === glowna ? { glowna: true } : {}) })),
    x: 0,
    szer: ids.length * KW + (ids.length - 1) * MALZ,
})
const nowaGrupa = (jedn: Jedn[], ideal: number): Grupa => ({ jedn, ideal, x: 0, szer: jedn.reduce((a, j) => a + j.szer, 0) + (jedn.length - 1) * RODZ })

/** Grupy w rzędzie: każda możliwie pod/nad swoim „ideałem”, bez nachodzenia, kolejność zachowana. */
function rozmiesc(grupy: Grupa[]) {
    let poprz: Grupa | null = null
    for (const g of grupy) {
        g.x = g.ideal - g.szer / 2
        if (poprz) g.x = Math.max(g.x, poprz.x + poprz.szer + GRUPA)
        poprz = g
    }
    if (grupy.length) {
        const przes = grupy.reduce((a, g) => a + (g.ideal - (g.x + g.szer / 2)), 0) / grupy.length
        for (const g of grupy) g.x += przes
    }
    for (const g of grupy) {
        let x = g.x
        for (const j of g.jedn) {
            j.x = x
            j.karty.forEach((k, i) => { k.x = x + (j.pad ?? 0) + i * (KW + MALZ) })
            x += j.szer + RODZ
        }
    }
}
const srodek = (k: KartaU) => k.x + KW / 2

export function drzewoOsoby(s: StanOsob, id: string, op: OpcjeDrzewa, poziom: Widocznosc): T | null {
    const o = s.drzewo.osoby.get(id)
    if (!o || !widoczne(s.widocznosc(id), poziom)) return null
    const wstecz = Math.max(0, Math.min(MAKS_POKOLEN, Math.round(op.wstecz) || 0))
    const naprzod = Math.max(0, Math.min(MAKS_POKOLEN, Math.round(op.naprzod) || 0))
    const widac = (x: string) => widoczne(s.widocznosc(x), poziom)
    const jest = (x: string | undefined): x is string => !!x && s.drzewo.osoby.has(x)
    const rodzice = (x: string) => s.relacje.get(x)?.rodzice[0]
    const malzenstwa = (x: string) => s.relacje.get(x)?.malzenstwa ?? []
    const zMalzonkami = op.zakres !== 'linia'
    const rokSlubu = (f: { zdarzenia: { rodzaj: string; data?: string }[] }) => f.zdarzenia.find((z) => z.rodzaj === 'slub' && z.data)?.data?.slice(0, 4) ?? ''

    // osoba z małżonkami: małżonek po prawej; przy kilku małżeństwach pierwszy po lewej, kolejni po prawej
    // (DRZ-11, 19.11: u każdej osoby, nie tylko głównej – inaczej kreska do dalszego małżonka biegła przez kartę bliższego)
    const rM = wstecz + (op.boczni ? ZAPAS : 0)
    const jednOsoby = (x: string, r: number, glowna?: string) => {
        const sp = zMalzonkami && widac(x) ? malzenstwa(x).map((f) => (f.maz === x ? f.zona : f.maz)).filter(jest) : []
        const ids = sp.length > 1 ? [sp[0], x, ...sp.slice(1)] : [x, ...sp]
        const j = nowaJedn(ids, r, glowna)
        for (const k of j.karty) if (k.id !== x) k.partner = x
        return j
    }
    const rodzinaGl = rodzice(id)
    const rodzenstwo = op.zakres === 'rodzenstwo' && rodzinaGl ? rodzinaGl.dzieci.filter(jest) : [id]
    if (!rodzenstwo.includes(id)) rodzenstwo.push(id)
    const boczni = !!op.boczni && wstecz > 0 && !!rodzinaGl && (jest(rodzinaGl.maz) || jest(rodzinaGl.zona))
    const boczna = new Set<string>()
    const jednM = rodzenstwo.map((c) => (c === id ? jednOsoby(id, rM, id) : boczni ? jednOsoby(c, rM) : nowaJedn([c], rM)))
    const wiersze: Grupa[][] = []
    const kartaOsoby = (j: Jedn, x: string) => j.karty.find((k) => k.id === x)!
    // krewny boczny z małżonkami; po lewej stronie (rodzina ojca) małżonek na zewnątrz, krew przy krwi;
    // DRZ-11: przy dwojgu i więcej małżonkach osoba pośrodku (pierwszy małżonek na zewnątrz), bez kreski przez kartę
    const jednBoczna = (x: string, r: number, lewa: boolean) => {
        const sp = widac(x) ? malzenstwa(x).map((f) => (f.maz === x ? f.zona : f.maz)).filter(jest) : []
        const ids = sp.length > 1 ? (lewa ? [sp[0], x, ...sp.slice(1)] : [...sp.slice(1).reverse(), x, sp[0]]) : lewa ? [...sp, x] : [x, ...sp]
        const j = nowaJedn(ids, r)
        for (const k of j.karty) { if (k.id !== x) k.partner = x; if (k.id) boczna.add(k.id) }
        return j
    }
    const szerGrupy = (js: Jedn[]) => js.reduce((a, j) => a + j.szer, 0) + Math.max(0, js.length - 1) * RODZ
    const zarezerwuj = (j: Jedn, w: number) => { if (w > j.szer) { j.pad = (w - j.szer) / 2; j.szer = w } }
    const rodzenstwoZ = (x: string | undefined) => { const f = x && jest(x) && widac(x) ? rodzice(x) : undefined; return f ? f.dzieci.filter(jest).filter((c) => c !== x) : [] }
    const ojciec = rodzinaGl?.maz && jest(rodzinaGl.maz) ? rodzinaGl.maz : undefined
    const matka = rodzinaGl?.zona && jest(rodzinaGl.zona) ? rodzinaGl.zona : undefined

    // linie: łączniki par, zejścia do dzieci
    const laczniki: { x1: number; x2: number; y: number; m: number; rok: string }[] = []
    const zejscia: { sx: number; sy: number; r: number; dzieci: number[]; f?: string; klamra?: boolean }[] = []
    const yGory = (r: number) => r * WIERSZ + GORA
    const ySrodka = (r: number) => r * WIERSZ + GORA + KH / 2
    function lacznikiJednB(j: Jedn, x: string, r: number) {
        const ko = kartaOsoby(j, x)
        for (const f of malzenstwa(x)) {
            const sp = f.maz === x ? f.zona : f.maz
            const ks = sp ? j.karty.find((k) => k.id === sp) : undefined
            if (!ks) continue
            const [l, p] = ks.x < ko.x ? [ks, ko] : [ko, ks]
            laczniki.push({ x1: l.x + KW, x2: p.x, y: ySrodka(r), m: (l.x + KW + p.x) / 2, rok: rokSlubu(f) })
        }
    }

    // przodkowie: rząd po rzędzie w górę; para nad dzieckiem (albo dziećmi – rodzeństwo)
    let dzieciNizej: { rodzina: NonNullable<ReturnType<typeof rodzice>>; karty: KartaU[] }[] = []
    const kartaKrwi = (j: Jedn) => j.karty.find((k) => k.id && !k.partner) ?? j.karty[0]
    let podzial: number | null = null
        let g0 = 1
    if (boczni && rodzinaGl) {
        // PK: rząd rodziców budowany najpierw – rodzeństwo ojca na lewo, rodzeństwo matki na prawo, każde z miejscem na swoje dzieci
        const r = rM - 1
        const kuzyni = new Map<Jedn, { f: NonNullable<ReturnType<typeof rodzice>>; jedn: Jedn[] }[]>()
        const rodzenstwoRodzica = (x: string | undefined, lewa: boolean) => rodzenstwoZ(x).map((c) => {
            const j = jednBoczna(c, r, lewa)
            const rodz = widac(c) ? malzenstwa(c).filter((f) => f.dzieci.some(jest)).map((f) => ({ f, jedn: f.dzieci.filter(jest).map((d) => jednBoczna(d, rM, lewa)) })) : []
            kuzyni.set(j, rodz)
            zarezerwuj(j, szerGrupy(rodz.flatMap((q) => q.jedn)))
            return j
        })
        const jo = rodzenstwoRodzica(ojciec, true), jm = rodzenstwoRodzica(matka, false)
        const jr = nowaJedn([ojciec, matka].filter(jest) as string[], r)
        if (jr.karty[1]?.id && jr.karty[0].id) jr.karty[1].para = jr.karty[0].id
        zarezerwuj(jr, szerGrupy(jednM))
        wiersze[r] = [nowaGrupa([...jo, jr, ...jm], 0)]
        rozmiesc(wiersze[r])
        const [a, b] = jr.karty
        const odRodz = b ? (a.x + KW + b.x) / 2 : srodek(a)
        if (b) { laczniki.push({ x1: a.x + KW, x2: b.x, y: ySrodka(r), m: odRodz, rok: rokSlubu(rodzinaGl) }); podzial = odRodz }
        // rząd osoby: kuzynostwo pod rodzicami, rodzeństwo osoby pod rodzicami osoby
        const grupyM: Grupa[] = []
        const zejsciaM: { sx: number; sy: number; js: Jedn[]; f: string }[] = []
        for (const j of [...jo, jr, ...jm]) {
            if (j === jr) { grupyM.push(nowaGrupa(jednM, odRodz)); zejsciaM.push({ sx: odRodz, sy: b ? ySrodka(r) : yGory(r) + KH, js: jednM, f: rodzinaGl.id }); continue }
            const krew = kartaKrwi(j)
            for (const { f, jedn } of kuzyni.get(j) ?? []) {
                const sp = f.maz === krew.id ? f.zona : f.maz
                const ks = sp ? j.karty.find((q) => q.id === sp) : undefined
                const sx = ks ? (ks.x < krew.x ? ks.x + KW + MALZ / 2 : ks.x - MALZ / 2) : srodek(krew)
                grupyM.push(nowaGrupa(jedn, sx))
                zejsciaM.push({ sx, sy: ks ? ySrodka(r) : yGory(r) + KH, js: jedn, f: f.id })
            }
            lacznikiJednB(j, krew.id!, r)
        }
        wiersze[rM] = grupyM
        rozmiesc(wiersze[rM])
        for (const z of zejsciaM) {
            zejscia.push({ sx: z.sx, sy: z.sy, r, f: z.f, dzieci: z.js.map((j) => srodek(z.js === jednM ? (j.karty.find((k) => k.id === id) ?? kartaKrwi(j)) : kartaKrwi(j))) })
            if (z.js !== jednM) for (const j of z.js) lacznikiJednB(j, kartaKrwi(j).id!, rM)
        }
        for (const j of jednM) if (!j.karty.some((k) => k.id === id)) lacznikiJednB(j, kartaKrwi(j).id!, rM)
        // dalej w górę: dziadkowie nad rodzicem i jego rodzeństwem
        for (const [x, js] of [[ojciec, jo], [matka, jm]] as const) {
            const f = x && widac(x) ? rodzice(x) : undefined
            if (!x || !f || !(jest(f.maz) || jest(f.zona))) continue
            const kx = jr.karty.find((k) => k.id === x)!
            const karty = [kx, ...js.map(kartaKrwi)].sort((p, q) => p.x - q.x)
            dzieciNizej.push({ rodzina: f, karty })
        }
        g0 = 2
    } else {
        wiersze[rM] = [nowaGrupa(jednM, 0)]
        rozmiesc(wiersze[rM])
        if (wstecz > 0 && rodzinaGl && (jest(rodzinaGl.maz) || jest(rodzinaGl.zona))) {
            dzieciNizej = [{ rodzina: rodzinaGl, karty: jednM.map((j) => j.karty.find((k) => k.id === id) ?? j.karty[0]) }]
        }
    }
    for (let g = g0; g <= wstecz && dzieciNizej.length; g++) {
        const r = rM - g
        const pary = dzieciNizej.map((d) => ({ d, j: nowaJedn([d.rodzina.maz, d.rodzina.zona].filter(jest), r) }))
        for (const { j } of pary) if (j.karty[1]?.id && j.karty[0].id) j.karty[1].para = j.karty[0].id
        wiersze[r] = pary.map(({ d, j }) => {
            const xs = d.karty.map(srodek)
            return nowaGrupa([j], (Math.min(...xs) + Math.max(...xs)) / 2)
        })
        rozmiesc(wiersze[r])
        const dalej: typeof dzieciNizej = []
        for (const { d, j } of pary) {
            const [a, b] = j.karty
            if (b) laczniki.push({ x1: a.x + KW, x2: b.x, y: ySrodka(r), m: (a.x + KW + b.x) / 2, rok: rokSlubu(d.rodzina) })
            zejscia.push({ sx: b ? (a.x + KW + b.x) / 2 : srodek(a), sy: b ? ySrodka(r) : yGory(r) + KH, r, f: d.rodzina.id, dzieci: d.karty.map(srodek) })
            for (const k of j.karty) {
                const f = k.id && widac(k.id) ? rodzice(k.id) : undefined
                if (f && (jest(f.maz) || jest(f.zona))) dalej.push({ rodzina: f, karty: [k] })
            }
        }
        dzieciNizej = dalej
    }

    // czy są jeszcze dalsi przodkowie (do „wczytaj kolejne pokolenia” na pełnym ekranie)
    const wiecejWstecz = wstecz === 0 ? !!(rodzinaGl && (jest(rodzinaGl.maz) || jest(rodzinaGl.zona))) : dzieciNizej.length > 0

    // potomkowie: rząd po rzędzie w dół; dzieci każdej pary pod jej łącznikiem
    const jGl = jednM.find((j) => j.karty.some((k) => k.id === id))!
    let osobyLinii: { k: KartaU; j: Jedn }[] = [{ k: kartaOsoby(jGl, id), j: jGl }]
    if (boczni) osobyLinii = jednM.map((j) => ({ k: j === jGl ? kartaOsoby(jGl, id) : kartaKrwi(j), j })).sort((a, b) => a.k.x - b.k.x)
    // łączniki par w wierszu osoby
    const lacznikiJedn = (j: Jedn, x: string, r: number) => {
        const ko = kartaOsoby(j, x)
        for (const f of malzenstwa(x)) {
            const sp = f.maz === x ? f.zona : f.maz
            const ks = sp ? j.karty.find((k) => k.id === sp) : undefined
            if (!ks) continue
            const [l, p] = ks.x < ko.x ? [ks, ko] : [ko, ks]
            // przy trzecim i dalszym małżonku łącznik biegnie za kartą poprzedniego – ⚭ tuż przed właściwą
            const m = ks.x < ko.x ? l.x + KW + MALZ / 2 : p.x - MALZ / 2
            laczniki.push({ x1: l.x + KW, x2: p.x, y: ySrodka(r), m, rok: rokSlubu(f) })
        }
    }
    lacznikiJedn(osobyLinii[0].j, id, rM)
    for (let d = 1; d <= naprzod && osobyLinii.length; d++) {
        const r = rM + d
        const grupy: { g: Grupa; od: { sx: number; sy: number }; f: string; dzieci: { k: KartaU; j: Jedn }[] }[] = []
        for (const { k, j } of osobyLinii) {
            const x = k.id!
            if (!widac(x)) continue
            for (const f of malzenstwa(x)) {
                const dzieci = f.dzieci.filter(jest)
                if (!dzieci.length) continue
                const sp = f.maz === x ? f.zona : f.maz
                const ks = sp ? j.karty.find((q) => q.id === sp) : undefined
                const od = ks
                    ? { sx: ks.x < k.x ? ks.x + KW + MALZ / 2 : ks.x - MALZ / 2, sy: ySrodka(r - 1) }
                    : { sx: srodek(k), sy: yGory(r - 1) + KH }
                const bratankowie = boczni && d === 1 && x !== id
                const jedn = dzieci.map((c) => (bratankowie ? jednBoczna(c, r, false) : jednOsoby(c, r)))
                grupy.push({ g: nowaGrupa(jedn, od.sx), od, f: f.id, dzieci: jedn.map((jj, i) => ({ k: kartaOsoby(jj, dzieci[i]), j: jj })) })
            }
        }
        if (!grupy.length) break
        wiersze[r] = grupy.map((x) => x.g)
        rozmiesc(wiersze[r])
        for (const x of grupy) {
            zejscia.push({ sx: x.od.sx, sy: x.od.sy, r: r - 1, f: x.f, dzieci: x.dzieci.map((c) => srodek(c.k)) })
            for (const c of x.dzieci) lacznikiJedn(c.j, c.k.id!, r)
        }
        osobyLinii = grupy.flatMap((x) => x.dzieci).filter((c) => !boczna.has(c.k.id ?? ''))
    }

    const wiecejNaprzod = osobyLinii.some(({ k }) => !!k.id && widac(k.id) && malzenstwa(k.id).some((f) => f.dzieci.some(jest)))

    // DRZ-12 (19.11, decyzja właściciela „rozwiń w miejscu”): kliknięta plakietka dokłada krewnych obok osoby, nie ruszając
    // reszty drzewa – nowa grupa kart staje w najbliższym wolnym miejscu swojego rzędu (środek drzewa i położenie
    // pozostałych kart bez zmian). Rozwinięcia w kolejności kliknięć; rozwinięty krewny może mieć własne plakietki.
    const zastosowane = new Set<string>()
    if (boczni && op.rozwin?.length) {
        const karty = () => wiersze.flatMap((w) => (w ?? []).flatMap((g) => g.jedn.flatMap((j) => j.karty)))
        const jednW = () => wiersze.flatMap((w) => (w ?? []).flatMap((g) => g.jedn))
        const pokazana = (x: string) => karty().some((k) => k.id === x)
        const kartaW = (x: string) => karty().find((k) => k.id === x && !k.partner) ?? karty().find((k) => k.id === x)
        /** grupa jednostek w najbliższym wolnym miejscu rzędu r (odstęp GRUPA od zajętych kart), bez przesuwania innych */
        const wstawWolne = (r: number, js: Jedn[], ideal: number) => {
            const w = szerGrupy(js)
            const zaj = karty().filter((k) => k.r === r).map((k) => [k.x - GRUPA, k.x + KW + GRUPA] as const)
            const wolne = (x: number) => zaj.every(([a, b]) => x + w <= a || x >= b)
            const kand = [ideal - w / 2, ...zaj.flatMap(([a, b]) => [b, a - w])].filter(wolne)
            const x0 = kand.sort((p, q) => Math.abs(p + w / 2 - ideal) - Math.abs(q + w / 2 - ideal))[0] ?? ideal - w / 2
            const g = nowaGrupa(js, ideal)
            g.x = x0
            let x = x0
            for (const j of js) { j.x = x; j.karty.forEach((k, i) => { k.x = x + (j.pad ?? 0) + i * (KW + MALZ) }); x += j.szer + RODZ }
            ;(wiersze[r] ??= []).push(g)
        }
        const oznaczBoczne = (js: Jedn[]) => { for (const j of js) for (const k of j.karty) if (k.id) boczna.add(k.id) }
        for (let przebieg = 0; przebieg < 3; przebieg++) {
            let zmiana = false
            for (const t of op.rozwin) {
                const klucz = `${t.r}.${t.id}`
                if (zastosowane.has(klucz) || !jest(t.id) || !widac(t.id)) continue
                const k = kartaW(t.id)
                if (!k) continue
                const bok = boczna.has(t.id) || !!k.partner
                const f = rodzice(t.id)
                if (t.r === 'g') {
                    const ids = f ? [f.maz, f.zona].filter(jest) : []
                    if (!f || !ids.length || ids.some(pokazana) || k.r - 1 < 0) { zastosowane.add(klucz); continue }
                    const j = nowaJedn(ids, k.r - 1)
                    if (j.karty[1]?.id && j.karty[0].id) j.karty[1].para = j.karty[0].id
                    if (bok) oznaczBoczne([j])
                    wstawWolne(k.r - 1, [j], srodek(k))
                    const [a, b] = j.karty
                    if (b) laczniki.push({ x1: a.x + KW, x2: b.x, y: ySrodka(k.r - 1), m: (a.x + KW + b.x) / 2, rok: rokSlubu(f) })
                    const sx = b ? (a.x + KW + b.x) / 2 : srodek(a), sy = b ? ySrodka(k.r - 1) : yGory(k.r - 1) + KH
                    // rodzeństwo pokazane wcześniej klamrą – teraz pod rodzicami
                    const kl = zejscia.find((z) => z.f === f.id && z.klamra)
                    if (kl) Object.assign(kl, { sx, sy, klamra: false })
                    else zejscia.push({ sx, sy, r: k.r - 1, f: f.id, dzieci: f.dzieci.map((c) => karty().find((q) => q.id === c && q.r === k.r)).filter((q): q is KartaU => !!q).map(srodek) })
                } else if (t.r === 'b') {
                    const sib = f ? f.dzieci.filter(jest).filter((c) => c !== t.id && !pokazana(c)) : []
                    if (!f || !sib.length) { zastosowane.add(klucz); continue }
                    const js = sib.map((c) => nowaJedn([c], k.r))
                    oznaczBoczne(js)
                    const jo = jednW().find((j) => j.karty.includes(k))
                    wstawWolne(k.r, js, (jo ? jo.x + jo.szer : k.x + KW) + GRUPA + szerGrupy(js) / 2)
                    const nowe = js.map((j) => srodek(j.karty[0]))
                    const z = zejscia.find((q) => q.f === f.id)
                    if (z) z.dzieci.push(...nowe)
                    else zejscia.push({ sx: srodek(k), sy: yGory(k.r), r: k.r - 1, f: f.id, klamra: true, dzieci: [srodek(k), ...nowe] })
                } else {
                    let dodano = false
                    for (const m of malzenstwa(t.id)) {
                        const dzieci = m.dzieci.filter(jest).filter((c) => !pokazana(c))
                        if (!dzieci.length) continue
                        const js = dzieci.map((c) => jednOsoby(c, k.r + 1))
                        if (bok) oznaczBoczne(js)
                        const sp = m.maz === t.id ? m.zona : m.maz
                        const ks = sp ? karty().find((q) => q.id === sp && q.r === k.r && Math.abs(q.x - k.x) <= KW + MALZ + 1) : undefined
                        const sx = ks ? (ks.x < k.x ? ks.x + KW + MALZ / 2 : ks.x - MALZ / 2) : srodek(k)
                        wstawWolne(k.r + 1, js, sx)
                        const nowe = js.map((j, i) => kartaOsoby(j, dzieci[i]))
                        const z = zejscia.find((q) => q.f === m.id)
                        if (z) z.dzieci.push(...nowe.map(srodek))
                        else zejscia.push({ sx, sy: ks ? ySrodka(k.r) : yGory(k.r) + KH, r: k.r, f: m.id, dzieci: nowe.map(srodek) })
                        js.forEach((j, i) => lacznikiJedn(j, dzieci[i], k.r + 1))
                        dodano = true
                    }
                    if (!dodano) { zastosowane.add(klucz); continue }
                }
                zastosowane.add(klucz)
                zmiana = true
            }
            if (!zmiana) break
        }
    }

    // przesunięcie do zera, wymiary
    const wszystkie = wiersze.flatMap((w) => (w ?? []).flatMap((g) => g.jedn.flatMap((j) => j.karty)))
    const minX = Math.min(...wszystkie.map((k) => k.x)) - 8
    const szer = Math.max(...wszystkie.map((k) => k.x + KW)) - minX + 8
    const pierwszy = wiersze.findIndex((w) => w && w.length)
    const ostatni = wiersze.length - 1
    const n = ostatni - pierwszy + 1
    const ox = (x: number) => Math.round((x - minX) * 10) / 10
    const oy = (y: number) => y - pierwszy * WIERSZ

    // kreski: pion od łącznika do szyny nad dziećmi, szyna, piony do dzieci; szyny w jednym rzędzie nie nachodzą na siebie
    const sciezki: string[] = []
    for (const l of laczniki) sciezki.push(`M${ox(l.x1)} ${oy(l.y)}H${ox(l.x2)}`)
    const zajete = new Map<number, [number, number, number][]>()
    for (const z of zejscia) {
        const xs = [z.sx, ...z.dzieci]
        const a = Math.min(...xs), b = Math.max(...xs)
        let y = (z.r + 1) * WIERSZ - 12
        const zaj = zajete.get(z.r) ?? []
        for (const dy of [0, -6, 6, -10]) {
            if (!zaj.some(([p, q, yy]) => yy === y + dy && p <= b + 24 && q >= a - 24)) { y += dy; break }
        }
        zaj.push([a, b, y])
        zajete.set(z.r, zaj)
        sciezki.push(`M${ox(z.sx)} ${oy(z.sy)}V${oy(y)}`)
        if (b - a > 0.5) sciezki.push(`M${ox(a)} ${oy(y)}H${ox(b)}`)
        for (const c of z.dzieci) sciezki.push(`M${ox(c)} ${oy(y)}V${oy(yGory(z.r + 1))}`)
    }

    const nazwyPokolen = (r: number): string => {
        const g = rM - r
        if (boczni && g === 0) return 'rodzeństwo, kuzynostwo'
        if (boczni && g === 1) return 'rodzice, wujostwo'
        if (boczni && g === -1) return 'dzieci, dzieci rodzeństwa'
        if (g === 0) return wiersze[rM][0].jedn.some((j) => j.karty.length > 1) ? 'małżeństwo' : op.zakres === 'rodzenstwo' && jednM.length > 1 ? 'rodzeństwo' : 'osoba'
        if (g > 0) return ['rodzice', 'dziadkowie', 'pradziadkowie', 'prapradziadkowie'][g - 1] ?? `${g}. pokolenie ↑`
        return ['dzieci', 'wnuki', 'prawnuki', 'praprawnuki'][-g - 1] ?? `${-g}. pokolenie ↓`
    }
    // PK: krewni poza widokiem – plakietki przy karcie (↑ rodzice, +N rodzeństwo, ↓N dzieci)
    const pokazane = new Set(wiersze.flatMap((w) => (w ?? []).flatMap((g) => g.jedn.flatMap((j) => j.karty.map((k) => k.id ?? undefined)))).filter(jest))
    const ukryci = (x: string) => {
        if (!boczni || !widac(x)) return { g: false, b: 0, d: 0, opis: '' }
        const f = rodzice(x)
        const g = !!f && [f.maz, f.zona].some((q) => jest(q) && !pokazane.has(q))
        const b = f ? f.dzieci.filter(jest).filter((c) => c !== x && !pokazane.has(c)).length : 0
        const d = new Set(malzenstwa(x).flatMap((m) => m.dzieci).filter(jest).filter((c) => !pokazane.has(c))).size
        const opis = [g && 'rodzice', b && `rodzeństwo ${b}`, d && `dzieci ${d}`].filter(Boolean).join(', ')
        return { g, b, d, opis }
    }
    // DRZ-12: plakietka to przycisk „rozwiń w miejscu” (data-rozwin – obsługa w PrzegladarkaDrzewa)
    const plakietki = wiersze.flatMap((w) => (w ?? []).flatMap((gr) => gr.jedn.flatMap((j) => j.karty))).flatMap((k) => {
        if (!k.id) return []
        const u = ukryci(k.id)
        const t: T[] = []
        const kto = nazwaOsoby(s.drzewo.osoby.get(k.id)!)
        const st = (r: RodzajRozwiniecia, x: number, y: number, txt: string, opis: string) => new Tag('button', {
            type: 'button', class: `dr-pl dr-pl-${r}`, style: `left:${ox(x)}px;top:${oy(y)}px`, 'data-rozwin': `${r}.${k.id}`,
            'aria-label': `${kto}: pokaż ${opis}`, title: `pokaż ${opis}`,
        }, [txt])
        if (u.g && k.r > 0) t.push(st('g', srodek(k), yGory(k.r), '↑', 'rodziców'))
        if (u.b) t.push(st('b', k.x + KW - 6, yGory(k.r), `+${u.b}`, `rodzeństwo (${u.b})`))
        // ↓N tylko u krewnego z krwi poniżej przodków (u przodków ukryte dzieci to „+N” przy ich dziecku; u małżonka – przy współmałżonku)
        if (u.d && !k.partner && (k.r >= rM || boczna.has(k.id))) t.push(st('d', srodek(k), yGory(k.r) + KH, `↓${u.d}`, `dzieci (${u.d})`))
        return t
    })
    const kartaT = (k: KartaU): T => {
        const styl = `left:${ox(k.x)}px;top:${oy(yGory(k.r))}px`
        const p = k.id ? s.drzewo.osoby.get(k.id) : undefined
        if (!p) return new Tag('span', { class: 'dr-karta dr-brak', style: styl }, ['?'])
        if (!widac(p.id)) return new Tag('span', { class: 'dr-karta dr-ukryta', style: styl, title: 'dane tej osoby widzą tylko zalogowani bliscy' }, [new Tag('span', { class: 'dr-imie' }, ['widoczne dla zalogowanych'])])
        const pp = k.partner ? s.drzewo.osoby.get(k.partner) : undefined
        const ukr = ukryci(p.id)
        const dopisek = (k.glowna ? ', ta osoba' : pp ? `, ${p.plec === 'K' ? 'żona' : p.plec === 'M' ? 'mąż' : 'małżonek'}: ${nazwaOsoby(pp)}` : '') + (ukr.opis ? `; poza widokiem: ${ukr.opis}` : '')
        const tresc = [new Tag('span', { class: 'dr-imie' }, [nazwaOsoby(p)]), new Tag('span', { class: 'dr-lata' }, [lataZycia(p)]), ...(dopisek ? [new Tag('span', { class: 'dr-sr' }, [dopisek])] : [])]
        const tytul = `${nazwaOsoby(p)}${lataZycia(p) ? ` (${lataZycia(p)})` : ''}`
        // opis karty dla strzałek (VIEW-06): rząd, położenie, rodzice widoczni w drzewie, rodzina pochodzenia, małżonek
        const fr = widac(p.id) ? rodzice(p.id) : undefined
        const nawig = {
            'data-id': p.id, 'data-rzad': String(k.r), 'data-x': String(Math.round(k.x)),
            'data-rodzice': fr ? [fr.maz, fr.zona].filter(jest).join(' ') : '',
            'data-rodzina': fr ? `${fr.maz ?? ''}+${fr.zona ?? ''}` : '',
            'data-partner': k.partner ?? k.para ?? '',
        }
        return k.glowna
            ? new Tag('span', { class: `dr-karta dr-${p.plec} dr-glowna`, style: styl, tabindex: '0', title: tytul, ...nawig }, tresc)
            : new Tag('a', { class: `dr-karta dr-${p.plec}${boczna.has(p.id) ? ' dr-boczna' : ''}`, href: `/osoby/${p.id}`, style: styl, title: tytul, ...nawig }, tresc)
    }
    // karty pogrupowane w pokolenia (lista z nazwą pokolenia – czytnik ekranu czyta drzewo pokolenie po pokoleniu)
    const pokolenia = Array.from({ length: n }, (_, i) => {
        const karty = wszystkie.filter((k) => k.r === pierwszy + i)
        return new Tag('ul', { class: 'dr-grupa', 'aria-label': nazwyPokolen(pierwszy + i) }, karty.map((k) => new Tag('li', {}, [kartaT(k)])))
    })
    const wys = n * WIERSZ
    // łatka po PK (odbiór 18.11): kolumna nazw pokoleń ma stałą szerokość na ekranie (nie rośnie z przybliżeniem –
    // --dr-lewa dzielone przez --dr-skala w CSS); gdy zajęłaby za dużo okna, zwija się do skrótu (↑2, •, ↓1) – DrzewaLinie.
    // data-szer / data-wys: rozmiar treści w jednostkach planszy (dopasowanie „całe drzewo w oknie”).
    const plansza = new Tag('div', { class: 'dr-plansza', 'data-szer': String(Math.ceil(szer) + PRAWA), 'data-wys': String(wys), style: `--wc:${Math.ceil(szer)}px;width:calc(var(--dr-lewa, ${LEWA}px) / var(--dr-skala, 1) + ${Math.ceil(szer) + PRAWA}px);height:${wys}px` }, [
        ...Array.from({ length: n }, (_, i) => {
            const g = rM - (pierwszy + i)
            const pelna = nazwyPokolen(pierwszy + i)
            return new Tag('div', { class: `dr-wiersz${i === n - 1 ? ' dr-ostatni' : ''}`, style: `top:${i * WIERSZ}px`, 'aria-hidden': 'true' }, [
                new Tag('span', { class: 'dr-pokol', title: pelna }, [new Tag('span', { class: 'dr-pokol-pelna' }, [pelna]), new Tag('span', { class: 'dr-pokol-skrot' }, [g > 0 ? `↑${g}` : g < 0 ? `↓${-g}` : '•'])]),
            ])
        }),
        new Tag('div', { class: 'dr-tresc', style: `width:${Math.ceil(szer)}px;height:${wys}px` }, [
            new Tag('svg', { class: 'dr-linie', width: String(Math.ceil(szer)), height: String(wys), viewBox: `0 0 ${Math.ceil(szer)} ${wys}`, 'aria-hidden': 'true' }, [new Tag('path', { d: sciezki.join('') }, []), ...(podzial !== null ? [new Tag('path', { class: 'dr-podzial', d: `M${ox(podzial)} ${oy(pierwszy * WIERSZ + 26)}V${oy(yGory(rM - 1) - 6)}` }, [])] : [])]),
            ...pokolenia,
            ...plakietki,
            ...(podzial !== null ? [
                new Tag('span', { class: 'dr-strona dr-strona-l', style: `left:${ox(podzial)}px;top:${oy(pierwszy * WIERSZ)}px` }, [`rodzina ojca${ojciec ? ` · ${s.drzewo.osoby.get(ojciec)?.nazwisko ?? ''}` : ''}`]),
                new Tag('span', { class: 'dr-strona dr-strona-p', style: `left:${ox(podzial)}px;top:${oy(pierwszy * WIERSZ)}px` }, [`rodzina matki${matka ? ` · ${s.drzewo.osoby.get(matka)?.nazwisko ?? ''}` : ''}`]),
            ] : []),
            ...laczniki.map((l) => new Tag('span', { class: 'dr-slub', style: `left:${ox(l.m)}px;top:${oy(l.y)}px`, 'aria-hidden': 'true', ...(l.rok ? { title: `ślub ${l.rok}` } : {}) }, ['⚭'])),
        ]),
    ])
    // wersja graficzna jest też wersją dla czytnika i klawiatury; tekstowa – tylko na telefonie (bez powielania)
    const klepsydra = new Tag('div', { class: 'dr-przewijanie', role: 'group', 'aria-label': `drzewo rodzinne: ${nazwaOsoby(o)}` }, [plansza])

    // wersja tekstowa (telefon, czytniki ekranu)
    const pozycja = (x: string | undefined, rola: string): T => {
        const p = x ? s.drzewo.osoby.get(x) : undefined
        if (!p) return new Tag('span', {}, [`${rola}: nieznany`])
        if (!widac(p.id)) return new Tag('span', {}, [`${rola}: `, new Tag('span', { class: 'dr-t-ukryta' }, ['widoczne dla zalogowanych'])])
        const l = lataZycia(p)
        return new Tag('span', {}, [`${rola}: `, new Tag('a', { href: `/osoby/${p.id}`, class: `dr-t-${p.plec}` }, [nazwaOsoby(p)]), l ? ` (${l})` : ''])
    }
    const listaPrzod = (x: string, g: number): T | null => {
        const f = rodzice(x)
        if (g <= 0 || !f || (!f.maz && !f.zona)) return null
        const el = (p: string | undefined, rola: string) => {
            const dalej = p && widac(p) ? listaPrzod(p, g - 1) : null
            return new Tag('li', {}, [pozycja(p, rola), ...(dalej ? [dalej] : [])])
        }
        return new Tag('ul', {}, [el(f.maz, 'ojciec'), el(f.zona, 'matka')])
    }
    const listaPot = (x: string, g: number): T | null => {
        if (g <= 0) return null
        const el: T[] = []
        for (const f of malzenstwa(x)) {
            const sp = f.maz === x ? f.zona : f.maz
            if (op.zakres !== 'linia' && sp) el.push(new Tag('li', {}, [pozycja(sp, s.drzewo.osoby.get(sp)?.plec === 'K' ? 'żona' : s.drzewo.osoby.get(sp)?.plec === 'M' ? 'mąż' : 'małżonek')]))
            for (const c of f.dzieci) {
                const dalej = widac(c) ? listaPot(c, g - 1) : null
                el.push(new Tag('li', {}, [pozycja(c, s.drzewo.osoby.get(c)?.plec === 'K' ? 'córka' : s.drzewo.osoby.get(c)?.plec === 'M' ? 'syn' : 'dziecko'), ...(dalej ? [dalej] : [])]))
            }
        }
        return el.length ? new Tag('ul', {}, el) : null
    }
    const lp = listaPrzod(id, wstecz), lpot = listaPot(id, naprzod)
    const rodzT = op.zakres === 'rodzenstwo' ? (rodzice(id)?.dzieci ?? []).filter((c) => c !== id) : []
    const tekst = new Tag('div', { class: 'dr-tekst' }, [
        new Tag('p', { class: 'dr-t-osoba' }, [nazwaOsoby(o), lataZycia(o) ? ` (${lataZycia(o)})` : '']),
        ...(lp ? [new Tag('p', { class: 'dr-t-naglowek' }, ['przodkowie']), lp] : []),
        ...(rodzT.length ? [new Tag('p', { class: 'dr-t-naglowek' }, ['rodzeństwo']), new Tag('ul', {}, rodzT.map((c) => new Tag('li', {}, [pozycja(c, s.drzewo.osoby.get(c)?.plec === 'K' ? 'siostra' : 'brat')])))] : []),
        ...(lpot ? [new Tag('p', { class: 'dr-t-naglowek' }, ['potomkowie']), lpot] : []),
        ...(boczni ? ([[ojciec, 'rodzeństwo ojca'], [matka, 'rodzeństwo matki']] as const).flatMap(([x, nagl]) => {
            const r = rodzenstwoZ(x)
            if (!r.length) return []
            return [new Tag('p', { class: 'dr-t-naglowek' }, [nagl]), new Tag('ul', {}, r.map((c) => {
                const dalej = widac(c) ? listaPot(c, 1) : null
                return new Tag('li', {}, [pozycja(c, s.drzewo.osoby.get(c)?.plec === 'K' ? 'ciotka' : x === ojciec ? 'stryj' : 'wuj'), ...(dalej ? [dalej] : [])])
            }))]
        }) : []),
    ])
    return new Tag('figure', {
        class: `drzewo${op.wTabeli ? ' dr-w-tabeli' : ''}`, 'data-osoba': id, ...(op.idFigury ? { id: op.idFigury } : {}),
        'data-wstecz': String(wstecz), 'data-naprzod': String(naprzod), 'data-zakres': op.zakres,
        // ile pokoleń naprawdę widać (N na przyciskach = pokolenia pokazane, nie zamówione)
        'data-pokolen-wstecz': String(rM - pierwszy), 'data-pokolen-naprzod': String(ostatni - rM),
        'data-wiecej-wstecz': wiecejWstecz ? '1' : '0', 'data-wiecej-naprzod': wiecejNaprzod ? '1' : '0',
        // ile rodzeństwa osoby jest w drzewie (przycisk „pokaż rodzeństwo” na pełnym ekranie)
        'data-rodzenstwo': String(rodzinaGl ? rodzinaGl.dzieci.filter((c) => c !== id && jest(c)).length : 0),
        'data-rozwiniete': String(zastosowane.size),
    }, [klepsydra, tekst])
}

export function drzewoHtml(s: StanOsob, id: string, op: OpcjeDrzewa, poziom: Widocznosc): string {
    const t = drzewoOsoby(s, id, op, poziom)
    return t ? Markdoc.renderers.html(t) : ''
}
