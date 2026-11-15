import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { wykonajPartie } from './zapis-importu'

test('rollback po błędzie w połowie importu odtwarza treści i usuwa nowe pliki', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ksiegi-test-'))
    const katalog = path.join(root, 'ksiegi')
    const backup = path.join(root, 'backup')
    await fs.mkdir(katalog)
    const a = path.join(katalog, 'a.yaml'), b = path.join(katalog, 'b.yaml')
    await fs.writeFile(a, 'oryginalny: tak\n')
    await assert.rejects(wykonajPartie([
        { id: 'a', plik: a, poprzedni: 'oryginalny: tak\n', wynik: 'zmieniony: tak\n' },
        { id: 'b', plik: b, poprzedni: null, wynik: 'nowy: tak\n' },
    ], katalog, backup, async (i) => { if (i === 1) throw new Error('symulacja awarii') }), /symulacja awarii/)
    assert.equal(await fs.readFile(a, 'utf8'), 'oryginalny: tak\n')
    await assert.rejects(fs.stat(b), { code: 'ENOENT' })
    await fs.rm(root, { recursive: true, force: true })
})

test('zapis tworzy nowy i aktualizuje istniejący rekord; preflight nie nadpisuje zmian z Keystatic', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ksiegi-test-'))
    const katalog = path.join(root, 'ksiegi')
    await fs.mkdir(katalog)
    const a = path.join(katalog, 'a.yaml'), b = path.join(katalog, 'b.yaml')
    await fs.writeFile(a, 'stare: tak\n')
    const zmiany = [
        { id: 'a', plik: a, poprzedni: 'stare: tak\n', wynik: 'nowe: tak\n' },
        { id: 'b', plik: b, poprzedni: null, wynik: 'nowe: tak\n' },
    ]
    const r = await wykonajPartie(zmiany, katalog, path.join(root, 'backup'))
    assert.deepEqual([r.dodane, r.uzupelnione], [1, 1])
    assert.equal(await fs.readFile(a, 'utf8'), 'nowe: tak\n')
    await assert.rejects(wykonajPartie(zmiany, katalog, path.join(root, 'backup')), /zmieniona/)
    await fs.rm(root, { recursive: true, force: true })
})

test('rollback usuwa również nowo utworzony plik po błędzie kolejnego zapisu', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ksiegi-test-'))
    const katalog = path.join(root, 'ksiegi')
    await fs.mkdir(katalog)
    const a = path.join(katalog, 'a.yaml'), b = path.join(katalog, 'b.yaml')
    await assert.rejects(wykonajPartie([
        { id: 'a', plik: a, poprzedni: null, wynik: 'pierwszy: tak\n' },
        { id: 'b', plik: b, poprzedni: null, wynik: 'drugi: tak\n' },
    ], katalog, path.join(root, 'backup'), async (i) => { if (i === 1) throw new Error('test drugiej pozycji') }), /test drugiej pozycji/)
    await assert.rejects(fs.stat(a), { code: 'ENOENT' })
    await assert.rejects(fs.stat(b), { code: 'ENOENT' })
    await fs.rm(root, { recursive: true, force: true })
})


test('nowe i uzupełniane księgi są czytelne dla grupy katalogu, kopie pozostają prywatne', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ksiegi-prawa-'))
    const katalog = path.join(root, 'ksiegi'), backup = path.join(root, 'backup')
    try {
        await fs.mkdir(katalog, { mode: 0o2770 })
        const a = path.join(katalog, 'a.yaml'), b = path.join(katalog, 'b.yaml')
        await fs.writeFile(a, 'stare: tak\n', { mode: 0o600 })
        const wynik = await wykonajPartie([
            { id: 'a', plik: a, poprzedni: 'stare: tak\n', wynik: 'nowe: tak\n' },
            { id: 'b', plik: b, poprzedni: null, wynik: 'dodane: tak\n' },
        ], katalog, backup)
        for (const plik of [a, b]) {
            const stat = await fs.stat(plik)
            assert.equal(stat.mode & 0o777, 0o640)
            assert.equal(stat.gid, (await fs.stat(katalog)).gid)
        }
        assert.ok(wynik.backup)
        assert.equal((await fs.stat(wynik.backup!)).mode & 0o777, 0o700)
        assert.equal((await fs.stat(path.join(wynik.backup!, 'a.yaml'))).mode & 0o777, 0o600)
        assert.equal((await fs.stat(path.join(wynik.backup!, 'wynik.json'))).mode & 0o777, 0o600)
    } finally {
        await fs.rm(root, { recursive: true, force: true })
    }
})

test('rollback odtwarza stare dane z prawem odczytu dla grupy katalogu', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ksiegi-prawa-'))
    const katalog = path.join(root, 'ksiegi')
    try {
        await fs.mkdir(katalog)
        const a = path.join(katalog, 'a.yaml'), b = path.join(katalog, 'b.yaml')
        await fs.writeFile(a, 'przed: tak\n', { mode: 0o600 })
        await assert.rejects(wykonajPartie([
            { id: 'a', plik: a, poprzedni: 'przed: tak\n', wynik: 'po: tak\n' },
            { id: 'b', plik: b, poprzedni: null, wynik: 'nowa: tak\n' },
        ], katalog, path.join(root, 'backup'), async (i) => {
            if (i === 1) throw new Error('przerwij testowo')
        }), /przerwij testowo/)
        assert.equal(await fs.readFile(a, 'utf8'), 'przed: tak\n')
        assert.equal((await fs.stat(a)).mode & 0o777, 0o640)
        await assert.rejects(fs.stat(b), { code: 'ENOENT' })
    } finally {
        await fs.rm(root, { recursive: true, force: true })
    }
})
