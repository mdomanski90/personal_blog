// JW-1 (JW-01): skaner języka wizualnego – testy na krótkich fragmentach kodu (dane syntetyczne).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { skanujTsx, skanujCss } from './skaner'

const rodzaje = (n: { rodzaj: string; co: string }[]) => n.map((x) => `${x.rodzaj}:${x.co}`)

test('styl inline z rozmiarem, szerokością, kolorem, odstępem i ramką – każda właściwość osobno', () => {
    const kod = `export const A = () => <div style={{ fontSize: 13, maxWidth: '52rem', color: 'red', padding: 4, border: '1px solid', display: 'flex', font: 'inherit' }} />`
    assert.deepEqual(rodzaje(skanujTsx(kod)), ['styl:fontSize', 'styl:maxWidth', 'styl:color', 'styl:padding', 'styl:border', 'styl:font'])
})

test('właściwości poza zakazanymi grupami (położenie, wyświetlanie) nie są naruszeniem', () => {
    const kod = `export const A = ({x}:{x:number}) => <div style={{ left: x + '%', top: 0, display: 'grid', position: 'absolute', transform: 'none' }} />`
    assert.deepEqual(skanujTsx(kod), [])
})

test('wyjątek /* styl-dynamiczny: … */ z uzasadnieniem zwalnia cały atrybut', () => {
    const kod = `export const A = ({p}:{p:number}) => <div style={/* styl-dynamiczny: szerokość paska postępu z danych */ { width: p + '%' }} />`
    assert.deepEqual(skanujTsx(kod), [])
})

test('znacznik styl-dynamiczny bez uzasadnienia nie działa', () => {
    const kod = `export const A = ({p}:{p:number}) => <div style={/* styl-dynamiczny: */ { width: p + '%' }} />`
    assert.deepEqual(rodzaje(skanujTsx(kod)), ['styl:width'])
})

test('styl przekazany zmienną liczy się jako jedno naruszenie (nie da się go sprawdzić)', () => {
    const kod = `const s = { fontSize: 15 }\nexport const A = () => <span style={s} />`
    assert.deepEqual(rodzaje(skanujTsx(kod)), ['styl:(zmienna)'])
})

test('zmienna CSS przekazywana do klasy jest dozwolona bez komentarza', () => {
    const kod = `export const A = ({k}:{k:string}) => <span style={{ ['--kolor-warstwy' as string]: k, '--x': 1 } as React.CSSProperties} />`
    assert.deepEqual(skanujTsx(kod), [])
})

test('rozwinięcie ...obiekt w stylu liczy się jako naruszenie', () => {
    const kod = `const b = {}\nexport const A = () => <span style={{ ...b, left: 0 }} />`
    assert.deepEqual(rodzaje(skanujTsx(kod)), ['styl:(rozwinięcie)'])
})

test('kolor hex w napisie, szablonie i klasie Tailwind – naruszenie; w komentarzu i w kotwicy – nie', () => {
    const kod = [
        `// akcent #4c3cc4 (komentarz)`,
        `const a = '#fff'`,
        'const b = `1px solid #e0d9cb`',
        `export const C = () => <a href="#tresc" className="bg-[#fdfcf9]">x</a>`,
    ].join('\n')
    const n = skanujTsx(kod)
    assert.deepEqual(rodzaje(n), ['hex:#fff', 'hex:#e0d9cb', 'hex:#fdfcf9'])
    assert.deepEqual(n.map((x) => x.linia), [2, 3, 4])
})

test('hex z komentarzem styl-dynamiczny w tej samej linii jest dozwolony', () => {
    const kod = `const kolorMapy = '#4c3cc4' /* styl-dynamiczny: MapLibre nie czyta zmiennych CSS */`
    assert.deepEqual(skanujTsx(kod), [])
})

test('CSS: hex tylko w deklaracjach tokenów (:root, .dark, html.dark, @theme)', () => {
    const css = [
        ':root {', '  --tekst: #1c1b18;', '}',
        '.dark { --tekst: #ece8df; }',
        '@theme inline { --color-x: #123456; }',
        'html.dark { background-color: #1a1917; --color-gray-50: #faf8f4; }',
        '.karta { color: #333; border: 1px solid #e0d9cb; }',
        ':root { color: #000; }',
        '@media print { .a { color: #000 } :root { --druk: #000 } }',
        '/* komentarz #abcdef */',
    ].join('\n')
    const n = skanujCss(css)
    // :root w @media print z deklaracją tokenu (np. --druk-…) to też blok tokenów
    assert.deepEqual(n.map((x) => `${x.linia}:${x.co}`), ['6:#1a1917', '7:#333', '7:#e0d9cb', '8:#000', '9:#000'])
})

test('CSS: numery linii po wielowierszowym komentarzu', () => {
    const css = '/* a\n b\n c */\n.x { color: #abc; }'
    assert.deepEqual(skanujCss(css).map((x) => x.linia), [4])
})
