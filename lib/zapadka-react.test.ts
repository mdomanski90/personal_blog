import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { policzReact, porownaj, suma, type ZapadkaReact } from './zapadka-react'

const k = (ruleId: string | null, severity = 1) => ({ ruleId, severity })

test('P7c: zapadka React – liczy tylko react-hooks/*, pomija pliki bez ostrzeżeń, zapis stabilny', () => {
    const L = policzReact([
        { plik: 'app/b.tsx', komunikaty: [k('react-hooks/refs'), k('react-hooks/refs'), k('@next/next/no-html-link-for-pages')] },
        { plik: 'app/a.tsx', komunikaty: [k('react-hooks/set-state-in-effect'), k(null)] },
        { plik: 'app/c.tsx', komunikaty: [k('@typescript-eslint/no-unused-vars')] },
    ])
    assert.deepEqual(L, { 'app/a.tsx': { 'react-hooks/set-state-in-effect': 1 }, 'app/b.tsx': { 'react-hooks/refs': 2 } })
    assert.deepEqual(Object.keys(L), ['app/a.tsx', 'app/b.tsx'])
    assert.equal(suma(L), 3)
})

test('P7c: zapadka React – wzrost w pliku i nowy plik z ostrzeżeniem to błąd; spadek – do obniżenia zapadki', () => {
    const zap = { 'app/a.tsx': { 'react-hooks/refs': 2, 'react-hooks/immutability': 1 } }
    assert.deepEqual(porownaj(zap, { 'app/a.tsx': { 'react-hooks/refs': 2, 'react-hooks/immutability': 1 } }), { wzrost: [], spadek: [] })
    const r = porownaj(zap, { 'app/a.tsx': { 'react-hooks/refs': 3 }, 'app/nowy.tsx': { 'react-hooks/refs': 1 } })
    assert.deepEqual(r.wzrost, ['app/a.tsx react-hooks/refs: 2 → 3', 'app/nowy.tsx react-hooks/refs: 0 → 1'])
    assert.deepEqual(r.spadek, ['app/a.tsx react-hooks/immutability: 1 → 0'])
})

test('P7c: plik zapadki istnieje, ma tylko reguły react-hooks/* i liczby dodatnie', () => {
    const z = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib', 'zapadka-react.json'), 'utf8')) as ZapadkaReact
    assert.ok(z.opis.includes('react-hooks'))
    for (const [plik, r] of Object.entries(z.pliki)) {
        assert.ok(!plik.startsWith('/') && !plik.includes('\\'), plik)
        for (const [regula, n] of Object.entries(r)) assert.ok(regula.startsWith('react-hooks/') && Number.isInteger(n) && n > 0, `${plik} ${regula}`)
    }
})
