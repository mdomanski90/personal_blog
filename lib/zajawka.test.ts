import { test } from 'node:test'
import assert from 'node:assert/strict'
import Markdoc from '@markdoc/markdoc'
import { zajawka } from './markdoc'

// dane wyłącznie syntetyczne
const akapit = (n: number) => `Akapit ${n}: ` + 'tekst testowy do zapowiedzi wpisu na stronie głównej, '.repeat(4).trim()

test('zapowiedź wpisu bez miniatury (decyzja 16.11): dwa razy dłuższa – kolejne akapity, z podziałem na akapity', () => {
    const doc = Markdoc.parse([akapit(1), akapit(2), akapit(3), akapit(4), akapit(5)].join('\n\n'))
    const krotka = zajawka(doc, 500)
    assert.ok(krotka.length <= 501 && !krotka.includes('Akapit 2'))
    const dluga = zajawka(doc, 1000, undefined, { akapity: true })
    assert.ok(dluga.length > 700 && dluga.length <= 1001, String(dluga.length))
    assert.match(dluga, /Akapit 2/)
    assert.ok(dluga.includes('\n'))
})
