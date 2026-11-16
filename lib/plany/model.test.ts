import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dlaCzytelnika, grobOgraniczony, popraw, rokZgonu, type Element, type Plan } from './model'
import { propozycja } from './numeracja'
import { katalog, USTAWIENIA_DOMYSLNE } from './typy'
import { odczytajSvg } from './svg'
import { doSvg } from './svg-tekst'
import * as React from 'react'

const grob = (id: string, x: number, y: number, reszta: Partial<Element> = {}): Element => ({ id, typ: 'grob', g: { k: 'r', x, y, w: 10, h: 20, a: 0 }, ...reszta })

test('rok zgonu: z pola, z dat osób, z napisu', () => {
    assert.equal(rokZgonu(grob('a', 0, 0, { rokZgonu: 1950 })), 1950)
    assert.equal(rokZgonu(grob('a', 0, 0, { osoby: [{ nazwa: 'Jan', zm: '1930' }] })), 1930)
    assert.equal(rokZgonu(grob('a', 0, 0, { opis: 'Ś.P. Jan Kowaluk 1864–1930, Maria 1870-2001' })), 2001)
    assert.equal(rokZgonu(grob('a', 0, 0, { opis: 'bez dat' })), null)
})

test('groby zmarłych niedawno i z osobami żyjącymi – dla czytelnika bez logowania sam kształt', () => {
    const typy = katalog()
    assert.equal(grobOgraniczony(grob('a', 0, 0, { rokZgonu: 2010 }), typy.get('grob'), 30, 2026), true)
    assert.equal(grobOgraniczony(grob('a', 0, 0, { rokZgonu: 1990 }), typy.get('grob'), 30, 2026), false)
    assert.equal(grobOgraniczony(grob('a', 0, 0, { ukryjNapis: true }), typy.get('grob'), 30, 2026), true)
    const plan = popraw({ slug: 'p', elementy: [grob('a', 0, 0, { rokZgonu: new Date().getFullYear() - 1, opis: 'tajne', osoby: [{ nazwa: 'X' }] }), grob('b', 0, 30, { opis: 'stare 1880', notatka: 'robocza', weryfikacja: 'auto' })] } as Plan)
    const pub = dlaCzytelnika(plan, 'publiczne', USTAWIENIA_DOMYSLNE)
    assert.deepEqual(Object.keys(pub.elementy[0]).sort(), ['g', 'id', 'ograniczony', 'stan', 'typ'].sort())
    assert.equal(pub.elementy[1].napis, 'stare 1880')
    assert.equal(pub.elementy[1].notatka, undefined)
    const bliscy = dlaCzytelnika(plan, 'bliscy', USTAWIENIA_DOMYSLNE)
    assert.equal(bliscy.elementy[0].napis, 'tajne')
})

test('elementy ukryte, typy ukryte i podkłady „tylko do edycji” nie trafiają do czytelnika', () => {
    const plan = popraw({ slug: 'p', elementy: [grob('a', 0, 0, { widocznosc: 'ja' }), { id: 'k', typ: 'krzyz', g: { k: 'p', x: 1, y: 1 } }], podklady: [{ id: 'x', plik: 'a.jpg', nazwa: '', szer: 1, wys: 1, macierz: [1, 0, 0, 1, 0, 0], krycie: 1, widocznosc: 'edycja' }] } as Plan)
    const pub = dlaCzytelnika(plan, 'publiczne', { ...USTAWIENIA_DOMYSLNE, ukryteTypy: ['krzyz'] })
    assert.equal(pub.elementy.length, 0)
    assert.equal(pub.podklady.length, 0)
})

test('propozycja numeracji: rzędy i miejsca wzdłuż kąta kwatery (jak dawna numeracja liczona przy wyświetlaniu)', () => {
    const kw: Element = { id: 'kw', typ: 'kwatera', nazwa: 'A', kat: 0, g: { k: 'w', p: [[-50, -50], [200, -50], [200, 200], [-50, 200]] } }
    const plan = { elementy: [kw, grob('a', 0, 0), grob('b', 15, 0), grob('c', 0, 40)] }
    const n = propozycja(plan, katalog(), 'kw')
    assert.deepEqual(n.get('a'), { kwatera: 'kw', rzad: '1', miejsce: '1' })
    assert.deepEqual(n.get('b'), { kwatera: 'kw', rzad: '1', miejsce: '2' })
    assert.deepEqual(n.get('c'), { kwatera: 'kw', rzad: '2', miejsce: '1' })
})

