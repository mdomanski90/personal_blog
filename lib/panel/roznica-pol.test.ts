// P6a wg plansz: różnica pole po polu (nazwy z formularza) i różnica słów.
import test from 'node:test'
import assert from 'node:assert/strict'
import { roznicaSlow, zmianyPol, tekstWartosci } from './roznica-pol'

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
