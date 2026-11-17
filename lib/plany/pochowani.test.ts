import { test } from 'node:test'
import assert from 'node:assert/strict'
import { liniaNazwyNapisu, napisObok } from './pochowani'

test('KRT-03 (P3): nazwisko z napisu obok zapisu z drzewa tylko gdy różne', () => {
    assert.equal(napisObok('Ś.P.\nJAN PRZYKŁADOWY\n1850–1920', 'Przykładowy'), null, 'to samo nazwisko – bez dopisku')
    assert.equal(napisObok('Ś.P.\nJAN PRZYKŁADOWSKI\n1850–1920', 'Przykładowy'), 'JAN PRZYKŁADOWSKI')
    assert.equal(napisObok('', 'Przykładowy'), null)
    assert.equal(liniaNazwyNapisu('Tu spoczywa\nANNA TESTOWA'), 'ANNA TESTOWA')
})
