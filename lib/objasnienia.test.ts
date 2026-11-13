import { test } from 'node:test'
import assert from 'node:assert/strict'
import { naW3C, poprawObjasnienie, stronaW3C, wKolejnosci, zW3C, type Objasnienie } from './objasnienia'

const o: Objasnienie = {
    id: 'o-abc123', strona: 's-k1-aa.jpg', x: 10.5, y: 20, w: 30, h: 5.25, rodzaj: 'odczyt', tekst: 'Działo się we wsi Olszanka…', jezyk: 'ru',
    powiazania: ['olszanka', 'jan-testowy-1880'], opracowal: 'redakcja', weryfikacja: 'Zgodne z indeksem Geneteki.', widocznosc: 'bliscy', utworzono: '2026-11-13',
}

test('objaśnienie → W3C → objaśnienie', () => {
    const a = naW3C(o, { zWidocznoscia: true })
    assert.equal(a.motivation, 'transcribing')
    assert.equal(a.target.selector.value, 'xywh=percent:10.5,20,30,5.25')
    assert.deepEqual(a.body.filter((b) => b.purpose === 'linking').map((b) => b.source), ['olszanka', 'jan-testowy-1880'])
    assert.deepEqual(zW3C(JSON.parse(JSON.stringify(a))), o)
})

test('eksport publiczny: pełne adresy, bez widoczności', () => {
    const s = stronaW3C([o], { id: 'https://x/a.json', zrodlo: (p) => `https://x/pliki/${p}`, powiazanie: (p) => (p === 'olszanka' ? 'https://x/miejsca/olszanka' : null), idAdnotacji: (i) => `https://x/a.json#${i}` })
    const a = s.items[0]
    assert.equal(s.type, 'AnnotationPage')
    assert.equal(a.target.source, 'https://x/pliki/s-k1-aa.jpg')
    assert.equal(a.id, 'https://x/a.json#o-abc123')
    assert.equal('odniepamieci:widocznosc' in a, false)
    assert.deepEqual(a.body.filter((b) => b.purpose === 'linking').map((b) => b.source), ['https://x/miejsca/olszanka'])
    // z eksportu da się odczytać (nazwa pliku z adresu)
    assert.equal(zW3C(a)?.strona, 's-k1-aa.jpg')
})

test('poprawianie: zły identyfikator, prostokąt poza stroną, nieznany rodzaj', () => {
    assert.equal(poprawObjasnienie({ ...o, id: 'zle' }), null)
    assert.equal(poprawObjasnienie({ ...o, strona: '../x.jpg' }), null)
    const p = poprawObjasnienie({ ...o, x: 90, w: 30, rodzaj: 'cokolwiek' as never, jezyk: 'łacina', widocznosc: 'x' as never })!
    assert.equal(p.w, 10)
    assert.equal(p.rodzaj, 'objasnienie')
    assert.equal(p.jezyk, undefined)
    assert.equal(p.widocznosc, 'publiczne')
})

test('kolejność czytania: strony, wiersze, od lewej', () => {
    const z = (id: string, strona: string, x: number, y: number) => ({ id, strona, x, y, h: 4 })
    const l = wKolejnosci([z('c', 's-2.jpg', 0, 0), z('b', 's-1.jpg', 50, 31), z('a', 's-1.jpg', 10, 30), z('d', 's-1.jpg', 0, 60)], ['s-1.jpg', 's-2.jpg'])
    assert.deepEqual(l.map((x) => x.id), ['a', 'b', 'd', 'c'])
})
