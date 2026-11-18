// Etap 3 · przeglądarka planu – testy (zasada 6.1: najpierw test odtwarzający brak / błąd).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dlaCzytelnika, popraw, type Element, type Plan } from './model'
import { numeryPlanu } from './numeracja'
import { katalog, USTAWIENIA_DOMYSLNE } from './typy'
import { adresZGrobem, elementyKadruStartowego, interfejsPlanu, kwateryPlanu, opisany, przesunVB, ruchKlawisza, stanPlanu, szukajNaPlanie, zakladkaKlawisza, opisKwater } from './przegladarka'

const typy = katalog()
const grob = (id: string, x: number, y: number, reszta: Partial<Element> = {}): Element => ({ id, typ: 'grob', g: { k: 'r', x, y, w: 10, h: 20, a: 0 }, ...reszta })
const teraz = new Date().getFullYear()

test('CEM-09: „opisany” tylko z danych jawnych – status pracy (etap) nie wystarcza', () => {
    assert.equal(opisany(grob('a', 0, 0, { etap: 'sprawdzony' })), false)
    assert.equal(opisany(grob('a', 0, 0, { napis: 'Ś.P. Jan' })), true)
    assert.equal(opisany(grob('a', 0, 0, { osoby: [{ nazwa: 'Jan Testowy' }] })), true)
    assert.equal(opisany(grob('a', 0, 0, { zdjecia: [{ plik: 'a.jpg' }] as Element['zdjecia'] })), true)
    assert.equal(opisany(grob('a', 0, 0, { ograniczony: true, napis: 'x' })), false)
})

test('CEM-08/09: liczby pustego panelu z planu dla czytelnika – grób z ograniczonym napisem liczony tylko jako „dla bliskich”', () => {
    const plan = popraw({ slug: 'p', elementy: [
        grob('a', 0, 0, { napis: 'stary 1880', etap: 'opracowany' }),
        grob('b', 20, 0, { etap: 'sprawdzony', notatka: 'robocza' }),
        grob('c', 40, 0, { rokZgonu: teraz - 2, napis: 'niedawno', osoby: [{ nazwa: 'X', id: 'os-x' }] }),
        grob('d', 60, 0, { osoby: [{ nazwa: 'Jan Testowy', id: 'os-j' }, { nazwa: 'Anna', id: 'os-ukryta' }] }),
    ] } as Plan)
    const pub = dlaCzytelnika(plan, 'publiczne', USTAWIENIA_DOMYSLNE)
    // os-x ma kartę widoczną, ale grób jest ograniczony – nie wolno go liczyć „w drzewie” (ślad treści ukrytej)
    const s = stanPlanu(pub, typy, new Set(['os-j', 'os-x']))
    assert.deepEqual(s, { groby: 4, opisane: 2, dlaBliskich: 1, wDrzewie: 1, bezOpisu: 1 })
})

test('CEM-07: kadr startowy – groby i kwatery, bez otoczenia; plan bez grobów – wszystko', () => {
    const plan = { elementy: [grob('a', 0, 0), grob('b', 20, 0), grob('c', 40, 0), { id: 'las', typ: 'las', g: { k: 'w', p: [[0, 0], [900, 0], [900, 900]] } } as Element] }
    assert.deepEqual(elementyKadruStartowego(plan, typy).map((e) => e.id), ['a', 'b', 'c'])
    const schemat = { elementy: [{ id: 'k', typ: 'krzyz', g: { k: 'p', x: 1, y: 1 } } as Element, { id: 'las', typ: 'las', g: { k: 'w', p: [[0, 0], [9, 0], [9, 9]] } } as Element] }
    assert.equal(elementyKadruStartowego(schemat, typy).length, 2)
})

test('kwatery z zapisanych numerów, kolejność naturalna', () => {
    const plan = popraw({ slug: 'p', elementy: [
        { id: 'kB', typ: 'kwatera', nazwa: 'B', g: { k: 'r', x: 100, y: 0, w: 50, h: 50, a: 0 } },
        { id: 'kA', typ: 'kwatera', nazwa: 'A', g: { k: 'r', x: 0, y: 0, w: 50, h: 50, a: 0 } },
        grob('a', 0, 0, { oznaczenie: { kwatera: 'kB', rzad: '1', miejsce: '1' } }),
        grob('b', 0, 0, { oznaczenie: { kwatera: 'kA', rzad: '1', miejsce: '1' } }),
        grob('c', 0, 0, { oznaczenie: { kwatera: 'kA', rzad: '1', miejsce: '2' } }),
    ] } as Plan)
    const k = kwateryPlanu(plan, typy, numeryPlanu(plan))
    assert.deepEqual(k.map((x) => [x.nazwa, x.ids.length]), [['A', 2], ['B', 1]])
})

test('CEM-04: szukanie – od 2 znaków, wszystkie słowa, bez polskich znaków, bez elementów bez położenia', () => {
    const plan = { elementy: [grob('a', 0, 0, { osoby: [{ nazwa: 'Józef Przykładowy' }] }), grob('b', 0, 0, { napis: 'Ś.P. Anna Testowa 1901' }), grob('c', 0, 0, { nazwa: 'Józef', nieznanePolozenie: true })] }
    assert.deepEqual(szukajNaPlanie(plan, 'j').map((e) => e.id), [])
    assert.deepEqual(szukajNaPlanie(plan, 'jozef').map((e) => e.id), ['a'])
    assert.deepEqual(szukajNaPlanie(plan, 'anna 1901').map((e) => e.id), ['b'])
    assert.deepEqual(szukajNaPlanie(plan, 'anna 1902').map((e) => e.id), [])
})

