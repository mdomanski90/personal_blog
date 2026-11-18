// PK (decyzja 18.11): płynne przybliżanie całego drzewa.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SKALA_MAX, SKALA_MIN, dopasowana, ogranicz, przewiniecie, skalaZKolka } from './drzewo-zoom'

test('skala w granicach 0,3–2', () => {
    assert.equal(ogranicz(0.1), SKALA_MIN)
    assert.equal(ogranicz(5), SKALA_MAX)
    assert.equal(ogranicz(0.8), 0.8)
})

test('punkt pod kursorem zostaje na miejscu (przybliżenie 2× przy kursorze 100 px od krawędzi)', () => {
    // treść w punkcie 300 + 100 = 400; po 2× ten punkt jest w 800, kursor nadal 100 px od krawędzi → przewinięcie 700
    assert.equal(przewiniecie(300, 100, 1, 2), 700)
    assert.equal(przewiniecie(0, 50, 1, 0.5), 0, 'nie mniej niż 0')
})

test('kółko: w dół oddala, w górę przybliża; linie (Firefox) liczone jak piksele; szczypanie czulsze', () => {
    assert.ok(skalaZKolka(1, 100) < 1)
    assert.ok(skalaZKolka(1, -100) > 1)
    assert.equal(skalaZKolka(1, 3, 1), skalaZKolka(1, 48, 0))
    assert.ok(skalaZKolka(1, -10, 0, true) > skalaZKolka(1, -10, 0, false))
    assert.equal(skalaZKolka(1.95, -10000), SKALA_MAX)
})

test('⤢: cała plansza w oknie – mniejszy z ilorazów, w granicach', () => {
    assert.equal(dopasowana(1000, 700, 2000, 800), 0.5)
    assert.equal(dopasowana(1000, 700, 500, 350), SKALA_MAX)
    assert.equal(dopasowana(1000, 700, 20000, 800), SKALA_MIN)
})
