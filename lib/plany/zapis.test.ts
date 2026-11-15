import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { listaKoszaPlikow, przywrocBrakujacePliki, przywrocPlikZKosza, usunPlik, usunSzkic, wczytajPlan, wczytajSzkic, wyczyscKoszPlikow, zapiszPlan, zapiszSzkic, zapiszZWersja } from './dane'
import { popraw, type Plan } from './model'

// cały test w katalogu tymczasowym (dane.ts liczy ścieżki od process.cwd())
const kat = fs.mkdtempSync(path.join(os.tmpdir(), 'plany-zapis-'))
process.chdir(kat)
test.after(() => { process.chdir(os.tmpdir()); fs.rmSync(kat, { recursive: true, force: true }) })

const plan = (wersja = 1): Plan => popraw({ slug: 'cmentarz-test', wersja, elementy: [{ id: 'a', typ: 'grob', g: { k: 'r', x: 0, y: 0, w: 10, h: 20, a: 0 } }] } as Plan)

test('dwie karty edytora z tą samą wersją zapisują naraz → jedna wygrywa, druga dostaje konflikt (409)', async () => {
    await zapiszPlan(plan(1))
    const [x, y] = await Promise.all([zapiszZWersja({ ...plan(1), tytul: 'okno 1' }), zapiszZWersja({ ...plan(1), tytul: 'okno 2' })])
    const wyniki = [x, y].map((w) => ('konflikt' in w ? 'konflikt' : 'ok')).sort()
    assert.deepEqual(wyniki, ['konflikt', 'ok'])
    const zapisany = await wczytajPlan('cmentarz-test')
    assert.equal(zapisany!.wersja, 2)
    assert.equal(zapisany!.tytul, 'okno 1', 'wygrywa zapis, który przyszedł pierwszy')
    const k = ('konflikt' in y ? y : x) as { konflikt: Plan }
    assert.equal(k.konflikt.wersja, 2, 'konflikt zwraca wersję z serwera')
})

test('usunięty podkład trafia do kosza; „cofnij” w edytorze (plan znów się odwołuje) przywraca go przy zapisie', async () => {
    const dir = path.join(kat, 'pliki-archiwum', 'plany', 'cmentarz-test')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'podklad-1.webp'), 'obraz')
    await usunPlik('cmentarz-test', 'podklad-1.webp')
    assert.equal(fs.existsSync(path.join(dir, 'podklad-1.webp')), false)
    const kosz = await listaKoszaPlikow()
    assert.equal(kosz.length, 1)
    assert.equal(kosz[0].plik, 'podklad-1.webp')
    const z = { ...plan(2), podklady: [{ id: 'p', plik: 'podklad-1.webp', nazwa: 'x', szer: 1, wys: 1, macierz: [1, 0, 0, 1, 0, 0] as Plan['podklady'][number]['macierz'], krycie: 1, widocznosc: 'edycja' as const }] }
    const w = await zapiszZWersja(z)
    assert.ok(!('konflikt' in w))
    assert.deepEqual((w as { przywrocone: string[] }).przywrocone, ['podklad-1.webp'])
    assert.equal(fs.readFileSync(path.join(dir, 'podklad-1.webp'), 'utf8'), 'obraz')
    assert.equal((await listaKoszaPlikow()).length, 0)
})

test('kosz plików: przywrócenie nie nadpisuje; po 30 dniach plik znika na stałe', async () => {
    const dir = path.join(kat, 'pliki-archiwum', 'plany', 'cmentarz-test')
    fs.writeFileSync(path.join(dir, 'zdj-1.jpg'), 'a')
    const teraz = Date.now()
    await usunPlik('cmentarz-test', 'zdj-1.jpg', teraz - 31 * 864e5)
    fs.writeFileSync(path.join(dir, 'zdj-1.jpg'), 'nowy')
    const [k] = await listaKoszaPlikow()
    assert.equal(await przywrocPlikZKosza(k.nazwa), 'pod tą nazwą jest już inny plik')
    assert.equal(fs.readFileSync(path.join(dir, 'zdj-1.jpg'), 'utf8'), 'nowy')
    assert.equal(await przywrocPlikZKosza('../../etc~x~y'), 'zła nazwa pliku')
    assert.equal(await wyczyscKoszPlikow(teraz), 1)
    assert.equal((await listaKoszaPlikow()).length, 0)
})

test('szkic awaryjny na serwerze: zapis, odczyt, usunięcie; zły identyfikator odrzucony', async () => {
    assert.equal(await wczytajSzkic('cmentarz-test'), null)
    await zapiszSzkic('cmentarz-test', { ...plan(2), tytul: 'niezapisane' })
    const s = await wczytajSzkic('cmentarz-test')
    assert.equal(s!.plan.tytul, 'niezapisane')
    assert.equal(s!.wersjaBazowa, 2)
    await usunSzkic('cmentarz-test')
    assert.equal(await wczytajSzkic('cmentarz-test'), null)
    await assert.rejects(zapiszSzkic('../x', plan()))
    assert.equal(await wczytajSzkic('../x'), null)
})
