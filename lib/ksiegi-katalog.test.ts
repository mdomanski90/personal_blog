import test from 'node:test'
import assert from 'node:assert/strict'
import { filtrujKatalog, grupujWedlugMiejsc, grupujWedlugParafii, ksiegaMaSkany, widokKatalogu, szukajMiejscowosci, ksiegiDotyczaceMiejsc, czyFiltrowacMiejsca, LATA_TOMOW_NIEZNANE, type KsiegaKatalogu } from './ksiegi-katalog'

const miejscowosci = [
    { id: 'osada-a', nazwa: 'Osada A', parafie: [{ parafia: 'urzad-a', od: 1800, do: 1850 }] },
    { id: 'osada-b', nazwa: 'Osada B', parafie: [{ parafia: 'urzad-a', od: 1800, do: 1850 }] },
    { id: 'osada-c', nazwa: 'Osada C', parafie: [{ parafia: 'urzad-b', od: 1900, do: 1950 }] },
]
const parafie = [
    { id: 'urzad-a', nazwa: 'Instytucja A', wyznanie: 'unicka' },
    { id: 'urzad-b', nazwa: 'Instytucja B', wyznanie: 'rzymskokatolicka' },
]
const ksiega = (id: string, arg: Partial<KsiegaKatalogu> = {}): KsiegaKatalogu => ({
    id, parafia: 'urzad-a', instytucje: ['urzad-a'], miejsca: [], zakresy: [[1810, 1820]], wyznania: [], skany: null, jednostki: [], ...arg,
})

test('nieznany lub niepodany widok oznacza domyślnie miejscowości', () => {
    assert.equal(widokKatalogu(undefined), 'miejscowosci')
    assert.equal(widokKatalogu('inne'), 'miejscowosci')
    assert.equal(widokKatalogu('parafie'), 'parafie')
})
test('ta sama księga występuje w kilku miejscowościach bez kopiowania rekordu', () => {
    const ks = ksiega('k1')
    const wynik = grupujWedlugMiejsc([ks], miejscowosci)
    assert.deepEqual(wynik.grupy.map((g) => g.id), ['osada-a', 'osada-b'])
    assert.equal(wynik.grupy[0].ksiegi[0], wynik.grupy[1].ksiegi[0])
    assert.equal(new Set(wynik.grupy.flatMap((g) => g.ksiegi.map((k) => k.id))).size, 1)
})
test('jawne przypisanie ogranicza księgę do wskazanej miejscowości', () => {
    const wynik = grupujWedlugMiejsc([ksiega('k1', { miejsca: ['osada-b'] })], miejscowosci)
    assert.deepEqual(wynik.grupy.map((g) => g.id), ['osada-b'])
})
test('niepewne powiązanie nie usuwa księgi z katalogu', () => {
    const wynik = grupujWedlugMiejsc([ksiega('k1', { instytucje: [], parafia: '', zakresy: [] })], miejscowosci)
    assert.equal(wynik.grupy.length, 0)
    assert.deepEqual(wynik.bezPrzypisania.map((k) => k.id), ['k1'])
})
test('kilka instytucji i nieustalony wytwórca – grupowanie nie gubi rekordów', () => {
    const wynik = grupujWedlugParafii([
        ksiega('wspolna', { parafia: '', instytucje: ['urzad-a', 'urzad-b'] }),
        ksiega('nieznana', { parafia: '', instytucje: ['usuniety-slug'] }),
    ], parafie)
    assert.deepEqual(wynik.grupy.map((g) => g.id), ['urzad-a', 'urzad-b'])
    assert.equal(wynik.bezPrzypisania[0].id, 'nieznana')
})
test('filtr wyznania sprawdza wszystkie instytucje, nie tylko główną', () => {
    const ks = ksiega('wspolna', { parafia: '', instytucje: ['urzad-a', 'urzad-b'] })
    assert.deepEqual(filtrujKatalog([ks], parafie, 'rzymskokatolicka', null, false).map((k) => k.id), ['wspolna'])
    assert.deepEqual(filtrujKatalog([ks], parafie, 'prawoslawna', null, false), [])
})
test('filtr miejscowości opiera się na jednej regule powiązań, nie na nazwie', () => {
    const a = ksiega('pierwsza')
    const b = ksiega('druga', { miejsca: ['osada-c'] })
    assert.deepEqual(filtrujKatalog([a, b], parafie, undefined, miejscowosci[2], false).map((k) => k.id), ['druga'])
})
test('skany 0 pozostają znanym brakiem, brak danych nie oznacza online', () => {
    assert.equal(ksiegaMaSkany(ksiega('brak', { jednostki: [{ skany: null, liczbaSkanow: 0, digitalizacja: 'brak' }] })), false)
    assert.equal(ksiegaMaSkany(ksiega('nieznane', { jednostki: [{ skany: null, liczbaSkanow: null, digitalizacja: 'nieustalone' }] })), false)
})
test('filtr skanów zachowuje tylko jednostki zdigitalizowane', () => {
    const ks = ksiega('k1', { jednostki: [
        { skany: null, liczbaSkanow: 0, digitalizacja: 'brak' },
        { skany: null, liczbaSkanow: 23, digitalizacja: 'online' },
    ] })
    const wynik = filtrujKatalog([ks], parafie, undefined, null, true)
    assert.equal(wynik.length, 1)
    assert.equal(wynik[0].jednostki.length, 1)
    assert.equal(ks.jednostki.length, 2)
    assert.deepEqual(filtrujKatalog([ksiega('k2')], parafie, undefined, null, true), [])
})


