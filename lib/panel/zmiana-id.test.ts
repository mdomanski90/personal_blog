// Decyzja 22.11: zmiana identyfikatora materiału – reszta podąża (strony skanów, skany, objaśnienia, odwołania, nr kat., przekierowanie)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { zamienWTekscie, zamienWNaglowku, planZmianyIdMaterialu, wykonajZmianeId, zmianaIdZZapisu } from './zmiana-id'

test('tekst: [[stary]], [[stary|…]] i blok materiału – zamienione; inne identyfikatory i fragmenty nazw – nie', () => {
    const t = 'Zob. [[list-a|list]], [[list-a]] i [[list-ab|inny]].\n\n{% material id="list-a" podpis="x" /%}\n{% material podpis="y" id="list-a" strona=2 /%}\n{% material id="list-abc" /%}\nlist-a zwykłym tekstem.'
    const w = zamienWTekscie(t, 'list-a', 'list-nowy')
    assert.equal(w.ile, 4)
    assert.equal(w.tekst, 'Zob. [[list-nowy|list]], [[list-nowy]] i [[list-ab|inny]].\n\n{% material id="list-nowy" podpis="x" /%}\n{% material podpis="y" id="list-nowy" strona=2 /%}\n{% material id="list-abc" /%}\nlist-a zwykłym tekstem.')
})

test('nagłówek: tylko pola relacji do materiałów, z kontrolą parserem (inne pola z tą samą wartością – bez zmian)', () => {
    const fm = 'title: list-a\ncover: list-a\nmapPoints:\n  - name: Sośnica\n    materials:\n      - list-a\n      - foto-b\nnote: list-a\n'
    const w = zamienWNaglowku(fm, 'list-a', 'list-nowy', [['cover', 'materialy'], ['mapPoints[].materials', 'materialy']])
    assert.equal(w.ile, 2)
    assert.equal(w.tekst, 'title: list-a\ncover: list-nowy\nmapPoints:\n  - name: Sośnica\n    materials:\n      - list-nowy\n      - foto-b\nnote: list-a\n')
    assert.equal(zamienWNaglowku('title: x\n', 'list-a', 'list-nowy', [['cover', 'materialy']]).ile, 0)
})

const zasiej = async (R: string) => {
    const w = async (p: string, t: string | Buffer) => { await fs.mkdir(path.dirname(path.join(R, p)), { recursive: true }); await fs.writeFile(path.join(R, p), t) }
    await w('content/materialy/list-nowy.mdoc', '---\ntitle: List\nvisibility: publiczne\n---\nOpis.\n') // już po zmianie w Keystatic
    await w('content/strony/list-a.json', JSON.stringify({ strony: [{ plik: 's-1.jpg' }] }))
    await w('pliki-archiwum/strony/list-a/s-1.jpg', Buffer.from([1, 2, 3]))
    await w('content/objasnienia/list-a.json', JSON.stringify({ items: [{ id: 'o-1' }] }))
    await w('content/objasnienia/inny.json', JSON.stringify({ items: [{ id: 'o-2', body: [{ type: 'SpecificResource', purpose: 'linking', source: 'list-a' }, { type: 'SpecificResource', purpose: 'linking', source: 'testowo' }] }] }))
    await w('content/zbiory/zb.mdoc', '---\ntitle: Zbiór\nmapPoints:\n  - name: Sośnica\n    coordinates: 51.5, 32.5\n    materials:\n      - list-a\n---\nOpis.\n')
    await w('content/posts/wpis.mdoc', '---\ntitle: Wpis\ncover: list-a\n---\nZob. [[list-a|list]].\n\n{% material id="list-a" /%}\n')
    await w('content/_panel/katalog.json', JSON.stringify({ wersja: 1, licznik: { MA: 1 }, pozycje: { 'MA-0001': { rodzaj: 'material', id: 'list-a', nadano: '2026-11-22' } } }))
    await w('content/_panel/przekierowania.json', JSON.stringify({ wpisy: [{ rodzaj: 'miejsca', stary: 'a', nowy: 'b' }] }))
}

