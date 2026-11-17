// P1 · VIEW-01/03: pułapka fokusu w pełnym ekranie i klik w puste tło (czyste funkcje).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nastepnyWPulapce, punktPozaProstokatem } from './fokus'

test('pułapka fokusu: Tab i Shift+Tab krążą w obrębie okna', () => {
    assert.equal(nastepnyWPulapce(4, 0, false), 1)
    assert.equal(nastepnyWPulapce(4, 3, false), 0, 'Tab na ostatnim → pierwszy')
    assert.equal(nastepnyWPulapce(4, 0, true), 3, 'Shift+Tab na pierwszym → ostatni')
    assert.equal(nastepnyWPulapce(4, 2, true), 1)
})

test('pułapka fokusu: fokus poza oknem trafia na pierwszy (Tab) albo ostatni (Shift+Tab) element', () => {
    assert.equal(nastepnyWPulapce(4, -1, false), 0)
    assert.equal(nastepnyWPulapce(4, -1, true), 3)
})

test('pułapka fokusu: okno bez elementów – brak ruchu', () => {
    assert.equal(nastepnyWPulapce(0, -1, false), null)
})

test('klik w tło: punkt poza obrazem zamyka, w obrazie nie (VIEW-01)', () => {
    const obraz = { x: 100, y: 50, w: 600, h: 800 }
    assert.equal(punktPozaProstokatem(obraz, 10, 10), true)
    assert.equal(punktPozaProstokatem(obraz, 750, 400), true)
    assert.equal(punktPozaProstokatem(obraz, 400, 400), false)
    assert.equal(punktPozaProstokatem(obraz, 100, 50), false, 'brzeg należy do obrazu')
    assert.equal(punktPozaProstokatem(obraz, 700, 850), false)
    assert.equal(punktPozaProstokatem(obraz, 701, 850), true)
})