test('lokalna wyszukiwarka dopasowuje fragment bez polskich znaków i wielkości liter', () => {
    const m = [
        { id: 'a', nazwa: 'Próchenki', inneNazwy: ['Prochenki'], formy: ['Próchenkach'] },
        { id: 'b', nazwa: 'Łosice', inneNazwy: ['Łosycze'], formy: [] },
        { id: 'c', nazwa: 'Mszanna', inneNazwy: [], formy: [] },
    ]
    assert.deepEqual(szukajMiejscowosci(m, 'proch').map((x) => x.id), ['a'])
    assert.deepEqual(szukajMiejscowosci(m, 'LOS').map((x) => x.id), ['b'])
    assert.deepEqual(szukajMiejscowosci(m, 'próchenkach').map((x) => x.id), ['a'])
    assert.deepEqual(szukajMiejscowosci(m, 'msza').map((x) => x.id), ['c'])
    assert.deepEqual(szukajMiejscowosci(m, 'xyz'), [])
    assert.equal(szukajMiejscowosci(m, '  ').length, 3)
})

test('wyszukiwanie na żywo zachowuje jedną regułę powiązań i nie duplikuje ksiąg', () => {
    const ks = [ksiega('wspolna'), ksiega('jawna', { miejsca: ['osada-b'] }), ksiega('inna', { miejsca: ['osada-c'] })]
    const kilka = ksiegiDotyczaceMiejsc(ks, miejscowosci.slice(0, 2))
    assert.deepEqual(kilka.map((k) => k.id), ['wspolna', 'jawna'])
    assert.deepEqual(ksiegiDotyczaceMiejsc(ks, miejscowosci.slice(2)).map((k) => k.id), ['inna'])
    assert.deepEqual(ksiegiDotyczaceMiejsc(ks, []), [])
})


test('wyszukiwanie miejscowości rozpoczyna się dopiero od dwóch liter', () => {
    assert.equal(czyFiltrowacMiejsca(''), false)
    assert.equal(czyFiltrowacMiejsca('p'), false)
    assert.equal(czyFiltrowacMiejsca('Ł'), false)
    assert.equal(czyFiltrowacMiejsca('a.'), false)
    assert.equal(czyFiltrowacMiejsca('Pr'), true)
    assert.equal(czyFiltrowacMiejsca('Ło'), true)
    assert.equal(czyFiltrowacMiejsca(' pro '), true)
})
test('stare linki ?miejsce=slug nadal działają bez wpisania dwóch liter', () => {
    assert.equal(czyFiltrowacMiejsca('', 'osada-a'), true)
    assert.equal(czyFiltrowacMiejsca('O', 'osada-a'), true)
})

// KI-13 (P2): filtr „ze skanami” nie zostawia lat całego zespołu, gdy tomy ze skanami nie mają własnych lat
test('KI-13: po filtrze „ze skanami” lata zespołu znikają, jeśli tomy ze skanami ich nie podają', () => {
    const k = ksiega('k13', {
        lata: '1810–1825', zakresy: [[1810, 1825]],
        jednostki: [
            { skany: 'https://przyklad.test/a', liczbaSkanow: null, digitalizacja: 'online' },
            { skany: null, liczbaSkanow: null, digitalizacja: 'brak' },
        ],
    })
    const [w] = filtrujKatalog([k], parafie, undefined, null, true)
    assert.equal(w.jednostki.length, 1)
    assert.deepEqual(w.zakresy, [], 'pasek roczników bez lat całego zespołu')
    assert.equal(w.lata, LATA_TOMOW_NIEZNANE, 'podpis zamiast lat całego zespołu (REL-05)')
    assert.equal(LATA_TOMOW_NIEZNANE, 'lata tomów ze skanami nieznane')
})
test('KI-13: lata tomów ze skanami zastępują lata zespołu', () => {
    const k = ksiega('k13b', {
        lata: '1810–1825', zakresy: [[1810, 1825]],
        jednostki: [
            { skany: 'https://przyklad.test/a', liczbaSkanow: null, digitalizacja: 'online', zakresy: [[1810, 1812]] },
            { skany: null, liczbaSkanow: null, digitalizacja: 'brak', zakresy: [[1813, 1825]] },
        ],
    })
    const [w] = filtrujKatalog([k], parafie, undefined, null, true)
    assert.deepEqual(w.zakresy, [[1810, 1812]])
    assert.equal(w.lata, '1810–1812')
})
test('KI-13: bez filtra skanów księga zostaje nietknięta', () => {
    const k = ksiega('k13c', { lata: '1810–1825', zakresy: [[1810, 1825]], jednostki: [{ skany: null, liczbaSkanow: null, digitalizacja: 'brak' }] })
    assert.equal(filtrujKatalog([k], parafie, undefined, null, false)[0], k)
})
