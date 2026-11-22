import assert from 'node:assert/strict'
import test from 'node:test'
import os from 'node:os'
import fs from 'node:fs/promises'
import path from 'node:path'
import { uwagiJakosci, stanUwagi, uwagiPlanu, uwagiNumeracji, REGULY_JAKOSCI } from './jakosc'
import { katalog } from '../plany/typy'

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
        assert.ok(wynik.some(x => x.id === 'miejsca:proba:przynaleznosc-bez-dat:parafia-a'), 'P6a: klucz z identyfikatora parafii, nie z pozycji')
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

// ---------- P6a ----------
async function wKatalogu(f: () => Promise<void>) {
    const przed = process.cwd(), tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'odniepamieci-p6a-'))
    try { process.chdir(tmp); await f() } finally { process.chdir(przed); await fs.rm(tmp, { recursive: true, force: true }) }
}

test('P6a: decyzja pod dawnym kluczem (pozycja) przeniesiona na stały klucz; nie przeskakuje na inny alert po zmianie kolejności', async () => {
    await wKatalogu(async () => {
        for (const k of ['miejsca', 'parafie', '_panel']) await fs.mkdir(`content/${k}`, { recursive: true })
        await fs.writeFile('content/miejsca/proba.mdoc', `---\ntitle: Próba\ntype: wies\ncoordinates: '52.1, 22.4'\nparishes:\n  - parish: parafia-a\n  - parish: parafia-b\n---\nOpis.\n`)
        // dawny klucz „:1” = druga parafia (parafia-b)
        await fs.writeFile('content/_panel/jakosc.json', JSON.stringify({ wersja: 1, decyzje: { 'miejsca:proba:przynaleznosc-bez-dat:1': { stan: 'ignorowane', notatka: 'n', data: '2026-11-15T10:00:00Z' } } }))
        let w = await uwagiJakosci()
        assert.equal(w.find((x) => x.id === 'miejsca:proba:przynaleznosc-bez-dat:parafia-b')?.stan, 'ignorowane')
        assert.equal(w.find((x) => x.id === 'miejsca:proba:przynaleznosc-bez-dat:parafia-a')?.stan, 'aktywne')
        const db = JSON.parse(await fs.readFile('content/_panel/jakosc.json', 'utf8'))
        assert.deepEqual(Object.keys(db.decyzje), ['miejsca:proba:przynaleznosc-bez-dat:parafia-b'], 'przeniesione raz, przy odczycie')
        // zmiana kolejności parafii – decyzja zostaje przy parafii-b (dawniej przeskoczyłaby na parafię-a)
        await fs.writeFile('content/miejsca/proba.mdoc', `---\ntitle: Próba\ntype: wies\ncoordinates: '52.1, 22.4'\nparishes:\n  - parish: parafia-b\n  - parish: parafia-a\n---\nOpis.\n`)
        w = await uwagiJakosci()
        assert.equal(w.find((x) => x.id === 'miejsca:proba:przynaleznosc-bez-dat:parafia-b')?.stan, 'ignorowane')
        assert.equal(w.find((x) => x.id === 'miejsca:proba:przynaleznosc-bez-dat:parafia-a')?.stan, 'aktywne')
    })
})

test('P6a: zmiana identyfikatora z przekierowaniem – decyzja idzie za wpisem (P6-15)', async () => {
    await wKatalogu(async () => {
        for (const k of ['miejsca', '_panel']) await fs.mkdir(`content/${k}`, { recursive: true })
        await fs.writeFile('content/miejsca/nowa.mdoc', `---\ntitle: Nowa\ntype: wies\n---\nOpis.\n`)
        await fs.writeFile('content/_panel/przekierowania.json', JSON.stringify({ wpisy: [{ rodzaj: 'miejsca', stary: 'stara', nowy: 'nowa' }] }))
        await fs.writeFile('content/_panel/jakosc.json', JSON.stringify({ wersja: 1, decyzje: { 'miejsca:stara:brak-wspolrzednych': { stan: 'ignorowane', notatka: 'brak GPS', data: '2026-11-15T10:00:00Z' } } }))
        const w = await uwagiJakosci()
        assert.equal(w.find((x) => x.id === 'miejsca:nowa:brak-wspolrzednych')?.stan, 'ignorowane')
        assert.equal(w.filter((x) => x.regula === 'brak-wspolrzednych').length, 1, 'bez duplikatu po zmianie nazwy')
    })
})

