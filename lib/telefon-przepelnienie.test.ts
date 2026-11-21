// Łatka 21.11 (telefon, KOREKTA): przyciski z napisem nie mogą się ściskać poniżej szerokości napisu (min-width:30/44px w regułach
// dotykowych pozwalało) – zakładki przy skanie, „szukaj” w polu szukania, zwinięty spis działów, edytor objaśnień.
// Pełny pomiar: /home/claude/skrypty/audyt_przepelnienie.py (320/375 px, A+, prawdziwy JetBrains Mono) – przed łatką 15 stron, po 0.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const css = fs.readFileSync('app/globals.css', 'utf8').replace(/\s+/g, ' ')
const panel = fs.readFileSync('app/keystatic/panel.css', 'utf8').replace(/\s+/g, ' ')
test('zakładki przy skanie: bez ściskania, z zawijaniem; pasek bez stałej wysokości', () => {
    assert.match(css, /\.szt-pasek \.dok-grupa>button\{flex:1 0 auto;min-width:max-content\}/)
    assert.match(css, /\.szt-pasek\{height:auto;min-height:calc\(46px \* var\(--font-scale,1\)\);flex-wrap:wrap/)
})
test('pole szukania: przycisk „szukaj” się nie ściska', () => assert.match(css, /\.pole-szukania>button\{flex:none\}/))
test('zwinięty spis działów zawija przycisk „wszystkie działy” na telefonie', () => {
    assert.match(css, /\.spis-ramka\.sd-zwiniety,body:has\(\.k-filtry-ramka:is\(\[open\],\[data-otwarte\]\)\) \.spis-ramka\{flex-wrap:wrap\}/)
    assert.match(css, /@media \(max-width:640px\)\{\.spis-ramka\.sd-zwiniety:not\(\.sd-pokaz\) \.spis-dzialow,[^{]+\{flex:1 1 12em\}\}/)
})
test('edytor objaśnień: jedna kolumna poniżej 900 px', () => assert.match(panel, /@media \(max-width: 900px\) \{ \.pn-obj-uklad \{ grid-template-columns: minmax\(0, 1fr\); \} \}/))
