// Łatka 21.11: zapis objaśnień z kontrolą wersji (zasada 2.3) – dwa okna / dwie osoby nie nadpisują się po cichu.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { poprawObjasnienie, wersjaObjasnien, zapiszObjasnieniaWersja, type Objasnienie } from './objasnienia'

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'obj-zapis-')))
const o = (id: string, tekst: string) => poprawObjasnienie({ id, strona: 's-a1.webp', x: 1, y: 1, w: 10, h: 10, rodzaj: 'odczyt', tekst, powiazania: [], opracowal: 'test', widocznosc: 'publiczne' }) as Objasnienie

test('wersja: brak pliku – pusta wersja i brak czasu zapisu', () => {
    assert.deepEqual(wersjaObjasnien('mat-syntetyczny'), { wersja: '', zapisano: null })
})
test('zapis z aktualną wersją przechodzi i zwraca nową wersję oraz czas; nieaktualna wersja – konflikt, plik bez zmian', async () => {
    const a = await zapiszObjasnieniaWersja('mat-syntetyczny', [o('o-aaaa', 'pierwsze')], '')
    assert.equal(a.ok, true)
    assert.ok(a.wersja.length > 0 && a.zapisano)
    assert.deepEqual(wersjaObjasnien('mat-syntetyczny').wersja, a.wersja)
    // drugie okno ma wersję sprzed zapisu
    const b = await zapiszObjasnieniaWersja('mat-syntetyczny', [o('o-bbbb', 'z drugiego okna')], '')
    assert.equal(b.ok, false)
    assert.equal(b.wersja, a.wersja)
    assert.match(fs.readFileSync('content/objasnienia/mat-syntetyczny.json', 'utf8'), /pierwsze/)
    // pierwsze okno zapisuje dalej swoją wersją
    const c = await zapiszObjasnieniaWersja('mat-syntetyczny', [o('o-aaaa', 'drugie')], a.wersja)
    assert.equal(c.ok, true)
    assert.notEqual(c.wersja, a.wersja)
})
test('dwa równoczesne zapisy z tą samą wersją – przechodzi tylko pierwszy', async () => {
    const w = wersjaObjasnien('mat-syntetyczny').wersja
    const [x, y] = await Promise.all([zapiszObjasnieniaWersja('mat-syntetyczny', [o('o-xxxx', 'x')], w), zapiszObjasnieniaWersja('mat-syntetyczny', [o('o-yyyy', 'y')], w)])
    assert.deepEqual([x.ok, y.ok], [true, false])
})
test('usunięcie wszystkich objaśnień też jest zapisem z czasem', async () => {
    const r = await zapiszObjasnieniaWersja('mat-syntetyczny', [], wersjaObjasnien('mat-syntetyczny').wersja)
    assert.equal(r.ok, true)
    assert.ok(r.zapisano)
    assert.equal(fs.existsSync('content/objasnienia/mat-syntetyczny.json'), false)
})