test('P6a: „odłóż” na 7 / 30 dni – po terminie alert wraca; dawna decyzja bez terminu = 30 dni od daty', async () => {
    await wKatalogu(async () => {
        for (const k of ['miejsca', '_panel']) await fs.mkdir(`content/${k}`, { recursive: true })
        await fs.writeFile('content/miejsca/a.mdoc', `---\ntitle: A\ntype: wies\n---\nOpis.\n`)
        await fs.writeFile('content/miejsca/b.mdoc', `---\ntitle: B\ntype: wies\n---\nOpis.\n`)
        const stare = new Date(Date.now() - 40 * 864e5).toISOString()
        await fs.writeFile('content/_panel/jakosc.json', JSON.stringify({ wersja: 1, decyzje: { 'miejsca:b:brak-wspolrzednych': { stan: 'odlozone', notatka: '', data: stare } } }))
        assert.equal(await stanUwagi('miejsca:a:brak-wspolrzednych', 'odlozone', '', 10), false, 'tylko 7 albo 30 dni')
        assert.equal(await stanUwagi('miejsca:a:brak-wspolrzednych', 'odlozone', '', 7), true)
        const w = await uwagiJakosci()
        const a = w.find((x) => x.id === 'miejsca:a:brak-wspolrzednych')!
        assert.equal(a.stan, 'odlozone')
        assert.ok(Math.abs(Date.parse(a.do!) - Date.now() - 7 * 864e5) < 60_000)
        assert.equal(w.find((x) => x.id === 'miejsca:b:brak-wspolrzednych')?.stan, 'aktywne', 'odłożone 40 dni temu bez terminu – wróciło')
    })
})

test('P6a: możliwy duplikat (wskazówka), data z przyszłości (błąd), wagi z katalogu reguł', async () => {
    await wKatalogu(async () => {
        await fs.mkdir('content/tematy', { recursive: true })
        await fs.writeFile('content/tematy/wola-a.mdoc', `---\ntitle: Wola\ntemporal: '2999'\n---\nOpis.\n`)
        await fs.writeFile('content/tematy/wola-b.mdoc', `---\ntitle: WOLA\n---\nOpis.\n`)
        const w = await uwagiJakosci()
        const dup = w.filter((x) => x.regula === 'mozliwy-duplikat')
        assert.deepEqual(dup.map((x) => x.id).sort(), ['tematy:wola-a:mozliwy-duplikat:wola-b', 'tematy:wola-b:mozliwy-duplikat:wola-a'])
        assert.ok(dup.every((x) => x.waga === 'wskazowka'))
        const d = w.find((x) => x.regula === 'niepoprawna-data')!
        assert.deepEqual([d.rekord, d.waga], ['wola-a', 'blad'])
        assert.ok(w.every((x) => x.waga), 'każdy alert ma wagę')
    })
})

