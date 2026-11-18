// Łatka po PK: wspólne przybliżanie planu i całego drzewa.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { KROK_PRZYCISKU, czynnikKolka, klawiszPrzyblizenia, przesuniecieKolka, wskazowkaPrzyblizenia } from './przyblizenie'

test('kółko: w górę przybliża (> 1), w dół oddala; linie liczone jak 16 px; szczypanie czulsze', () => {
    assert.ok(czynnikKolka(-100) > 1)
    assert.ok(czynnikKolka(100) < 1)
    assert.equal(czynnikKolka(3, 1), czynnikKolka(48, 0))
    assert.ok(czynnikKolka(-10, 0, true) > czynnikKolka(-10, 0, false))
})

test('klawisze wspólne: + − 0', () => {
    assert.equal(klawiszPrzyblizenia('+'), 'przybliz')
    assert.equal(klawiszPrzyblizenia('='), 'przybliz')
    assert.equal(klawiszPrzyblizenia('-'), 'oddal')
    assert.equal(klawiszPrzyblizenia('0'), 'calosc')
    assert.equal(klawiszPrzyblizenia('a'), null)
})

test('krok przycisków ×1,25; Shift + kółko – przesunięcie w bok; podpowiedź bez Ctrl', () => {
    assert.equal(KROK_PRZYCISKU, 1.25)
    assert.equal(przesuniecieKolka(0, 30), 30)
    assert.equal(przesuniecieKolka(12, 30), 12)
    assert.match(wskazowkaPrzyblizenia('kliknij – karta'), /^kliknij – karta · przeciągnij – przesuń · kółko – przybliż · Shift \+ kółko – w bok$/)
})
