// P2 · ADM-06: wstępy działów – nowe działy (księgi, słownik, plany) są edytowalne, a schemat Keystatic i DZIALY się zgadzają.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { DZIALY, znormalizujWstep } from './wstepy'

const ROOT = path.resolve(import.meta.dirname, '../..')

test('ADM-06: księgi, słownik i plany mają wstęp edytowalny w panelu', () => {
    for (const d of ['ksiegi', 'slownik', 'plany']) assert.ok((DZIALY as readonly string[]).includes(d), d)
})
test('ADM-06: każdy dział z DZIALY ma pola w schemacie Keystatic (wstepyDzialow)', () => {
    const cfg = fs.readFileSync(path.join(ROOT, 'keystatic.config.ts'), 'utf8')
    const blok = cfg.slice(cfg.indexOf('wstepyDzialow: singleton'), cfg.indexOf('stronaGlowna: singleton'))
    for (const d of DZIALY) assert.match(blok, new RegExp(`\\['${d}', '`), `brak działu „${d}” w schemacie`)
})
test('ADM-06: znormalizujWstep przycina i odrzuca niebezpieczny adres', () => {
    const w = znormalizujWstep({ slownik: { tytul: ' Słownik ', wstep: 'Tekst', linkTekst: 'więcej', linkAdres: 'javascript:alert(1)' } }, 'slownik')
    assert.deepEqual(w, { tytul: 'Słownik', wstep: 'Tekst', linkTekst: 'więcej', linkAdres: '' })
    assert.equal(znormalizujWstep({ slownik: { linkAdres: '/biblioteka' } }, 'slownik').linkAdres, '/biblioteka')
    assert.equal(znormalizujWstep(null, 'plany').wstep, '')
})
