import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pozycjeBiblioteki, filtrujBiblioteke } from './biblioteka'
import { NA_STRONE } from './stronicowanie'

// dane wyłącznie syntetyczne
const miejsca = [
    { id: 'wies-a', nazwa: 'Wieś A', parafie: [{ parafia: 'par-1', od: 1800, do: 1900 }] },
    { id: 'wies-b', nazwa: 'Wieś B', parafie: [] },
]
const dane = {
    miejsca,
    publikacje: [{ id: 'pub-1', nazwa: 'Dzieje unitów', rodzaj: 'ksiazka', autor: 'Autor X', rok: '1999', wydawca: '', opis: '', miejsca: ['wies-b'] }],
    ksiegi: [
        { id: 'ks-1', nazwa: 'Urodzenia 1850–1860', parafia: 'par-1', instytucje: [], miejsca: [], zakresy: [[1850, 1860]] as [number, number][], rodzaje: ['urodzenia'], lata: '1850–1860', gdzie: '', sygnatura: '' },
        { id: 'ks-2', nazwa: 'Zgony 1950', parafia: 'par-1', instytucje: [], miejsca: [], zakresy: [[1950, 1950]] as [number, number][], rodzaje: ['zgony'], lata: '1950', gdzie: '', sygnatura: '' },
    ],
    parafie: [{ id: 'par-1', nazwa: 'Parafia Testowa', wyznanie: 'rzymskokatolickie', czas: '', siedziba: null, opis: '' }],
    hasla: [{ id: 'h-1', haslo: 'włóka', rodzaj: 'miara', znaczenie: 'dawna miara ziemi', formy: [] }],
}

test('jedna lista w kolejności działów, z odnośnikami do podstron', () => {
    const p = pozycjeBiblioteki(dane)
    assert.deepEqual(p.map((x) => x.dzial), ['publikacje', 'ksiegi', 'ksiegi', 'parafie', 'slownik'])
    assert.equal(p[0].href, '/biblioteka/publikacje/pub-1')
    assert.equal(p[0].linia, 'książka · Autor X · 1999')
    assert.equal(p[4].href, '/biblioteka/slownik#h-1')
})

test('miejscowość: księga tylko w okresie przynależności, parafia przez przynależność, słownik bez miejsc', () => {
    const p = pozycjeBiblioteki(dane)
    const ids = filtrujBiblioteke(p, { miejsce: 'wies-a' }).wyniki.map((x) => x.id)
    assert.deepEqual(ids, ['ks-1', 'par-1'])
    assert.deepEqual(filtrujBiblioteke(p, { miejsce: 'wies-b' }).wyniki.map((x) => x.id), ['pub-1'])
})

test('dział i fraza (z odmianą, bez polskich znaków); nieznany dział = wszystkie', () => {
    const p = pozycjeBiblioteki(dane)
    assert.equal(filtrujBiblioteke(p, { dzial: 'ksiegi' }).razem, 2)
    assert.equal(filtrujBiblioteke(p, { dzial: 'nieznany' }).razem, 5)
    assert.deepEqual(filtrujBiblioteke(p, { q: 'unitow' }).wyniki.map((x) => x.id), ['pub-1'])
    assert.deepEqual(filtrujBiblioteke(p, { q: 'wloka' }).wyniki.map((x) => x.id), ['h-1'])
})

test('stronicowanie wspólne z archiwum', () => {
    const duzo = pozycjeBiblioteki({ ...dane, hasla: Array.from({ length: NA_STRONE + 3 }, (_, i) => ({ id: `h${i}`, haslo: `h${i}`, rodzaj: 'gwara', znaczenie: '', formy: [] })) })
    const w = filtrujBiblioteke(duzo, { dzial: 'slownik', strona: 99 })
    assert.equal(w.stron, 2); assert.equal(w.strona, 2); assert.equal(w.wyniki.length, 3)
})

test('adres filtrów: pomija stronę i wskazane parametry, nadpisuje wartości', async () => {
    const { adresFiltrow } = await import('./adres-filtrow')
    const sp = { q: 'unia', dzial: 'ksiegi', strona: '3', puste: '' }
    assert.equal(adresFiltrow('/biblioteka', sp), '/biblioteka?q=unia&dzial=ksiegi')
    assert.equal(adresFiltrow('/biblioteka', sp, { pomin: ['dzial'] }), '/biblioteka?q=unia')
    assert.equal(adresFiltrow('/biblioteka', sp, { ustaw: { dzial: 'slownik', strona: '2' } }), '/biblioteka?q=unia&dzial=slownik&strona=2')
    assert.equal(adresFiltrow('/biblioteka', sp, { ustaw: { dzial: '' }, pomin: ['q'] }), '/biblioteka')
})
