// P5: wspólny mechanizm operacji (podgląd + cofnij) – dane syntetyczne w katalogu tymczasowym.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
    wykonajOperacje, cofnijOperacje, podgladCofniecia, rozstrzygnijPrzerwana, stanBlokady, blokadaZapisu, zdejmijMartwaBlokade,
    listaOperacji, wczytajManifest, sciezkaTresci, ZACHOWAJ_OPERACJI,
} from './operacje'

async function korzen() {
    const k = await fs.mkdtemp(path.join(os.tmpdir(), 'operacje-'))
    await fs.mkdir(path.join(k, 'content', 'obiekty'), { recursive: true })
    await fs.writeFile(path.join(k, 'content', 'obiekty', 'a.mdoc'), 'A1')
    await fs.writeFile(path.join(k, 'content', 'obiekty', 'b.mdoc'), 'B1')
    return k
}
const czytaj = (k: string, p: string) => fs.readFile(path.join(k, 'content', p), 'utf8').catch(() => null)

test('operacja: utworzenie, zmiana, usunięcie; cofnij przywraca, cofnięcie cofnięcia znów stosuje', async () => {
    const k = await korzen()
    try {
        const w = await wykonajOperacje({ korzen: k, rodzaj: 'zbiorcza', opis: 'test', zmiany: [
            { plik: 'obiekty/a.mdoc', poprzedni: 'A1', wynik: 'A2' },
            { plik: 'obiekty/b.mdoc', poprzedni: 'B1', wynik: null },
            { plik: 'obiekty/c.mdoc', poprzedni: null, wynik: 'C2' },
        ] })
        assert.deepEqual([w.zmienione, w.usuniete, w.utworzone], [1, 1, 1])
        assert.deepEqual([await czytaj(k, 'obiekty/a.mdoc'), await czytaj(k, 'obiekty/b.mdoc'), await czytaj(k, 'obiekty/c.mdoc')], ['A2', null, 'C2'])
        assert.equal((await wczytajManifest(w.id!, k))!.stan, 'zapisane')
        assert.equal(await stanBlokady(k), null, 'blokada zdjęta')
        const p = await podgladCofniecia(w.id!, k)
        assert.deepEqual([p.mozna, p.pliki, p.konflikty.length], [true, 3, 0])
        const c = await cofnijOperacje(w.id!, { korzen: k })
        assert.deepEqual([await czytaj(k, 'obiekty/a.mdoc'), await czytaj(k, 'obiekty/b.mdoc'), await czytaj(k, 'obiekty/c.mdoc')], ['A1', 'B1', null])
        assert.equal((await wczytajManifest(w.id!, k))!.stan, 'cofniete')
        assert.equal((await wczytajManifest(w.id!, k))!.cofnietaPrzez, c.id)
        await cofnijOperacje(c.id!, { korzen: k })
        assert.equal(await czytaj(k, 'obiekty/a.mdoc'), 'A2', 'cofnięcie cofnięcia')
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})

test('operacja: plik zmieniony od podglądu – nic nie zapisano, bez śladu w _operacje', async () => {
    const k = await korzen()
    try {
        await assert.rejects(wykonajOperacje({ korzen: k, rodzaj: 'zbiorcza', opis: 'x', zmiany: [
            { plik: 'obiekty/a.mdoc', poprzedni: 'A1', wynik: 'A2' },
            { plik: 'obiekty/b.mdoc', poprzedni: 'B0', wynik: 'B2' },
        ] }), /zmienił się od podglądu/)
        assert.equal(await czytaj(k, 'obiekty/a.mdoc'), 'A1')
        assert.deepEqual(await listaOperacji(k), [])
        assert.equal(await stanBlokady(k), null)
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})

test('operacja: błąd w połowie zapisu i błąd kontroli po zapisie – całość wraca, manifest „wycofane”', async () => {
    const k = await korzen()
    try {
        const zmiany = [{ plik: 'obiekty/a.mdoc', poprzedni: 'A1', wynik: 'A2' }, { plik: 'obiekty/c.mdoc', poprzedni: null, wynik: 'C2' }]
        await assert.rejects(wykonajOperacje({ korzen: k, rodzaj: 'zbiorcza', opis: 'x', zmiany, przedZapisem: async (i) => { if (i === 1) throw new Error('awaria testowa') } }), /awaria testowa/)
        assert.equal(await czytaj(k, 'obiekty/a.mdoc'), 'A1')
        await assert.rejects(wykonajOperacje({ korzen: k, rodzaj: 'zbiorcza', opis: 'y', zmiany, sprawdz: async () => { throw new Error('wpis nieczytelny') } }), /wpis nieczytelny/)
        assert.deepEqual([await czytaj(k, 'obiekty/a.mdoc'), await czytaj(k, 'obiekty/c.mdoc')], ['A1', null])
        assert.deepEqual((await listaOperacji(k)).map((m) => m.stan), ['wycofane', 'wycofane'])
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})

test('cofnij: plik zmieniony po operacji to konflikt – odmowa, a „pomiń konflikty” cofa resztę i nie rusza zmienionego', async () => {
    const k = await korzen()
    try {
        const w = await wykonajOperacje({ korzen: k, rodzaj: 'zbiorcza', opis: 'x', zmiany: [
            { plik: 'obiekty/a.mdoc', poprzedni: 'A1', wynik: 'A2' }, { plik: 'obiekty/b.mdoc', poprzedni: 'B1', wynik: 'B2' },
        ] })
        await fs.writeFile(path.join(k, 'content', 'obiekty', 'b.mdoc'), 'B3 – poprawka redaktora')
        assert.deepEqual((await podgladCofniecia(w.id!, k)).konflikty, ['obiekty/b.mdoc'])
        await assert.rejects(cofnijOperacje(w.id!, { korzen: k }), /zmieniono 1 plik/)
        assert.equal(await czytaj(k, 'obiekty/a.mdoc'), 'A2', 'odmowa nic nie zmienia')
        const c = await cofnijOperacje(w.id!, { korzen: k, pominKonflikty: true })
        assert.deepEqual(c.konflikty, ['obiekty/b.mdoc'])
        assert.deepEqual([await czytaj(k, 'obiekty/a.mdoc'), await czytaj(k, 'obiekty/b.mdoc')], ['A1', 'B3 – poprawka redaktora'])
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})

test('blokada: druga operacja w trakcie pierwszej odrzucona; zapis Keystatic dostaje komunikat', async () => {
    const k = await korzen()
    try {
        let wTrakcie: Promise<unknown> | null = null
        await wykonajOperacje({ korzen: k, rodzaj: 'import-ksiag', opis: 'import ksiąg – test', zmiany: [{ plik: 'obiekty/a.mdoc', poprzedni: 'A1', wynik: 'A2' }],
            przedZapisem: async () => {
                assert.match((await blokadaZapisu(k))!, /Trwa import ksiąg/)
                wTrakcie = wykonajOperacje({ korzen: k, rodzaj: 'zbiorcza', opis: 'druga', zmiany: [{ plik: 'obiekty/b.mdoc', poprzedni: 'B1', wynik: 'B2' }] })
                await assert.rejects(wTrakcie as Promise<unknown>, /Trwa inna operacja/)
            } })
        assert.equal(await blokadaZapisu(k), null)
        assert.equal(await czytaj(k, 'obiekty/b.mdoc'), 'B1')
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})

/** Awaria procesu w połowie: manifest „przygotowane”, część plików zapisana, blokada bez żywej operacji. */
async function przerwana(k: string) {
    const w = await wykonajOperacje({ korzen: k, rodzaj: 'import-drzewa', opis: 'import drzewa – test', zmiany: [
        { plik: 'obiekty/a.mdoc', poprzedni: 'A1', wynik: 'A2' }, { plik: 'obiekty/b.mdoc', poprzedni: 'B1', wynik: 'B2' },
    ] })
    const pm = path.join(k, 'content', '_operacje', w.id!, 'manifest.json')
    const m = JSON.parse(await fs.readFile(pm, 'utf8')); m.stan = 'przygotowane'; await fs.writeFile(pm, JSON.stringify(m))
    await fs.writeFile(path.join(k, 'content', 'obiekty', 'b.mdoc'), 'B1') // drugi plik nie zdążył się zapisać
    await fs.mkdir(path.join(k, 'content', '_operacje', '.blokada'), { recursive: true })
    await fs.writeFile(path.join(k, 'content', '_operacje', '.blokada', 'info.json'), JSON.stringify({ id: w.id, czas: '', rodzaj: 'import-drzewa', opis: 'import drzewa – test' }))
    return w.id!
}

test('awaria procesu: martwa blokada wstrzymuje zapis i operacje; „dokończ” zapisuje resztę, „cofnij” przywraca całość', async () => {
    const k = await korzen()
    try {
        const id = await przerwana(k)
        assert.equal((await stanBlokady(k))!.martwa, true)
        assert.match((await blokadaZapisu(k))!, /przerwana/)
        await assert.rejects(wykonajOperacje({ korzen: k, rodzaj: 'zbiorcza', opis: 'z', zmiany: [{ plik: 'obiekty/c.mdoc', poprzedni: null, wynik: 'C' }] }), /przerwana/)
        assert.match((await zdejmijMartwaBlokade(k))!, /dokończ albo cofnij/)
        const r = await rozstrzygnijPrzerwana(id, 'dokoncz', k)
        assert.deepEqual([r.zmienione, await czytaj(k, 'obiekty/a.mdoc'), await czytaj(k, 'obiekty/b.mdoc')], [1, 'A2', 'B2'])
        assert.equal(await stanBlokady(k), null)
        assert.equal((await wczytajManifest(id, k))!.stan, 'dokonczone')
    } finally { await fs.rm(k, { recursive: true, force: true }) }
    const k2 = await korzen()
    try {
        const id = await przerwana(k2)
        await rozstrzygnijPrzerwana(id, 'cofnij', k2)
        assert.deepEqual([await czytaj(k2, 'obiekty/a.mdoc'), await czytaj(k2, 'obiekty/b.mdoc')], ['A1', 'B1'])
        assert.equal(await stanBlokady(k2), null)
    } finally { await fs.rm(k2, { recursive: true, force: true }) }
})

test('ścieżki: tylko wewnątrz content/, bez „..”, plików ukrytych i katalogu kopii operacji', () => {
    for (const zla of ['../x', 'obiekty/../../x', '/etc/passwd', '_operacje/x/manifest.json', '_operacje/.blokada/info.json', 'obiekty//a', 'a\\b'])
        assert.throws(() => sciezkaTresci('/tmp/k', zla), Error, zla)
    assert.equal(sciezkaTresci('/tmp/k', 'obiekty/a.mdoc'), '/tmp/k/content/obiekty/a.mdoc')
})

test(`zostaje ${ZACHOWAJ_OPERACJI} ostatnich operacji`, async () => {
    const k = await korzen()
    try {
        let t = 'A1'
        for (let i = 0; i < ZACHOWAJ_OPERACJI + 3; i++) {
            await wykonajOperacje({ korzen: k, rodzaj: 'zbiorcza', opis: `nr ${i}`, zmiany: [{ plik: 'obiekty/a.mdoc', poprzedni: t, wynik: `A${i + 2}` }] })
            t = `A${i + 2}`
        }
        const L = await listaOperacji(k)
        assert.equal(L.length, ZACHOWAJ_OPERACJI)
        assert.equal(L[0].opis, `nr ${ZACHOWAJ_OPERACJI + 2}`)
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})

test('prawa „grupaKatalogu” (import ksiąg): pliki 0640 w grupie katalogu, kopie operacji prywatne (0700/0600) – także po cofnięciu', async () => {
    const k = await fs.mkdtemp(path.join(os.tmpdir(), 'operacje-prawa-'))
    try {
        const kat = path.join(k, 'content', 'ksiegi')
        await fs.mkdir(kat, { recursive: true, mode: 0o2770 })
        await fs.writeFile(path.join(kat, 'a.yaml'), 'stare: tak\n', { mode: 0o600 })
        const w = await wykonajOperacje({ korzen: k, rodzaj: 'import-ksiag', opis: 'x', prawa: { tryb: 0o640, grupaKatalogu: true }, zmiany: [
            { plik: 'ksiegi/a.yaml', poprzedni: 'stare: tak\n', wynik: 'nowe: tak\n' }, { plik: 'ksiegi/b.yaml', poprzedni: null, wynik: 'dodane: tak\n' },
        ] })
        const gid = (await fs.stat(kat)).gid
        for (const p of ['a.yaml', 'b.yaml']) {
            const st = await fs.stat(path.join(kat, p))
            assert.equal(st.mode & 0o777, 0o640); assert.equal(st.gid, gid)
        }
        const op = path.join(k, 'content', '_operacje', w.id!)
        assert.equal((await fs.stat(op)).mode & 0o777, 0o700)
        assert.equal((await fs.stat(path.join(op, 'przed', '0'))).mode & 0o777, 0o600)
        assert.equal((await fs.stat(path.join(op, 'manifest.json'))).mode & 0o777, 0o600)
        await cofnijOperacje(w.id!, { korzen: k })
        assert.equal((await fs.stat(path.join(kat, 'a.yaml'))).mode & 0o777, 0o640, 'cofnięcie z tymi samymi prawami')
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})
