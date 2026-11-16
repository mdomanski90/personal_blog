import { test } from 'node:test'
import assert from 'node:assert/strict'
import { naW3C, poprawObjasnienie, zW3C, wKsztalcie, type Objasnienie } from './objasnienia'

// dane wyłącznie syntetyczne
const baza = { id: 'o-abcd1234', strona: 's-1.jpg', rodzaj: 'odczyt' as const, tekst: 'rzeka', powiazania: [], opracowal: 'X', widocznosc: 'publiczne' as const }

test('PH-01: wielokąt w % strony – obrys liczony z punktów, zapis i odczyt z pliku bez zmian', () => {
    const o = poprawObjasnienie({ ...baza, x: 0, y: 0, w: 1, h: 1, ksztalt: { k: 'w', p: [[10, 20], [40, 22], [35, 50]] } })!
    assert.deepEqual([o.x, o.y, o.w, o.h], [10, 20, 30, 30])
    const z = zW3C(naW3C(o, { zWidocznoscia: true }))!
    assert.deepEqual(z.ksztalt, o.ksztalt)
    assert.deepEqual([z.x, z.y, z.w, z.h], [10, 20, 30, 30])
})

test('PH-01: punkt – mały obrys wokół punktu; zły kształt odrzucony (zostaje prostokąt)', () => {
    const p = poprawObjasnienie({ ...baza, x: 0, y: 0, w: 1, h: 1, ksztalt: { k: 'p', x: 50, y: 60 } })!
    assert.deepEqual(p.ksztalt, { k: 'p', x: 50, y: 60 })
    assert.ok(p.x < 50 && p.x + p.w > 50 && p.y < 60 && p.y + p.h > 60)
    const zly = poprawObjasnienie({ ...baza, x: 5, y: 5, w: 10, h: 10, ksztalt: { k: 'w', p: [[1, 1], [2, 2]] } as never })!
    assert.equal(zly.ksztalt, undefined)
    assert.deepEqual([zly.x, zly.y, zly.w, zly.h], [5, 5, 10, 10])
    const poza = poprawObjasnienie({ ...baza, x: 5, y: 5, w: 10, h: 10, ksztalt: { k: 'w', p: [[1, 1], [200, 2], [3, 50]] } })!
    assert.equal(poza.ksztalt, undefined)
})

test('PH-01: eksport W3C – prostokąt jak dotąd, wielokąt i punkt jako SvgSelector w pikselach oryginału', () => {
    const r = naW3C(poprawObjasnienie({ ...baza, x: 10, y: 10, w: 20, h: 20 })!, { wymiary: () => [2000, 1000] })
    assert.equal((r.target.selector as { type: string }).type, 'FragmentSelector')
    const w = naW3C(poprawObjasnienie({ ...baza, x: 0, y: 0, w: 1, h: 1, ksztalt: { k: 'w', p: [[10, 20], [40, 20], [40, 50]] } })!, { wymiary: () => [2000, 1000] })
    const sel = w.target.selector as { type: string; value: string }[]
    assert.equal(sel[0].type, 'FragmentSelector')
    assert.equal(sel[1].type, 'SvgSelector')
    assert.match(sel[1].value, /points="200,200 800,200 800,500"/)
    const bezWymiarow = naW3C(poprawObjasnienie({ ...baza, x: 0, y: 0, w: 1, h: 1, ksztalt: { k: 'p', x: 50, y: 50 } })!)
    assert.equal((bezWymiarow.target.selector as { type: string }).type, 'FragmentSelector')
    assert.equal(JSON.stringify(bezWymiarow).includes('odniepamieci:ksztalt'), false)
})

test('PH-01: trafienie w kształt – wielokąt (punkt w środku / w obrysie poza wielokątem), punkt w promieniu', () => {
    const o = poprawObjasnienie({ ...baza, x: 0, y: 0, w: 1, h: 1, ksztalt: { k: 'w', p: [[0, 0], [40, 0], [0, 40]] } }) as Objasnienie
    assert.equal(wKsztalcie(o, 5, 5), true)
    assert.equal(wKsztalcie(o, 35, 35), false) // w prostokącie obrysu, ale poza trójkątem
    const p = poprawObjasnienie({ ...baza, x: 0, y: 0, w: 1, h: 1, ksztalt: { k: 'p', x: 50, y: 50 } }) as Objasnienie
    assert.equal(wKsztalcie(p, 50.5, 50.4, 1), true)
    assert.equal(wKsztalcie(p, 55, 50, 1), false)
})
