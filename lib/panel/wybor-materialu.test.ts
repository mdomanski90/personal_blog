// P6b (PD-20): okno wyboru materiału – 5 ostatnio zmienionych, szukanie (dane syntetyczne).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ostatnieMaterialy, szukajMaterialow, type MaterialDoWyboru } from './wybor-materialu'

const m = (id: string, nazwa: string, zmieniono: string | null, extra: Partial<MaterialDoWyboru> = {}): MaterialDoWyboru => ({ id, nazwa, rodzaj: 'zdjecie', czas: '1930', widocznosc: 'publiczne', podglad: null, zmieniono, ...extra })
const L = [
    m('a', 'Szkoła w Testowie', '2026-11-10T10:00:00Z'), m('b', 'Młyn', '2026-11-18T10:00:00Z'), m('c', 'Akt chrztu', null, { rodzaj: 'akt', czas: '1850' }),
    m('d', 'Cerkiew', '2026-11-17T10:00:00Z'), m('e', 'Krzyż', '2026-11-16T10:00:00Z'), m('f', 'Łąka', '2026-11-15T10:00:00Z'), m('g', 'Wesele', '2026-11-01T10:00:00Z'),
]

test('PD-20: 5 ostatnio zmienionych, najnowszy pierwszy; bez czasu – pominięty', () => {
    assert.deepEqual(ostatnieMaterialy(L).map((x) => x.id), ['b', 'd', 'e', 'f', 'a'])
})

test('PD-20: szukanie bez polskich znaków, po roku i rodzaju; puste – nic', () => {
    assert.deepEqual(szukajMaterialow(L, 'laka').map((x) => x.id), ['f'])
    assert.deepEqual(szukajMaterialow(L, 'akt 1850').map((x) => x.id), ['c'])
    assert.deepEqual(szukajMaterialow(L, '  '), [])
})
