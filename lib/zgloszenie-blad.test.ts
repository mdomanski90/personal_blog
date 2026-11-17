// P1 · UX-05: komunikat błędu zgłoszenia mówi, co się stało i co zrobić (429 ≠ brak internetu).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { komunikatBleduZgloszenia } from './zgloszenie-blad'

test('brak odpowiedzi (sieć) – sprawdź połączenie, treść zostaje', () => {
    const k = komunikatBleduZgloszenia(null)
    assert.match(k.tytul, /nie udało się wysłać/)
    assert.match(k.tresc, /połączenie/)
    assert.match(k.tresc, /treść zostaje/)
})

test('429 – limit zgłoszeń, nie błąd połączenia', () => {
    const k = komunikatBleduZgloszenia(429)
    assert.match(k.tytul, /limit/i)
    assert.doesNotMatch(k.tresc, /połączenie z internetem/)
    assert.match(k.tresc, /później/)
})

test('400 – zgłoszenie odrzucone, zapytaj o treść i pola', () => {
    const k = komunikatBleduZgloszenia(400)
    assert.match(k.tytul, /odrzucone|nie przyjęto/i)
    assert.match(k.tresc, /treść/)
    assert.equal(k.pole, 'tresc')
})

test('5xx – błąd po stronie serwisu, spróbuj później', () => {
    const k = komunikatBleduZgloszenia(500)
    assert.match(k.tresc, /serwis|później/)
    assert.equal(k.pole, undefined)
})
