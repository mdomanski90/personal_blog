// SLW-04 (P3): jeden błędny wpis kolekcji Keystatic nie może po cichu opróżnić całej kolekcji (dawniej `.all().catch(() => [])`).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createReader } from '@keystatic/core/reader'
import keystaticConfig from '../keystatic.config'
import { wczytajOdpornie } from './kolekcja-odporna'

test('SLW-04: błędny wpis pominięty i zgłoszony, reszta kolekcji czytana (zastępczy czytnik)', async () => {
    const kol = {
        list: async () => ['a', 'zly', 'b'],
        read: async (s: string) => { if (s === 'zly') throw new Error('Invalid data for "zly"'); return { title: s } },
    }
    const w = await wczytajOdpornie(kol)
    assert.deepEqual(w.wpisy.map((x) => x.slug), ['a', 'b'])
    assert.equal(w.bledy.length, 1)
    assert.equal(w.bledy[0].slug, 'zly')
})

test('SLW-04: prawdziwy czytnik Keystatic – slug z polskimi znakami i nieznany rodzaj nie opróżniają słownika (dane syntetyczne)', async () => {
    const kat = fs.mkdtempSync(path.join(os.tmpdir(), 'odniepamieci-hasla-'))
    try {
        const h = path.join(kat, 'content', 'hasla'); fs.mkdirSync(h, { recursive: true })
        fs.writeFileSync(path.join(h, 'arenda.yaml'), 'title: arenda\nkind: pojecie\nmeaning: Dzierżawa.\nvisibility: publiczne\n')
        fs.writeFileSync(path.join(h, 'żarna.yaml'), 'title: żarna\nkind: pojecie\nmeaning: Młynek.\nvisibility: publiczne\n')
        fs.writeFileSync(path.join(h, 'zly.yaml'), 'title: zly\nkind: nieznany\nmeaning: x\n')
        const cfg = (keystaticConfig as unknown as { collections?: unknown }).collections ? keystaticConfig : (keystaticConfig as unknown as { default: typeof keystaticConfig }).default
        const r = createReader(kat, cfg) as unknown as { collections: { hasla: { all: () => Promise<unknown[]>; list: () => Promise<string[]>; read: (s: string) => Promise<unknown> } } }
        await assert.rejects(() => r.collections.hasla.all(), 'odtworzenie błędu: .all() rzuca przy jednym złym wpisie – dawny .catch(() => []) dawał pusty słownik')
        const w = await wczytajOdpornie(r.collections.hasla)
        assert.deepEqual(w.wpisy.map((x) => x.slug), ['arenda'])
        assert.deepEqual(w.bledy.map((x) => x.slug).sort(), ['zly', 'żarna'])
    } finally { fs.rmSync(kat, { recursive: true, force: true }) }
})

test('P5: odporny czytnik – jeden obiekt z rodzajem spoza listy nie wyłącza kolekcji (odtworzenie obserwacji z P3: 500 stron)', async () => {
    const { odpornyCzytnik } = await import('./kolekcja-odporna')
    const kat = fs.mkdtempSync(path.join(os.tmpdir(), 'odniepamieci-obiekty-'))
    try {
        const o = path.join(kat, 'content', 'obiekty'); fs.mkdirSync(o, { recursive: true })
        const wpis = (slug: string, typ: string) => fs.writeFileSync(path.join(o, `${slug}.mdoc`), `---\ntitle: Obiekt ${slug}\ntype: ${typ}\nexists: true\nvisibility: publiczne\n---\nOpis syntetyczny.\n`)
        wpis('obj-kapliczka-a', 'kapliczka'); wpis('obj-kapliczka-b', 'kapliczka'); wpis('obj-zly', 'rodzaj-spoza-listy')
        const cfg = (keystaticConfig as unknown as { collections?: unknown }).collections ? keystaticConfig : (keystaticConfig as unknown as { default: typeof keystaticConfig }).default
        const zwykly = createReader(kat, cfg)
        await assert.rejects(() => zwykly.collections.obiekty.all({ resolveLinkedFiles: true }), 'odtworzenie błędu: zwykły czytnik rzuca – strona dawała 500')
        const ostrzezenia: string[] = []
        const warn = console.warn; console.warn = (m: string) => { ostrzezenia.push(m) }
        try {
            const w = await odpornyCzytnik(zwykly).collections.obiekty.all({ resolveLinkedFiles: true })
            assert.deepEqual(w.map((x) => x.slug).sort(), ['obj-kapliczka-a', 'obj-kapliczka-b'])
            assert.equal(typeof w[0].entry.description, 'object', 'resolveLinkedFiles działa jak w .all() – treść rozwinięta')
        } finally { console.warn = warn }
        assert.equal(ostrzezenia.length, 1)
        assert.match(ostrzezenia[0], /obiekty: pominięto wpis „obj-zly”/)
        // reszta czytnika bez zmian
        assert.equal((await odpornyCzytnik(zwykly).collections.obiekty.read('obj-kapliczka-a'))?.title, 'Obiekt obj-kapliczka-a')
    } finally { fs.rmSync(kat, { recursive: true, force: true }) }
})
