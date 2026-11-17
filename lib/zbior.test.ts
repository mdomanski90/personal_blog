import { test } from 'node:test'
import assert from 'node:assert/strict'
import { wierszeZbioru } from './zbior'

test('ARC-09 (P3): wiersze zbioru liczone z materiałów – rodzaje, lata, miejsca, tematy; osoby tylko widoczne dla czytelnika', () => {
    const w = wierszeZbioru([
        { rodzaj: 'zdjecie', lata: [1931, 1931], miejsca: ['testowo'], tematy: [], osobyIds: ['os-jan', 'os-ukryty'] },
        { rodzaj: 'dokument', lata: [1922, 1925], miejsca: ['testowo', 'wola'], tematy: ['biezenstwo'], osobyIds: [] },
        { rodzaj: 'dokument', lata: null, miejsca: [], tematy: [], osobyIds: ['os-jan'] },
    ], (id) => id !== 'os-ukryty')
    assert.deepEqual(w.rodzaje, [{ rodzaj: 'dokument', ile: 2 }, { rodzaj: 'zdjecie', ile: 1 }])
    assert.deepEqual(w.lata, [1922, 1931])
    assert.deepEqual(w.miejsca, ['testowo', 'wola'])
    assert.deepEqual(w.tematy, ['biezenstwo'])
    assert.deepEqual(w.osoby, ['os-jan'], 'osoba niewidoczna nie jest ani liczona, ani wymieniona')
})
test('ARC-09 (P3): zbiór bez materiałów – puste wiersze, bez lat', () => {
    const w = wierszeZbioru([], () => true)
    assert.equal(w.lata, null)
    assert.equal(w.rodzaje.length, 0)
})

test('łatka P3: opis rodzajów materiałów zbioru jak na planszy', async () => {
    const { opisRodzajow } = await import('./zbior')
    const { odmiana } = await import('./tekst')
    assert.equal(opisRodzajow([{ rodzaj: 'dokument', ile: 2 }, { rodzaj: 'zdjecie', ile: 2 }, { rodzaj: 'akt', ile: 1 }, { rodzaj: 'wspomnienie', ile: 1 }], odmiana), '6 – 2 dokumenty, 2 zdjęcia, akt metrykalny, wspomnienie')
    assert.equal(opisRodzajow([], odmiana), '')
})
