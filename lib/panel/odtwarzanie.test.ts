// P5: sprawdzenie i odtworzenie kopii – test odtwarzający na danych SYNTETYCZNYCH (kopia z panelu → zmiany → raport → odtworzenie → cofnij).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { utworzKopie } from './kopia'
import { bladOdczytu, odtworzZKopii, raportKopii, rozpakuj, zmianyOdtworzenia } from './odtwarzanie'
import { cofnijOperacje } from './operacje'

async function stronaZKopia() {
    const k = await fs.mkdtemp(path.join(os.tmpdir(), 'odtw-strona-'))
    const w = (p: string, t: string | Buffer) => fs.mkdir(path.dirname(path.join(k, p)), { recursive: true }).then(() => fs.writeFile(path.join(k, p), t))
    await w('content/miejsca/testowo.mdoc', '---\ntitle: Testowo\ntype: wies\n---\nWieś przykładowa.\n')
    await w('content/miejsca/wola.mdoc', '---\ntitle: Wola\n---\n')
    await w('content/osoby/os-jan.json', '{"imiona":"Jan"}')
    await w('content/osoby/os-maria.json', '{"imiona":"Maria"}')
    await w('content/plany/podklad.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 1]))
    await w('pliki-archiwum/skan.jpg', Buffer.alloc(1024, 3))
    await fs.mkdir(path.join(k, 'data'))
    const db = new Database(path.join(k, 'data', 'baza.db')); db.exec('create table t(x)'); db.prepare('insert into t values (1)').run(); db.close()
    const s = await utworzKopie('komputer', { korzen: k, commit: 'test123' })
    if (typeof s === 'string') throw new Error(s)
    const plik = path.join(os.tmpdir(), `odtw-${path.basename(k)}.tar.gz`)
    const out = createWriteStream(plik)
    const zamk = new Promise<void>((ok) => out.on('close', () => ok()))
    s.strumien.pipe(out)
    const [wynik] = await Promise.all([s.koniec, zamk])
    assert.ok(wynik.ok, wynik.blad)
    return { k, plik }
}

test('kopia → zmiany → raport różnic (niczego nie zmienia) → odtworzenie pliku i katalogu jako operacja → cofnij', async () => {
    const { k, plik } = await stronaZKopia()
    let kat = ''
    try {
        // po kopii: zmiana, usunięcie, nowy plik
        await fs.writeFile(path.join(k, 'content', 'miejsca', 'testowo.mdoc'), '---\ntitle: Testowo (zmienione)\n---\n')
        await fs.rm(path.join(k, 'content', 'osoby', 'os-maria.json'))
        await fs.writeFile(path.join(k, 'content', 'osoby', 'os-nowy.json'), '{"imiona":"Nowy"}')
        kat = await rozpakuj(plik)
        const r = await raportKopii(kat, k)
        assert.equal(r.opis?.commit, 'test123')
        assert.deepEqual(r.bledy, [])
        assert.deepEqual(r.bazy.map((b) => [b.nazwa, b.ok]), [['baza.db', true]])
        const c = r.czesci.find((x) => x.nazwa === 'content')!
        assert.deepEqual([c.rozne, c.tylkoWKopii, c.tylkoTeraz], [['miejsca/testowo.mdoc'], ['osoby/os-maria.json'], ['osoby/os-nowy.json']])
        assert.equal(await fs.readFile(path.join(k, 'content', 'miejsca', 'testowo.mdoc'), 'utf8'), '---\ntitle: Testowo (zmienione)\n---\n', 'raport niczego nie zmienia')
        // podgląd odtworzenia katalogu osoby/: przywraca Marię i usuwa nowego
        const z = await zmianyOdtworzenia(kat, ['osoby/'], k)
        assert.deepEqual(z.map((x) => [x.plik, x.poprzedni === null, x.wynik === null]), [['osoby/os-maria.json', true, false], ['osoby/os-nowy.json', false, true]])
        const w = await odtworzZKopii(kat, ['miejsca/testowo.mdoc', 'osoby/'], 'test.tar.gz', k)
        assert.equal(w.zapisane, 3)
        assert.match(await fs.readFile(path.join(k, 'content', 'miejsca', 'testowo.mdoc'), 'utf8'), /title: Testowo\n/)
        await assert.rejects(fs.stat(path.join(k, 'content', 'osoby', 'os-nowy.json')), { code: 'ENOENT' })
        await cofnijOperacje(w.id!, { korzen: k })
        assert.equal(await fs.readFile(path.join(k, 'content', 'osoby', 'os-nowy.json'), 'utf8'), '{"imiona":"Nowy"}', 'odtworzenie da się cofnąć')
        // plik binarny – odmowa
        await fs.writeFile(path.join(k, 'content', 'plany', 'podklad.png'), Buffer.from([1, 2, 0, 3]))
        await assert.rejects(zmianyOdtworzenia(kat, ['plany/podklad.png'], k), /binarny/)
        await assert.rejects(zmianyOdtworzenia(kat, ['../etc/passwd'], k), /Niedozwolona/)
    } finally {
        await fs.rm(k, { recursive: true, force: true }); await fs.rm(plik, { force: true })
        if (kat) await fs.rm(kat, { recursive: true, force: true })
    }
})

test('czytelność treści tym samym parserem co strona: YAML, JSON, nagłówek .mdoc', () => {
    assert.equal(bladOdczytu('a.yaml', 'title: A\n'), null)
    assert.match(bladOdczytu('a.yaml', 'title: A\ntitle: B\n')!, /duplicated/)
    assert.match(bladOdczytu('a.json', '{"a":')!, /JSON|Unexpected/)
    assert.equal(bladOdczytu('a.mdoc', '---\ntitle: A\n---\ntreść'), null)
    assert.match(bladOdczytu('a.mdoc', '---\ntitle: A\ntreść bez końca nagłówka')!, /niezamknięty/)
    assert.equal(bladOdczytu('a.png', '\u0000'), null)
})

test('uszkodzone archiwum – czytelny błąd, nic nie rozpakowane obok danych', async () => {
    const p = path.join(os.tmpdir(), `zle-${Date.now()}.tar.gz`)
    await fs.writeFile(p, 'to nie jest archiwum')
    try { await assert.rejects(rozpakuj(p), /Nie da się rozpakować/) } finally { await fs.rm(p, { force: true }) }
})
