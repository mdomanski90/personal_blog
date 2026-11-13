import { test } from 'node:test'
import assert from 'node:assert/strict'
import { zakresyLat, nakladaSie, scalZakresy, zakresyTekst } from './ksiegi'

test('zakresy lat', () => {
    assert.deepEqual(zakresyLat('1826–1875, 1880; 1890-1885'), [[1826, 1875], [1880, 1880], [1885, 1890]])
    assert.deepEqual(zakresyLat('brak, ok. 1900'), [])
    assert.deepEqual(zakresyLat(''), [])
})

test('nakładanie się z latami przynależności', () => {
    const z = zakresyLat('1826–1875')
    assert.equal(nakladaSie(z, 1870, 1918), true)
    assert.equal(nakladaSie(z, 1876, null), false)
    assert.equal(nakladaSie(z, null, null), true)
})

test('tomy rok po roku scalone w przedziały', () => {
    const z = scalZakresy([[1810, 1810], [1812, 1812], [1811, 1811], [1813, 1813], [1815, 1816], [1814, 1814], [1820, 1820]])
    assert.deepEqual(z, [[1810, 1816], [1820, 1820]])
    assert.equal(zakresyTekst(z), '1810–1816, 1820')
})
