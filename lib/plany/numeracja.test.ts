import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dlaCzytelnika, popraw, rokZgonuZeZrodlem, type Element, type Plan } from './model'
import {
    grobyKolejno, literaRzedu, nowePowtorzenie, numerKrotki, numerTekst, numeryPlanu, porownajCzesc, powtorzoneNazwyKwater,
    kolejnoDoPracy, propozycja, przenumeruj, raportNumerow, stanNumeracji, uzupelnij, zajety, zastosujNumery,
} from './numeracja'
import { katalog, USTAWIENIA_DOMYSLNE } from './typy'

const grob = (id: string, x: number, y: number, reszta: Partial<Element> = {}): Element => ({ id, typ: 'grob', g: { k: 'r', x, y, w: 10, h: 20, a: 0 }, ...reszta })
const kwatera = (id: string, nazwa: string, x0: number, reszta: Partial<Element> = {}): Element =>
    ({ id, typ: 'kwatera', nazwa, kat: 0, g: { k: 'w', p: [[x0 - 50, -50], [x0 + 200, -50], [x0 + 200, 200], [x0 - 50, 200]] }, ...reszta })
const typy = katalog()
const plan = (elementy: Element[]): Plan => popraw({ slug: 'p', widocznosc: 'publiczne', elementy } as Plan)

test('A2-01: numer zapisany – ten sam dla anonima i redaktora, także gdy w rzędzie jest grób „tylko ja”', () => {
    const p = plan([kwatera('kw', 'A', 0), grob('a', 0, 0), grob('b', 15, 0, { widocznosc: 'ja' }), grob('c', 30, 0)])
    // dawne zachowanie: numer liczony po filtrze – u anonima „c” byłby miejscem 2; teraz numery nadaje edytor i są zapisane
    const z = zastosujNumery(p.elementy, uzupelnij(p, typy))
    const pelny = { ...p, elementy: z }
    const red = numeryPlanu(pelny), anon = numeryPlanu(dlaCzytelnika(pelny, 'publiczne', USTAWIENIA_DOMYSLNE))
    assert.deepEqual(red.get('c'), { kwatera: 'A', rzad: '1', miejsce: '3' })
    assert.deepEqual(anon.get('c'), red.get('c'))
    assert.equal(anon.has('b'), false) // grób niewidoczny – luka (decyzja 16.11)
})

test('grób z ograniczonym napisem: czytelnik dostaje sam kształt i numer, bez id kwatery', () => {
    const p = plan([kwatera('kw', 'A', 0), grob('a', 0, 0, { rokZgonu: new Date().getFullYear() - 1, napis: 'tajne', oznaczenie: { kwatera: 'kw', rzad: '1', miejsce: '1' } })])
    const e = dlaCzytelnika(p, 'publiczne', USTAWIENIA_DOMYSLNE).elementy.find((x) => x.id === 'a')!
    assert.deepEqual(Object.keys(e).sort(), ['g', 'id', 'numer', 'ograniczony', 'stan', 'typ'].sort())
    assert.deepEqual(e.numer, { kwatera: 'A', rzad: '1', miejsce: '1' })
})

test('A2-03: dwie kwatery o tej samej nazwie – numery liczone osobno (wg id), powtórzona nazwa wykryta', () => {
    const p = plan([kwatera('k1', 'A', 0), kwatera('k2', 'A', 400), grob('a', 0, 0), grob('b', 400, 0)])
    const z = uzupelnij(p, typy)
    assert.deepEqual(z.map((x) => x.nowe), [{ kwatera: 'k1', rzad: '1', miejsce: '1' }, { kwatera: 'k2', rzad: '1', miejsce: '1' }])
    assert.deepEqual(powtorzoneNazwyKwater(p), ['A'])
    assert.deepEqual(stanNumeracji(p, typy).nazwyKwater, ['A'])
})

test('zmiana nazwy kwatery nie wymaga przenumerowania', () => {
    const p = plan([kwatera('kw', 'A', 0), grob('a', 0, 0, { oznaczenie: { kwatera: 'kw', rzad: '2', miejsce: '5' } })])
    p.elementy[0].nazwa = 'B'
    assert.equal(numerTekst(numeryPlanu(p).get('a')), 'kwatera B · rząd 2 · miejsce 5')
    assert.equal(numerKrotki(numeryPlanu(p).get('a')), 'B/2/5')
})

