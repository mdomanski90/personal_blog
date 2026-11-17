// Etap 3 · zasada „wstęp” w spisie treści (uwaga właściciela 17.11): gdy nad pierwszą tabelą karty jest tekst (lead w
// NaglowekKarty), spis zaczyna się od pozycji, która do niego prowadzi. Jedna reguła we wspólnym miejscu – test pilnuje
// także stron: każda karta, która przekazuje `lead=` do NaglowekKarty, buduje spis z opcją `wstep`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ID_WSTEPU, idCzesci, spisCzesci } from './spis-karty'

const ROOT = path.resolve(import.meta.dirname, '..')

test('spisCzesci: bez wstępu – tylko części', () => {
    assert.deepEqual(spisCzesci(['podstawowe', false, 'jak cytować']), [
        { id: 'cz-podstawowe', tekst: 'podstawowe' },
        { id: 'cz-jak-cytowac', tekst: 'jak cytować' },
    ])
})

test('spisCzesci: z tekstem nad tabelą – „wstęp” na początku, z id tekstu', () => {
    const s = spisCzesci(['podstawowe'], { wstep: true })
    assert.deepEqual(s[0], { id: ID_WSTEPU, tekst: 'wstęp' })
    assert.equal(s[1].id, 'cz-podstawowe')
})

test('spisCzesci: wstep=false (np. pusty lead) – bez pozycji „wstęp”', () => {
    assert.equal(spisCzesci(['podstawowe'], { wstep: false }).some((p) => p.tekst === 'wstęp'), false)
})

test('spisCzesci: osoba – „biogram” zaczyna się od tekstu nad tabelą (bez dodatkowego „wstępu”)', () => {
    const s = spisCzesci(['biogram', 'życie'], { wstep: true, wstepTo: 'biogram' })
    assert.deepEqual(s.map((p) => p.tekst), ['biogram', 'życie'])
    assert.equal(s[0].id, idCzesci('biogram'))
})

function strony(dir: string): string[] {
    const wyn: string[] = []
    for (const w of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const p = path.join(dir, w.name)
        if (w.isDirectory()) { if (!['keystatic', 'api'].includes(w.name)) wyn.push(...strony(p)) }
        else if (w.name === 'page.tsx') wyn.push(p)
    }
    return wyn
}

test('każda karta z tekstem nad tabelą (lead=) ma „wstęp” w spisie (opcja wstep w spisCzesci)', () => {
    const bez: string[] = []
    for (const p of strony('app')) {
        const kod = fs.readFileSync(path.join(ROOT, p), 'utf8')
        if (!kod.includes('<NaglowekKarty')) continue
        // lead przekazany do NaglowekKarty (także lead={…} w wielu liniach)
        if (!/<NaglowekKarty[\s\S]*?\slead=/.test(kod)) continue
        if (!/spisCzesci\([\s\S]*?\{\s*wstep[:\s,}]/.test(kod)) bez.push(p)
    }
    assert.deepEqual(bez, [], `karty z lead bez „wstępu” w spisie: ${bez.join(', ')}`)
})
