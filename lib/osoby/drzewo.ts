// Drzewo osoby jako HTML (Markdoc Tag) – na karcie osoby i we wpisach (znacznik {% drzewo %}).
// Na komputerze „klepsydra”: przodkowie nad osobą, potomkowie pod nią; na telefonie drzewo tekstowe.
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
}

export function drzewoOsoby(s: StanOsob, id: string, op: OpcjeDrzewa, poziom: Widocznosc): T | null {
    const o = s.drzewo.osoby.get(id)
    if (!o || !widoczne(s.widocznosc(id), poziom)) return null
    const wstecz = Math.max(0, Math.min(4, Math.round(op.wstecz)))
    const naprzod = Math.max(0, Math.min(3, Math.round(op.naprzod)))

    const widac = (x: string) => widoczne(s.widocznosc(x), poziom)
    const karta = (x: string | undefined, glowna = false, rola?: string): T => {
        if (!x) return new Tag('span', { class: 'dr-karta dr-brak' }, [rola ? `${rola} – nieznany` : '?'])
        const p = s.drzewo.osoby.get(x)
        if (!p) return new Tag('span', { class: 'dr-karta dr-brak' }, ['?'])
        if (!widac(x)) return new Tag('span', { class: 'dr-karta dr-ukryta', title: 'dane osoby żyjącej – dla zalogowanych' }, [new Tag('span', { class: 'dr-imie' }, ['osoba żyjąca']), new Tag('span', { class: 'dr-lata' }, ['dla zalogowanych'])])
        const tresc = [new Tag('span', { class: 'dr-imie' }, [nazwaOsoby(p)]), new Tag('span', { class: 'dr-lata' }, [lataZycia(p)])]
        return glowna
            ? new Tag('span', { class: `dr-karta dr-${p.plec} dr-glowna` }, tresc)
            : new Tag('a', { class: `dr-karta dr-${p.plec}`, href: `/osoby/${p.id}` }, tresc)
    }
    const rodzice = (x: string) => s.relacje.get(x)?.rodzice[0]
    const malzenstwa = (x: string) => s.relacje.get(x)?.malzenstwa ?? []

    // przodkowie: kolumna – rodzice nad osobą (na górze ojciec i matka, niżej osoba)
    const przod = (x: string | undefined, g: number, glowna: boolean, rola?: string): T => {
        const f = x ? rodzice(x) : undefined
        const dzieci: T[] = []
        if (g > 0 && x && f && (f.maz || f.zona)) dzieci.push(new Tag('div', { class: 'dr-pokolenie' }, [przod(f.maz, g - 1, false, 'ojciec'), przod(f.zona, g - 1, false, 'matka')]))
        return new Tag('div', { class: 'dr-galaz dr-gora' }, [...dzieci, karta(x, glowna, rola)])
    }
    // potomkowie: pod osobą rodziny (małżonek) z dziećmi
    const pot = (x: string, g: number): T[] => {
        if (g <= 0) return []
        return malzenstwa(x).filter((f) => f.dzieci.length || op.zakres !== 'linia').map((f) => {
            const sp = f.maz === x ? f.zona : f.maz
            const glowa: T[] = op.zakres !== 'linia' && sp ? [new Tag('div', { class: 'dr-malzonek' }, [new Tag('span', { class: 'dr-podpis', title: 'małżeństwo' }, ['⚭']), karta(sp)])] : []
            const dzieci = f.dzieci.filter((c) => s.drzewo.osoby.has(c)).map((c) => new Tag('div', { class: 'dr-galaz dr-dol' }, [karta(c), ...wrapPot(c, g - 1)]))
            return new Tag('div', { class: 'dr-rodzina' }, [...glowa, ...(dzieci.length ? [new Tag('div', { class: 'dr-pokolenie' }, dzieci)] : [])])
        })
    }
    const wrapPot = (x: string, g: number): T[] => {
        const r = pot(x, g)
        return r.length ? [new Tag('div', { class: 'dr-potomni' }, r)] : []
    }

    const srodek: T[] = []
    if (op.zakres === 'rodzenstwo') {
        const f = rodzice(id)
        const rodz = (f?.dzieci ?? []).filter((c) => c !== id && s.drzewo.osoby.has(c))
        if (rodz.length) srodek.push(new Tag('div', { class: 'dr-rodzenstwo' }, [new Tag('span', { class: 'dr-podpis' }, ['rodzeństwo']), ...rodz.map((c) => karta(c))]))
    }
    // linie pokrewieństwa (pod kątem prostym) i przerywane granice pokoleń dorysowuje w przeglądarce DrzewaLinie
    const klepsydra = new Tag('div', { class: 'dr-przewijanie', 'aria-hidden': 'true' }, [
        new Tag('div', { class: 'dr-klepsydra' }, [
            przod(id, wstecz, true),
            ...srodek,
            ...wrapPot(id, naprzod),
        ]),
    ])

    // wersja tekstowa (telefon, czytniki ekranu)
    const pozycja = (x: string | undefined, rola: string): T => {
        const p = x ? s.drzewo.osoby.get(x) : undefined
        if (!p) return new Tag('span', {}, [`${rola}: nieznany`])
        if (!widac(p.id)) return new Tag('span', {}, [`${rola}: `, new Tag('span', { class: 'dr-t-ukryta' }, ['osoba żyjąca (dla zalogowanych)'])])
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
    return new Tag('figure', { class: 'drzewo', 'data-osoba': id }, [klepsydra, tekst])
}

export function drzewoHtml(s: StanOsob, id: string, op: OpcjeDrzewa, poziom: Widocznosc): string {
    const t = drzewoOsoby(s, id, op, poziom)
    return t ? Markdoc.renderers.html(t) : ''
}
