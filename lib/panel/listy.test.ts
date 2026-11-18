// P5 (PNL-09): listy panelu i zmiany zbiorcze – dane syntetyczne w katalogu tymczasowym.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import * as yaml from 'js-yaml'
import { daneListy, podgladZmiany, rozdziel, serializuj, zapiszZmiane } from './listy'
import { kolumnyWgUstawien, LISTY } from './listy-konfig'
import { cofnijOperacje } from './operacje'

async function strona() {
    const k = await fs.mkdtemp(path.join(os.tmpdir(), 'listy-'))
    const w = async (p: string, t: string) => { await fs.mkdir(path.dirname(path.join(k, 'content', p)), { recursive: true }); await fs.writeFile(path.join(k, 'content', p), t) }
    const mdoc = (dane: Record<string, unknown>, tresc = 'Opis syntetyczny.\n') => serializuj(dane, tresc)
    await w('miejsca/testowo.mdoc', mdoc({ title: 'Testowo', type: 'wies', visibility: 'publiczne' }))
    await w('miejsca/wola.mdoc', mdoc({ title: 'Wola', type: 'wies', visibility: 'publiczne' }))
    await w('obiekty/obj-kapliczka.mdoc', mdoc({ title: 'Kapliczka', type: 'kapliczka', spatial: 'testowo', exists: true, visibility: 'ja' }))
    await w('obiekty/obj-krzyz.mdoc', mdoc({ title: 'Krzyż', type: 'krzyz', spatial: 'wola', exists: true, visibility: 'publiczne' }))
    await w('obiekty/obj-zly.mdoc', mdoc({ title: 'Zły', type: 'rodzaj-spoza-listy', exists: true, visibility: 'ja' }))
    await w('zbiory/zbior-a.mdoc', mdoc({ title: 'Zbiór A', visibility: 'publiczne' }))
    await w('materialy/mat-01.mdoc', mdoc({ title: 'Dokument 1', type: 'dokument', visibility: 'ja', collections: [] }))
    await w('materialy/mat-02.mdoc', mdoc({ title: 'Dokument 2', type: 'dokument', visibility: 'ja', collections: ['zbior-a'] }))
    await w('parafie/parafia-testowo.yaml', yaml.dump({ title: 'parafia Testowo', religion: 'rzymskokatolicka', seat: 'testowo' }))
    await w('posts/wpis.mdoc', mdoc({ title: 'Wpis', date: '2026-01-01', kind: 'esej', visibility: 'publiczne' }, 'O [[obj-krzyz]] w Woli.\n'))
    return k
}

test('format Keystatic: rozdzielenie i złożenie .mdoc bez zmian (js-yaml dump, „---”)', () => {
    const t = serializuj({ title: 'A', visibility: 'ja', lista: ['x', 'y'] }, 'Treść\n\n---\n\nz kreską w środku\n')
    const r = rozdziel(t)!
    assert.equal(serializuj(yaml.load(r.naglowek) as Record<string, unknown>, r.cialo), t)
    assert.equal(rozdziel('bez nagłówka'), null)
})

test('kolumny: nazwa, miejscowość, rodzaj/wyznanie, identyfikator na końcu; ustawienie zmienia kolejność i ukrywa', () => {
    assert.deepEqual(kolumnyWgUstawien(LISTY.obiekty).map((k) => k.etykieta), ['nazwa', 'miejscowość', 'rodzaj', 'widoczność', 'identyfikator'])
    assert.deepEqual(kolumnyWgUstawien(LISTY.parafie).map((k) => k.etykieta), ['nazwa', 'miejscowość', 'wyznanie', 'czas', 'identyfikator'])
    assert.deepEqual(kolumnyWgUstawien(LISTY.parafie, ['religion', 'title', 'nie-ma', 'religion']).map((k) => k.pole), ['religion', 'title'])
    assert.deepEqual(kolumnyWgUstawien(LISTY.parafie, []).map((k) => k.pole), LISTY.parafie.domyslne)
})

