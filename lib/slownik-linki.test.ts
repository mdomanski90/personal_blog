import { test } from 'node:test'
import assert from 'node:assert/strict'
import { linkujHasla } from './slownik-linki'

const H = [
    { id: 'morga', haslo: 'morga', formy: ['mórg', 'morgi'], znaczenie: 'Dawna miara.', adres: '/biblioteka/slownik/morga' },
    { id: 'soltys', haslo: 'sołtys', formy: ['sołtysem'], znaczenie: 'Przełożony gromady.', adres: '/biblioteka/slownik/soltys' },
]

test('SLW-03 (łatka P3): pierwsze wystąpienie każdego hasła w opisie staje się odnośnikiem', () => {
    const w = linkujHasla('<p>Kupno trzech mórg, potem dwóch mórg; świadkowie z sołtysem.</p>', H)
    assert.equal((w.match(/odn-haslo/g) ?? []).length, 2)
    assert.ok(w.includes('<a href="/biblioteka/slownik/morga" class="odn odn-haslo" title="Dawna miara.">mórg</a>, potem dwóch mórg'), 'tylko pierwsze „mórg”')
    assert.ok(w.includes('>sołtysem</a>'))
})
test('SLW-03 (łatka P3): bez odnośnika wewnątrz istniejącego odnośnika i w środku słowa', () => {
    assert.equal(linkujHasla('<p><a href="/x">trzy morgi</a> i morgowy</p>', H), '<p><a href="/x">trzy morgi</a> i morgowy</p>')
    assert.equal(linkujHasla('<p>nic</p>', []), '<p>nic</p>')
})
