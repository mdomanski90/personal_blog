import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import Database from 'better-sqlite3'
import { sprawdzKatalog, ustawKatalog, utworzKopie, wczytajZnacznik, zapiszNaSerwerze, ZACHOWAJ_NA_SERWERZE } from './kopia'

// Dane syntetyczne – żadnych prawdziwych treści.
async function strona() {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kopia-strona-'))
    await fs.mkdir(path.join(root, 'content', 'miejsca'), { recursive: true })
    await fs.writeFile(path.join(root, 'content', 'miejsca', 'wies-testowa.mdoc'), '---\ntitle: Wieś testowa\n---\n')
    await fs.mkdir(path.join(root, 'pliki-archiwum'))
    await fs.writeFile(path.join(root, 'pliki-archiwum', 'skan.jpg'), Buffer.alloc(2048, 7))
    await fs.mkdir(path.join(root, 'data'))
    const db = new Database(path.join(root, 'data', 'test.db'))
    db.pragma('journal_mode = WAL')
    db.exec('create table t(x text)'); db.prepare('insert into t values (?)').run('zapis w WAL')
    // baza otwarta (WAL nie scalony) – .backup() musi i tak zawierać wiersz
    return { root, db }
}

test('kopia na komputer: archiwum zawiera content, pliki-archiwum, spójną bazę i kopia.json; zapisuje znacznik', async () => {
    const { root, db } = await strona()
    const s = await utworzKopie('komputer', { korzen: root, commit: 'abc1234' })
    assert.equal(typeof s, 'object')
    if (typeof s === 'string') return
    const plik = path.join(root, '..', s.nazwa)
    const out = createWriteStream(plik)
    const zamkniety = new Promise<void>((ok) => out.on('close', () => ok()))
    s.strumien.pipe(out)
    const [w] = await Promise.all([s.koniec, zamkniety])
    db.close()
    assert.ok(w.ok, w.blad)
    const lista = execFileSync('tar', ['-tzf', plik]).toString()
    for (const p of ['content/miejsca/wies-testowa.mdoc', 'pliki-archiwum/skan.jpg', 'data/test.db', 'kopia.json']) assert.ok(lista.includes(p), p)
    assert.ok(!lista.includes('test.db-wal'))
    const cel = await fs.mkdtemp(path.join(os.tmpdir(), 'kopia-odtw-'))
    execFileSync('tar', ['-xzf', plik, '-C', cel])
    const odtw = new Database(path.join(cel, 'data', 'test.db'), { readonly: true })
    assert.equal((odtw.prepare('select x from t').get() as { x: string }).x, 'zapis w WAL')
    odtw.close()
    const opis = JSON.parse(await fs.readFile(path.join(cel, 'kopia.json'), 'utf8'))
    assert.equal(opis.commit, 'abc1234')
    assert.ok((await wczytajZnacznik(root)).komputer?.czas)
    await fs.rm(plik)
})

test('katalog kopii: tylko ścieżka bezwzględna, bez „..”, poza katalogiem strony, zapisywalna', async () => {
    const { root, db } = await strona(); db.close()
    assert.match(await sprawdzKatalog('kopie', root) ?? '', /pełną ścieżkę/)
    assert.match(await sprawdzKatalog('/tmp/../etc', root) ?? '', /\.\./)
    assert.match(await sprawdzKatalog(path.join(root, 'content'), root) ?? '', /poza katalogiem strony/)
    assert.match(await sprawdzKatalog(path.join(root, 'nie-ma'), root) ?? '', /poza katalogiem strony/)
    assert.match(await sprawdzKatalog('/nie-ma-takiego-katalogu-kopii', root) ?? '', /nie istnieje/)
})

test('kopia na serwerze: zapis przez .part, zostaje 5 najnowszych własnych archiwów, obce pliki nietknięte', async () => {
    const { root, db } = await strona(); db.close()
    const kat = await fs.mkdtemp(path.join(os.tmpdir(), 'kopia-kat-'))
    for (let i = 1; i <= 6; i++) await fs.writeFile(path.join(kat, `odniepamieci-kopia-2020010${i}-000000.tar.gz`), 'stara')
    await fs.writeFile(path.join(kat, 'notatka.txt'), 'obcy plik')
    assert.equal(await zapiszNaSerwerze({ korzen: root }), 'Najpierw wskaż katalog kopii na serwerze.')
    assert.equal(await ustawKatalog(kat, root), null)
    const w = await zapiszNaSerwerze({ korzen: root })
    assert.equal(typeof w, 'object', String(w))
    const pliki = (await fs.readdir(kat)).sort()
    assert.equal(pliki.filter((n) => n.startsWith('odniepamieci-kopia-')).length, ZACHOWAJ_NA_SERWERZE)
    assert.ok(pliki.includes('notatka.txt'))
    assert.ok(!pliki.some((n) => n.endsWith('.part')))
    assert.ok(!pliki.includes('odniepamieci-kopia-20200101-000000.tar.gz'))
    assert.ok((await wczytajZnacznik(root)).serwer?.plik)
})
