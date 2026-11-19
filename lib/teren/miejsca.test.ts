// P7b (TER-01): nowe miejsca z telefonu – odczyt pól, najbliższa miejscowość, kierunek. Dane syntetyczne.
import test from 'node:test'
import assert from 'node:assert/strict'
import { kierunek, najblizszaMiejscowosc, odczytajMiejsce, odczytajNoweMiejsce, odlegloscKm, opisBlisko } from './miejsca'

test('nowe miejsce: identyfikator wymagany, nieznany rodzaj → „coś innego”, położenie tylko w zakresie', () => {
    assert.equal(typeof odczytajNoweMiejsce({ id: 'x' }), 'string')
    assert.deepEqual(odczytajNoweMiejsce({ id: 'miejsce-0001', rodzaj: 'krzyz', nazwa: ' krzyż przy drodze ', notatka: 'żeliwny', lat: '52.2116', lon: '22.7185', dokl: '6.4' }),
        { id: 'miejsce-0001', rodzaj: 'krzyz', nazwa: 'krzyż przy drodze', notatka: 'żeliwny', lat: 52.2116, lon: 22.7185, dokl: 6 })
    assert.deepEqual(odczytajNoweMiejsce({ id: 'miejsce-0001', rodzaj: 'ufo', lat: '152', lon: '22' }), { id: 'miejsce-0001', rodzaj: 'inne', nazwa: '', notatka: '' })
})

test('wpis z pliku: złe pola pomijane, stan domyślnie „nowe”, nazwy plików zdjęć sprawdzane', () => {
    assert.equal(odczytajMiejsce({ nazwa: 'bez id' }), null)
    const m = odczytajMiejsce({ id: 'miejsce-0001', kto: 'k1', imie: 'Jan Testowy', czas: '2026-11-19T10:00:00.000Z', stan: 'cokolwiek', zdjecia: [{ plik: 'zdjecie-1.jpg', szer: 100, wys: 50 }, { plik: '../x.jpg' }] })
    assert.equal(m?.stan, 'nowe')
    assert.deepEqual(m?.zdjecia, [{ plik: 'zdjecie-1.jpg', szer: 100, wys: 50 }])
})

test('najbliższa miejscowość: odległość i kierunek od niej; dalej niż 30 km – brak', () => {
    const M = [{ id: 'testowo', nazwa: 'Testowo', lat: 52.2, lon: 22.7 }, { id: 'przykladowo', nazwa: 'Przykładowo', lat: 52.3, lon: 22.9 }]
    const b = najblizszaMiejscowosc(52.203, 22.704, M)!
    assert.equal(b.id, 'testowo'); assert.equal(b.kierunek, 'płn.-wsch.'); assert.equal(b.km, 0.4)
    assert.equal(opisBlisko(b), 'Testowo (0,4 km na płn.-wsch.)')
    assert.equal(najblizszaMiejscowosc(50, 20, M), undefined)
    assert.equal(opisBlisko(najblizszaMiejscowosc(52.2, 22.7, M)!), 'Testowo')
    assert.ok(Math.abs(odlegloscKm(52, 22, 53, 22) - 111.2) < 0.5)
    assert.deepEqual([kierunek(52, 22, 53, 22), kierunek(52, 22, 52, 23), kierunek(52, 22, 51, 22), kierunek(52, 22, 52, 21)], ['płn.', 'wsch.', 'płd.', 'zach.'])
})
