// Drzewo osoby jako HTML (Markdoc Tag) – na karcie osoby i we wpisach (znacznik {% drzewo %}).
// Na komputerze: przodkowie nad osobą, potomkowie pod nią, pokolenia w wierszach; na telefonie drzewo tekstowe.
// Osoba, której czytelnik nie może zobaczyć (żyjąca, „dla bliskich”), to szara karta bez danych.

import Markdoc from '@markdoc/markdoc'
import type { Widocznosc } from '../archiwum'
import { lataZycia, nazwaOsoby } from './model'
import type { StanOsob } from './dane'

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
}

// ---------- układ drzewa ----------
// Pokolenia w wierszach po 100 px (jak wiersze tabeli), etykieta pokolenia w lewej kolumnie (164 px – ta sama co
// etykiety na karcie osoby). Para stoi obok siebie, łącznik z ⚭ pośrodku; od łącznika kreska do dzieci tej pary.
// Wszystko liczone tu, na serwerze: położenie kart i linie (SVG) – przeglądarka tylko przewija i powiększa.

/** najwięcej pokoleń w jedną stronę (doczytywanie na pełnym ekranie) */
export const MAKS_POKOLEN = 15
// karta 124×60 (do trzech wierszy imienia i nazwiska), w wierszu 100 px – środek karty na wysokości 50
const KW = 124, KH = 60, MALZ = 22, RODZ = 12, GRUPA = 28, WIERSZ = 100, GORA = 20
const LEWA = 164, PRAWA = 16