test('lista: etykiety z konfiguracji Keystatic, nazwy powiązań, wpis nieczytelny oznaczony; ustawienie z content/_panel/listy.json', async () => {
    const k = await strona()
    try {
        const d = await daneListy('obiekty', k)
        assert.deepEqual(d.wiersze.map((w) => w.slug), ['obj-kapliczka', 'obj-krzyz', 'obj-zly'])
        const kap = d.wiersze[0]
        assert.equal(kap.komorki.spatial.tekst, 'Testowo')
        assert.equal(kap.komorki.type.tekst, 'kapliczka')
        assert.equal(kap.komorki.visibility.tekst, 'tylko ja')
        assert.match(d.wiersze[2].nieczytelny ?? '', /type|Invalid|rodzaj/i)
        await fs.mkdir(path.join(k, 'content', '_panel'), { recursive: true })
        await fs.writeFile(path.join(k, 'content', '_panel', 'listy.json'), JSON.stringify({ obiekty: { kolumny: ['type', 'title', 'slug'] } }))
        assert.deepEqual((await daneListy('obiekty', k)).kolumny.map((c) => c.pole), ['type', 'title', 'slug'])
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})

test('zmiana zbiorcza widoczności: podgląd skutku (publikacja, ukrycie z odwołaniami, bez zmian, nieczytelne), zapis tylko pola, cofnij bit w bit', async () => {
    const k = await strona()
    try {
        const przed = await fs.readFile(path.join(k, 'content', 'obiekty', 'obj-kapliczka.mdoc'), 'utf8')
        const p = await podgladZmiany('obiekty', ['obj-kapliczka', 'obj-zly'], { rodzaj: 'widocznosc', wartosc: 'publiczne' }, k)
        assert.deepEqual([p.zmienione, p.bezZmian, p.nieczytelne], [1, 0, ['obj-zly']])
        assert.match(p.skutek.join(' '), /stanie się publiczna/)
        assert.match(p.skutek.join(' '), /1 pominięte/)
        const u = await podgladZmiany('obiekty', ['obj-krzyz'], { rodzaj: 'widocznosc', wartosc: 'ja' }, k)
        assert.match(u.skutek.join(' '), /404.*Wspomina je 1 innych/, 'wpis wspomina krzyż w treści')
        const w = await zapiszZmiane('obiekty', ['obj-kapliczka', 'obj-krzyz', 'obj-zly'], { rodzaj: 'widocznosc', wartosc: 'publiczne' }, k)
        assert.deepEqual([w.zapisane, w.bezZmian], [1, 1])
        const po = await fs.readFile(path.join(k, 'content', 'obiekty', 'obj-kapliczka.mdoc'), 'utf8')
        assert.equal(po, przed.replace('visibility: ja', 'visibility: publiczne'), 'zmienia się tylko widoczność, reszta pliku bez zmian')
        await cofnijOperacje(w.id!, { korzen: k })
        assert.equal(await fs.readFile(path.join(k, 'content', 'obiekty', 'obj-kapliczka.mdoc'), 'utf8'), przed)
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})

test('zmiana zbiorcza powiązań: dopisz do zbioru (bez duplikatu), usuń; nieznany cel i pole spoza listy odrzucone', async () => {
    const k = await strona()
    try {
        const p = await podgladZmiany('materialy', ['mat-01', 'mat-02'], { rodzaj: 'dodaj-relacje', pole: 'collections', wartosc: 'zbior-a' }, k)
        assert.deepEqual([p.zmienione, p.bezZmian], [1, 1])
        assert.match(p.skutek[0], /„Zbiór A” pojawi się przy 1 pozycji, a ta pozycja – na karcie „Zbiór A”/)
        assert.deepEqual(p.przyklady.map((x) => [x.przed, x.po]), [['(brak)', 'Zbiór A']])
        await zapiszZmiane('materialy', ['mat-01', 'mat-02'], { rodzaj: 'dodaj-relacje', pole: 'collections', wartosc: 'zbior-a' }, k)
        const m1 = rozdziel(await fs.readFile(path.join(k, 'content', 'materialy', 'mat-01.mdoc'), 'utf8'))!
        assert.deepEqual((yaml.load(m1.naglowek) as { collections: string[] }).collections, ['zbior-a'])
        assert.equal(m1.cialo, 'Opis syntetyczny.\n', 'treść nietknięta')
        const usun = await zapiszZmiane('materialy', ['mat-01', 'mat-02'], { rodzaj: 'usun-relacje', pole: 'collections', wartosc: 'zbior-a' }, k)
        assert.equal(usun.zapisane, 2)
        await assert.rejects(podgladZmiany('materialy', ['mat-01'], { rodzaj: 'dodaj-relacje', pole: 'collections', wartosc: 'nie-ma' }, k), /Nie ma takiej pozycji/)
        await assert.rejects(podgladZmiany('materialy', ['mat-01'], { rodzaj: 'dodaj-relacje', pole: 'title', wartosc: 'zbior-a' }, k), /nie można zmieniać zbiorczo/)
        await assert.rejects(podgladZmiany('parafie', ['parafia-testowo'], { rodzaj: 'widocznosc', wartosc: 'publiczne' }, k), /nie ma ustawienia widoczności/)
        await assert.rejects(podgladZmiany('nie-ma', ['x'], { rodzaj: 'widocznosc', wartosc: 'ja' }, k), /Nieznana kolekcja/)
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})
