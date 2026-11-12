import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dlaCzytelnika, grobOgraniczony, numeracja, popraw, rokZgonu, type Element, type Plan } from './model'
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
    assert.equal(pub.elementy[1].opis, 'stare 1880')
    assert.equal(pub.elementy[1].notatka, undefined)
    const bliscy = dlaCzytelnika(plan, 'bliscy', USTAWIENIA_DOMYSLNE)
    assert.equal(bliscy.elementy[0].opis, 'tajne')
})

test('elementy ukryte, typy ukryte i podkłady „tylko do edycji” nie trafiają do czytelnika', () => {
    const plan = popraw({ slug: 'p', elementy: [grob('a', 0, 0, { widocznosc: 'ja' }), { id: 'k', typ: 'krzyz', g: { k: 'p', x: 1, y: 1 } }], podklady: [{ id: 'x', plik: 'a.jpg', nazwa: '', szer: 1, wys: 1, macierz: [1, 0, 0, 1, 0, 0], krycie: 1, widocznosc: 'edycja' }] } as Plan)
    const pub = dlaCzytelnika(plan, 'publiczne', { ...USTAWIENIA_DOMYSLNE, ukryteTypy: ['krzyz'] })
    assert.equal(pub.elementy.length, 0)
    assert.equal(pub.podklady.length, 0)
})

test('numeracja: rzędy i miejsca wzdłuż kąta kwatery', () => {
    const kw: Element = { id: 'kw', typ: 'kwatera', nazwa: 'A', kat: 0, g: { k: 'w', p: [[-50, -50], [200, -50], [200, 200], [-50, 200]] } }
    const plan = { elementy: [kw, grob('a', 0, 0), grob('b', 15, 0), grob('c', 0, 40)] }
    const n = numeracja(plan, katalog())
    assert.deepEqual(n.get('a'), { kwatera: 'A', rzad: 1, miejsce: 1 })
    assert.deepEqual(n.get('b'), { kwatera: 'A', rzad: 1, miejsce: 2 })
    assert.deepEqual(n.get('c'), { kwatera: 'A', rzad: 2, miejsce: 1 })
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
