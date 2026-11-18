// P5 (REL-07): raport ksiąg – dane syntetyczne.
import test from 'node:test'
import assert from 'node:assert/strict'
import { raportKsiag, type KsiegaRaportu } from './ksiegi-raport'

const k = (id: string, o: Partial<KsiegaRaportu>): KsiegaRaportu => ({
    id, nazwa: id, parafia: '', instytucje: [], miejsca: [], zakresy: [[1826, 1875]], jednostki: [], sygnatura: '', widocznosc: 'publiczne', lata: '1826–1875', ...o,
} as KsiegaRaportu)

test('REL-07: katalog i karta miejscowości liczone tymi samymi regułami; zerwana relacja widoczna jako różnica i błąd', () => {
    const miejsca = [
        { id: 'testowo', nazwa: 'Testowo', parafie: [{ parafia: 'par-testowo', od: 1800, do: 1950 }] },
        { id: 'wola', nazwa: 'Wola', parafie: [{ parafia: 'par-testowo', od: null, do: null }] },
    ]
    const parafie = [{ id: 'par-testowo', nazwa: 'parafia Testowo', wyznanie: 'rzymskokatolicka' }]
    const r = raportKsiag([
        k('urodzenia', { parafia: 'par-testowo', instytucje: ['par-testowo'] }),
        k('zgony', { parafia: 'par-testowo', instytucje: ['par-testowo'], widocznosc: 'ja' }),
        k('zerwana', { parafia: 'par-usunieta', instytucje: ['par-usunieta'], miejsca: ['testowo'] }),
        k('nieustalona', { miejsca: ['wola'], sygnatura: '99/1' }),
        k('duplikat', { miejsca: ['wola'], sygnatura: '99/1' }),
        k('nigdzie', { parafia: 'par-testowo', instytucje: ['par-testowo'], zakresy: [], miejsca: [] }),
    ], miejsca, parafie)
    const t = r.miejsca.find((m) => m.id === 'testowo')!
    assert.deepEqual([t.katalog, t.karta, t.publiczne], [3, 2, 2])
    assert.deepEqual(t.brakNaKarcie, [{ id: 'zerwana', nazwa: 'zerwana' }])
    const w = r.miejsca.find((m) => m.id === 'wola')!
    assert.deepEqual([w.katalog, w.karta], [2, 2], 'przynależność bez dat: tylko księgi ze wskazaną wsią; nieustalona instytucja jest na karcie')
    assert.deepEqual(r.instytucje, [{ id: 'par-testowo', nazwa: 'parafia Testowo', katalog: 3, karta: 3, publiczne: 2 }])
    assert.deepEqual(r.bezMiejscowosci.map((x) => x.id), ['nigdzie'])
    assert.ok(r.uwagi.some((u) => u.rodzaj === 'blad' && u.ksiega === 'zerwana' && /par-usunieta/.test(u.tekst)))
    assert.ok(r.uwagi.some((u) => /sygnatura 99\/1/.test(u.tekst)))
    assert.ok(r.uwagi.some((u) => u.miejsce === 'wola' && /bez dat/.test(u.tekst)))
    assert.ok(r.uwagi.some((u) => u.ksiega === 'nigdzie' && /brak lat/.test(u.tekst)))
    assert.deepEqual([r.ksiag, r.publicznych], [6, 5])
})
