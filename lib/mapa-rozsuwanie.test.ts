import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rozsun, ileObiektow } from './mapa-rozsuwanie'

test('rozsuwanie: para w jednym punkcie obok siebie, daleko – bez zmian', () => {
    const w = rozsun([{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 101, y: 100 }, { id: 'c', x: 400, y: 400 }])
    assert.equal(w.size, 2)
    const a = w.get('a')!, b = w.get('b')!
    assert.ok(Math.abs((100 + a.dx) - (101 + b.dx)) >= 31, 'odstęp między parą')
    assert.equal(a.strona, 'l'); assert.equal(b.strona, 'p')
    assert.ok(!w.has('c'))
})

test('rozsuwanie: obiekt w punkcie wsi – wieś stoi, obiekt nad nią', () => {
    const w = rozsun([{ id: 'wies', x: 50, y: 50, staly: true }, { id: 'o', x: 52, y: 51 }])
    assert.ok(!w.has('wies'))
    const o = w.get('o')!
    assert.ok(51 + o.dy < 50 - 25, 'obiekt nad tarczą')
})

test('rozsuwanie: trzy obiekty – wszystkie co najmniej odstęp od siebie; dwie wsie się nie łączą', () => {
    const z = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 3, y: 2 }, { id: 'c', x: 1, y: 4 }]
    const w = rozsun(z)
    const p = z.map((q) => [q.x + w.get(q.id)!.dx, q.y + w.get(q.id)!.dy])
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.ok(Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]) >= 31)
    assert.equal(rozsun([{ id: 'w1', x: 0, y: 0, staly: true }, { id: 'w2', x: 5, y: 0, staly: true }]).size, 0)
})

test('liczba obiektów po polsku', () => {
    assert.deepEqual([1, 2, 4, 5, 12, 22, 25].map(ileObiektow), ['1 obiekt', '2 obiekty', '4 obiekty', '5 obiektów', '12 obiektów', '22 obiekty', '25 obiektów'])
})

test('rozsuwanie: grupa obok wsi po rozsunięciu nie wchodzi na obiekt przy wsi', () => {
    const z = [{ id: 'w', x: 0, y: 0, staly: true }, { id: 'p', x: 0, y: 0 }, { id: 'a', x: 0, y: -27 }, { id: 'b', x: 1, y: -27 }, { id: 'c', x: 2, y: -26 }]
    const w = rozsun(z)
    const poz = z.map((q) => { const r = w.get(q.id); return r ? [q.x + r.dx, q.y + r.dy] : [q.x, q.y] })
    for (let i = 0; i < z.length; i++) for (let j = i + 1; j < z.length; j++) assert.ok(Math.hypot(poz[i][0] - poz[j][0], poz[i][1] - poz[j][1]) >= 26, `${z[i].id}–${z[j].id}`)
})
