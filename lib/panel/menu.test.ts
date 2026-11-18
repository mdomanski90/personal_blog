// PK: menu panelu w danych – ustawienia (ukrywanie, kolejność), kompletność względem Keystatic, adresy publiczne, rodzaj widoku ramy.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { MENU, NIEUKRYWALNE, aktywna, menuWgUstawien, pozycjeDoUstawien, rodzajWidoku, stronaZAdresuKeystatic } from './menu'

const hrefy = () => MENU.flatMap((g) => [g.href, ...g.pozycje.map((p) => p.href)]).filter(Boolean) as string[]

test('każda kolekcja i singleton Keystatic ma pozycję w menu panelu (także zespoły, przekierowania, kręgi)', () => {
    const cfg = fs.readFileSync(path.join(process.cwd(), 'keystatic.config.ts'), 'utf8')
    const klucze = [...cfg.matchAll(/^ {4}(\w+): (collection|singleton)\(/gm)].map((m) => [m[1], m[2]] as const)
    assert.ok(klucze.length >= 18, `za mało kluczy w konfiguracji: ${klucze.length}`)
    const h = hrefy()
    for (const [k, r] of klucze) assert.ok(h.includes(`/keystatic/${r}/${k}`), `brak w menu: ${r} ${k}`)
})

test('klucze pozycji menu są niepowtarzalne', () => {
    const k = MENU.flatMap((g) => [g.klucz, ...g.pozycje.map((p) => p.klucz)])
    const pow = k.filter((x, i) => k.indexOf(x) !== i && !MENU.some((g) => g.klucz === x && g.pozycje.some((p) => p.klucz === x)))
    assert.deepEqual(pow, [])
})

test('brak ustawienia = menu domyślne, nic ukrytego', () => {
    const m = menuWgUstawien(null)
    assert.deepEqual(m.map((g) => g.klucz), MENU.map((g) => g.klucz))
    assert.ok(m.every((g) => !g.ukryta && g.pozycje.every((p) => !p.ukryta)))
})

test('kolejność grup z ustawienia; nieznane i powtórzone klucze pomijane, brakujące grupy na końcu', () => {
    const m = menuWgUstawien({ kolejnosc: ['plany', 'nie-ma-takiej', 'plany', 'osoby-nie-grupa', 'tresci'] })
    assert.deepEqual(m.slice(0, 2).map((g) => g.klucz), ['plany', 'tresci'])
    assert.equal(m.length, MENU.length)
})

test('ukrycie wszystkich pozycji grupy ukrywa grupę; pulpitu i „menu panelu” nie da się ukryć', () => {
    const m = menuWgUstawien({ ukryte: ['publikacje', 'pulpit', 'menuPanelu', 'zespoly'] })
    assert.equal(m.find((g) => g.klucz === 'biblioteka')!.ukryta, true)
    assert.equal(m.find((g) => g.klucz === 'pulpit')!.ukryta, false)
    assert.equal(m.find((g) => g.klucz === 'narzedzia')!.pozycje.find((p) => p.klucz === 'menuPanelu')!.ukryta, false)
    const ks = m.find((g) => g.klucz === 'ksiegi')!
    assert.equal(ks.ukryta, false)
    assert.equal(ks.pozycje.find((p) => p.klucz === 'zespoly')!.ukryta, true)
    assert.ok(pozycjeDoUstawien().every((x) => !NIEUKRYWALNE.has(x.value)))
})

test('„na stronie ↗”: pozycja Keystatic → strona publiczna; kolekcja bez strony – brak', () => {
    assert.equal(stronaZAdresuKeystatic('/keystatic/collection/miejsca/item/testowo'), '/miejsca/testowo')
    assert.equal(stronaZAdresuKeystatic('/keystatic/collection/materialy/item/mat-00'), '/archiwum/mat-00')
    assert.equal(stronaZAdresuKeystatic('/keystatic/collection/biogramy/item/os-jan'), '/osoby/os-jan')
    assert.equal(stronaZAdresuKeystatic('/keystatic/collection/ksiegi/item/x'), null)
    assert.equal(stronaZAdresuKeystatic('/keystatic/singleton/oProjekcie'), '/o-projekcie')
    assert.equal(stronaZAdresuKeystatic('/keystatic/collection/miejsca'), null)
})

test('rodzaj widoku ramy: strony panelu, edytor planu (kolumna ikon), Keystatic', () => {
    assert.equal(rodzajWidoku('/keystatic/panel'), 'panel')
    assert.equal(rodzajWidoku('/keystatic/osoby/os-jan'), 'panel')
    assert.equal(rodzajWidoku('/keystatic/plany'), 'panel')
    assert.equal(rodzajWidoku('/keystatic/plany/typy'), 'panel')
    assert.equal(rodzajWidoku('/keystatic/plany/cmentarz-testowo'), 'edytor-planu')
    assert.equal(rodzajWidoku('/keystatic/plany/typowo'), 'edytor-planu')
    assert.equal(rodzajWidoku('/keystatic'), 'keystatic')
    assert.equal(rodzajWidoku('/keystatic/collection/posts/item/a'), 'keystatic')
})

test('aktywna pozycja: plany po rodzaju z zapytania, pulpit tylko dokładnie, podstrony panelu', () => {
    assert.equal(aktywna('/keystatic/plany?rodzaj=historyczny', '/keystatic/plany', '?rodzaj=historyczny'), true)
    assert.equal(aktywna('/keystatic/plany?rodzaj=cmentarz', '/keystatic/plany', '?rodzaj=historyczny'), false)
    assert.equal(aktywna('/keystatic/panel', '/keystatic/panel/zgloszenia', ''), false)
    assert.equal(aktywna('/keystatic/panel/zgloszenia', '/keystatic/panel/zgloszenia', ''), true)
    assert.equal(aktywna('/keystatic/collection/posts', '/keystatic/collection/posts/item/x', ''), true)
})
