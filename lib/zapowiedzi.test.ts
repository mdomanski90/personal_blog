import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DLUGOSC_ZAPOWIEDZI, czyKrotkaZapowiedz } from './zapowiedzi'

// uwagi właściciela 16.11 (wariant B): tekst w kolumnach z limitem wierszy; krótka zapowiedź (do ok. jednej kolumny) bez kolumn
test('zapowiedź: długość wypełnia kolumny, krótka do ok. jednej kolumny', () => {
    assert.ok(DLUGOSC_ZAPOWIEDZI.zObrazem >= 2 * 7 * 37, 'z miniaturą: 2 kolumny × 7 wierszy')
    assert.ok(DLUGOSC_ZAPOWIEDZI.bezObrazu >= 3 * 9 * 33, 'bez miniatury: 3 kolumny × 9 wierszy')
    assert.equal(czyKrotkaZapowiedz('Krótka zapowiedź jednego zdania.', true), true)
    assert.equal(czyKrotkaZapowiedz('x'.repeat(400), true), false)
    assert.equal(czyKrotkaZapowiedz('x'.repeat(220), false), true)
    assert.equal(czyKrotkaZapowiedz('x'.repeat(250), true), false)
    assert.equal(czyKrotkaZapowiedz('x'.repeat(400), false), false)
    assert.equal(czyKrotkaZapowiedz('', true), true)
})
