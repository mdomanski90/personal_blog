import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { bezZmiennych, regulyPlanu, tokenyPlanu } from './styl-svg'

const css = fs.readFileSync(path.resolve(import.meta.dirname, '../../app/globals.css'), 'utf8')

// odbiór 17.11: na mapie zamiast planu czarny kształt – mapa.png i podglad.svg bez reguł klas .pl-* (obszar trafienia .pl-traf czarny)
test('obrazy planu poza stroną dostają reguły klas .pl-* z globals.css', () => {
    const r = regulyPlanu(css)
    for (const k of ['.pl-traf{', '.pl-f-las{', '.pl-dolina-jasna{', '.pl-napis-tlo{', '.pl-niepewny{']) assert.ok(r.includes(k), k)
    assert.doesNotMatch(r, /@media|\.plan-/)
})
test('każda klasa .pl-* z rysunku planu ma regułę dla obrazów poza stroną', () => {
    const rys = fs.readFileSync(path.resolve(import.meta.dirname, '../../app/components/plan/Rysunek.tsx'), 'utf8')
    const r = regulyPlanu(css)
    const klasy = new Set([...rys.matchAll(/className="(pl-[\w-]+)"/g)].map((m) => m[1]))
    assert.ok(klasy.size > 5)
    for (const k of klasy) assert.ok(r.includes(`.${k}`), `brak reguły .${k}`)
})
test('zmienne CSS zamienione na wartości (sharp nie zna var())', () => {
    const t = tokenyPlanu(css, ':root')
    assert.ok(t.get('pl-papier'))
    const s = bezZmiennych(regulyPlanu(css), t)
    assert.doesNotMatch(s, /var\(/)
    assert.match(s, /\.pl-traf\{fill:transparent\}/)
})

// odbiór 17.11: długa karta grobu ucięta zamiast przewijana – części panelu (flex column) kurczyły się do wysokości mapy
test('panel planu przewija się wewnątrz, części panelu się nie kurczą', () => {
    assert.match(css, /\.plan-panel\{flex:1;min-height:0;overflow-y:auto;/)
    assert.match(css, /\.plan-panel>\*\{flex-shrink:0\}/)
})