test('propozycja: rzędy literami i początek w prawym dolnym rogu', () => {
    const els = [grob('a', 0, 0), grob('b', 15, 0), grob('c', 0, 40), grob('d', 15, 40)]
    const zwykla = propozycja(plan([kwatera('kw', 'A', 0), ...els]), typy, 'kw')
    assert.deepEqual([...zwykla].map(([id, o]) => `${id}:${o.rzad}/${o.miejsce}`).sort(), ['a:1/1', 'b:1/2', 'c:2/1', 'd:2/2'])
    const odwr = propozycja(plan([kwatera('kw', 'A', 0, { numeracjaKwatery: { rzedy: 'litery', poczatek: 'pd' } }), ...els]), typy, 'kw')
    assert.deepEqual([...odwr].map(([id, o]) => `${id}:${o.rzad}/${o.miejsce}`).sort(), ['a:B/2', 'b:B/1', 'c:A/2', 'd:A/1'])
})

test('przenumeruj: tabela różnic tylko dla zmienionych; powtórzenie wykluczone; grób spoza kwatery traci numer', () => {
    const p = plan([kwatera('kw', 'A', 0), grob('a', 0, 0, { oznaczenie: { kwatera: 'kw', rzad: '1', miejsce: '1' } }), grob('b', 15, 0, { oznaczenie: { kwatera: 'kw', rzad: '1', miejsce: '7' } }),
        grob('x', 900, 900, { oznaczenie: { kwatera: 'kw', rzad: '1', miejsce: '2' } })])
    const z = przenumeruj(p, typy, 'kw')
    assert.deepEqual(z.map((x) => [x.id, x.nowe?.miejsce ?? null]), [['b', '2'], ['x', null]])
    const po = { ...p, elementy: zastosujNumery(p.elementy, z) }
    assert.equal(nowePowtorzenie(p, po), null)
    assert.equal(po.elementy.find((e) => e.id === 'x')!.oznaczenie, undefined)
    assert.deepEqual(przenumeruj(po, typy, 'kw'), []) // powtórzenie niczego nie zmienia
})

test('uzupełnij: istniejące numery bez zmian, zajęte miejsce → następne wolne w rzędzie', () => {
    // „b” ma ręcznie nadany numer 1/1, więc „a” (z położenia 1/1) dostaje 1/3 (po zajętym 1/2 grobu „c”)
    const p = plan([kwatera('kw', 'A', 0), grob('a', 0, 0), grob('b', 15, 0, { oznaczenie: { kwatera: 'kw', rzad: '1', miejsce: '1' } }), grob('c', 30, 0, { oznaczenie: { kwatera: 'kw', rzad: '1', miejsce: '2' } })])
    assert.deepEqual(uzupelnij(p, typy), [{ id: 'a', nowe: { kwatera: 'kw', rzad: '1', miejsce: '3' } }])
    const po = { ...p, elementy: zastosujNumery(p.elementy, uzupelnij(p, typy)) }
    assert.deepEqual(uzupelnij(po, typy), [])
    assert.equal(nowePowtorzenie(p, po), null)
})

test('groby poza kwaterami: numer bez kwatery', () => {
    const p = plan([grob('a', 0, 0), grob('b', 15, 0)])
    assert.deepEqual(uzupelnij(p, typy).map((z) => z.nowe), [{ rzad: '1', miejsce: '1' }, { rzad: '1', miejsce: '2' }])
})

test('ręczna korekta: zajęte miejsce wykryte bez względu na wielkość liter; zapis z nowym powtórzeniem odrzucony', () => {
    const p = plan([kwatera('kw', 'A', 0), grob('a', 0, 0, { oznaczenie: { kwatera: 'kw', rzad: 'b', miejsce: '1' } }), grob('b', 15, 0)])
    assert.equal(zajety(p, 'b', { kwatera: 'kw', rzad: 'B', miejsce: ' 1' })?.id, 'a')
    assert.equal(zajety(p, 'a', { kwatera: 'kw', rzad: 'B', miejsce: '1' }), null)
    const zly = { ...p, elementy: p.elementy.map((e) => (e.id === 'b' ? { ...e, oznaczenie: { kwatera: 'kw', rzad: 'B', miejsce: '1' } } : e)) }
    assert.match(nowePowtorzenie(p, zly) ?? '', /powtórzony numer grobu: kwatera A · rząd b · miejsce 1/)
    // powtórzenie, które już było zapisane, nie blokuje innych zmian (pokazuje je panel jakości)
    assert.equal(nowePowtorzenie(zly, { ...zly, tytul: 'x' } as Plan), null)
})

