import { test } from 'node:test'
import assert from 'node:assert/strict'
import { zakresyLat, odczytajLata, nakladaSie, scalZakresy, zakresyTekst } from './ksiegi'

test('zakresy lat', () => {
    assert.deepEqual(zakresyLat('1826–1875, 1880; 1890-1885'), [[1826, 1875], [1880, 1880], [1885, 1890]])
    assert.deepEqual(zakresyLat('brak, 1900'), [[1900, 1900]])
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

// KI-12 (P2): zapis lat nie może po cichu tracić danych – to, czego nie da się odczytać, jest zgłaszane
test('KI-12: skrócony rok końcowy, „ok.” i ukośnik są odczytywane', () => {
    assert.deepEqual(zakresyLat('1828–30'), [[1828, 1830]])
    assert.deepEqual(zakresyLat('1895-05'), [[1895, 1905]], 'przekroczenie wieku')
    assert.deepEqual(zakresyLat('ok. 1850'), [[1850, 1850]])
    assert.deepEqual(zakresyLat('ca 1850, przed 1860'), [[1850, 1850], [1860, 1860]])
    assert.deepEqual(zakresyLat('1850/1855'), [[1850, 1855]])
    assert.deepEqual(zakresyLat('1850 – 1855; 1860'), [[1850, 1855], [1860, 1860]])
})
test('KI-12: odczytajLata zwraca zakresy i listę fragmentów, których nie odczytano', () => {
    assert.deepEqual(odczytajLata('1826–1875, brak, 18xx, 1880'), { zakresy: [[1826, 1875], [1880, 1880]], nieodczytane: ['brak', '18xx'] })
    assert.deepEqual(odczytajLata(''), { zakresy: [], nieodczytane: [] })
    assert.deepEqual(odczytajLata(null), { zakresy: [], nieodczytane: [] })
    assert.deepEqual(odczytajLata(' , ; '), { zakresy: [], nieodczytane: [] }, 'puste kawałki nie są błędem')
})

test('CAT-07: odczytany początek z doczepionym tekstem – zakres zostaje, a cały kawałek jest zgłoszony jako nieodczytany', () => {
    assert.deepEqual(odczytajLata('1830 lub 1831, 1850'), { zakresy: [[1830, 1830], [1850, 1850]], nieodczytane: ['1830 lub 1831'] })
    assert.deepEqual(odczytajLata('1850 (uszkodzony)'), { zakresy: [[1850, 1850]], nieodczytane: ['1850 (uszkodzony)'] })
    assert.deepEqual(odczytajLata('1826–1875, ok. 1880, 1885-90').nieodczytane, [])
})
