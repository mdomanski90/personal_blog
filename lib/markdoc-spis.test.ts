// JW-2: spis treści z nagłówków treści i podział wpisu na odcinki wokół wstawek materiałów (JW-13)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import Markdoc from '@markdoc/markdoc'
import { naHtml, naglowkiZHtml, podzielWstawki } from './markdoc'

const ktx = { material: (id: string) => ({ id, nazwa: 'Akt testowy', rodzaj: 'dokument', plik: null, strony: [{ adres: `/pliki/strony/${id}/s-1.jpg` }] }) }

test('nagłówki h2 dostają identyfikator t-… i trafiają do spisu w pisowni autora', () => {
    const h = naHtml(Markdoc.parse('## Skąd wiemy o Chrzcie\n\nx\n\n### podrozdział\n\n## Co było dalej?\n\ny'))
    assert.match(h, /<h2 id="t-skad-wiemy-o-chrzcie">Skąd wiemy o Chrzcie<\/h2>/)
    assert.match(h, /<h3 id="t-podrozdzial">/)
    assert.deepEqual(naglowkiZHtml(h), [{ id: 't-skad-wiemy-o-chrzcie', tekst: 'Skąd wiemy o Chrzcie' }, { id: 't-co-bylo-dalej', tekst: 'Co było dalej?' }])
})

test('wpis bez wstawek zostaje jednym odcinkiem; ze wstawką – tekst / materiał / tekst', () => {
    const bez = naHtml(Markdoc.parse('## A\n\ntekst'))
    assert.deepEqual(podzielWstawki(bez), [{ html: bez }])
    const z = naHtml(Markdoc.parse('tekst\n\n{% material id="akt-1" /%}\n\n## Dalej\n\ny'), ktx)
    const cz = podzielWstawki(z)
    assert.equal(cz.length, 3)
    assert.deepEqual(cz[1], { material: 'akt-1' })
    assert.ok('html' in cz[0] && cz[0].html.includes('<p>tekst</p>') && !cz[0].html.includes('<article>'))
    assert.ok('html' in cz[2] && cz[2].html.includes('<h2 id="t-dalej">') && !cz[2].html.includes('</article>'))
})

test('materiał bez skanu (np. nagranie) nie dzieli wpisu', () => {
    const z = naHtml(Markdoc.parse('tekst\n\n{% material id="n-1" /%}\n\ny'), { material: (id: string) => ({ id, nazwa: 'Nagranie', rodzaj: 'nagranie', plik: '/pliki/n.mp3' }) })
    assert.equal(podzielWstawki(z).length, 1)
})
