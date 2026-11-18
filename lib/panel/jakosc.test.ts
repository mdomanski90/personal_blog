import assert from 'node:assert/strict'
import test from 'node:test'
import os from 'node:os'
import fs from 'node:fs/promises'
import path from 'node:path'
import { uwagiJakosci, stanUwagi, uwagiPlanu } from './jakosc'

test('P6: kolejkowanie, trwałe ignorowanie i automatyczne domknięcie ostrzeżenia', async () => {
    const przed = process.cwd()
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'odniepamieci-p6-test-'))
    try {
        process.chdir(tmp)
        await fs.mkdir('content/miejsca', { recursive: true })
        await fs.mkdir('content/materialy', { recursive: true })
        await fs.writeFile('content/miejsca/proba.mdoc', `---\ntitle: Próba\ntype: wies\nparishes:\n  - parish: parafia-a\n---\nOpis miejscowości z archiwum.\n`)
        await fs.writeFile('content/materialy/zdjecie.yaml', `title: Fotografia\ntype: zdjecie\nsource: Archiwum rodzinne\n`)
        let wynik = await uwagiJakosci()
        assert.ok(wynik.some(x => x.id === 'miejsca:proba:brak-wspolrzednych'))
        assert.ok(wynik.some(x => x.id === 'miejsca:proba:przynaleznosc-bez-dat:0'))
        assert.ok(!wynik.some(x => x.id === 'miejsca:proba:bez-opisu'), 'treść Markdoc liczy się jako opis')
        assert.ok(wynik.some(x => x.id === 'materialy:zdjecie:brak-praw'))
        const id = 'miejsca:proba:brak-wspolrzednych'
        assert.equal(await stanUwagi(id, 'ignorowane', 'Nie ma danych GPS'), true)
        wynik = await uwagiJakosci()
        assert.equal(wynik.find(x => x.id === id)?.stan, 'ignorowane')
        assert.equal(wynik.find(x => x.id === id)?.notatka, 'Nie ma danych GPS')
        assert.equal(await stanUwagi('miejsca:proba:nie-ma-takiej-reguly', 'ignorowane', ''), false)
        assert.equal(await stanUwagi(id, 'aktywne', ''), true)
        wynik = await uwagiJakosci()
        assert.equal(wynik.find(x => x.id === id)?.stan, 'aktywne')
        await fs.writeFile('content/miejsca/proba.mdoc', `---\ntitle: Próba\ntype: wies\ncoordinates: '52.1, 22.4'\n---\nOpis miejscowości z archiwum.\n`)
        wynik = await uwagiJakosci()
        assert.ok(!wynik.some(x => x.id === id), 'po uzupełnieniu pola alert znika')
    } finally {
        process.chdir(przed)
        await fs.rm(tmp, { recursive: true, force: true })
    }
})

test('0C: powiązanie do nieistniejącego wpisu i błędne przekierowania (dane syntetyczne)', async () => {
    const przed = process.cwd()
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'odniepamieci-0c-test-'))
    try {
        process.chdir(tmp)
        for (const k of ['miejsca', 'parafie', 'ksiegi', '_panel']) await fs.mkdir(`content/${k}`, { recursive: true })
        await fs.writeFile('content/miejsca/wies-a.mdoc', `---\ntitle: Wieś A\ntype: wies\n---\nOpis.\n`)
        await fs.writeFile('content/parafie/urzad-nowy.yaml', `title: Urząd nowy\n`)
        await fs.writeFile('content/ksiegi/ksiega-a.yaml', `title: Księga A\nparish: urzad-stary\nspatial:\n  - wies-a\n  - wies-usunieta\nrepository: Archiwum\nidentifier: 1/2/3\nyears: 1800\n`)
        await fs.writeFile('content/_panel/przekierowania.json', JSON.stringify({ wpisy: [
            { rodzaj: 'parafie', stary: 'urzad-stary', nowy: 'urzad-nowy' },
            { rodzaj: 'miejsca', stary: 'wies-a', nowy: 'wies-b' },
            { rodzaj: 'parafie', stary: 'inny-stary', nowy: 'nie-ma-takiego' },
        ] }))
        const w = await uwagiJakosci()
        const rel = w.filter((x) => x.regula === 'relacja-do-nieistniejacego' && x.rekord === 'ksiega-a')
        assert.equal(rel.length, 2, JSON.stringify(rel.map((x) => x.opis)))
        assert.ok(rel.some((x) => x.opis.includes('urzad-stary') && x.wskazowka.includes('urzad-nowy')))
        assert.ok(rel.some((x) => x.opis.includes('wies-usunieta')))
        assert.ok(!rel.some((x) => x.opis.includes('„wies-a”')))
        const prz = w.filter((x) => x.regula === 'przekierowanie-bledne').map((x) => x.opis).sort()
        assert.deepEqual(prz, ['Nowy identyfikator nie istnieje', 'Stary identyfikator nadal istnieje'])
    } finally { process.chdir(przed); await fs.rm(tmp, { recursive: true, force: true }) }
})

