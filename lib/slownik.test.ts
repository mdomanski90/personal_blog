// P2 · SLW-01: słownik jako siatka fiszek – filtr z odmianą, litery, adres hasła, zgłoszenie „hasło do słownika” (dane syntetyczne).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { adresHasla, filtrujHasla, litery, liczbyRodzajow, skrocZnaczenie, type HasloSlownika } from './slownik'
import { zgloszenieZDanych, RODZAJE_ZGLOSZEN } from './zgloszenia'
import { POMOC } from './wspoltworz-reguly'

const h = (id: string, haslo: string, rodzaj: string, znaczenie: string, formy: string[] = []): HasloSlownika => ({ id, haslo, rodzaj, znaczenie, przyklad: '', zrodlo: 'syntetyczne', formy })
const HASLA = [
    h('soltys', 'sołtys', 'urzad', 'Przedstawiciel wsi wybierany przez mieszkańców.', ['wójt wiejski']),
    h('lan', 'łan', 'miara', 'Dawna miara powierzchni gruntu.'),
    h('unia', 'unia brzeska', 'pojecie', 'Związek Kościoła prawosławnego z Rzymem z 1596 roku.', ['unici']),
    h('kolacja', 'kolacja', 'gwara', 'Wieczerza wigilijna w gwarze miejscowej.'),
    h('zlote', 'złoty', 'miara', 'Jednostka monetarna.'),
]

test('filtr haseł: fraza z odmianą w hasłach, formach i znaczeniach', () => {
    assert.deepEqual(filtrujHasla(HASLA, { q: 'sołtysa' }).map((x) => x.id), ['soltys'])
    assert.deepEqual(filtrujHasla(HASLA, { q: 'unitów' }).map((x) => x.id), ['unia'], 'forma „unici”')
    assert.deepEqual(filtrujHasla(HASLA, { q: 'powierzchni' }).map((x) => x.id), ['lan'], 'w znaczeniu')
    assert.equal(filtrujHasla(HASLA, { q: 'x' }).length, HASLA.length, 'jedna litera – bez filtra')
})
test('filtr haseł: rodzaj i litera łącznie, litera bez rozróżniania polskich znaków', () => {
    assert.deepEqual(filtrujHasla(HASLA, { rodzaj: 'miara' }).map((x) => x.id), ['lan', 'zlote'])
    assert.deepEqual(filtrujHasla(HASLA, { litera: 'Ł' }).map((x) => x.id), ['lan'])
    assert.deepEqual(filtrujHasla(HASLA, { litera: 'S' }).map((x) => x.id), ['soltys'], 'Ś/S to osobne litery – S nie łapie „sołtys”')
})
test('litery i liczby rodzajów (po frazie)', () => {
    assert.deepEqual(litery(HASLA).map((x) => x.litera), ['K', 'Ł', 'S', 'U', 'Z'])
    assert.deepEqual(liczbyRodzajow(HASLA, 'sołtysa'), { urzad: 1 })
    assert.deepEqual(liczbyRodzajow(HASLA), { urzad: 1, miara: 2, pojecie: 1, gwara: 1 })
})
test('adres hasła – jedna strona hasła zamiast kotwicy na liście', () => {
    assert.equal(adresHasla('soltys'), '/biblioteka/slownik/soltys')
    assert.equal(adresHasla('a b'), '/biblioteka/slownik/a%20b')
})
test('skrócone znaczenie kończy się na granicy słowa', () => {
    assert.equal(skrocZnaczenie('krótkie', 50), 'krótkie')
    const s = skrocZnaczenie('jeden dwa trzy cztery pięć sześć siedem', 20)
    assert.match(s, /…$/); assert.ok(s.length <= 21); assert.ok(!/\s…$/.test(s))
})
test('SLW-01: zgłoszenie „hasło do słownika” jest przyjmowane i opisane', () => {
    assert.equal(RODZAJE_ZGLOSZEN.haslo, 'hasło do słownika')
    assert.ok(POMOC.some((p) => p.rodzaj === 'haslo'))
    const z = zgloszenieZDanych({ rodzaj: 'haslo', adres: '/biblioteka/slownik', tytul: 'słownik', tresc: 'Słowo „kolacja” znaczy wieczerza.' })
    assert.equal(z?.rodzaj, 'haslo')
})
test('adres hasła nigdzie nie wraca do kotwicy /biblioteka/slownik#…', () => {
    const ROOT = path.resolve(import.meta.dirname, '..')
    const zle: string[] = []
    const przejdz = (d: string) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
        const rel = `${d}/${e.name}`
        if (e.isDirectory()) { if (e.name !== 'node_modules') przejdz(rel) }
        else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) && /biblioteka\/slownik#/.test(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) zle.push(rel)
    } }
    przejdz('app'); przejdz('lib')
    assert.deepEqual(zle, [], 'użyj adresHasla() z lib/slownik')
})
