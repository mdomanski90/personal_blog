// P4 (VIEW-05, DRZ-01): liczba pokoleń drzewa w adresie karty osoby.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DOMYSLNE_NAPRZOD, DOMYSLNE_WSTECZ, MAKS_POKOLEN, krokPokolen, parametryDrzewa, zastosujParametryDrzewa } from './drzewo-adres'

test('bez parametrów: domyślnie 2 w górę i 2 w dół, małżonkowie', () => {
    assert.deepEqual(parametryDrzewa({}), { wstecz: DOMYSLNE_WSTECZ, naprzod: DOMYSLNE_NAPRZOD, zakres: 'malzonkowie' })
})
test('stare linki ?wstecz=1 i ?wstecz=3 działają, 0 jest dozwolone', () => {
    assert.equal(parametryDrzewa({ wstecz: '1' }).wstecz, 1)
    assert.equal(parametryDrzewa({ wstecz: '3' }).wstecz, 3)
    assert.equal(parametryDrzewa({ naprzod: '0' }).naprzod, 0)
})
test('zła wartość = domyślna, za duża = MAKS_POKOLEN, ujemna = 0', () => {
    assert.equal(parametryDrzewa({ wstecz: 'abc' }).wstecz, DOMYSLNE_WSTECZ)
    assert.equal(parametryDrzewa({ wstecz: '2.5' }).wstecz, DOMYSLNE_WSTECZ)
    assert.equal(parametryDrzewa({ wstecz: '' }).wstecz, DOMYSLNE_WSTECZ)
    assert.equal(parametryDrzewa({ naprzod: '99' }).naprzod, MAKS_POKOLEN)
    assert.equal(parametryDrzewa({ wstecz: '-4' }).wstecz, 0)
})
test('rodzeństwo=1 włącza zakres rodzeństwa, inna wartość nie', () => {
    assert.equal(parametryDrzewa({ rodzenstwo: '1' }).zakres, 'rodzenstwo')
    assert.equal(parametryDrzewa({ rodzenstwo: 'tak' }).zakres, 'malzonkowie')
})
test('adres: wartości domyślne znikają, inne parametry zostają', () => {
    const sp = new URLSearchParams('x=1&wstecz=5&naprzod=4&rodzenstwo=1')
    assert.equal(zastosujParametryDrzewa(sp, { wstecz: 2, naprzod: 2, zakres: 'malzonkowie' }).toString(), 'x=1')
    assert.equal(zastosujParametryDrzewa(new URLSearchParams(), { wstecz: 3, naprzod: 0, zakres: 'rodzenstwo' }).toString(), 'wstecz=3&naprzod=0&rodzenstwo=1')
    assert.equal(sp.get('wstecz'), '5', 'oryginał bez zmian')
})
test('krok pokoleń: ±1 w granicach 0…MAKS_POKOLEN', () => {
    assert.equal(krokPokolen(2, 1), 3)
    assert.equal(krokPokolen(0, -1), 0)
    assert.equal(krokPokolen(MAKS_POKOLEN, 1), MAKS_POKOLEN)
})