test('PH3: elementy planów – powiązania [[…]] i podstawa do nieistniejących pozycji (dane syntetyczne)', async () => {
    const przed = process.cwd()
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'odniepamieci-ph3-jakosc-'))
    try {
        process.chdir(tmp)
        for (const k of ['miejsca', 'materialy', 'obiekty', 'plany', '_panel', 'osoby']) await fs.mkdir(`content/${k}`, { recursive: true })
        await fs.writeFile('content/miejsca/testowo.mdoc', `---\ntitle: Testowo\ntype: wies\nvisibility: tylko-ja\ninflections:\n  - Testowie\n---\nOpis.\n`)
        await fs.writeFile('content/obiekty/mlyn-nowy.mdoc', `---\ntitle: Młyn nowy\n---\nOpis.\n`)
        await fs.writeFile('content/materialy/szkic.mdoc', `---\ntitle: Szkic\ntype: dokument\n---\n`)
        await fs.writeFile('content/osoby/p1.json', JSON.stringify({ imiona: 'Jan', nazwisko: 'Przykładowy' }))
        await fs.writeFile('content/_panel/przekierowania.json', JSON.stringify({ wpisy: [{ rodzaj: 'obiekty', stary: 'mlyn', nowy: 'mlyn-nowy' }] }))
        await fs.writeFile('content/plany/syntetyczny.json', JSON.stringify({ slug: 'syntetyczny', tytul: 'Plan syntetyczny', elementy: [
            { id: 'el1aaaa', typ: 'mlyn', nazwa: 'Młyn', g: { k: 'p', x: 1, y: 1 }, powiazania: ['mlyn', 'w Testowie', 'testowo', 'Jan Przykładowy', 'p1', 'nie-ma-takiej'] },
            { id: 'el2bbbb', typ: 'kosciol', g: { k: 'p', x: 2, y: 2 }, podstawa: [{ material: 'szkic' }, { material: 'usuniety-skan', objasnienie: 'o-abcd' }] },
        ] }))
        const L = (await uwagiJakosci()).filter((x) => x.kolekcja === 'plany')
        assert.deepEqual(L.map((x) => x.opis).sort(), [
            'Element „Młyn”: powiązanie [[mlyn]] wskazuje kartę, której nie ma',
            'Element „Młyn”: powiązanie [[nie-ma-takiej]] wskazuje kartę, której nie ma',
            'Element kosciol el2bbbb: podstawa wskazuje materiał „usuniety-skan”, którego nie ma w archiwum',
        ].sort())
        assert.equal(L.length, 3, 'ukryta karta (Testowo), forma z przyimkiem, osoba po id i po nazwie – istnieją')
        const mlyn = L.find((x) => x.opis.includes('[[mlyn]]'))!
        assert.match(mlyn.wskazowka, /„mlyn” → „mlyn-nowy”/)
        assert.equal(mlyn.edytuj, '/keystatic/plany/syntetyczny?el=el1aaaa')
        assert.equal(mlyn.regula, 'relacja-do-nieistniejacego')
        assert.doesNotMatch(L.find((x) => x.opis.includes('nie-ma-takiej'))!.wskazowka, /przekierowaniach/)
        // decyzja „ignoruj” trzyma się elementu i celu (klucz z id elementu – stały przy zmianie kolejności)
        assert.equal(await stanUwagi(mlyn.id, 'ignorowane', 'sprawdzone'), true)
        const p = JSON.parse(await fs.readFile('content/plany/syntetyczny.json', 'utf8'))
        p.elementy.reverse()
        await fs.writeFile('content/plany/syntetyczny.json', JSON.stringify(p))
        assert.equal((await uwagiJakosci()).find((x) => x.id === mlyn.id)?.stan, 'ignorowane')
    } finally {
        process.chdir(przed)
        await fs.rm(tmp, { recursive: true, force: true })
    }
})

