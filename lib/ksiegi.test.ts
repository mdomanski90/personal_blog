import { test } from 'node:test'
import assert from 'node:assert/strict'
import { zakresyLat, nakladaSie } from './ksiegi'

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
