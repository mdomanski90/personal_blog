import { test } from 'node:test'
import assert from 'node:assert/strict'
import { miejscaPowiazane, punktyMapyMaterialu, punktyMapyZbioru, wierszeZbioru } from './zbior'

test('ARC-09 (P3): wiersze zbioru liczone z materiałów – rodzaje, lata, miejsca, tematy; osoby tylko widoczne dla czytelnika', () => {
    const w = wierszeZbioru([
        { rodzaj: 'zdjecie', lata: [1931, 1931], miejsca: ['testowo'], tematy: [], osobyIds: ['os-jan', 'os-ukryty'] },
        { rodzaj: 'dokument', lata: [1922, 1925], miejsca: ['testowo', 'wola'], tematy: ['biezenstwo'], osobyIds: [] },
        { rodzaj: 'dokument', lata: null, miejsca: [], tematy: [], osobyIds: ['os-jan'] },
    ], (id) => id !== 'os-ukryty')
    assert.deepEqual(w.rodzaje, [{ rodzaj: 'dokument', ile: 2 }, { rodzaj: 'zdjecie', ile: 1 }])
    assert.deepEqual(w.lata, [1922, 1931])
    assert.deepEqual(w.miejsca, ['testowo', 'wola'])
    assert.deepEqual(w.tematy, ['biezenstwo'])
    assert.deepEqual(w.osoby, ['os-jan'], 'osoba niewidoczna nie jest ani liczona, ani wymieniona')
})
test('ARC-09 (P3): zbiór bez materiałów – puste wiersze, bez lat', () => {
    const w = wierszeZbioru([], () => true)
    assert.equal(w.lata, null)
    assert.equal(w.rodzaje.length, 0)
})

test('łatka P3: opis rodzajów materiałów zbioru jak na planszy', async () => {
    const { opisRodzajow } = await import('./zbior')
    const { odmiana } = await import('./tekst')
    assert.equal(opisRodzajow([{ rodzaj: 'dokument', ile: 2 }, { rodzaj: 'zdjecie', ile: 2 }, { rodzaj: 'akt', ile: 1 }, { rodzaj: 'wspomnienie', ile: 1 }], odmiana), '6 – 2 dokumenty, 2 zdjęcia, akt metrykalny, wspomnienie')
    assert.equal(opisRodzajow([], odmiana), '')
})

