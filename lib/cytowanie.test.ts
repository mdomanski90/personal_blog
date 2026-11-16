import { test } from 'node:test'
import assert from 'node:assert/strict'
import { daneCytatu } from './cytowanie'

// uwaga właściciela 16.11: „jak cytować” na każdej karcie – jedne dane, stały adres /k/NR, gdy karta ma nr kat.
test('dane cytatu: stały adres przy numerze katalogowym, inaczej adres strony; opracowanie domyślne', () => {
    const z = daneCytatu({ tytul: 'Testowo', sciezka: '/miejsca/testowo', nrKat: 'MI-0001', rodzaj: 'miejsce' })
    assert.equal(z.adres, 'https://odniepamieci.pl/k/MI-0001')
    assert.equal(z.nrKat, 'MI-0001')
    assert.equal(z.opracowal, 'redakcja odniepamieci.pl')
    const b = daneCytatu({ tytul: 'Plan', sciezka: '/plany/plan-1', nrKat: null, rodzaj: 'plan', opracowal: 'Jan Przykładowski' })
    assert.equal(b.adres, 'https://odniepamieci.pl/plany/plan-1')
    assert.equal(b.nrKat, undefined)
    assert.equal(b.opracowal, 'Jan Przykładowski')
    assert.ok(!('autor' in b) || b.autor === undefined)
})
