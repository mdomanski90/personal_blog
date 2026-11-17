// SRCH-D-21 (P3): podpowiedzi wyszukiwarki w nagłówku – do 8 (na wąskim ekranie do 5), najpierw różnorodność, potem dopełnienie.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { wybierzPodpowiedzi, LIMIT_PODPOWIEDZI } from './podpowiedzi'

const w = (rodzaj: string, n: number) => Array.from({ length: n }, (_, i) => ({ rodzaj, id: `${rodzaj}${i}` }))
const KOL = ['miejsce', 'osoba', 'wpis', 'materiał', 'publikacja', 'zbiór', 'księga', 'parafia', 'hasło', 'obiekt', 'temat', 'objaśnienie']

test('SRCH-D-21: 17 osób → 8 podpowiedzi (dawniej 2)', () => {
    assert.equal(wybierzPodpowiedzi(w('osoba', 17), KOL, 8).length, 8)
})
test('SRCH-D-21: 3 osoby + 1 miejsce → 4, miejsce pierwsze (stała kolejność rodzajów)', () => {
    const r = wybierzPodpowiedzi([...w('osoba', 3), ...w('miejsce', 1)], KOL, 8)
    assert.deepEqual(r.map((x) => x.id), ['miejsce0', 'osoba0', 'osoba1', 'osoba2'])
})
test('SRCH-D-21: po jednym z 12 rodzajów → 8, pierwsze 8 rodzajów kolejności', () => {
    const r = wybierzPodpowiedzi(KOL.flatMap((k) => w(k, 1)), KOL, 8)
    assert.deepEqual(r.map((x) => x.rodzaj), KOL.slice(0, 8))
})
test('SRCH-D-21: różnorodność przed dopełnieniem – 5 osób i 5 wpisów przy limicie 5', () => {
    const r = wybierzPodpowiedzi([...w('osoba', 5), ...w('wpis', 5)], KOL, 5)
    assert.deepEqual(r.map((x) => x.id), ['osoba0', 'osoba1', 'wpis0', 'wpis1', 'osoba2'])
})
test('SRCH-D-21: limit z klienta ograniczony do 1–8', () => {
    assert.equal(LIMIT_PODPOWIEDZI('5'), 5)
    assert.equal(LIMIT_PODPOWIEDZI('99'), 8)
    assert.equal(LIMIT_PODPOWIEDZI(null), 8)
    assert.equal(LIMIT_PODPOWIEDZI('x'), 8)
})
