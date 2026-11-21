import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// Lekcja 21.11 (wdrożenie 0ec0c85 + 07c234e przerwane): ścieżka `path.join(process.cwd(), 'content')` bez
// /*turbopackIgnore: true*/ sprawia, że next build przegląda cały katalog treści. Prywatny katalog operacji
// (content/_operacje/<id>, 0700, właściciel usługi) przerwał budowę: „Permission denied”. Treść jest czytana
// w czasie działania, nie przy budowie – każda taka ścieżka w lib/ musi mieć znacznik (zasada 6.3).
function pliki(kat: string): string[] {
    return fs.readdirSync(kat, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(kat, e.name)
        return e.isDirectory() ? pliki(p) : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : []
    })
}

test('lib/: ścieżki od process.cwd() mają /*turbopackIgnore: true*/ (budowa nie przegląda content/)', () => {
    const zle: string[] = []
    for (const p of pliki(path.join(process.cwd(), 'lib'))) {
        fs.readFileSync(p, 'utf8').split('\n').forEach((w, i) => {
            if (/path\.(join|resolve)\(\s*process\.cwd\(\)/.test(w)) zle.push(`${path.relative(process.cwd(), p)}:${i + 1}`)
        })
    }
    assert.deepEqual(zle, [])
})

test('Tailwind nie przegląda danych: globals.css wyklucza content/, pliki-archiwum/ i data/', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf8')
    for (const k of ['content', 'pliki-archiwum', 'data']) assert.match(css, new RegExp(`@source not "\\.\\./${k}";`))
})
