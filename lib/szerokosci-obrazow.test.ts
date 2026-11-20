// Lekcja 20.11: szerokość ?w= spoza listy serwera = pełny oryginał zamiast miniatury.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { SZEROKOSCI } from './szerokosci-obrazow'
import { adresMiniatury } from './zapowiedzi'

const pliki = (kat: string): string[] => fs.readdirSync(kat, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(kat, e.name)
    if (e.isDirectory()) return e.name === 'node_modules' || e.name.startsWith('.') ? [] : pliki(p)
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : []
})
const wszystkie = new Set(Object.values(SZEROKOSCI).flat() as number[])
const wspolne = (...r: (keyof typeof SZEROKOSCI)[]) => r.map((k) => SZEROKOSCI[k] as readonly number[]).reduce((a, b) => a.filter((x) => b.includes(x)))

test('obrazy: każda szerokość ?w= w kodzie jest na liście serwera', () => {
    const zle: string[] = []
    for (const p of [...pliki('app'), ...pliki('lib')]) {
        const t = fs.readFileSync(p, 'utf8')
        for (const m of t.matchAll(/\?w=(\d+)/g)) {
            const linia = t.slice(0, m.index).split('\n').length
            const kod = t.split('\n')[linia - 1]
            if (/^\s*(\/\/|\/?\*)/.test(kod)) continue // komentarz z opisem listy
            if (!wszystkie.has(Number(m[1]))) zle.push(`${p}:${linia} ?w=${m[1]}`)
        }
    }
    assert.deepEqual(zle, [])
})

test('obrazy: karta „z archiwum” (skan albo zdjęcie obiektu) prosi o szerokość wspólną dla obu', () => {
    const t = fs.readFileSync('app/components/LosowaKarta.tsx', 'utf8')
    const w = [...t.matchAll(/\?w=(\d+)/g)].map((m) => Number(m[1]))
    assert.ok(w.length > 0)
    for (const x of w) assert.ok(wspolne('strony', 'obiekty').includes(x), `?w=${x}`)
})

test('obrazy: obrazStrony – strony skanu i plik obrazu materiału pomniejszane, inne adresy bez zmian', async () => {
    const { obrazStrony } = await import('./pliki')
    assert.equal(obrazStrony('/pliki/strony/m/s-1.jpg', 480), '/pliki/strony/m/s-1.jpg?w=480')
    assert.equal(obrazStrony('/pliki/zdjecie-x/foto.JPG', 160), '/pliki/zdjecie-x/foto.JPG?w=160')
    assert.equal(obrazStrony('/pliki/akt-x/akt.pdf', 480), '/pliki/akt-x/akt.pdf')
    assert.equal(obrazStrony('/pliki/obiekty/k/a.jpg', 480), '/pliki/obiekty/k/a.jpg', 'obiekty mają własne szerokości')
    assert.equal(obrazStrony('https://example.org/a.jpg', 480), 'https://example.org/a.jpg')
    assert.deepEqual(SZEROKOSCI.plikMaterialu, SZEROKOSCI.strony, 'obrazStrony daje tę samą szerokość obu rodzajom')
})

test('obrazy: miniatury zdjęć grobów (karta osoby, panel grobu) w szerokości trasy /plany/<plan>/zdjecie', () => {
    for (const [p, wz] of [['app/osoby/[id]/page.tsx', /zdjecie\}\?w=(\d+)/], ['app/components/plan/PanelPlanu.tsx', /zdjecie\/\$\{z\.plik\}\?w=(\d+)/]] as const) {
        const m = fs.readFileSync(p, 'utf8').match(wz)
        assert.ok(m && (SZEROKOSCI.zdjeciaGrobow as readonly number[]).includes(Number(m[1])), p)
    }
})

test('obrazy: miniatura wpisu (skan albo plik obrazu materiału) w szerokości wydawanej przez serwer', () => {
    for (const a of [adresMiniatury({ strony: [{ adres: '/pliki/strony/m/s-1.jpg' }] }), adresMiniatury({ strony: [], plik: '/pliki/m/z.jpg' })]) {
        const w = Number(new URL(a!, 'http://x').searchParams.get('w'))
        assert.ok(wspolne('strony', 'plikMaterialu').includes(w), String(a))
    }
})
