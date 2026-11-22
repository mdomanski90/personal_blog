import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { celPrzekierowania } from './przekierowania'
import { POWIAZANIA, wartosciPola } from './panel/jakosc'

test('przekierowania: prosty wpis, łańcuch, pętla, inny rodzaj', () => {
    const L = [
        { rodzaj: 'parafie', stary: 'gmina-testowa', nowy: 'urzad-testowy' },
        { rodzaj: 'miejsca', stary: 'wies-a', nowy: 'wies-b' }, { rodzaj: 'miejsca', stary: 'wies-b', nowy: 'wies-c' },
        { rodzaj: 'tematy', stary: 'x', nowy: 'y' }, { rodzaj: 'tematy', stary: 'y', nowy: 'x' },
    ]
    assert.equal(celPrzekierowania(L, 'parafie', 'gmina-testowa'), 'urzad-testowy')
    assert.equal(celPrzekierowania(L, 'miejsca', 'wies-a'), 'wies-c')
    assert.equal(celPrzekierowania(L, 'tematy', 'x'), 'y')
    assert.equal(celPrzekierowania(L, 'miejsca', 'gmina-testowa'), null)
    assert.equal(celPrzekierowania(L, 'parafie', 'nie-ma'), null)
})

test('wartości pól powiązań: pojedyncze, lista, lista obiektów', () => {
    const d = { parish: 'p1', spatial: ['a', 'b', ''], parishes: [{ parish: 'p2', from: 1800 }, { from: 1900 }] }
    assert.deepEqual(wartosciPola(d, 'parish'), ['p1'])
    assert.deepEqual(wartosciPola(d, 'spatial[]'), ['a', 'b'])
    assert.deepEqual(wartosciPola(d, 'parishes[].parish'), ['p2'])
    // ARC-14: lista obiektów z listą identyfikatorów w środku (punkty mapy zbioru → materiały)
    const z = { mapPoints: [{ name: 'A', materials: ['m-1', '', 'm-2'] }, { name: 'B' }, { name: 'C', materials: ['m-3'] }] }
    assert.deepEqual(wartosciPola(z, 'mapPoints[].materials'), ['m-1', 'm-2', 'm-3'])
})

test('mapa powiązań w panelu jakości obejmuje każde pole relacji z keystatic.config.ts', () => {
    const kod = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'keystatic.config.ts'), 'utf8')
    const znane = new Set(Object.values(POWIAZANIA).flat().map(([p, cel]) => `${p.replace(/\[\]\..*|\[\]/, '').split('.').pop()}→${cel}`))
    for (const [p, cel] of Object.values(POWIAZANIA).flat()) if (p.includes('[].')) znane.add(`${p.split('[].')[1]}→${cel}`)
    const brak: string[] = []
    for (const m of kod.matchAll(/(\w+): fields\.(?:multiRelationship|relationship)\(\{[\s\S]*?collection: '(\w+)'/g)) {
        if (m[1] === 'id') continue // wstawka materiału w treści Markdoc – nie pole rekordu
        if (!znane.has(`${m[1]}→${m[2]}`)) brak.push(`${m[1]}→${m[2]}`)
    }
    assert.deepEqual(brak, [], 'nowe pole powiązania – dopisz je do POWIAZANIA w lib/panel/jakosc.ts')
})

// Łatka 21.11: dział „tematy” → „leksykon” – stare adresy przekierowane na stałe (zasada 2.1), dane bez zmian
test('stare adresy /tematy i /tematy/<slug> prowadzą na stałe do /leksykon', async () => {
    const cfg = (await import('../next.config.mjs')).default as { redirects: () => Promise<{ source: string; destination: string; permanent: boolean }[]> }
    const r = await cfg.redirects()
    assert.ok(r.some((x) => x.source === '/tematy' && x.destination === '/leksykon' && x.permanent))
    assert.ok(r.some((x) => x.source === '/tematy/:slug' && x.destination === '/leksykon/:slug' && x.permanent))
    const { RODZAJE_PRZEKIEROWAN } = await import('./przekierowania')
    assert.equal(RODZAJE_PRZEKIEROWAN.tematy.adres, '/leksykon')
})
