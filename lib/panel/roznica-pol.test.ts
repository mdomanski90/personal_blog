// P6a wg plansz: różnica pole po polu (nazwy z formularza) i różnica słów.
import test from 'node:test'
import assert from 'node:assert/strict'
import { roznicaSlow, zmianyPol, tekstWartosci, wycinek } from './roznica-pol'

test('różnica słów: „Wieś wspominana w 1802 r.” → „… 1820 r.”', () => {
    assert.deepEqual(roznicaSlow('Wieś wspominana w 1802 r.', 'Wieś wspominana w 1820 r.'), [{ t: '=', s: 'Wieś wspominana w ' }, { t: '-', s: '1802' }, { t: '+', s: '1820' }, { t: '=', s: ' r.' }])
})

test('zmiany pól: etykiety z formularza, listy po przecinku, treść .mdoc jako „treść”, bez zmian – pomijane', () => {
    const z = '---\ntitle: Testowo\nsources:\n  - A\ndescription: x\n---\nStary opis.\n'
    const na = '---\ntitle: Testowo\nsources:\n  - A\n  - B\ndescription: x\n---\nNowy opis.\n'
    const w = zmianyPol('content/miejsca/testowo.mdoc', z, na, { sources: 'źródła' })!
    assert.deepEqual(w.map((x) => x.etykieta), ['źródła', 'treść'])
    assert.equal(tekstWartosci({ name: 'Testowo', slug: 'testowo' }), 'Testowo')
    assert.equal(zmianyPol('content/x.json', '{zly', '{}'), null, 'nieczytelny plik – null')
    assert.deepEqual(zmianyPol('content/x.yaml', null, 'a: 1\n')!.map((x) => x.pole), ['a'], 'nowy plik – wszystkie pola')
})

test('wycinek wg planszy: kilka słów kontekstu wokół zmiany, reszta „…”', () => {
    const fr = roznicaSlow('Wieś wspominana w 1802 r. jako własność klasztoru w dokumentach z archiwum parafii', 'Wieś wspominana w 1820 r. jako własność klasztoru w dokumentach z archiwum parafii')
    const w = wycinek(fr)
    assert.equal(w.fragmenty.map((f) => (f.t === '-' ? `[-${f.s}]` : f.t === '+' ? `[+${f.s}]` : f.s)).join(''), 'Wieś wspominana w [-1802][+1820] r. jako własność')
    assert.equal(w.pocz, false)
    assert.equal(w.kon, true)
    assert.deepEqual(wycinek(roznicaSlow('a b', 'a b')).fragmenty, [], 'bez zmian – pusto')
    const dlugi = wycinek(roznicaSlow('', 'x'.repeat(200)), 4, 3, 90)
    assert.ok(dlugi.kon && dlugi.fragmenty.reduce((n, f) => n + f.s.length, 0) <= 90, 'limit długości')
})
