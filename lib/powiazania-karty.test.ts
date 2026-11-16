// JW-16: test odtwarzający błąd – odnośniki do osób i instytucji na karcie materiału mają nazwy, nie identyfikatory.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { odnosnikiInstytucji, odnosnikiOsob } from './powiazania-karty'

const osoby = new Map<string, { imiona: string; nazwisko: string; plec: 'M' | 'K' | 'U' }>([
    ['jan-testowy-1820', { imiona: 'Jan', nazwisko: 'Testowy', plec: 'M' as const }],
    ['anna-probna-1825', { imiona: 'Anna', nazwisko: 'Próbna', plec: 'K' as const }],
    ['ukryta-1990', { imiona: 'Ukryta', nazwisko: 'Osoba', plec: 'K' as const }],
])

test('osoby: nazwa zamiast identyfikatora, kolor płci, tylko widoczne i istniejące, bez powtórzeń', () => {
    const w = odnosnikiOsob(['jan-testowy-1820', 'ukryta-1990', 'nie-ma-takiej', 'anna-probna-1825', 'jan-testowy-1820'], osoby, (id) => id !== 'ukryta-1990')
    assert.deepEqual(w, [
        { id: 'jan-testowy-1820', href: '/osoby/jan-testowy-1820', nazwa: 'Jan Testowy', plec: 'M' },
        { id: 'anna-probna-1825', href: '/osoby/anna-probna-1825', nazwa: 'Anna Próbna', plec: 'K' },
    ])
    for (const x of w) assert.notEqual(x.nazwa, x.id, 'tekst odnośnika nie może być identyfikatorem')
})

test('instytucje: nazwa parafii zamiast identyfikatora; nieznane pominięte', () => {
    const w = odnosnikiInstytucji(['parafia-testowa', 'nieznana'], [{ id: 'parafia-testowa', nazwa: 'parafia unicka w Testowie' }])
    assert.deepEqual(w, [{ id: 'parafia-testowa', href: '/parafie/parafia-testowa', nazwa: 'parafia unicka w Testowie' }])
})

test('karta materiału nie wypisuje identyfikatora jako tekstu odnośnika (regresja JW-16)', () => {
    const kod = fs.readFileSync(path.join(path.resolve(import.meta.dirname, '..'), 'app/archiwum/[slug]/page.tsx'), 'utf8')
    assert.doesNotMatch(kod, />\{id\}<\/Link>/, 'wiersz karty z „{id}” jako tekstem odnośnika')
    assert.match(kod, /odnosnikiOsob\(/)
    assert.match(kod, /odnosnikiInstytucji\(/)
})
