// Decyzja 22.11: okno wyboru osób w Keystatic – szukanie po imieniu i nazwisku, latach, miejscowości, identyfikatorze i nr kat.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { szukajOsob, opisOsoby, type OsobaDoWyboru } from './wybor-osob'

const L: OsobaDoWyboru[] = [
    { id: 'maria-makaruk-1886', nazwa: 'Maria Makaruk', lata: '1886', miejsce: 'Próchenki', plec: 'K', widocznosc: 'publiczne', nr: 'OS-0570' },
    { id: 'jan-makaruk-1885', nazwa: 'Jan Makaruk', lata: '1885', miejsce: 'Próchenki', plec: 'M', widocznosc: 'publiczne', nr: 'OS-0569' },
    { id: 'zofia-lewczuk', nazwa: 'Zofia Lewczuk', lata: '1857–1896', miejsce: 'Olszanka', plec: 'K', widocznosc: 'bliscy', nr: null },
]

test('szukanie: każde słowo musi pasować, bez polskich znaków i wielkości liter', () => {
    assert.deepEqual(szukajOsob(L, 'makaruk').map((o) => o.id), ['jan-makaruk-1885', 'maria-makaruk-1886'], 'alfabetycznie po nazwie')
    assert.deepEqual(szukajOsob(L, 'maria 1886').map((o) => o.id), ['maria-makaruk-1886'])
    assert.deepEqual(szukajOsob(L, 'prochenki jan').map((o) => o.id), ['jan-makaruk-1885'])
    assert.deepEqual(szukajOsob(L, 'lewczuk olszanka').map((o) => o.id), ['zofia-lewczuk'])
    assert.deepEqual(szukajOsob(L, ''), [])
})

test('szukanie po nr kat. w dowolnym zapisie – jedno trafienie', () => {
    assert.deepEqual(szukajOsob(L, 'OS-0570').map((o) => o.id), ['maria-makaruk-1886'])
    assert.deepEqual(szukajOsob(L, 'os-570').map((o) => o.id), ['maria-makaruk-1886'])
})

test('opis pozycji: lata · miejscowość · nr kat. · widoczność (bez powtarzania nazwy)', () => {
    assert.equal(opisOsoby(L[0]), '1886 · Próchenki · OS-0570 · publiczna')
    assert.equal(opisOsoby(L[2]), '1857–1896 · Olszanka · dla bliskich')
})