test('plan i wykonanie: przeniesienia, odwołania, nr kat., przekierowanie; powtórka – nic do zrobienia', async () => {
    const R = await fs.mkdtemp(path.join(os.tmpdir(), 'odniepamieci-zmiana-id-'))
    try {
        await zasiej(R)
        const plan = await planZmianyIdMaterialu(R, 'list-a', 'list-nowy')
        assert.deepEqual(plan.przeniesienia.map((p) => p.z).sort(), ['content/objasnienia/list-a.json', 'content/strony/list-a.json', 'pliki-archiwum/strony/list-a'])
        assert.deepEqual(plan.edycje.map((e) => e.plik).sort(), ['content/_panel/katalog.json', 'content/_panel/przekierowania.json', 'content/objasnienia/inny.json', 'content/posts/wpis.mdoc', 'content/zbiory/zb.mdoc'])
        assert.deepEqual(plan.bledy, [])
        const w = await wykonajZmianeId(R, plan)
        assert.equal(w.ok, true)
        assert.ok(await fs.stat(path.join(R, 'pliki-archiwum/strony/list-nowy/s-1.jpg')))
        assert.ok(await fs.stat(path.join(R, 'content/strony/list-nowy.json')))
        assert.ok(await fs.stat(path.join(R, 'content/objasnienia/list-nowy.json')))
        assert.match(await fs.readFile(path.join(R, 'content/zbiory/zb.mdoc'), 'utf8'), /- list-nowy\n/)
        const wpis = await fs.readFile(path.join(R, 'content/posts/wpis.mdoc'), 'utf8')
        assert.ok(wpis.includes('cover: list-nowy') && wpis.includes('[[list-nowy|list]]') && wpis.includes('{% material id="list-nowy" /%}'))
        assert.match(await fs.readFile(path.join(R, 'content/objasnienia/inny.json'), 'utf8'), /"source":"list-nowy"[\s\S]*"source":"testowo"/)
        const kat = JSON.parse(await fs.readFile(path.join(R, 'content/_panel/katalog.json'), 'utf8'))
        assert.equal(kat.pozycje['MA-0001'].id, 'list-nowy'); assert.equal(kat.wersja, 2, 'wersja rejestru +1')
        const przek = JSON.parse(await fs.readFile(path.join(R, 'content/_panel/przekierowania.json'), 'utf8')).wpisy
        assert.equal(przek.length, 2, 'dotychczasowe przekierowania zostają')
        assert.deepEqual({ ...przek[1], uwaga: undefined }, { rodzaj: 'archiwum', stary: 'list-a', nowy: 'list-nowy', uwaga: undefined })
        const znowu = await planZmianyIdMaterialu(R, 'list-a', 'list-nowy')
        assert.equal(znowu.przeniesienia.length + znowu.edycje.length, 0, 'powtórka – nic do zrobienia')
    } finally { await fs.rm(R, { recursive: true, force: true }) }
})

test('kolizja: plik pod nowym identyfikatorem już jest – błąd w planie, nic nie zmienione', async () => {
    const R = await fs.mkdtemp(path.join(os.tmpdir(), 'odniepamieci-zmiana-id-'))
    try {
        await zasiej(R)
        await fs.writeFile(path.join(R, 'content/strony/list-nowy.json'), '{}')
        const plan = await planZmianyIdMaterialu(R, 'list-a', 'list-nowy')
        assert.ok(plan.bledy.some((b) => b.includes('content/strony/list-nowy.json')))
        const w = await wykonajZmianeId(R, plan)
        assert.equal(w.ok, false)
        assert.ok(await fs.stat(path.join(R, 'content/strony/list-a.json')), 'nic nie przeniesione')
    } finally { await fs.rm(R, { recursive: true, force: true }) }
})

test('błąd w trakcie – cofnięcie wszystkiego (przeniesienia i edycje)', async () => {
    const R = await fs.mkdtemp(path.join(os.tmpdir(), 'odniepamieci-zmiana-id-'))
    try {
        await zasiej(R)
        const plan = await planZmianyIdMaterialu(R, 'list-a', 'list-nowy')
        plan.edycje.push({ plik: 'content/nie-ma-katalogu/x/../../../poza.json', przed: '', po: 'x', opis: 'awaria testowa' })
        const w = await wykonajZmianeId(R, plan, { awariaPo: 4 })
        assert.equal(w.ok, false)
        assert.ok(await fs.stat(path.join(R, 'pliki-archiwum/strony/list-a/s-1.jpg')), 'skany wróciły')
        assert.match(await fs.readFile(path.join(R, 'content/zbiory/zb.mdoc'), 'utf8'), /- list-a\n/, 'odwołanie wróciło')
    } finally { await fs.rm(R, { recursive: true, force: true }) }
})

test('wykrycie zmiany identyfikatora w zapisie Keystatic: usunięcie + dodanie jednego materiału', () => {
    assert.deepEqual(zmianaIdZZapisu({ additions: [{ path: 'content/materialy/nowy.mdoc' }], deletions: [{ path: 'content/materialy/stary.mdoc' }] }), { stary: 'stary', nowy: 'nowy' })
    assert.equal(zmianaIdZZapisu({ additions: [{ path: 'content/materialy/a.mdoc' }], deletions: [] }), null)
    assert.equal(zmianaIdZZapisu({ additions: [], deletions: [{ path: 'content/materialy/a.mdoc' }] }), null, 'samo usunięcie – nie zmiana')
    assert.equal(zmianaIdZZapisu({ additions: [{ path: 'content/materialy/a.mdoc' }, { path: 'content/materialy/b.mdoc' }], deletions: [{ path: 'content/materialy/c.mdoc' }] }), null, 'niejednoznaczne – bez zmian')
})
