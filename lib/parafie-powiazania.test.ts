import test from 'node:test'
import assert from 'node:assert/strict'
import { miejscowosciInstytucji, obiektyInstytucji, ksiegiInstytucji, zapiszOkres, osobyInstytucjiDlaCzytelnika, funkcjeOsoby } from './parafie-powiazania'

test('własne okresy przynależności miejscowości nie pochodzą z lat ksiąg ani istnienia instytucji', () => {
    const miejscowosci = miejscowosciInstytucji('p', [
        { id: 'a', parafie: [{ parafia: 'p', od: 1600, do: 1788 }] },
        { id: 'b', parafie: [{ parafia: 'inna', od: 1700, do: 1800 }] },
    ])
    assert.deepEqual(miejscowosci.map((m) => [m.miejsce.id, m.okresy]), [['a', [{ od: 1600, do: 1788 }]]])
    assert.equal(zapiszOkres(1600, 1788), '1600–1788')
})
test('dwie rozłączne przynależności jednej wsi pozostają oddzielnymi przedziałami', () => {
    const wynik = miejscowosciInstytucji('p', [{ id: 'a', parafie: [
        { parafia: 'p', od: 1600, do: 1700 }, { parafia: 'p', od: 1800, do: 1900 },
    ] }])
    assert.equal(wynik.length, 1)
    assert.deepEqual(wynik[0].okresy, [{ od: 1600, do: 1700 }, { od: 1800, do: 1900 }])
})
test('nieznany okres relacji pozostaje nieznany', () => {
    assert.equal(zapiszOkres(null, null), 'okres nieustalony')
    assert.equal(zapiszOkres(null, 1788), 'do 1788')
    assert.equal(zapiszOkres(1600, null), 'od 1600')
})
test('związek budynku z parafią wymaga jawnego powiązania, a nie wspólnej siedziby', () => {
    const w = obiektyInstytucji('p', [
        { id: 'kosciol', instytucje: [{ parafia: 'p', od: 1820, do: 1900, zrodlo: 'kronika' }] },
        { id: 'budynek-w-tym-samym-miescie', instytucje: [] },
        { id: 'cerkiew', instytucje: [{ parafia: 'q', od: null, do: null, zrodlo: '' }] },
    ])
    assert.deepEqual(w.map((v) => v.obiekt.id), ['kosciol'])
    assert.equal(w[0].relacje[0].zrodlo, 'kronika')
})
test('jeden budynek może historycznie służyć kilku instytucjom', () => {
    const o = [{ id: 'budynek', instytucje: [
        { parafia: 'p', od: 1600, do: 1800, zrodlo: '' },
        { parafia: 'q', od: 1801, do: null, zrodlo: '' },
    ] }]
    assert.equal(obiektyInstytucji('p', o).length, 1)
    assert.equal(obiektyInstytucji('q', o).length, 1)
})
test('księga z wieloma instytucjami jest liczona raz i respektuje starsze pole główne', () => {
    const k = [{ id: 'tom', instytucje: ['p', 'q'], parafia: 'p' }, { id: 'stary', instytucje: [], parafia: 'p' }]
    assert.deepEqual(ksiegiInstytucji('p', k).map((v) => v.id), ['tom', 'stary'])
    assert.deepEqual(ksiegiInstytucji('q', k).map((v) => v.id), ['tom'])
})

// PAR-06 / PPL-04 / PPL-05 (P3): osoby instytucji – odnośnik tylko do karty widocznej dla czytelnika, źródło związku; „funkcje” na karcie osoby
test('PAR-06: osoba instytucji – odnośnik tylko do karty widocznej dla czytelnika; źródło związku zostaje', () => {
    const lista = osobyInstytucjiDlaCzytelnika([
        { nazwa: 'Jan', rola: 'organista', okres: '1880–1910', idOsoby: 'os-jan', zrodlo: 'Schematyzm 1900' },
        { nazwa: 'Karol', rola: 'proboszcz', okres: '', idOsoby: 'os-ukryty', zrodlo: '' },
        { nazwa: 'Bez karty', rola: '', okres: '', idOsoby: '', zrodlo: '' },
    ], (id) => id === 'os-jan')
    assert.deepEqual(lista.map((o) => o.href ?? null), ['/osoby/os-jan', null, null])
    assert.equal(lista[0].zrodlo, 'Schematyzm 1900')
})
test('PPL-04/05: funkcje osoby z wielu instytucji – rola, okres, źródło; wyznanie z instytucji (nie osobiste)', () => {
    const f = funkcjeOsoby('os-jan', [
        { id: 'p1', nazwa: 'parafia Testowo', wyznanie: 'rzymskokatolicka', osoby: [{ nazwa: 'Jan', rola: 'organista', okres: '1880–1910', idOsoby: 'os-jan', zrodlo: 'S1' }] },
        { id: 'p2', nazwa: 'urząd gminy', wyznanie: 'urzad', osoby: [{ nazwa: 'Jan', rola: 'wójt', okres: '1912', idOsoby: 'os-jan', zrodlo: '' }, { nazwa: 'Inny', rola: 'pisarz', okres: '', idOsoby: 'os-inny', zrodlo: '' }] },
    ])
    assert.deepEqual(f.map((x) => [x.rola, x.instytucja.id, x.okres, x.zrodlo, x.instytucja.wyznanie]), [['organista', 'p1', '1880–1910', 'S1', 'rzymskokatolicka'], ['wójt', 'p2', '1912', '', 'urzad']])
})
