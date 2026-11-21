import { test } from 'node:test'
import assert from 'node:assert/strict'
import { naUzycia, WSTAWIONY } from './uzyty-w'

const z = (rodzaj: 'wpis' | 'miejsce' | 'osoba', id: string, adres: string, trafienia: string[]) =>
    ({ zrodlo: { rodzaj, id, nazwa: `N-${id}`, adres }, fragmenty: trafienia.map((t) => ({ przed: '', trafienie: t, po: '' })), ile: trafienia.length })

test('użyty w: najpierw wpisy, adres edycji w Keystatic / panelu, materiał wstawiony we wpis osobno od odnośników', () => {
    const u = naUzycia({ odnosniki: [z('miejsce', 'testowo', '/miejsca/testowo', ['[[x]]']), z('wpis', 'w1', '/wpisy/w1', [WSTAWIONY]), z('osoba', 'os-jan', '/osoby/os-jan', ['[[x]]', '[[x]]']), z('wpis', 'w2', '/wpisy/w2', ['[[x]]'])], wzmianki: [] })
    assert.deepEqual(u.map((x) => x.nazwa), ['N-w1', 'N-w2', 'N-testowo', 'N-os-jan'])
    assert.equal(u[0].edycja, '/keystatic/collection/posts/item/w1')
    assert.deepEqual([u[0].wstawiony, u[0].odnosnikow], [true, 0])
    assert.deepEqual([u[1].wstawiony, u[1].odnosnikow], [false, 1])
    assert.equal(u[2].edycja, '/keystatic/collection/miejsca/item/testowo')
    assert.equal(u[3].edycja, '/keystatic/osoby/os-jan')
    assert.equal(u[3].odnosnikow, 2)
})
test('użyty w: brak powiązań – pusta lista', () => assert.deepEqual(naUzycia({ odnosniki: [], wzmianki: [] }), []))
