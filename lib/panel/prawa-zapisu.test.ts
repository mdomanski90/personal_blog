// P6a: prawa zapisu przed zapisem Keystatic (EACCES na VPS 18.11 21:20: content/strona-glowna.yaml).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { komunikatPrawa } from './prawa-zapisu'

test('komunikat: plik, katalog i komenda tylko dla katalogu podrzędnego (nie dla samego content/)', () => {
    const k = komunikatPrawa([{ plik: 'content/materialy/nowy.mdoc', katalog: 'content/materialy' }])
    assert.match(k, /content\/materialy\/nowy\.mdoc/)
    assert.match(k, /sudo chmod g\+w content\/materialy$/)
    const k2 = komunikatPrawa([{ plik: 'content/strona-glowna.yaml', katalog: 'content' }])
    assert.doesNotMatch(k2, /chmod/)
})

test('ustawienia Keystatic nie leżą bezpośrednio w content/ (usługa nie zakłada tam plików) – wyjątek: istniejące „o projekcie”', () => {
    const cfg = fs.readFileSync(path.join(process.cwd(), 'keystatic.config.ts'), 'utf8')
    const blok = cfg.slice(cfg.indexOf('singletons: {'))
    const sciezki = [...blok.matchAll(/path: '([^']+)'/g)].map((m) => m[1])
    assert.ok(sciezki.length >= 6)
    const wprost = sciezki.filter((p) => /^content\/[^/]+$/.test(p))
    assert.deepEqual(wprost, ['content/o-projekcie'], `ustawienia wprost w content/: ${wprost.join(', ')}`)
})
