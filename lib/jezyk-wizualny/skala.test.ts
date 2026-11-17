// P1 · UX-03 (zasada 5.1c): skala A−/A+ – w stronach publicznych żaden rozmiar pisma nie jest sztywnym px ani rem.
// Rozmiary wyłącznie z tokenów `--rozmiar-*` albo `calc(Npx * var(--font-scale))`. Wyjątek (biblioteka, rysunek w zoomie, znak w stałym kółku)
// wymaga komentarza `skala-wyjatek: powód` w tej samej linii. Pilnuje test, nie pamięć (lekcja 16.11).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, plikiPubliczne } from './zapadka'

const WYJATEK = /skala-wyjatek:\s*\S/
const SKALOWANE = /var\(--(font-scale|rozmiar-[a-z-]+|blog-font-size)/

/** Deklaracje font-size w jednej linii CSS (w tym minifikowanych reguł): wartości bez skali. */
export function nieskalowaneRozmiaryCss(linia: string): string[] {
    const wynik: string[] = []
    for (const m of linia.matchAll(/(?<![-\w])font-size\s*:\s*([^;}]+)/g)) {
        const v = m[1].trim()
        if (SKALOWANE.test(v)) continue
        if (/^(inherit|initial|unset|1em|100%)$/.test(v)) continue
        if (/\d(\.\d+)?(px|rem)\b/.test(v)) wynik.push(v)   // em i % dziedziczą skalę od rodzica; pt – tylko druk
    }
    return wynik
}

test('globals.css: font-size tylko z tokenów albo z --font-scale (UX-03)', () => {
    const css = fs.readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8').split('\n')
    const zle: string[] = []
    css.forEach((linia, i) => {
        if (WYJATEK.test(linia)) return
        for (const v of nieskalowaneRozmiaryCss(linia)) zle.push(`app/globals.css:${i + 1}  font-size: ${v}`)
    })
    assert.equal(zle.length, 0, `Rozmiary pisma poza skalą A± (użyj --rozmiar-* albo calc(Npx * var(--font-scale,1)); wyjątek: /* skala-wyjatek: powód */):\n${zle.join('\n')}`)
})

test('skaner: rozpoznaje sztywne i skalowane rozmiary', () => {
    assert.deepEqual(nieskalowaneRozmiaryCss('.a{font-size:13px}'), ['13px'])
    assert.deepEqual(nieskalowaneRozmiaryCss('.a{font-size: clamp(12px, 1.25vw, 14px)}'), ['clamp(12px, 1.25vw, 14px)'])
    assert.deepEqual(nieskalowaneRozmiaryCss('.a{font-size:calc(13px * var(--font-scale,1))}'), [])
    assert.deepEqual(nieskalowaneRozmiaryCss('.a{font-size:var(--rozmiar-opis)}'), [])
    assert.deepEqual(nieskalowaneRozmiaryCss('.a{font-size:.88em}'), [], 'em dziedziczy skalę od rodzica')
    assert.deepEqual(nieskalowaneRozmiaryCss('.a{font-size:1.1rem}'), ['1.1rem'])
    assert.deepEqual(nieskalowaneRozmiaryCss('.a{--x:calc(12px * var(--font-scale,1))}'), [])
})

test('pliki publiczne: style inline z fontSize tylko ze skalą A± (UX-03)', () => {
    const zle: string[] = []
    for (const plik of plikiPubliczne()) {
        const linie = fs.readFileSync(path.join(ROOT, plik), 'utf8').split('\n')
        linie.forEach((linia, i) => {
            if (WYJATEK.test(linia)) return
            for (const m of linia.matchAll(/\bfontSize\s*:\s*('[^']*'|"[^"]*"|`[^`]*`|[\d.]+)/g)) {
                const v = m[1].replace(/^['"`]|['"`]$/g, '')
                if (SKALOWANE.test(v) || /^(inherit|1em)$/.test(v)) continue
                zle.push(`${plik}:${i + 1}  fontSize: ${m[1]}`)
            }
        })
    }
    assert.equal(zle.length, 0, `Sztywne rozmiary pisma w TSX (użyj klasy z tokenem albo calc(Npx * var(--font-scale,1))):\n${zle.join('\n')}`)
})