test('CEM-24: klawiatura planu i zakładek', () => {
    assert.deepEqual(ruchKlawisza('ArrowRight'), { kolejny: 1 })
    assert.deepEqual(ruchKlawisza('ArrowUp'), { kolejny: -1 })
    assert.deepEqual(ruchKlawisza('ArrowRight', true), { przesun: [0.15, 0] })
    assert.deepEqual(ruchKlawisza('Enter'), { szczegoly: true })
    assert.deepEqual(ruchKlawisza('+'), { zoom: 1 / 1.25 })
    assert.deepEqual(ruchKlawisza('0'), { caly: true })
    assert.equal(ruchKlawisza('a'), null)
    assert.deepEqual(przesunVB([0, 0, 100, 50], [0.15, -0.15]), [15, -7.5, 100, 50])
    const z = ['plan', 'lista'] as const
    assert.equal(zakladkaKlawisza(z, 'plan', 'ArrowRight'), 'lista')
    assert.equal(zakladkaKlawisza(z, 'lista', 'ArrowRight'), 'plan')
    assert.equal(zakladkaKlawisza(z, 'lista', 'Home'), 'plan')
    assert.equal(zakladkaKlawisza(z, 'plan', 'Enter'), null)
})

test('CEM-13: adres z wybranym grobem – podmiana i usunięcie parametru, reszta adresu bez zmian', () => {
    assert.equal(adresZGrobem('https://x.pl/plany/c?grob=a#k', 'b'), '/plany/c?grob=b#k')
    assert.equal(adresZGrobem('https://x.pl/plany/c?grob=a', null), '/plany/c')
    assert.equal(adresZGrobem('https://x.pl/plany/c?x=1', 'a b'), '/plany/c?x=1&grob=a+b')
})

test('PH-13: plan historyczny i schemat bez interfejsu grobowego', () => {
    assert.equal(interfejsPlanu({}).grobowy, true)
    assert.equal(interfejsPlanu({ rodzaj: 'cmentarz' }).zakladkaListy, 'lista pochowanych')
    for (const rodzaj of ['historyczny', 'schemat'] as const) {
        const i = interfejsPlanu({ rodzaj })
        assert.equal(i.grobowy, false)
        assert.equal(i.zakladkaListy, 'lista obiektów')
        assert.ok(![i.zakladkaListy, i.czescSzukania, i.podpowiedz].some((t) => /grob|pochowan/.test(t)))
    }
})

test('PH-13: lista obiektów planu bez grobów – numer legendy, potem nazwa; bez samych napisów', async () => {
    const { obiektyListy, elementyNawigacji } = await import('./przegladarka')
    const plan = { elementy: [
        { id: 'n', typ: 'napis', nazwa: 'Rynek', g: { k: 't', x: 0, y: 0, a: 0 } } as Element,
        { id: 'b', typ: 'krzyz', nazwa: 'Krzyż', g: { k: 'p', x: 1, y: 1 } } as Element,
        { id: 'c', typ: 'krzyz', nrLegendy: '10', nazwa: 'Kapliczka', g: { k: 'p', x: 1, y: 1 } } as Element,
        { id: 'd', typ: 'krzyz', nrLegendy: '2', nazwaZrodlowa: 'Church', g: { k: 'p', x: 1, y: 1 } } as Element,
    ] }
    assert.deepEqual(obiektyListy(plan, typy).map((e) => e.id), ['d', 'c', 'b'])
    assert.deepEqual(elementyNawigacji(plan, typy, new Map()).map((e) => e.id), ['d', 'c', 'b'])
})

test('WSP-06: napisy do odczytania – grób ze zdjęciem bez napisu; grób z progiem lat nigdy (sam kształt w wersji dla czytelnika)', async () => {
    const { napisyDoOdczytania } = await import('./przegladarka')
    const zdj = [{ plik: 'a.jpg' }] as Element['zdjecia']
    const plan = popraw({ slug: 'p', elementy: [
        grob('a', 0, 0, { zdjecia: zdj }),
        grob('b', 20, 0, { zdjecia: zdj, napis: 'odczytany' }),
        grob('c', 40, 0, { zdjecia: zdj, rokZgonu: teraz - 1 }),
        grob('d', 60, 0, { zdjecia: zdj, ukryjNapis: true }),
        grob('e', 80, 0),
    ] } as Plan)
    const pub = dlaCzytelnika(plan, 'publiczne', USTAWIENIA_DOMYSLNE)
    assert.deepEqual(napisyDoOdczytania(pub, typy).map((e) => e.id), ['a'])
})

test('PH4: litery dla objaśnień, gdy plan ma numerowaną legendę; inaczej numery', async () => {
    const { znakObjasnienia } = await import('./przegladarka')
    assert.deepEqual([0, 1, 25, 26, 27, 51, 52].map((i) => znakObjasnienia(i, true)), ['a', 'b', 'z', 'aa', 'ab', 'az', 'ba'])
    assert.deepEqual([0, 9].map((i) => znakObjasnienia(i, false)), ['1', '10'])
})

test('plansza 17.11: kwatery w linii pod tytułem planu', () => {
    assert.equal(opisKwater([]), null)
    assert.equal(opisKwater(['A']), 'kwatera A')
    assert.equal(opisKwater(['A', 'B']), 'kwatery A, B')
    assert.equal(opisKwater(['A', 'B', 'C', 'D']), 'kwatery A–D')
})