// ARC-14 (22.11): mapa zbioru – punkty z pola zbioru (miejscowości spoza okolicy) + miejscowości z okolicy przypięte do materiałów
test('ARC-14: punkty mapy zbioru – tylko widoczne materiały, łączenie po nazwie, odnośnik do materiału albo listy', () => {
    const p = punktyMapyZbioru({
        punkty: [
            { nazwa: 'Daleko', opis: 'stąd pisała A', rodzaj: 'miasto', lat: 51.5, lng: 32.5, przyblizone: true, materialy: ['list-a', 'foto-a'] },
            { nazwa: 'Jedno', opis: '', rodzaj: 'wies', lat: 48.6, lng: 38, przyblizone: false, materialy: ['list-b', 'ukryty'] },
            { nazwa: 'Tylko ukryte', opis: '', rodzaj: 'wies', lat: 50, lng: 30, przyblizone: false, materialy: ['ukryty'] },
            { nazwa: 'Bez materiałów', opis: 'tło', rodzaj: 'wies', lat: 49, lng: 31, przyblizone: false, materialy: [] },
        ],
        materialy: [{ id: 'list-a', nazwa: 'List A', miejsca: ['testowo'] }, { id: 'foto-a', nazwa: 'Fotografia A', miejsca: ['testowo', 'bez-gps'] }, { id: 'list-b', nazwa: 'List B', miejsca: [] }],
        miejsca: new Map([['testowo', { nazwa: 'Testowo', rodzaj: 'wies', wspolrzedne: [52.1, 22.6] as [number, number], przyblizone: false }], ['bez-gps', { nazwa: 'Bez GPS', rodzaj: 'wies', wspolrzedne: null, przyblizone: false }]]),
        kotwicaListy: '#materialy-w-zbiorze',
    })
    assert.deepEqual(p.map((x) => x.nazwa), ['Daleko', 'Jedno', 'Bez materiałów', 'Testowo'])
    const [daleko, jedno, bez, testowo] = p
    assert.equal(daleko.href, '#materialy-w-zbiorze', 'kilka materiałów – odnośnik do listy')
    assert.deepEqual(jedno.materialy, [{ id: 'list-b', nazwa: 'List B' }], 'ukryty materiał nie jest wymieniony')
    assert.equal(jedno.href, '/archiwum/list-b', 'jeden widoczny materiał – jego karta')
    assert.equal(bez.href, '', 'punkt bez materiałów – bez odnośnika')
    assert.equal(testowo.href, '/miejsca/testowo', 'miejscowość z okolicy – jej karta')
    assert.ok(!p.some((x) => x.nazwa === 'Tylko ukryte'), 'punkt tylko z ukrytymi materiałami znika (zasada 1.6)')
    assert.deepEqual(punktyMapyZbioru({ punkty: [], materialy: [{ id: 'list-a', nazwa: 'List A', miejsca: ['testowo'] }], miejsca: new Map([['testowo', { nazwa: 'Testowo', rodzaj: 'wies', wspolrzedne: [52.1, 22.6] as [number, number], przyblizone: false }]]), kotwicaListy: '#x' }), [], 'zbiór bez własnych punktów – bez mapy (inne zbiory bez zmian)')
    // ten sam punkt wpisany w zbiorze i przypięty jako miejscowość – jeden znacznik (nazwa bez wielkości liter i znaków)
    const dwa = punktyMapyZbioru({ punkty: [{ nazwa: 'Testowo', opis: '', rodzaj: 'wies', lat: 52.1, lng: 22.6, przyblizone: false, materialy: [] }], materialy: [{ id: 'list-a', nazwa: 'List A', miejsca: ['testowo'] }], miejsca: new Map([['testowo', { nazwa: 'testowo', rodzaj: 'wies', wspolrzedne: [52.1, 22.6] as [number, number], przyblizone: false }]]), kotwicaListy: '#x' })
    assert.equal(dwa.length, 1)
})

test('ARC-14: miejsca powiązane materiału – z punktów widocznych zbiorów, bez powtórzeń', () => {
    const z = [
        { id: 'zb-1', nazwa: 'Zbiór 1', punkty: [{ nazwa: 'Daleko', opis: 'obwód X', rodzaj: 'miasto', lat: 1, lng: 1, przyblizone: false, materialy: ['m-1'] }, { nazwa: 'Inne', opis: '', rodzaj: 'wies', lat: 2, lng: 2, przyblizone: false, materialy: ['m-2'] }] },
        { id: 'zb-2', nazwa: 'Zbiór 2', punkty: [{ nazwa: 'Daleko', opis: 'obwód X', rodzaj: 'miasto', lat: 1, lng: 1, przyblizone: false, materialy: ['m-1'] }] },
    ]
    assert.deepEqual(miejscaPowiazane('m-1', z), [{ nazwa: 'Daleko', opis: 'obwód X', zbior: 'zb-1' }])
    assert.deepEqual(miejscaPowiazane('m-3', z), [])
})

// Zgłoszenie 22.11: „drukuj całość” na karcie zbioru tylko w pasku akcji – wiersz „udostępnianie” wyłącznie dla kolekcji IIIF
test('karta zbioru: „drukuj całość” nie powtarza się w wierszu „udostępnianie”', async () => {
    const fs = await import('node:fs')
    const kod = fs.readFileSync(new URL('../app/archiwum/zbiory/[slug]/page.tsx', import.meta.url), 'utf8')
    assert.ok(kod.includes('<PrzyciskDrukujCalosc'), 'przycisk „drukuj całość” w pasku akcji zostaje')
    assert.ok(!kod.includes("tekst: 'drukuj całość'"), 'bez drugiego odnośnika w tabeli')
    assert.match(kod, /iiif && <W e="udostępnianie">/, 'wiersz tylko, gdy jest kolekcja IIIF (bez pustego wiersza)')
})

