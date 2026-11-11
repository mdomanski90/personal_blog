import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EDTF_REGEX, czyPoprawnaEdtf, formatujEdtf, kluczSortowania, parsujEdtf, rokPoczatku, zakresIso } from './edtf'
import { identyfikatorZNazwy, normalizuj } from './tekst'

test('poprawne zapisy EDTF', () => {
    for (const z of ['', '1750-05-27', '1908-02', '1875', '195X', '18XX', '1750~', '1750?', '1750%', '1915/1918', '../1920', '1945/..', '1908-02/1908-03']) {
        assert.ok(czyPoprawnaEdtf(z), z)
        assert.ok(EDTF_REGEX.test(z), `regex: ${z}`)
    }
})

test('błędne zapisy EDTF', () => {
    for (const z of ['ok. 1750', '1750-13', '1750-02-30', '19X5', '../..', '1918/1915', '75', 'lata 50.']) {
        assert.equal(czyPoprawnaEdtf(z), false, z)
    }
})

test('polski zapis dat', () => {
    assert.equal(formatujEdtf('1750-05-27'), '27 maja 1750')
    assert.equal(formatujEdtf('1908-02'), 'luty 1908')
    assert.equal(formatujEdtf('1875'), '1875')
    assert.equal(formatujEdtf('195X'), 'lata 50. XX w.')
    assert.equal(formatujEdtf('190X'), '1900–1909')
    assert.equal(formatujEdtf('18XX'), 'XIX w.')
    assert.equal(formatujEdtf('1750~'), 'ok. 1750')
    assert.equal(formatujEdtf('1750?'), '1750 (?)')
    assert.equal(formatujEdtf('1915/1918'), '1915–1918')
    assert.equal(formatujEdtf('../1920'), 'do 1920')
    assert.equal(formatujEdtf('1945/..'), 'od 1945')
})

test('sortowanie i zakresy', () => {
    assert.ok(kluczSortowania('1750-05-27') < kluczSortowania('1875'))
    assert.ok(kluczSortowania('18XX') < kluczSortowania('1801'))
    assert.equal(kluczSortowania(''), Number.POSITIVE_INFINITY)
    assert.deepEqual(zakresIso('195X'), { od: '1950-01-01', do: '1959-12-31' })
    assert.deepEqual(zakresIso('1908-02'), { od: '1908-02-01', do: '1908-02-29' })
    assert.deepEqual(zakresIso('1945/..'), { od: '1945-01-01', do: null })
    assert.equal(rokPoczatku('../1920'), 1920)
    assert.equal(parsujEdtf('1915/1918')?.przedzial, true)
})

test('identyfikatory i wyszukiwanie', () => {
    assert.equal(identyfikatorZNazwy('Łepki Stare'), 'lepki-stare')
    assert.equal(identyfikatorZNazwy('Międzyrzec Podlaski'), 'miedzyrzec-podlaski')
    assert.equal(identyfikatorZNazwy('Kasata unii 1875'), 'kasata-unii-1875')
    assert.equal(normalizuj('W Olszance, 1915!'), 'w olszance 1915')
    assert.equal(normalizuj('Ольшанка'), 'ольшанка')
})
