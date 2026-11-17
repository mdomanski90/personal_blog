import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RODZINY, rodzinaRodzaju, rodzinaZParametru } from './rodziny-wynikow'
import type { RodzajWyniku } from './indeks-szukania'

const WSZYSTKIE: RodzajWyniku[] = ['miejsce', 'osoba', 'wpis', 'materiał', 'publikacja', 'zbiór', 'księga', 'parafia', 'hasło', 'obiekt', 'temat', 'objaśnienie']

test('SRCH-D-12: każdy rodzaj wyniku należy do dokładnie jednej z pięciu rodzin', () => {
    assert.equal(RODZINY.length, 5)
    for (const r of WSZYSTKIE) assert.equal(RODZINY.filter((x) => x.rodzaje.includes(r)).length, 1, r)
    assert.equal(RODZINY.flatMap((x) => x.rodzaje).length, WSZYSTKIE.length)
})

test('rodzina rodzaju: archiwum / miejsca / osoby / biblioteka / wpisy', () => {
    assert.equal(rodzinaRodzaju('objaśnienie'), 'archiwum')
    assert.equal(rodzinaRodzaju('zbiór'), 'archiwum')
    assert.equal(rodzinaRodzaju('obiekt'), 'miejsca')
    assert.equal(rodzinaRodzaju('hasło'), 'biblioteka')
    assert.equal(rodzinaRodzaju('parafia'), 'biblioteka')
    assert.equal(rodzinaRodzaju('temat'), 'wpisy')
})

test('parametr ?rodzaj=: rodzina, stary rodzaj pozycji (zgodność odnośników), nieznane = brak filtra', () => {
    assert.equal(rodzinaZParametru('osoby'), 'osoby')
    assert.equal(rodzinaZParametru('księga'), 'biblioteka')
    assert.equal(rodzinaZParametru('materiał'), 'archiwum')
    assert.equal(rodzinaZParametru('cokolwiek'), undefined)
    assert.equal(rodzinaZParametru(undefined), undefined)
})

test('odmiana nazw rodzin ma trzy formy', () => {
    for (const r of RODZINY) assert.equal(new Set(r.formy).size >= 2 && r.formy.length === 3, true, r.id)
})
