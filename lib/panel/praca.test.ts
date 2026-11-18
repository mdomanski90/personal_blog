// P6a (PNL-08): „wróć do pracy” – ostatnio edytowane, przypięte, widoki list (dane syntetyczne).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { dopiszOstatnie, zapiszOstatnie, zapiszOstatniePozycje, wczytajPrace, dodajDoListy, usunZListy, adresPanelu, MAKS_OSTATNICH } from './praca'

test('ostatnie: najnowsze pierwsze, jeden wpis na adres (miejsce pracy z nowszego), limit', () => {
    let L = dopiszOstatnie([], [{ href: '/keystatic/plany/testowo?el=g1', nazwa: 'plan „Testowo”', miejsce: 'grób 1' }], 't1')
    L = dopiszOstatnie(L, [{ href: '/keystatic/osoby/p1', nazwa: 'osoba' }], 't2')
    L = dopiszOstatnie(L, [{ href: '/keystatic/plany/testowo?el=g2', nazwa: 'plan „Testowo”', miejsce: 'grób 2' }], 't3')
    assert.deepEqual(L.map((x) => [x.href, x.czas]), [['/keystatic/plany/testowo?el=g2', 't3'], ['/keystatic/osoby/p1', 't2']])
    for (let i = 0; i < 20; i++) L = dopiszOstatnie(L, [{ href: `/keystatic/osoby/x${i}`, nazwa: 'x' }])
    assert.equal(L.length, MAKS_OSTATNICH)
})

test('praca.json: zapis Keystatic → adres edycji; przypnij, widok, odepnij; tylko adresy panelu', async () => {
    const k = await fs.mkdtemp(path.join(os.tmpdir(), 'praca-'))
    try {
        await zapiszOstatnie(['content/obiekty/testowa-kapliczka.mdoc', 'content/_panel/wstepy-dzialow.json', 'pliki-archiwum/x.jpg'], k)
        const p = await wczytajPrace(k)
        assert.deepEqual(p.ostatnie.map((x) => x.href), ['/keystatic/collection/obiekty/item/testowa-kapliczka', '/keystatic/singleton/wstepyDzialow'])
        assert.match(p.ostatnie[0].nazwa, /„testowa-kapliczka”/)
        await dodajDoListy('przypiete', { href: '/keystatic/osoby/p1', nazwa: 'Przykładowa Maria' }, k)
        await dodajDoListy('widoki', { href: '/keystatic/panel/lista/materialy?widocznosc=ja', nazwa: 'materiały · tylko ja' }, k)
        assert.equal(await dodajDoListy('przypiete', { href: 'https://zly.pl', nazwa: 'x' }, k), null)
        await zapiszOstatniePozycje([{ href: '//zly', nazwa: 'x' }], k)
        let q = await wczytajPrace(k)
        assert.deepEqual([q.przypiete.length, q.widoki.length, q.ostatnie.length], [1, 1, 2])
        await usunZListy('przypiete', '/keystatic/osoby/p1', k)
        q = await wczytajPrace(k)
        assert.equal(q.przypiete.length, 0)
        assert.equal(adresPanelu('/keystatic/panel'), true)
        assert.equal(adresPanelu('/osoby/x'), false)
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})
