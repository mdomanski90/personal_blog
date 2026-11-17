// P2 · DZL-01 + UX-11: jedna kolejność strony działu, odmiana i pusty stan przez wspólne komponenty (test pilnuje także stron).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ElementyDzialu, KOLEJNOSC_DZIALU } from '../app/components/ElementyDzialu'

const ROOT = path.resolve(import.meta.dirname, '..')
const czytaj = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')

test('DZL-01: kolejność – spis działów, wstęp, panel, wybrane, licznik, lista, strony (niezależnie od kolejności argumentów)', () => {
    assert.deepEqual([...KOLEJNOSC_DZIALU], ['spis', 'wstep', 'panel', 'wybrane', 'licznik', 'tresc', 'stronicowanie'])
    const odwrotnie = Object.fromEntries([...KOLEJNOSC_DZIALU].reverse().map((k) => [k, React.createElement('i', { 'data-k': k })]))
    const html = renderToStaticMarkup(React.createElement(ElementyDzialu, odwrotnie))
    const wystapienia = [...html.matchAll(/data-k="([a-z]+)"/g)].map((m) => m[1])
    assert.deepEqual(wystapienia, [...KOLEJNOSC_DZIALU])
})

test('DZL-01: puste elementy nie zostawiają śladu', () => {
    const html = renderToStaticMarkup(React.createElement(ElementyDzialu, { spis: React.createElement('i', { 'data-k': 'spis' }), wstep: null, panel: undefined }))
    assert.equal(html, '<i data-k="spis"></i>')
})

const STRONY_DZIALOW = ['app/archiwum/page.tsx', 'app/biblioteka/page.tsx', 'app/biblioteka/publikacje/page.tsx', 'app/biblioteka/ksiegi/page.tsx', 'app/biblioteka/slownik/page.tsx', 'app/szukaj/page.tsx']

test('DZL-01: każda strona działu składa się przez StronaDzialu, nie przez własną kolejność', () => {
    for (const p of STRONY_DZIALOW) {
        const z = czytaj(p)
        assert.match(z, /<StronaDzialu[\s>]/, `${p}: brak <StronaDzialu>`)
        assert.doesNotMatch(z, /<Strona[\s>]/, `${p}: <Strona> bezpośrednio – kolejność ma wyznaczać StronaDzialu`)
    }
})

function pliki(dir: string, wynik: string[] = []): string[] {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`
        if (e.isDirectory()) { if (e.name !== 'keystatic' && e.name !== 'node_modules') pliki(rel, wynik) }
        else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) wynik.push(rel)
    }
    return wynik
}

test('UX-11: odmiana liczebników tylko przez odmiana() z lib/tekst (bez ręcznych „% 10 >= 2”)', () => {
    const naruszenia = [...pliki('app'), ...pliki('lib')]
        .filter((p) => !['lib/tekst.ts', 'lib/odmiana.ts'].includes(p))
        .filter((p) => /%\s*10\s*>=\s*2/.test(czytaj(p)))
    assert.deepEqual(naruszenia, [], 'użyj odmiana() z @/lib/tekst')
})

test('UX-11: pusty stan tylko przez <Komunikat> (bez ręcznie złożonego k-kom)', () => {
    const naruszenia = pliki('app')
        .filter((p) => p !== 'app/components/Komunikat.tsx')
        .filter((p) => /className="k-kom k-kom--/.test(czytaj(p)))
    assert.deepEqual(naruszenia, [], 'użyj <Komunikat rodzaj="pusto">')
})
