import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nazwaOsoby, nazwaOsobyKatalog } from './model'

// uwaga właściciela 16.11: w katalogu osób (alfabet po nazwisku) najpierw nazwisko, potem imiona; gdzie indziej „Imię Nazwisko”
test('nazwa w katalogu osób: nazwisko przed imionami; braki bez podwójnych spacji', () => {
    assert.equal(nazwaOsobyKatalog({ imiona: 'Jan Piotr', nazwisko: 'Przykładowski' }), 'Przykładowski Jan Piotr')
    assert.equal(nazwaOsobyKatalog({ imiona: '', nazwisko: 'Przykładowska' }), 'Przykładowska')
    assert.equal(nazwaOsobyKatalog({ imiona: 'Anna', nazwisko: '' }), 'Anna')
    assert.equal(nazwaOsobyKatalog({ imiona: '', nazwisko: '' }), 'bez imienia')
    assert.equal(nazwaOsoby({ imiona: 'Jan', nazwisko: 'Przykładowski' }), 'Jan Przykładowski')
})
