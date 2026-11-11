import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bezNawiasow, fragment, slownikOdnosnikow, tekstOdnosnika, wzorzecWzmianek, znajdzWzmianki, type Cel } from './odnosniki'

const olszanka: Cel = { rodzaj: 'miejsce', id: 'olszanka', nazwa: 'Olszanka', adres: '/miejsca/olszanka' }
const luby: Cel = { rodzaj: 'miejsce', id: 'luby', nazwa: 'Łuby', adres: '/miejsca/luby' }
const biez: Cel = { rodzaj: 'temat', id: 'biezenstwo', nazwa: 'Bieżeństwo', adres: '/tematy/biezenstwo' }
const rozwiaz = slownikOdnosnikow([
    { cel: olszanka, nazwy: ['w Olszance', 'Ольшанка', 'Olszanki', 'Olszance'] },
    { cel: luby, nazwy: ['Łubach'] },
    { cel: biez, nazwy: ['bieżeńcy', 'bieżeństwa'] },
])

test('odnośniki: identyfikator, nazwa, forma, przyimek, cyrylica', () => {
    assert.equal(rozwiaz('olszanka'), olszanka)
    assert.equal(rozwiaz('Olszanka'), olszanka)
    assert.equal(rozwiaz('Olszance'), olszanka)
    assert.equal(rozwiaz('w Olszance'), olszanka)
    assert.equal(rozwiaz('Ольшанка'), olszanka)
    assert.equal(rozwiaz('biezenstwo'), biez)
    assert.equal(rozwiaz('bieżeństwa'), biez)
    assert.equal(rozwiaz('Kornica'), null)
})

test('tekst odnośnika: identyfikator → nazwa, własny tekst', () => {
    assert.equal(tekstOdnosnika(biez, 'biezenstwo'), 'Bieżeństwo')
    assert.equal(tekstOdnosnika(olszanka, 'Olszance'), 'Olszance')
    assert.equal(tekstOdnosnika(olszanka, 'Olszanka', 'we wsi'), 'we wsi')
    assert.equal(tekstOdnosnika(null, 'Kornica'), 'Kornica')
    assert.equal(bezNawiasow('z [[biezenstwo]] i [[Olszanka|wsi]]', rozwiaz), 'z Bieżeństwo i wsi')
})

test('wzmianki: całe słowa, wielkość liter dla nazw własnych, nie w odnośnikach', () => {
    const w = wzorzecWzmianek(['Łuby', 'Łubach', 'w Łubach', 'Ł'])
    const t = 'Był luby sercu. W Łubach mieszkał, [[Łuby]] i Łubach, Łubachowski.'
    const znalezione = znajdzWzmianki(t, w).map((x) => t.slice(x.start, x.koniec))
    assert.deepEqual(znalezione, ['Łubach', 'Łubach'])
    const m = wzorzecWzmianek(['bieżeństwo', 'bieżeńcy'])
    assert.deepEqual(znajdzWzmianki('Bieżeńcy wrócili; bieżeństwo trwało.', m).length, 2)
    const tematy = wzorzecWzmianek(['Bieżeństwo', 'Bieżeństwa'], true)
    assert.equal(znajdzWzmianki('czas bieżeństwa i Bieżeństwo', tematy).length, 2)
})

test('fragment: ucięty na słowach, odnośniki zamienione na tekst', () => {
    const t = 'Początek bardzo długiego zdania, które ciągnie się i ciągnie, aż wreszcie mowa o [[biezenstwo]] w Olszance i dalej jeszcze sporo słów do końca akapitu tego.'
    const i = t.indexOf('Olszance')
    const f = fragment(t, i, i + 8, rozwiaz, 40)
    assert.equal(f.trafienie, 'Olszance')
    assert.ok(f.przed.startsWith('…'))
    assert.ok(f.przed.includes('Bieżeństwo'))
    assert.ok(!f.przed.includes('[['))
    assert.ok(f.po.endsWith('…'))
})