test('stan numeracji: bez numeru i grób przesunięty do innej kwatery', () => {
    const p = plan([kwatera('k1', 'A', 0), kwatera('k2', 'B', 400), grob('a', 0, 0), grob('b', 400, 0, { oznaczenie: { kwatera: 'k1', rzad: '1', miejsce: '1' } })])
    const s = stanNumeracji(p, typy)
    assert.deepEqual(s.bezNumeru.map((e) => e.id), ['a'])
    assert.deepEqual(s.pozaKwatera.map((e) => e.id), ['b'])
})

test('kolejność: rzędy literami i liczbami, „12a” po „12”', () => {
    assert.equal(literaRzedu(1), 'A'); assert.equal(literaRzedu(26), 'Z'); assert.equal(literaRzedu(27), 'AA')
    assert.ok(porownajCzesc('2', '10') < 0); assert.ok(porownajCzesc('Z', 'AA') < 0); assert.ok(porownajCzesc('12', '12a') < 0)
    const p = plan([grob('a', 0, 0, { oznaczenie: { rzad: '2', miejsce: '1' } }), grob('b', 0, 0, { oznaczenie: { rzad: '10', miejsce: '1' } }), grob('c', 0, 0, { oznaczenie: { rzad: '2', miejsce: '12a' } })])
    assert.deepEqual(grobyKolejno(p, numeryPlanu(p)).map((e) => e.id), ['a', 'c', 'b'])
})

test('popraw: numer w złym kształcie usunięty, wyliczony `numer` nie trafia do zapisu', () => {
    const p = plan([grob('a', 0, 0, { oznaczenie: { rzad: '', miejsce: '1' } }), grob('b', 0, 0, { oznaczenie: { rzad: '1', miejsce: '2' }, numer: { kwatera: 'X', rzad: '9', miejsce: '9' } })])
    assert.equal(p.elementy[0].oznaczenie, undefined)
    assert.deepEqual(p.elementy[1].oznaczenie, { rzad: '1', miejsce: '2' })
    assert.equal(p.elementy[1].numer, undefined)
})

test('A2-09: rok śmierci – reguła bez zmian, ze źródłem do pokazania w edytorze', () => {
    assert.deepEqual(rokZgonuZeZrodlem(grob('a', 0, 0, { rokZgonu: 1950, napis: '2001' })), { rok: 1950, zrodlo: 'pole' })
    assert.deepEqual(rokZgonuZeZrodlem(grob('a', 0, 0, { osoby: [{ nazwa: 'Jan', zm: '1930' }], napis: 'odnowiono 1998' })), { rok: 1998, zrodlo: 'napis' })
    assert.deepEqual(rokZgonuZeZrodlem(grob('a', 0, 0, { osoby: [{ nazwa: 'Jan', zm: '1930' }], napis: '1864–1930' })), { rok: 1930, zrodlo: 'osoby' })
    assert.equal(rokZgonuZeZrodlem(grob('a', 0, 0, { napis: 'bez dat' })), null)
})

test('kolejność pracy w edytorze obejmuje też groby bez numeru', () => {
    const p = plan([kwatera('kw', 'A', 0), grob('a', 15, 0, { oznaczenie: { kwatera: 'kw', rzad: '1', miejsce: '2' } }), grob('b', 0, 0), grob('c', 0, 40)])
    assert.deepEqual(kolejnoDoPracy(p, typy).map((e) => e.id), ['b', 'a', 'c'])
})

test('migracja: numery z pełnego planu; raport liczy groby, którym zmieni się numer u czytelnika; powtórzenie nic nie zmienia', () => {
    const p = plan([kwatera('kw', 'A', 0), grob('a', 0, 0), grob('b', 15, 0, { widocznosc: 'bliscy' }), grob('c', 30, 0), grob('d', 0, 40)])
    const r = raportNumerow(p, typy, USTAWIENIA_DOMYSLNE)
    assert.equal(r.grobow, 4); assert.equal(r.poMigracji, false); assert.equal(r.zmiany.length, 4)
    assert.equal(r.inaczejPublicznie, 1) // „c”: dawniej u anonima miejsce 2, teraz 3 (luka po „b”)
    assert.equal(r.inaczejBliscy, 0)
    const po = { ...p, elementy: zastosujNumery(p.elementy, r.zmiany) }
    const r2 = raportNumerow({ ...po, elementy: [...po.elementy, grob('e', 15, 40)] }, typy, USTAWIENIA_DOMYSLNE)
    assert.equal(r2.poMigracji, true); assert.equal(r2.zmiany.length, 0); assert.equal(r2.bezNumeru, 1)
})
