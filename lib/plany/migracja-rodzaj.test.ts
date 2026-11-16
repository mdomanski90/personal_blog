import { test } from 'node:test'
import assert from 'node:assert/strict'
import { popraw, type Element } from './model'
import { katalog } from './typy'
import { propozycjaRodzaju } from './migracja-rodzaj'

// dane wyłącznie syntetyczne
const grob: Element = { id: 'g', typ: 'grob', g: { k: 'r', x: 0, y: 0, w: 1, h: 2, a: 0 } }
const droga: Element = { id: 'd', typ: 'droga', g: { k: 'l', p: [[0, 0], [5, 5]] } }

test('rodzaj z reguły ogólnej: groby → cmentarz, bez grobów → historyczny; zapisany rodzaj pomijany', () => {
    const typy = katalog()
    assert.equal(propozycjaRodzaju(popraw({ slug: 'a', elementy: [grob, droga] }), typy).nowy, 'cmentarz')
    assert.equal(propozycjaRodzaju(popraw({ slug: 'b', elementy: [droga] }), typy).nowy, 'historyczny')
    assert.equal(propozycjaRodzaju(popraw({ slug: 'c', elementy: [] }), typy).nowy, 'historyczny')
    const juz = propozycjaRodzaju(popraw({ slug: 'd', rodzaj: 'schemat', elementy: [grob] }), typy)
    assert.equal(juz.nowy, null)
    assert.equal(juz.obecny, 'schemat')
})
