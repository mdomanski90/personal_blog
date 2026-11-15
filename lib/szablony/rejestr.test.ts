// Test spójności (P7G): mapa szablonów musi być kompletna i prawdziwa.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { MIEJSCA, POZA_MAPA, WZORCE } from './rejestr'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const BYTY = /href=\{`\/(obiekty|parafie|miejsca|osoby|archiwum|biblioteka\/publikacje|archiwum\/zbiory|tematy|wpisy|plany)\/\$\{/

function pliki(dir: string): string[] {
    const wyn: string[] = []
    for (const w of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const p = path.join(dir, w.name)
        if (w.isDirectory()) { if (!['keystatic', 'api'].includes(w.name)) wyn.push(...pliki(p)) }
        else if (p.endsWith('.tsx')) wyn.push(p)
    }
    return wyn
}

test('każde miejsce z mapy istnieje i używa deklarowanego wzorca', () => {
    for (const m of MIEJSCA) {
        const p = path.join(ROOT, m.plik)
        assert.ok(fs.existsSync(p), `brak pliku ${m.plik}`)
        const w = WZORCE.find((x) => x.id === m.wzorzec)
        assert.ok(w, `nieznany wzorzec ${m.wzorzec}`)
        if (w.znacznik.length) {
            const kod = fs.readFileSync(p, 'utf8')
            assert.ok(w.znacznik.some((z) => kod.includes(z)), `${m.plik} (${m.gdzie}) – deklaruje „${w.nazwa}”, ale nie używa ${w.znacznik.join(' / ')}`)
        }
        if (m.status !== 'zgodne') assert.ok(m.uwaga, `${m.plik} (${m.gdzie}) – status „${m.status}” wymaga uzasadnienia`)
    }
})

test('każdy plik z listą odnośników do bytów jest na mapie szablonów', () => {
    const znane = new Set([...MIEJSCA.map((m) => m.plik), ...POZA_MAPA.map((p) => p.plik)])
    const brak = pliki('app').map((p) => p.split(path.sep).join('/')).filter((p) => BYTY.test(fs.readFileSync(path.join(ROOT, p), 'utf8')) && !znane.has(p))
    assert.deepEqual(brak, [], `Nowe miejsca wyświetlania bytów bez wpisu w lib/szablony/rejestr.ts: ${brak.join(', ')}`)
})