test('P6a: plan – powtórzony numer grobu, powtórzona nazwa kwatery, napisy do odczytania (jedna uwaga na plan)', () => {
    const typy = katalog()
    const grob = [...typy.values()].find((t) => (t as { grob?: boolean }).grob || /grob/.test((t as { id: string }).id))!
    const g = (id: string, o: Record<string, unknown>) => ({ id, typ: (grob as { id: string }).id, ...o })
    const plan = { slug: 'testowo', tytul: 'Testowo', elementy: [
        { id: 'k1', typ: 'kwatera', nazwa: 'A' }, { id: 'k2', typ: 'kwatera', nazwa: 'a' },
        g('g1', { oznaczenie: { kwatera: 'k1', rzad: '1', miejsce: '1' }, zdjecia: [{ plik: 'x.jpg' }] }),
        g('g2', { oznaczenie: { kwatera: 'k1', rzad: '1', miejsce: '1' }, zdjecia: [{ plik: 'y.jpg' }], napis: 'Śp. Testowy' }),
        g('g3', { zdjecia: [{ plik: 'z.jpg' }], ograniczony: true }),
    ] }
    const u = uwagiNumeracji(plan, typy)
    assert.deepEqual(u.map((x) => x.regula).sort(), ['napisy-do-odczytania', 'powtorzona-nazwa-kwatery', 'powtorzony-numer-grobu'])
    assert.match(u.find((x) => x.regula === 'napisy-do-odczytania')!.opis, /^1 grób ma/, 'grób z ograniczonym napisem się nie liczy')
    assert.match(u.find((x) => x.regula === 'powtorzony-numer-grobu')!.edytuj, /\?el=g1$/)
})

test('P6a: spis reguł – każda reguła ma nazwę, wagę, zakres i uzasadnienie', () => {
    for (const [k, r] of Object.entries(REGULY_JAKOSCI)) assert.ok(r.nazwa && r.zakres && r.uzasadnienie && ['blad', 'brak', 'wskazowka'].includes(r.waga), k)
})

// Decyzja 22.11: „Powiązane osoby” i blok „Drzewo osoby” – osoba, której nie ma w drzewie (także nieznany nr kat.); OS-… z rejestru – bez ostrzeżenia
test('osoby: powiązana osoba spoza drzewa – ostrzeżenie; identyfikator i znany nr kat. – bez (dane syntetyczne)', async () => {
    const przed = process.cwd()
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'odniepamieci-osoby-test-'))
    try {
        process.chdir(tmp)
        for (const k of ['materialy', 'posts', 'osoby', '_panel']) await fs.mkdir(`content/${k}`, { recursive: true })
        await fs.writeFile('content/osoby/maria-testowa.json', JSON.stringify({ imiona: 'Maria', nazwisko: 'Testowa', plec: 'K' }))
        await fs.writeFile('content/osoby/jan-testowy.json', JSON.stringify({ imiona: 'Jan', nazwisko: 'Testowy', plec: 'M' }))
        await fs.writeFile('content/_panel/katalog.json', JSON.stringify({ wersja: 1, licznik: { OS: 1 }, pozycje: { 'OS-0001': { rodzaj: 'osoba', id: 'maria-testowa', nadano: '2026-11-22' } } }))
        await fs.writeFile('content/materialy/list-a.mdoc', `---\ntitle: List A\ntype: dokument\npeopleIds:\n  - OS-0001\n  - jan-testowy\n  - OS-0999\n  - nie-ma-takiej\nvisibility: publiczne\n---\nOpis.\n`)
        await fs.writeFile('content/posts/wpis-a.mdoc', `---\ntitle: Wpis A\n---\nTekst.\n\n{% drzewo osoba="OS-0001" wstecz=2 naprzod=1 /%}\n\n{% drzewo osoba="ktos-usuniety" wstecz=2 naprzod=1 /%}\n`)
        const w = (await uwagiJakosci()).filter((x) => x.regula === 'relacja-do-nieistniejacego')
        const mat = w.filter((x) => x.rekord === 'list-a').map((x) => x.opis).sort()
        assert.deepEqual(mat, ['Powiązanie „powiązane osoby” wskazuje „OS-0999”, którego nie ma', 'Powiązanie „powiązane osoby” wskazuje „nie-ma-takiej”, którego nie ma'])
        const wp = w.filter((x) => x.rekord === 'wpis-a').map((x) => x.opis)
        assert.deepEqual(wp, ['Powiązanie „drzewo osoby” wskazuje „ktos-usuniety”, którego nie ma'])
    } finally { process.chdir(przed); await fs.rm(tmp, { recursive: true, force: true }) }
})