test('PH3: objaśnienie podstawy usunięte ze skanu – osobna uwaga (materiał istnieje)', () => {
    const L = uwagiPlanu({ slug: 'x', tytul: 'X', elementy: [{ id: 'e1', nazwa: 'Rynek', podstawa: [{ material: 'szkic', objasnienie: 'o-zzzz' }, { material: 'szkic', objasnienie: 'o-jest' }] }] },
        { cel: () => true, material: (id) => id === 'szkic', objasnienie: (_m, id) => id === 'o-jest' }, [], () => false)
    assert.equal(L.length, 1)
    assert.equal(L[0].opis, 'Element „Rynek”: podstawa wskazuje objaśnienie o-zzzz, którego nie ma na skanie „szkic”')
})

test('CAT-07: lata księgi, których nie da się odczytać (np. „lata 30.”, „ok. 1830 lub 1831”), trafiają do kolejki jakości – przy księdze i przy tomie', async () => {
    const przed = process.cwd()
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'odniepamieci-cat07-test-'))
    try {
        process.chdir(tmp)
        await fs.mkdir('content/ksiegi', { recursive: true })
        await fs.writeFile('content/ksiegi/dobra.yaml', `title: Dobra\nrepository: AP\nidentifier: 1/2\nyears: 1826–1875, ok. 1880, 1885-90\nvolumes:\n  - years: 1810\n  - years: 1811–1812\n`)
        await fs.writeFile('content/ksiegi/zla.yaml', `title: Zła\nrepository: AP\nidentifier: 1/2\nyears: lata 30., 1850–1860\nvolumes:\n  - years: 1810\n  - years: brak danych\n  - years: 1830 lub 1831\n`)
        const w = (await uwagiJakosci()).filter((x) => x.regula === 'nieodczytane-lata')
        assert.deepEqual(w.filter((x) => x.rekord === 'dobra'), [], 'poprawne zapisy nie dają uwag')
        const zla = w.filter((x) => x.rekord === 'zla')
        assert.equal(zla.length, 3, JSON.stringify(zla.map((x) => x.opis)))
        assert.ok(zla.some((x) => x.opis.includes('lata 30.')), 'lata księgi')
        assert.ok(zla.some((x) => x.opis.includes('brak danych')) && zla.some((x) => x.opis.includes('1830 lub 1831')), 'lata tomów')
        assert.equal(new Set(zla.map((x) => x.id)).size, 3, 'każda uwaga ma własny identyfikator (trwałe ignorowanie osobno)')
    } finally { process.chdir(przed); await fs.rm(tmp, { recursive: true, force: true }) }
})

test('SLW-04 (P3): błędny wpis słownika widoczny w panelu jakości (dawniej pomijany po cichu)', async () => {
    const przed = process.cwd()
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'odniepamieci-slw04-'))
    try {
        process.chdir(tmp)
        await fs.mkdir('content/hasla', { recursive: true })
        await fs.writeFile('content/hasla/arenda.yaml', 'title: arenda\nkind: pojecie\nmeaning: Dzierżawa.\n')
        await fs.writeFile('content/hasla/żarna.yaml', 'title: żarna\nkind: pojecie\nmeaning: Młynek.\n')
        await fs.writeFile('content/hasla/zly.yaml', 'title: zly\nkind: nieznany\nmeaning: x\n')
        const w = (await uwagiJakosci()).filter((u) => u.regula === 'wpis-nieczytelny')
        assert.deepEqual(w.map((u) => u.rekord).sort(), ['zly', 'żarna.yaml'])
        assert.ok(w.every((u) => u.kolekcja === 'hasla'))
    } finally { process.chdir(przed); await fs.rm(tmp, { recursive: true, force: true }) }
})

test('P5: błędny wpis w każdej kolekcji (np. obiekt z rodzajem spoza listy) widoczny w panelu jakości', async () => {
    const przed = process.cwd()
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'odniepamieci-p5-jakosc-'))
    try {
        process.chdir(tmp)
        await fs.mkdir('content/obiekty', { recursive: true })
        await fs.writeFile('content/obiekty/obj-dobry.mdoc', '---\ntitle: Dobry\ntype: kapliczka\nexists: true\nvisibility: publiczne\n---\nOpis.\n')
        await fs.writeFile('content/obiekty/obj-zly.mdoc', '---\ntitle: Zły\ntype: rodzaj-spoza-listy\nexists: true\nvisibility: publiczne\n---\nOpis.\n')
        const w = (await uwagiJakosci()).filter((u) => u.regula === 'wpis-nieczytelny')
        assert.deepEqual(w.map((u) => [u.kolekcja, u.rekord]), [['obiekty', 'obj-zly']])
        assert.match(w[0].opis, /Wpis pominięty na stronie/)
    } finally { process.chdir(przed); await fs.rm(tmp, { recursive: true, force: true }) }
})
