// P6a: katalogi kopii (KOREKTA P5 – usługa bez zapisu w content/) i ich ukrycie przed Keystatic.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import ignore from 'ignore'
import { zapewnijKatalog, BrakKataloguKopii, brakujaceKatalogi, KOMENDA_KATALOGOW } from './katalogi'
import { wykonajOperacje, stanBlokady } from './operacje'

test('katalog kopii: zakłada .gitignore „*” – filtr jak w Keystatic (read-local) pomija zawartość', async () => {
    const k = await fs.mkdtemp(path.join(os.tmpdir(), 'katalogi-'))
    try {
        const kat = await zapewnijKatalog(k, '_historia')
        assert.equal(await fs.readFile(path.join(kat, '.gitignore'), 'utf8'), '*\n')
        await zapewnijKatalog(k, '_historia') // drugi raz – bez błędu, plik bez zmian
        const filtr = ignore().add(await fs.readFile(path.join(kat, '.gitignore'), 'utf8')).createFilter()
        assert.equal(filtr('content/_historia/posts/a.mdoc/20261118-1'), false)
        assert.equal(filtr('content/_historia/posts/'), false)
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})

test('katalog kopii: brak możliwości założenia → komunikat z komendą, operacja nic nie zmienia', async () => {
    const k = await fs.mkdtemp(path.join(os.tmpdir(), 'katalogi-'))
    try {
        await fs.writeFile(path.join(k, 'content'), 'to nie katalog')
        await assert.rejects(zapewnijKatalog(k, '_operacje'), (e: unknown) => e instanceof BrakKataloguKopii && (e as Error).message.includes(KOMENDA_KATALOGOW))
        assert.deepEqual(await brakujaceKatalogi(k), ['_operacje', '_historia', '_kosz'])
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})

test('operacja: blokada w content/_operacje/.blokada (nie w samym content/), po operacji zdjęta', async () => {
    const k = await fs.mkdtemp(path.join(os.tmpdir(), 'katalogi-'))
    try {
        await fs.mkdir(path.join(k, 'content', 'obiekty'), { recursive: true })
        await fs.writeFile(path.join(k, 'content', 'obiekty', 'a.mdoc'), 'A1')
        const w = await wykonajOperacje({ korzen: k, rodzaj: 'zbiorcza', opis: 't', zmiany: [{ plik: 'obiekty/a.mdoc', poprzedni: 'A1', wynik: 'A2' }],
            przedZapisem: async () => { await fs.access(path.join(k, 'content', '_operacje', '.blokada', 'info.json')) } })
        assert.ok(w.id)
        assert.equal(await stanBlokady(k), null)
        assert.deepEqual((await fs.readdir(path.join(k, 'content'))).sort(), ['_operacje', 'obiekty'], 'nic nowego w samym content/')
        assert.equal(await fs.readFile(path.join(k, 'content', '_operacje', '.gitignore'), 'utf8'), '*\n')
        assert.deepEqual(await brakujaceKatalogi(k), [], 'brakujące _historia/_kosz da się założyć – nie są uwagą')
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})
