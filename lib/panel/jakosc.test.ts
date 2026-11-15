import assert from 'node:assert/strict'
import test from 'node:test'
import os from 'node:os'
import fs from 'node:fs/promises'
import path from 'node:path'
import { uwagiJakosci, stanUwagi } from './jakosc'

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
