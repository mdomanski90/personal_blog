// KAT-01/02: zapis rejestru – katalog tymczasowy, kandydaci syntetyczni (bez czytania treści).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { KonfliktRejestru, PLIK_REJESTRU, nadajBrakujace, numerKat, wczytajRejestr, zapiszRejestr } from './dane'
import type { Kandydat } from './model'

const kat = fs.mkdtempSync(path.join(os.tmpdir(), 'katalog-'))
process.chdir(kat)
test.after(() => { process.chdir(os.tmpdir()); fs.rmSync(kat, { recursive: true, force: true }) })

let kand: Kandydat[] = [
    { rodzaj: 'material', id: 'akt-1', nazwa: 'Akt', sort: '2026-01-01' },
    { rodzaj: 'osoba', id: 'jan-1820', nazwa: 'Jan', sort: '1820' },
]
const op = { zbierz: async () => kand, przekierowania: () => null, dzis: '2026-11-16' }

test('bez rejestru nadawanie automatyczne nic nie robi (migracja tylko za zgodą)', async () => {
    const w = await nadajBrakujace({ ...op, zapisz: true })
    assert.equal(w.wylaczone, true)
    assert.equal(fs.existsSync(PLIK_REJESTRU()), false)
    assert.equal(numerKat('material', 'akt-1'), null)
})

test('podgląd migracji nie zapisuje; migracja tworzy rejestr; numer czytany przez numerKat', async () => {
    const pod = await nadajBrakujace({ ...op, zapisz: false, utworz: true })
    assert.deepEqual(pod.nadane.map((x) => x.nr).sort(), ['MA-0001', 'OS-0001'])
    assert.equal(fs.existsSync(PLIK_REJESTRU()), false)
    const w = await nadajBrakujace({ ...op, zapisz: true, utworz: true })
    assert.equal(w.zapisano, true)
    assert.equal(wczytajRejestr()!.wersja, 1)
    assert.equal(numerKat('osoba', 'jan-1820'), 'OS-0001')
})

test('kolejne nadanie po dodaniu pozycji publicznej; jednoczesne wywołania nie dublują numerów', async () => {
    kand = [...kand, { rodzaj: 'material', id: 'akt-2', nazwa: 'Akt 2', sort: '2026-02-01' }]
    const [a, b] = await Promise.all([nadajBrakujace({ ...op, zapisz: true }), nadajBrakujace({ ...op, zapisz: true })])
    assert.deepEqual([...a.nadane, ...b.nadane].map((x) => x.nr), ['MA-0002'])
    const r = wczytajRejestr()!
    assert.equal(r.licznik.MA, 2)
    assert.equal(numerKat('material', 'akt-2'), 'MA-0002')
})

test('kontrola wersji: zapis ze starą wersją odrzucony (konflikt), plik bez zmian', () => {
    const r = wczytajRejestr()!
    assert.throws(() => zapiszRejestr(r, r.wersja - 1), KonfliktRejestru)
    assert.equal(wczytajRejestr()!.wersja, r.wersja)
    assert.deepEqual(fs.readdirSync(path.dirname(PLIK_REJESTRU())).filter((p) => p.endsWith('.tmp')), [], 'bez śmieci .tmp')
})

test('niespójny rejestr nie jest zapisywany ani czytany po cichu', () => {
    const r = wczytajRejestr()!
    assert.throws(() => zapiszRejestr({ ...r, pozycje: { ...r.pozycje, 'MA-0009': { rodzaj: 'material', id: 'akt-1', nadano: 'x' } } }, r.wersja), /niespójnego/)
    fs.writeFileSync(PLIK_REJESTRU(), JSON.stringify({ wersja: 9, licznik: {}, pozycje: { 'MA-0001': { rodzaj: 'osoba', id: 'x', nadano: 'x' } } }))
    assert.throws(() => wczytajRejestr(), /niespójny/)
})
