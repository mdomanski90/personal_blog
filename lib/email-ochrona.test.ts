import { test } from 'node:test'
import assert from 'node:assert/strict'
import { odkoduj, ukryjAdresy, zakoduj } from './email-ochrona'

test('OPS-08: kod adresu w obie strony, bez „@” i bez nazwy w zakodowanym tekście', () => {
    const k = zakoduj('kontakt@odniepamieci.pl')
    assert.equal(odkoduj(k), 'kontakt@odniepamieci.pl')
    assert.ok(!k.includes('@') && !k.includes('kontakt'))
    assert.equal(odkoduj(zakoduj('żółw@przykład.pl')), 'żółw@przykład.pl')
})

test('OPS-08: adresy w treści i odnośniki mailto → przycisk; atrybuty i tekst bez adresu bez zmian', () => {
    const h = ukryjAdresy('<p>Napisz: anna.nowak@example.org albo <a href="mailto:kontakt@odniepamieci.pl?subject=x">kliknij</a>.</p><img alt="x" src="/a@2x.png">')
    assert.doesNotMatch(h, /anna\.nowak@example\.org|kontakt@odniepamieci\.pl|mailto:/)
    assert.equal((h.match(/class="email-pokaz /g) ?? []).length, 2)
    assert.match(h, /src="\/a@2x\.png"/)
    const k = h.match(/data-k="([0-9a-f]+)"/)![1]
    assert.equal(odkoduj(k), 'anna.nowak@example.org')
    assert.equal(ukryjAdresy('<p>bez adresu</p>'), '<p>bez adresu</p>')
})
