// P5: import ksiąg – zapis przez operacje (cofnij) i kolumny spoza formatu (IMP-10). Dane syntetyczne.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import * as yaml from 'js-yaml'
import { kolumnyDodatkowe, nieznaneKolumny, zapiszImport } from './import-ksiegi'
import { cofnijOperacje, wczytajManifest } from './operacje'

test('IMP-10: kolumny spoza formatu są wykrywane i zachowywane jako „kolumna: wartość” (puste pomijane)', () => {
    const znane = new Set(['ksiega_id', 'nazwa'])
    const w: Record<string, string>[] = [{ ksiega_id: 'a', nazwa: 'A', przyszla_kolumna: 'x', pusta: '' }, { ksiega_id: 'b', nazwa: 'B', inna: 'y' }]
    assert.deepEqual(nieznaneKolumny(w, znane), ['przyszla_kolumna', 'pusta', 'inna'])
    assert.deepEqual(kolumnyDodatkowe(w[0], znane), ['przyszla_kolumna: x'])
})

const ksiega = (title: string, note = '') => ({
    title, parish: null, fonds: null, relatedParishes: [], relatedReligions: [], types: ['urodzenia'], spatial: ['testowo'], years: '1826–1875',
    gaps: '', language: '', repository: 'Archiwum Przykładowe', identifier: `99/${title}`, volumes: [], access: 'skany', scans: null, index: null, visibility: 'ja', note,
})

test('import ksiąg: nowe „tylko ja”, operacja w panelu, „cofnij” usuwa dodane i przywraca uzupełnione', async () => {
    const k = await fs.mkdtemp(path.join(os.tmpdir(), 'import-ksiag-'))
    try {
        await fs.mkdir(path.join(k, 'content', 'ksiegi'), { recursive: true })
        const stara = yaml.dump({ title: 'Stara', identifier: '99/stara', years: '', visibility: 'publiczne' })
        await fs.writeFile(path.join(k, 'content', 'ksiegi', 'stara.yaml'), stara)
        const z = { uwagi: [], rekordy: [
            { id: 'nowa', ksiega: ksiega('nowa', 'inne kolumny arkusza:\nprzyszla_kolumna: x'), parafiaNazwa: '', liczbaTomow: 0, zrodloZespolu: null },
            { id: 'stara', ksiega: ksiega('stara'), parafiaNazwa: '', liczbaTomow: 0, zrodloZespolu: null },
        ] }
        const w = await zapiszImport(z as never, 'dopelnij', false, 'ja', false, false, k)
        assert.deepEqual([w.dodane, w.uzupelnione], [1, 1])
        const nowa = yaml.load(await fs.readFile(path.join(k, 'content', 'ksiegi', 'nowa.yaml'), 'utf8')) as Record<string, unknown>
        assert.equal(nowa.visibility, 'ja')
        assert.match(String(nowa.note), /przyszla_kolumna: x/)
        const uzup = yaml.load(await fs.readFile(path.join(k, 'content', 'ksiegi', 'stara.yaml'), 'utf8')) as Record<string, unknown>
        assert.deepEqual([uzup.years, uzup.visibility, uzup.title], ['1826–1875', 'publiczne', 'Stara'], 'dopełnia tylko puste pola')
        const m = (await wczytajManifest(w.operacja!, k))!
        assert.equal(m.rodzaj, 'import-ksiag')
        await cofnijOperacje(w.operacja!, { korzen: k })
        await assert.rejects(fs.stat(path.join(k, 'content', 'ksiegi', 'nowa.yaml')), { code: 'ENOENT' })
        assert.equal(await fs.readFile(path.join(k, 'content', 'ksiegi', 'stara.yaml'), 'utf8'), stara)
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})