interface KartaU { id: string | null; glowna?: boolean; x: number; r: number; /** małżonek tej osoby z drzewa (dla czytnika: „żona: …”) */ partner?: string }
interface Jedn { karty: KartaU[]; x: number; szer: number }
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
            j.karty.forEach((k, i) => { k.x = x + i * (KW + MALZ) })
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

    // osoba z małżonkami: małżonek po prawej; u osoby głównej przy kilku małżeństwach pierwszy po lewej, kolejni po prawej
    const rM = wstecz
    const jednOsoby = (x: string, r: number, glowna?: string) => {
        const sp = zMalzonkami && widac(x) ? malzenstwa(x).map((f) => (f.maz === x ? f.zona : f.maz)).filter(jest) : []
        const ids = glowna && sp.length > 1 ? [sp[0], x, ...sp.slice(1)] : [x, ...sp]
        const j = nowaJedn(ids, r, glowna)
        for (const k of j.karty) if (k.id !== x) k.partner = x
        return j
    }
    const rodzinaGl = rodzice(id)
    const rodzenstwo = op.zakres === 'rodzenstwo' && rodzinaGl ? rodzinaGl.dzieci.filter(jest) : [id]
    if (!rodzenstwo.includes(id)) rodzenstwo.push(id)
    const jednM = rodzenstwo.map((c) => (c === id ? jednOsoby(id, rM, id) : nowaJedn([c], rM)))
    const wiersze: Grupa[][] = []
    wiersze[rM] = [nowaGrupa(jednM, 0)]
    rozmiesc(wiersze[rM])
    const kartaOsoby = (j: Jedn, x: string) => j.karty.find((k) => k.id === x)!

    // linie: łączniki par, zejścia do dzieci
    const laczniki: { x1: number; x2: number; y: number; m: number; rok: string }[] = []
    const zejscia: { sx: number; sy: number; r: number; dzieci: number[] }[] = []
    const yGory = (r: number) => r * WIERSZ + GORA
    const ySrodka = (r: number) => r * WIERSZ + GORA + KH / 2

    // przodkowie: rząd po rzędzie w górę; para nad dzieckiem (albo dziećmi – rodzeństwo)
    let dzieciNizej: { rodzina: NonNullable<ReturnType<typeof rodzice>>; karty: KartaU[] }[] = []
    if (wstecz > 0 && rodzinaGl && (jest(rodzinaGl.maz) || jest(rodzinaGl.zona))) {
        dzieciNizej = [{ rodzina: rodzinaGl, karty: jednM.map((j) => j.karty.find((k) => k.id === id) ?? j.karty[0]) }]
    }
    for (let g = 1; g <= wstecz && dzieciNizej.length; g++) {
        const r = rM - g
        const pary = dzieciNizej.map((d) => ({ d, j: nowaJedn([d.rodzina.maz, d.rodzina.zona].filter(jest), r) }))
        wiersze[r] = pary.map(({ d, j }) => {
            const xs = d.karty.map(srodek)
            return nowaGrupa([j], (Math.min(...xs) + Math.max(...xs)) / 2)
        })
        rozmiesc(wiersze[r])
        const dalej: typeof dzieciNizej = []
        for (const { d, j } of pary) {
            const [a, b] = j.karty
            if (b) laczniki.push({ x1: a.x + KW, x2: b.x, y: ySrodka(r), m: (a.x + KW + b.x) / 2, rok: rokSlubu(d.rodzina) })
            zejscia.push({ sx: b ? (a.x + KW + b.x) / 2 : srodek(a), sy: b ? ySrodka(r) : yGory(r) + KH, r, dzieci: d.karty.map(srodek) })
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
        const grupy: { g: Grupa; od: { sx: number; sy: number }; dzieci: { k: KartaU; j: Jedn }[] }[] = []
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
                const jedn = dzieci.map((c) => jednOsoby(c, r))
                grupy.push({ g: nowaGrupa(jedn, od.sx), od, dzieci: jedn.map((jj, i) => ({ k: kartaOsoby(jj, dzieci[i]), j: jj })) })
            }
        }
        if (!grupy.length) break
        wiersze[r] = grupy.map((x) => x.g)
        rozmiesc(wiersze[r])
        for (const x of grupy) {
            zejscia.push({ sx: x.od.sx, sy: x.od.sy, r: r - 1, dzieci: x.dzieci.map((c) => srodek(c.k)) })
            for (const c of x.dzieci) lacznikiJedn(c.j, c.k.id!, r)
        }
        osobyLinii = grupy.flatMap((x) => x.dzieci)
    }

    const wiecejNaprzod = osobyLinii.some(({ k }) => !!k.id && widac(k.id) && malzenstwa(k.id).some((f) => f.dzieci.some(jest)))

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
        if (g === 0) return wiersze[rM][0].jedn.some((j) => j.karty.length > 1) ? 'małżeństwo' : op.zakres === 'rodzenstwo' && jednM.length > 1 ? 'rodzeństwo' : 'osoba'
        if (g > 0) return ['rodzice', 'dziadkowie', 'pradziadkowie', 'prapradziadkowie'][g - 1] ?? `${g}. pokolenie ↑`
        return ['dzieci', 'wnuki', 'prawnuki', 'praprawnuki'][-g - 1] ?? `${-g}. pokolenie ↓`
    }
    const kartaT = (k: KartaU): T => {
        const styl = `left:${ox(k.x)}px;top:${oy(yGory(k.r))}px`
        const p = k.id ? s.drzewo.osoby.get(k.id) : undefined
        if (!p) return new Tag('span', { class: 'dr-karta dr-brak', style: styl }, ['?'])
        if (!widac(p.id)) return new Tag('span', { class: 'dr-karta dr-ukryta', style: styl, title: 'dane tej osoby widzą tylko zalogowani bliscy' }, [new Tag('span', { class: 'dr-imie' }, ['widoczne dla zalogowanych'])])
        const pp = k.partner ? s.drzewo.osoby.get(k.partner) : undefined
        const dopisek = k.glowna ? ', ta osoba' : pp ? `, ${p.plec === 'K' ? 'żona' : p.plec === 'M' ? 'mąż' : 'małżonek'}: ${nazwaOsoby(pp)}` : ''
        const tresc = [new Tag('span', { class: 'dr-imie' }, [nazwaOsoby(p)]), new Tag('span', { class: 'dr-lata' }, [lataZycia(p)]), ...(dopisek ? [new Tag('span', { class: 'dr-sr' }, [dopisek])] : [])]
        const tytul = `${nazwaOsoby(p)}${lataZycia(p) ? ` (${lataZycia(p)})` : ''}`
        return k.glowna
            ? new Tag('span', { class: `dr-karta dr-${p.plec} dr-glowna`, style: styl, tabindex: '0', title: tytul }, tresc)
            : new Tag('a', { class: `dr-karta dr-${p.plec}`, href: `/osoby/${p.id}`, style: styl, title: tytul }, tresc)
    }
    // karty pogrupowane w pokolenia (lista z nazwą pokolenia – czytnik ekranu czyta drzewo pokolenie po pokoleniu)
    const pokolenia = Array.from({ length: n }, (_, i) => {
        const karty = wszystkie.filter((k) => k.r === pierwszy + i)
        return new Tag('ul', { class: 'dr-grupa', 'aria-label': nazwyPokolen(pierwszy + i) }, karty.map((k) => new Tag('li', {}, [kartaT(k)])))
    })
    const wys = n * WIERSZ
    const plansza = new Tag('div', { class: 'dr-plansza', style: `--wc:${Math.ceil(szer)}px;width:${LEWA + Math.ceil(szer) + PRAWA}px;height:${wys}px` }, [
        ...Array.from({ length: n }, (_, i) => new Tag('div', { class: `dr-wiersz${i === n - 1 ? ' dr-ostatni' : ''}`, style: `top:${i * WIERSZ}px`, 'aria-hidden': 'true' }, [new Tag('span', { class: 'dr-pokol' }, [nazwyPokolen(pierwszy + i)])])),
        new Tag('div', { class: 'dr-tresc', style: `width:${Math.ceil(szer)}px;height:${wys}px` }, [
            new Tag('svg', { class: 'dr-linie', width: String(Math.ceil(szer)), height: String(wys), viewBox: `0 0 ${Math.ceil(szer)} ${wys}`, 'aria-hidden': 'true' }, [new Tag('path', { d: sciezki.join('') }, [])]),
            ...pokolenia,
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
    ])
    return new Tag('figure', {
        class: `drzewo${op.wTabeli ? ' dr-w-tabeli' : ''}`, 'data-osoba': id, ...(op.idFigury ? { id: op.idFigury } : {}),
        'data-wstecz': String(wstecz), 'data-naprzod': String(naprzod), 'data-zakres': op.zakres,
        'data-wiecej-wstecz': wiecejWstecz ? '1' : '0', 'data-wiecej-naprzod': wiecejNaprzod ? '1' : '0',
    }, [klepsydra, tekst])
}

export function drzewoHtml(s: StanOsob, id: string, op: OpcjeDrzewa, poziom: Widocznosc): string {
    const t = drzewoOsoby(s, id, op, poziom)
    return t ? Markdoc.renderers.html(t) : ''
}
