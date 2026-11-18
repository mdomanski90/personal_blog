// P4 (PD-11): podkład mapy pokazuje się dopiero z jawnie wpisaną licencją.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { podkladyDoPokazania, zrodloPodkladu } from './podklady'

const OK = { id: 'wig-p40-s36', etykieta: 'mapa WIG 1:100 000 (1930–1939)', kafelki: '/podklady/wig/{z}/{x}/{y}.png', zrodlo: 'Wojskowy Instytut Geograficzny, arkusz P40 S36 (1937)', licencja: 'domena publiczna – potwierdzone przez właściciela' }

test('kompletny wpis z licencją jest pokazany', () => {
    assert.deepEqual(podkladyDoPokazania([OK]), [OK])
})
test('bez licencji, z pustą licencją albo bez źródła podkładu nie ma', () => {
    assert.deepEqual(podkladyDoPokazania([{ ...OK, licencja: '' }, { ...OK, id: 'b', licencja: '   ' }, { ...OK, id: 'c', licencja: undefined }, { ...OK, id: 'd', zrodlo: '' }]), [])
})
test('adres kafelków musi mieć {z}/{x}/{y}; zdublowany id – tylko pierwszy', () => {
    assert.deepEqual(podkladyDoPokazania([{ ...OK, kafelki: '/podklady/wig.png' }]), [])
    assert.equal(podkladyDoPokazania([OK, { ...OK, etykieta: 'drugi' }]).length, 1)
})
test('nie-lista i śmieci dają pustą listę', () => {
    assert.deepEqual(podkladyDoPokazania(null), [])
    assert.deepEqual(podkladyDoPokazania({ a: 1 }), [])
    assert.deepEqual(podkladyDoPokazania([null, 5, 'x']), [])
})
test('źródło pod mapą zawiera źródło i licencję', () => {
    assert.equal(zrodloPodkladu(OK), 'podkład: Wojskowy Instytut Geograficzny, arkusz P40 S36 (1937) – licencja: domena publiczna – potwierdzone przez właściciela')
})
test('wersja w repozytorium nie ma żadnego podkładu do czasu potwierdzenia licencji (decyzja 18.11)', () => {
    const plik = JSON.parse(readFileSync(new URL('../public/podklady/podklady.json', import.meta.url), 'utf8'))
    assert.deepEqual(podkladyDoPokazania(plik), [])
})
