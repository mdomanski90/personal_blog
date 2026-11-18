// P6a (PNL-07): paleta Ctrl+K – dopasowanie (bez polskich znaków, numer katalogowy, kilka słów) i polecenia z menu.
import test from 'node:test'
import assert from 'node:assert/strict'
import { poleceniaZMenu, szukajWPalecie, NOWE } from './paleta'
import { menuWgUstawien } from './menu'

const L = [
    { t: 'Przykładowa Maria', typ: 'osoba', href: '/keystatic/osoby/p1', d: 'ok. 1835', grupa: 'osoby' },
    { t: 'Akt ślubu Testowskich', typ: 'materiał', href: '/keystatic/collection/materialy/item/akt', nr: 'MA-0042', grupa: 'tresci', strona: '/archiwum/akt' },
    { t: 'Testowo', typ: 'miejsce', href: '/keystatic/collection/miejsca/item/testowo', grupa: 'tresci' },
    { t: 'Kapliczka w Testowie', typ: 'obiekt', href: '/keystatic/collection/obiekty/item/k', grupa: 'tresci' },
]

test('paleta: bez polskich znaków, kilka słów, numer katalogowy; najpierw tytuły zaczynające się od zapytania', () => {
    assert.deepEqual(szukajWPalecie(L, 'przykladowa').map((x) => x.t), ['Przykładowa Maria'])
    assert.deepEqual(szukajWPalecie(L, 'ma-0042').map((x) => x.t), ['Akt ślubu Testowskich'])
    assert.deepEqual(szukajWPalecie(L, 'slub testow').map((x) => x.t), ['Akt ślubu Testowskich'])
    assert.deepEqual(szukajWPalecie(L, 'testow').map((x) => x.t), ['Testowo', 'Akt ślubu Testowskich', 'Kapliczka w Testowie'])
    assert.deepEqual(szukajWPalecie(L, '   '), [])
})

test('paleta: polecenia z menu (także ukryte) i „+ nowa …”, wszystkie w grupie „polecenia”, adresy panelu', () => {
    const P = poleceniaZMenu(menuWgUstawien({ ukryte: ['raport-ksiag'] }))
    assert.ok(P.slice(0, NOWE.length).every((x) => x.typ === 'polecenie'))
    assert.ok(P.some((x) => x.t === 'raport ksiąg'), 'pozycja ukryta w menu nadal w palecie')
    assert.ok(P.every((x) => x.grupa === 'polecenia' && x.href.startsWith('/keystatic')))
    assert.deepEqual(szukajWPalecie(P, 'ostatnie operacje').map((x) => x.href), ['/keystatic/panel/operacje'])
})

test('paleta wg planszy: polecenie z wpisanym tekstem i tryb „>”', async () => {
    const { poleceniaZTekstem, tylkoPolecenia } = await import('./paleta')
    assert.deepEqual(poleceniaZTekstem('Jan Przykładowy').map((x) => [x.t, x.href]), [['+ nowa osoba „Jan Przykładowy”', '/keystatic/osoby?nowa=Jan%20Przyk%C5%82adowy']])
    assert.equal(poleceniaZTekstem('przyk')[0].t, '+ nowa osoba „Przyk”', 'wielka litera jak na planszy')
    assert.equal(poleceniaZTekstem('anna kowalska-nowak')[0].t, '+ nowa osoba „Anna Kowalska-Nowak”')
    assert.deepEqual(poleceniaZTekstem('> kop'), [])
    assert.equal(tylkoPolecenia(' >kopie'), true)
})
