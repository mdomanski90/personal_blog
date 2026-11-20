// Decyzja właściciela 20.11 15:2x (ankieta B): grób z kilkoma osobami, z których część zmarła w progu lat –
// publicznie widać osoby spoza progu (bez roku – gdy powód ma inna osoba z datą, KOREKTA 20.11) i dopisek o osobach zmarłych niedawno;
// napis, zdjęcia, opis, rok i osoby z progu – ukryte. „Ukryj napis” – jak dotąd cały grób ukryty. Dane syntetyczne.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dlaCzytelnika, popraw, type Element, type Plan } from './model'
import { szukajNaPlanie } from './przegladarka'
import { USTAWIENIA_DOMYSLNE } from './typy'

const R = new Date().getFullYear()
const grob = (id: string, reszta: Partial<Element> = {}): Element => ({ id, typ: 'grob', g: { k: 'r', x: 0, y: 0, w: 10, h: 20, a: 0 }, ...reszta })
const plan = (elementy: Element[]): Plan => popraw({ slug: 'p', widocznosc: 'publiczne', elementy } as Plan)
const mieszany = () => grob('g', {
    napis: `Ś.P. Jan Dawny 1890–1950, Anna Dawna 1895–1960, Piotr Dawny 1920–1980, Ewa Nowa 1940–${R - 2}`,
    opis: 'opis z nazwiskiem Ewy', zdjecia: [{ plik: 'z.jpg' }],
    osoby: [
        { nazwa: 'Jan Dawny', ur: '1890', zm: '1950', id: 'os-jan' }, { nazwa: 'Anna Dawna', ur: '1895', zm: '1960' },
        { nazwa: 'Piotr Dawny', zm: '1980' }, { nazwa: 'Ewa Nowa', ur: '1940', zm: String(R - 2), id: 'os-ewa' },
    ],
})

test('grób mieszany: anonim widzi 3 osoby spoza progu i dopisek, bez osoby z progu, napisu, zdjęć, opisu', () => {
    const e = dlaCzytelnika(plan([mieszany()]), 'publiczne', USTAWIENIA_DOMYSLNE).elementy[0]
    assert.equal(e.ograniczony, true)
    assert.deepEqual(e.osoby?.map((o) => o.nazwa), ['Jan Dawny', 'Anna Dawna', 'Piotr Dawny'])
    assert.equal(e.ukryteOsoby, true)
    assert.equal(e.napis, undefined); assert.equal(e.opis, undefined); assert.equal(e.zdjecia, undefined); assert.equal(e.rokZgonu, undefined)
    assert.ok(!JSON.stringify(e).includes('Ewa'), 'żadnego śladu osoby z progu')
})

test('grób mieszany: szukanie na planie znajduje grób po osobie spoza progu, nie po osobie z progu', () => {
    const p = dlaCzytelnika(plan([mieszany()]), 'publiczne', USTAWIENIA_DOMYSLNE)
    assert.equal(szukajNaPlanie(p, 'Anna Dawna').length, 1)
    assert.equal(szukajNaPlanie(p, 'Ewa Nowa').length, 0)
})

test('grób mieszany: osoba bez roku pokazywana, gdy powód ma inna osoba z datą; rok z drzewa w progu – ukrywa', () => {
    const g = grob('g', { osoby: [{ nazwa: 'Bez Daty' }, { nazwa: 'Z Drzewa', id: 'os-d' }, { nazwa: 'Świeża', zm: String(R - 1) }] })
    const e = dlaCzytelnika(plan([g]), 'publiczne', USTAWIENIA_DOMYSLNE, (id) => (id === 'os-d' ? R - 3 : null)).elementy[0]
    assert.deepEqual(e.osoby?.map((o) => o.nazwa), ['Bez Daty'])
    assert.equal(e.ukryteOsoby, true)
})

test('KOREKTA 20.11: powód ograniczenia z napisu albo pola „rok śmierci” – osoba bez roku ukryta (może być zmarłą niedawno)', () => {
    const zNapisu = grob('a', { napis: `Jan Kowalski zm. ${R - 5}`, osoby: [{ nazwa: 'Jan Kowalski' }] })
    const zPola = grob('b', { rokZgonu: R - 5, osoby: [{ nazwa: 'Jan Kowalski' }, { nazwa: 'Stary Dawny', zm: '1930' }] })
    const [a, b] = dlaCzytelnika(plan([zNapisu, zPola]), 'publiczne', USTAWIENIA_DOMYSLNE).elementy
    assert.equal(a.osoby, undefined)
    assert.deepEqual(b.osoby?.map((o) => o.nazwa), ['Stary Dawny'])
    assert.ok(!JSON.stringify([a, b]).includes('Kowalski'))
})

test('grób mieszany: wszyscy w progu – jak dotąd sam kształt; „ukryj napis” – jak dotąd cały grób ukryty', () => {
    const wszyscy = grob('a', { osoby: [{ nazwa: 'A', zm: String(R - 1) }, { nazwa: 'B', zm: String(R - 5) }] })
    const ukryj = grob('b', { ukryjNapis: true, osoby: [{ nazwa: 'Stary', zm: '1900' }] })
    const [a, b] = dlaCzytelnika(plan([wszyscy, ukryj]), 'publiczne', USTAWIENIA_DOMYSLNE).elementy
    assert.deepEqual(Object.keys(a).sort(), ['g', 'id', 'ograniczony', 'stan', 'typ'].sort())
    assert.deepEqual(Object.keys(b).sort(), ['g', 'id', 'ograniczony', 'stan', 'typ'].sort())
})

test('grób mieszany: rok z napisu (odnowienie) w progu, wszystkie osoby dawne – osoby widoczne, bez dopisku o osobach', () => {
    const g = grob('g', { napis: `odnowiono ${R - 1}`, osoby: [{ nazwa: 'Stary', zm: '1920' }] })
    const e = dlaCzytelnika(plan([g]), 'publiczne', USTAWIENIA_DOMYSLNE).elementy[0]
    assert.equal(e.ograniczony, true)
    assert.deepEqual(e.osoby?.map((o) => o.nazwa), ['Stary'])
    assert.equal(e.ukryteOsoby, undefined)
    assert.equal(e.napis, undefined)
})

test('grób mieszany: zalogowany bliski widzi wszystko jak dotąd', () => {
    const e = dlaCzytelnika(plan([mieszany()]), 'bliscy', USTAWIENIA_DOMYSLNE).elementy[0]
    assert.equal(e.ograniczony, undefined)
    assert.equal(e.osoby?.length, 4)
    assert.ok(e.napis?.includes('Ewa'))
})
