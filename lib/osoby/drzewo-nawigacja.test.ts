// P4 (VIEW-06): strzałki w drzewie – rodzice, dzieci, rodzeństwo i małżonek.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nastepnaKarta, type KartaNaw } from './drzewo-nawigacja'

// dziadkowie (rząd 0) → rodzice Jan+Maria (rząd 1) → rodzeństwo Józef(główny)+Anna(żona), Stanisław (rząd 2) → dziecko Ewa (rząd 3)
const K: KartaNaw[] = [
    { id: 'dziadek', rzad: 0, x: 100, rodzice: [], rodzina: '', partner: '' },
    { id: 'babcia', rzad: 0, x: 246, rodzice: [], rodzina: '', partner: 'dziadek' },
    { id: 'jan', rzad: 1, x: 100, rodzice: ['dziadek', 'babcia'], rodzina: 'r-dziadkow', partner: '' },
    { id: 'maria', rzad: 1, x: 246, rodzice: [], rodzina: '', partner: 'jan' },
    { id: 'jozef', rzad: 2, x: 0, rodzice: ['jan', 'maria'], rodzina: 'r-jana', partner: '' },
    { id: 'anna', rzad: 2, x: 146, rodzice: [], rodzina: '', partner: 'jozef' },
    { id: 'stanislaw', rzad: 2, x: 330, rodzice: ['jan', 'maria'], rodzina: 'r-jana', partner: '' },
    { id: 'ewa', rzad: 3, x: 50, rodzice: ['jozef', 'anna'], rodzina: 'r-jozefa', partner: '' },
    { id: 'kuzyn', rzad: 2, x: 600, rodzice: ['obcy'], rodzina: 'r-obcych', partner: '' },
]
const id = (k: KartaNaw | null) => k?.id ?? null

test('w górę: rodzic widoczny w drzewie; brak rodziców – nic', () => {
    assert.equal(id(nastepnaKarta(K, 'jozef', 'ArrowUp')), 'jan')
    assert.equal(id(nastepnaKarta(K, 'jan', 'ArrowUp')), 'dziadek')
    assert.equal(id(nastepnaKarta(K, 'maria', 'ArrowUp')), null)
    assert.equal(id(nastepnaKarta(K, 'dziadek', 'ArrowUp')), null)
})
test('w dół: pierwsze dziecko; małżonek też prowadzi do dzieci pary', () => {
    assert.equal(id(nastepnaKarta(K, 'jan', 'ArrowDown')), 'jozef')
    assert.equal(id(nastepnaKarta(K, 'maria', 'ArrowDown')), 'jozef')
    assert.equal(id(nastepnaKarta(K, 'anna', 'ArrowDown')), 'ewa')
    assert.equal(id(nastepnaKarta(K, 'ewa', 'ArrowDown')), null)
})
test('w bok: rodzeństwo i małżonek, a obcy w tym samym rzędzie – nie', () => {
    assert.equal(id(nastepnaKarta(K, 'jozef', 'ArrowRight')), 'anna')
    assert.equal(id(nastepnaKarta(K, 'anna', 'ArrowLeft')), 'jozef')
    assert.equal(id(nastepnaKarta(K, 'jozef', 'ArrowLeft')), null)
    assert.equal(id(nastepnaKarta(K, 'stanislaw', 'ArrowLeft')), 'anna', 'rząd czytamy po kolei: Józef, Anna, Stanisław')
    assert.equal(id(nastepnaKarta(K, 'stanislaw', 'ArrowRight')), null, 'kuzyn z innej rodziny jest poza kręgiem')
})
test('w rzędzie strzałki przechodzą całą rodzinę po kolei, w obie strony', () => {
    assert.equal(id(nastepnaKarta(K, 'anna', 'ArrowRight')), 'stanislaw')
    assert.equal(id(nastepnaKarta(K, 'jan', 'ArrowRight')), 'maria')
    assert.equal(id(nastepnaKarta(K, 'maria', 'ArrowLeft')), 'jan')
})
test('nieznana karta – null', () => {
    assert.equal(nastepnaKarta(K, 'nie-ma', 'ArrowUp'), null)
})
