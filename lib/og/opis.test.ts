import { test } from 'node:test'
import assert from 'node:assert/strict'
import { opisOg } from './opis'

test('opis podglądu: krótki bez zmian, długi do końca zdania albo słowa z „…”, pusty – brak', () => {
    assert.equal(opisOg('  Krótki   opis. '), 'Krótki opis.')
    assert.equal(opisOg(''), undefined)
    const zdania = 'Karta pocztowa korespondencji jenieckiej z 1917 roku. Nadawca – jeniec wojenny w szpitalu w Eger. ' + 'Dalszy tekst opisu karty. '.repeat(10)
    assert.equal(opisOg(zdania, 120), 'Karta pocztowa korespondencji jenieckiej z 1917 roku. Nadawca – jeniec wojenny w szpitalu w Eger.')
    const bez = 'słowo '.repeat(60)
    const w = opisOg(bez, 100)!
    assert.ok(w.endsWith('…') && w.length <= 101 && !w.includes('  '))
})