// Decyzja 22.11 (popołudnie): punkty na mapie materiału – wpisywane w materiale (bez kart w „Miejscach”)
test('mapa materiału: własne punkty + punkty widocznych zbiorów + miejscowości materiału; bez punktów spoza okolicy – bez mapy', () => {
    const miejsca = new Map([['testowo', { nazwa: 'Testowo', rodzaj: 'wies', wspolrzedne: [52.1, 22.6] as [number, number], przyblizone: false }]])
    const p = punktyMapyMaterialu({
        id: 'foto-a', punkty: [{ nazwa: 'Dalekowo', opis: 'obwód X', rodzaj: 'miasto', lat: 51.5, lng: 32.5, przyblizone: true }],
        miejsca: ['testowo'], wszystkieMiejsca: miejsca,
        zbiory: [{ id: 'zb-1', punkty: [{ nazwa: 'dalekowo', opis: 'z innego', rodzaj: 'miasto', lat: 51.5, lng: 32.5, przyblizone: true, materialy: ['foto-a'] }, { nazwa: 'Wschodnie', opis: '', rodzaj: 'miasto', lat: 48.6, lng: 38, przyblizone: false, materialy: ['foto-a'] }, { nazwa: 'Obce', opis: '', rodzaj: 'wies', lat: 1, lng: 1, przyblizone: false, materialy: ['inny'] }] }],
        kotwicaZbioru: (z) => `/archiwum/zbiory/${z}#mapa`,
    })
    assert.deepEqual(p.map((x) => [x.nazwa, x.href]), [['Dalekowo', ''], ['Wschodnie', '/archiwum/zbiory/zb-1#mapa'], ['Testowo', '/miejsca/testowo']])
    assert.deepEqual(punktyMapyMaterialu({ id: 'foto-a', punkty: [], miejsca: ['testowo'], wszystkieMiejsca: miejsca, zbiory: [], kotwicaZbioru: () => '' }), [], 'same miejscowości z okolicy – bez mapy (inne karty bez zmian)')
})

test('mapa zbioru: dokłada punkty swoich (widocznych) materiałów; mapa także wtedy, gdy punkty mają tylko materiały', () => {
    const p = punktyMapyZbioru({
        punkty: [],
        materialy: [{ id: 'm-1', nazwa: 'List 1', miejsca: [], punkty: [{ nazwa: 'Dalekowo', opis: 'obwód X', rodzaj: 'miasto', lat: 51.5, lng: 32.5, przyblizone: true }] }, { id: 'm-2', nazwa: 'List 2', miejsca: [], punkty: [{ nazwa: 'Dalekowo', opis: '', rodzaj: 'miasto', lat: 51.5, lng: 32.5, przyblizone: true }] }],
        miejsca: new Map(), kotwicaListy: '#lista',
    })
    assert.equal(p.length, 1, 'ta sama nazwa z dwóch materiałów – jeden punkt')
    assert.deepEqual(p[0].materialy.map((m) => m.id), ['m-1', 'm-2'])
    assert.equal(p[0].href, '#lista')
})

test('miejsca powiązane materiału: najpierw własne punkty (bez odnośnika), potem punkty zbiorów', () => {
    const z = [{ id: 'zb-1', punkty: [{ nazwa: 'Wschodnie', opis: 'obwód Y', rodzaj: 'miasto', lat: 1, lng: 1, przyblizone: false, materialy: ['m-1'] }] }]
    assert.deepEqual(miejscaPowiazane('m-1', z, [{ nazwa: 'Dalekowo', opis: 'obwód X', rodzaj: 'miasto', lat: 2, lng: 2, przyblizone: false }]),
        [{ nazwa: 'Dalekowo', opis: 'obwód X', zbior: '' }, { nazwa: 'Wschodnie', opis: 'obwód Y', zbior: 'zb-1' }])
})
