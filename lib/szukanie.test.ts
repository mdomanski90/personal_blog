import { test } from 'node:test'
import assert from 'node:assert/strict'
import { krotszeZapytanie, pasuje, przygotujZapytanie, rdzenie } from './szukanie'

const p = (q: string, t: string) => pasuje(przygotujZapytanie(q)!, t)

test('odmiana: bieżeństwo, Olszanka, Filipiuk, Próchenki, Łosice', () => {
    assert.ok(p('bieżeństwo', 'wróciła z bieżeństwa w 1921'))
    assert.ok(p('bieżeństwo', 'o Bieżeństwie pamiętają najstarsi'))
    assert.ok(p('Olszanka', 'urodzony w Olszance'))
    assert.ok(p('w Olszance', 'wieś Olszanka'))
    assert.ok(p('Filipiuk', 'akt Edwarda Filipiuka'))
    assert.ok(p('Prochenki', 'cmentarz w Próchenkach'))
    assert.ok(p('Łosice', 'parafia w Łosicach'))
    assert.ok(p('cerkiew unicka', 'dawna cerkiew unicka w Olszance'))
})

test('bez fałszywych trafień w środku wyrazu i przy krótkich słowach', () => {
    assert.ok(!p('lis', 'Pawlisz'))
    assert.ok(!p('Olszanka', 'Wólka'))
    assert.ok(!p('cerkiew unicka', 'cerkiew prawosławna'))
    assert.deepEqual(rdzenie('Łuby'), ['luby'])
})

test('podpowiedź krótszego zapytania', () => {
    assert.equal(krotszeZapytanie('cmentarz unicki'), 'cmentarz')
    assert.equal(krotszeZapytanie('bieżeństwo'), 'bieżeństw')
})