test('znak z pliku SVG: tylko proste kształty, bez skryptów', () => {
    const z = odczytajSvg('<svg viewBox="0 0 24 24"><script>alert(1)</script><path d="M2 2L20 20" onclick="x()"/><circle cx="12" cy="12" r="4"/><image href="javascript:x"/></svg>')!
    assert.equal(z.elementy.length, 2)
    assert.deepEqual(z.elementy[0], { t: 'path', d: 'M2 2L20 20' })
    assert.equal(odczytajSvg('<svg><foreignObject/></svg>'), null)
})

test('tekst SVG z drzewa React: atrybuty, style, znaki specjalne', () => {
    const s = doSvg(React.createElement('g', { strokeWidth: 2, style: { fill: 'var(--x)', strokeDasharray: '2 3' } }, React.createElement('text', null, 'a < b & „c”')))
    assert.equal(s, '<g stroke-width="2" style="fill:var(--x);stroke-dasharray:2 3"><text>a &lt; b &amp; „c”</text></g>')
})

test('edytor: stempel obok sąsiada, wyrównanie, rozmiar jednym bokiem', async () => {
    const { pozycjaStempla, wyrownajWLinie, rozlozRowno, rozmiarBokiem } = await import('./edycja')
    const g = (id: string, x: number, y: number) => ({ id, typ: 'grob', g: { k: 'r' as const, x, y, w: 10, h: 20, a: 0 } })
    const plan = { elementy: [g('a', 0, 0), g('b', 12, 0)] } as unknown as Parameters<typeof pozycjaStempla>[0]
    const s = pozycjaStempla(plan, [23, 1], { typ: 'grob', w: 10, h: 20, a: 0 })
    assert.equal(s.przyciagniety, true)
    assert.equal(Math.round(s.x), 24); assert.equal(Math.round(s.y), 0)
    const w = wyrownajWLinie([g('a', 0, 0), g('b', 10, 2), g('c', 20, -1)] as never)
    assert.ok(Math.abs((w.get('b')!.g as { y: number }).y) < 1.5)
    const r = rozlozRowno([g('a', 0, 0), g('b', 3, 0), g('c', 20, 0)] as never)
    assert.equal(Math.round((r.get('b')!.g as { x: number }).x), 10)
    const b = rozmiarBokiem({ k: 'r', x: 0, y: 0, w: 10, h: 20, a: 0 }, 0, [10, 3], 1, false)
    assert.equal(b.w, 15); assert.equal(b.x, 2.5); assert.equal(b.h, 20)
})

// audyt nr 2 (AUD-P-01/09): kopia grobu = sam kształt; dane (także „ukryj napis”) zostają w oryginale
test('kopia grobu nie przenosi napisu, źródeł, osób, zdjęć, dat ani weryfikacji', async () => {
    const { kopia } = await import('./edycja')
    const grob = {
        id: 'g1', typ: 'grob', g: { k: 'r' as const, x: 1, y: 2, w: 2, h: 1, r: 0 }, widocznosc: 'bliscy' as const,
        napis: 'Ś.P. Jan Testowy', zrodla: 'księga testowa', czas: '1901', stan: 'istnieje' as const, rokZgonu: 1901, ukryjNapis: true,
        osoby: [{ nazwa: 'Jan Testowy' }], zdjecia: [{ plik: 'zdjecie-x.jpg' }], weryfikacja: 'ok' as const, notatka: 'robocza', nazwa: 'grób Testowych', opis: 'opis',
    } as unknown as Parameters<typeof kopia>[0]
    const k = kopia(grob, 3, 0)
    assert.notEqual(k.id, 'g1')
    assert.equal(k.typ, 'grob')
    assert.equal(k.widocznosc, 'bliscy')
    for (const p of ['napis', 'zrodla', 'czas', 'stan', 'rokZgonu', 'ukryjNapis', 'osoby', 'zdjecia', 'weryfikacja', 'notatka', 'nazwa', 'opis']) assert.ok(!(p in k), p)
    const kw = kopia({ id: 'k', typ: 'kwatera', g: grob.g, nazwa: 'A' } as Parameters<typeof kopia>[0], 0, 0)
    assert.equal(kw.nazwa, 'A')
})
