import { test } from 'node:test'
import assert from 'node:assert/strict'
import { popraw, dlaCzytelnika } from './model'
import { USTAWIENIA_DOMYSLNE } from './typy'
import { indeksWystapien } from './wystapienia-indeks'
import type { Cel } from '../odnosniki'

// dane wyłącznie syntetyczne
const cele = new Map<string, Cel>([['obj-ratusz', { rodzaj: 'obiekt', id: 'obj-ratusz', nazwa: 'Ratusz', adres: '/obiekty/obj-ratusz' }]])
const rozwiaz = (id: string) => cele.get(id) ?? null

test('T09: karta obiektu widzi element planu i objaśnienie skanu, które ją wskazują; elementy i objaśnienia ukryte nie zostawiają śladu', () => {
    const pelny = popraw({ slug: 'h', tytul: 'Miasteczko 1939', widocznosc: 'publiczne', elementy: [
        { id: 'e1', typ: 'ratusz', g: { k: 'p', x: 1, y: 1 }, nazwa: 'ratusz', powiazania: ['obj-ratusz'] },
        { id: 'e2', typ: 'ratusz', g: { k: 'p', x: 2, y: 2 }, nazwa: 'ukryty', powiazania: ['obj-ratusz'], widocznosc: 'ja' },
        { id: 'e3', typ: 'ratusz', g: { k: 'p', x: 3, y: 3 }, powiazania: ['obj-ukryty'] },
    ] })
    const wydany = dlaCzytelnika(pelny, 'publiczne', USTAWIENIA_DOMYSLNE)
    const ix = indeksWystapien(
        [{ pelny, wydany, adres: (el) => `/plany/h?grob=${el}`, nazwaTypu: () => 'ratusz' }],
        [{ id: 'skan-a', nazwa: 'Szkic', objasnienia: [{ id: 'o-abcd1234', tekst: 'MAGISTRAT', powiazania: ['obj-ratusz'] }] }],
        rozwiaz,
    )
    const w = ix.get('obiekt:obj-ratusz')!
    assert.deepEqual(w.plany, [{ nazwa: 'Miasteczko 1939 – ratusz', adres: '/plany/h?grob=e1' }])
    assert.deepEqual(w.skany, [{ nazwa: 'Szkic – „MAGISTRAT”', adres: '/archiwum/skan-a#o-abcd1234' }])
    assert.equal(ix.has('obiekt:obj-ukryty'), false)
    assert.equal(JSON.stringify([...ix.values()]).includes('ukryty'), false)
})
