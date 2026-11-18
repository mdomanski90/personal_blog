// PK (decyzja 18.11): całe drzewo z rodzinami ojca i matki – rodzeństwo rodziców z małżonkami i dziećmi, krewni boczni
// bez wypełnienia, plakietki krewnych poza widokiem, podział „rodzina ojca / matki”. Karta osoby (bez opcji) bez zmian.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { indeksRelacji, type Drzewo, type Osoba, type Rodzina } from './model'
import type { StanOsob } from './dane'
import { drzewoHtml } from './drzewo'

const os = (id: string, nazwisko: string, plec: 'M' | 'K', ur: string): Osoba => ({ id, imiona: id, nazwisko, plec, zyje: 'nie', widocznosc: 'auto', wersja: 1, zdarzenia: [{ id: `${id}-u`, rodzaj: 'urodzenie', data: ur }] } as Osoba)
const rodz = (id: string, maz: string | undefined, zona: string | undefined, dzieci: string[]): Rodzina => ({ id, maz, zona, dzieci, zdarzenia: [], wersja: 1 })
function stan(ukryte: string[] = []): StanOsob {
    const o = [
        os('dziadek', 'A', 'M', '1800'), os('babcia', 'A', 'K', '1805'), os('stryjDziadka', 'A', 'M', '1802'), os('pradziad', 'A', 'M', '1770'),
        os('ojciec', 'A', 'M', '1830'), os('stryj', 'A', 'M', '1832'), os('stryjenka', 'C', 'K', '1834'), os('kuzyn', 'A', 'M', '1860'),
        os('matka', 'B', 'K', '1835'), os('wuj', 'B', 'M', '1838'), os('dziadekM', 'B', 'M', '1805'),
        os('ja', 'A', 'M', '1865'), os('siostra', 'A', 'K', '1868'), os('szwagier', 'D', 'M', '1864'), os('siostrzeniec', 'D', 'M', '1890'),
        os('zona', 'E', 'K', '1868'), os('tesc', 'E', 'M', '1840'), os('syn', 'A', 'M', '1890'),
    ]
    const f = [
        rodz('f0', 'pradziad', undefined, ['dziadek', 'stryjDziadka']),
        rodz('f1', 'dziadek', 'babcia', ['ojciec', 'stryj']), rodz('f2', 'stryj', 'stryjenka', ['kuzyn']),
        rodz('f3', 'dziadekM', undefined, ['matka', 'wuj']),
        rodz('f4', 'ojciec', 'matka', ['ja', 'siostra']), rodz('f5', 'szwagier', 'siostra', ['siostrzeniec']),
        rodz('f6', 'tesc', undefined, ['zona']), rodz('f7', 'ja', 'zona', ['syn']),
    ]
    const drzewo: Drzewo = { osoby: new Map(o.map((x) => [x.id, x])), rodziny: new Map(f.map((x) => [x.id, x])), zrodla: new Map() }
    return { drzewo, relacje: indeksRelacji(drzewo), lata: new Map(), zyje: () => false, widocznosc: (id) => (ukryte.includes(id) ? 'ja' : 'publiczne') }
}
const karty = (html: string) => [...html.matchAll(/class="dr-karta[^"]*"[^>]*data-id="([^"]+)"/g)].map((m) => m[1])
const op = { wstecz: 2, naprzod: 2, zakres: 'rodzenstwo' as const, wTabeli: true }

test('z rodzinami: rodzeństwo ojca i matki z małżonkami i dziećmi, rodzeństwo osoby z małżonkiem i dziećmi', () => {
    const h = drzewoHtml(stan(), 'ja', { ...op, boczni: true }, 'publiczne')
    for (const id of ['stryj', 'stryjenka', 'kuzyn', 'wuj', 'siostra', 'szwagier', 'siostrzeniec', 'syn']) assert.ok(karty(h).includes(id), id)
    assert.match(h, /rodzina ojca · A/)
    assert.match(h, /rodzina matki · B/)
    assert.match(h, /class="dr-podzial"/)
    assert.match(h, /aria-label="rodzice, wujostwo"/)
})

test('krewni boczni bez wypełnienia, linia prosta wypełniona', () => {
    const h = drzewoHtml(stan(), 'ja', { ...op, boczni: true }, 'publiczne')
    const klasa = (id: string) => h.match(new RegExp(`class="(dr-karta[^"]*)"[^>]*data-id="${id}"`))?.[1] ?? ''
    for (const id of ['stryj', 'kuzyn', 'stryjenka', 'wuj', 'siostrzeniec']) assert.match(klasa(id), /dr-boczna/, id)
    for (const id of ['ojciec', 'matka', 'dziadek', 'syn', 'siostra']) assert.doesNotMatch(klasa(id), /dr-boczna/, id)
})

test('rodzina ojca na lewo od ojca, rodzina matki na prawo od matki (kreski się nie krzyżują)', () => {
    const h = drzewoHtml(stan(), 'ja', { ...op, boczni: true }, 'publiczne')
    const x = (id: string) => Number(h.match(new RegExp(`data-id="${id}"[^>]*data-x="([\\d.-]+)"`))?.[1])
    assert.ok(x('stryj') < x('ojciec') && x('ojciec') < x('matka') && x('matka') < x('wuj'))
    assert.ok(x('kuzyn') < x('ja'))
})

test('plakietki: rodzeństwo dziadka poza widokiem (+1), teść poza widokiem (↑ przy żonie); bez plakietek u przodków za ich dzieci', () => {
    const h = drzewoHtml(stan(), 'ja', { ...op, boczni: true }, 'publiczne')
    assert.ok(!karty(h).includes('stryjDziadka'))
    assert.match(h, /class="dr-pl dr-pl-b"[^>]*>\+1</)
    assert.match(h, /class="dr-pl dr-pl-g"[^>]*>↑</)
    assert.doesNotMatch(h, /class="dr-pl dr-pl-d"/, 'dzieci przodków są przy ich dziecku jako +N, nie ↓N u przodka')
    assert.match(h, /poza widokiem: rodzice, rodzeństwo 1/, 'czytnik ekranu dostaje to samo słowami')
})

test('osoba ukryta: szara karta, bez plakietek i bez liczenia jej krewnych (zasada 1.6)', () => {
    const h = drzewoHtml(stan(['stryj']), 'ja', { ...op, boczni: true }, 'publiczne')
    assert.ok(!karty(h).includes('stryj'))
    assert.match(h, /dr-ukryta/)
    assert.ok(!karty(h).includes('stryjenka') && !karty(h).includes('kuzyn'), 'małżonek i dzieci osoby ukrytej się nie pojawiają')
})

test('karta osoby (bez opcji): układ jak dotąd – bez wujostwa, kuzynostwa, plakietek i podziału', () => {
    const h = drzewoHtml(stan(), 'ja', op, 'publiczne')
    for (const id of ['stryj', 'kuzyn', 'wuj', 'siostrzeniec']) assert.ok(!karty(h).includes(id), id)
    assert.doesNotMatch(h, /class="dr-pl |dr-podzial|dr-boczna|dr-strona/)
})
