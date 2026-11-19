// PK (zasada 5.1d): styl panelu pilnuje test, nie pamięć – kolory tylko w tokenach, bez stylów w miejscu w plikach ramy,
// bez grubszej lewej krawędzi jako wyróżnienia i bez wersalików z rozstrzeleniem.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { skanujCss, skanujTsx } from './skaner'

const ROOT = process.cwd()
const czytaj = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const CSS = 'app/keystatic/panel.css'
/** Pliki ramy i ekranów przerobionych w PK i P5 – zero stylów w miejscu z kolorem/rozmiarem i zero hex (pozostałe ekrany – przy P6). */
const PLIKI_RAMY = [
    'app/keystatic/layout.tsx', 'app/keystatic/RamaPanelu.tsx', 'app/keystatic/panel/wspolne.tsx', 'app/keystatic/panel/page.tsx',
    'app/keystatic/osoby/page.tsx', 'app/keystatic/osoby/[id]/EdytorOsoby.tsx', 'app/keystatic/osoby/wspolne.ts', 'app/keystatic/plany/page.tsx',
    'lib/panel/menu.ts',
    // P5
    'app/keystatic/panel/okno.tsx', 'app/keystatic/panel/operacje/page.tsx', 'app/keystatic/panel/ksiegi-import/page.tsx', 'app/keystatic/panel/raport-ksiag/page.tsx', 'app/keystatic/panel/lista/[kolekcja]/page.tsx',
    // P6a
    'lib/panel/katalogi.ts', 'lib/panel/historia.ts', 'lib/panel/praca.ts', 'app/keystatic/SzufladaHistorii.tsx', 'app/keystatic/panel/do-opracowania/page.tsx', 'app/keystatic/PaletaPolecen.tsx', 'lib/panel/paleta.ts',
    // P7a
    'app/keystatic/MenuKonta.tsx', 'app/keystatic/panel/dostep/page.tsx', 'app/keystatic/panel/dostep/wspolne.tsx', 'app/keystatic/panel/dostep/[id]/page.tsx', 'app/keystatic/panel/dostep/role/page.tsx', 'lib/konta/model.ts',
    // P7b (TER-01): „w terenie” i „z terenu”
    'app/keystatic/RamaTerenu.tsx', 'app/keystatic/teren/page.tsx', 'app/keystatic/teren/wspolne.tsx', 'app/keystatic/teren/plan/[slug]/PlanTerenowy.tsx', 'app/keystatic/teren/nowe/page.tsx',
    'app/keystatic/teren/wyslij/page.tsx', 'app/keystatic/teren/konto/page.tsx', 'app/keystatic/panel/teren/page.tsx',
]
const blokTokenow = (sel: string) => /^(\.pn|\.dark \.pn)$/.test(sel) || /kui-scheme--/.test(sel)

test('arkusz panelu: kolory hex tylko w blokach tokenów (.pn, .dark .pn, schematy Keystatic)', () => {
    const n = skanujCss(czytaj(CSS), blokTokenow)
    assert.deepEqual(n.map((x) => `${x.co}@${x.linia}`), [])
})

test('skaner z własną regułą bloku tokenów: hex poza blokiem jest naruszeniem', () => {
    const css = '.pn{--pn-a:#fff}.pn-b{color:#000}.dark .pn{--pn-a:#111}'
    assert.deepEqual(skanujCss(css, blokTokenow).map((x) => x.co), ['#000'])
})

test('pliki ramy panelu: bez hex i bez stylów w miejscu (poza „styl-dynamiczny”)', () => {
    for (const p of PLIKI_RAMY) {
        const kod = czytaj(p)
        const hex = [...kod.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0])
        assert.deepEqual(hex, [], `${p}: kolory hex`)
        if (p.endsWith('.tsx')) assert.deepEqual(skanujTsx(kod, p).map((x) => `${x.rodzaj}:${x.co}@${x.linia}`), [], `${p}: style w miejscu`)
    }
})

test('zakaz 5.1d: bez grubszej lewej krawędzi jako wyróżnienia (poza kreską aktywnej pozycji menu) i bez wersalików', () => {
    const css = czytaj(CSS) + PLIKI_RAMY.map(czytaj).join('\n') + czytaj('app/keystatic/plany/[slug]/Edytor.tsx')
    assert.doesNotMatch(css, /inset\s+[2-9]px\s+0\s+0/, 'cień wewnętrzny z lewej (lewa krawędź)')
    assert.doesNotMatch(css, /border-left:\s*[2-9]px/, 'gruba lewa ramka')
    assert.doesNotMatch(css, /borderLeft:\s*['"]?[2-9]px/, 'gruba lewa ramka (styl w miejscu)')
    assert.doesNotMatch(czytaj(CSS), /text-transform:\s*uppercase/, 'wersaliki')
    assert.doesNotMatch(czytaj('app/keystatic/plany/[slug]/Edytor.tsx'), /text-transform:uppercase/, 'wersaliki w edytorze planu')
    // jedyna kreska 3 px – przy aktywnej pozycji menu
    const kreski = [...czytaj(CSS).matchAll(/([^{}]+)\{[^}]*width:\s*3px[^}]*\}/g)].map((m) => m[1].trim())
    assert.ok(kreski.every((s) => /aria-current=page\]::before/.test(s)), `kreska 3 px poza menu: ${kreski.join(' | ')}`)
})

test('panel nie ładuje się na stronach publicznych: arkusz importowany tylko w układzie /keystatic', () => {
    assert.match(czytaj('app/keystatic/layout.tsx'), /import '\.\/panel\.css'/)
    assert.doesNotMatch(czytaj('app/layout.tsx'), /panel\.css/)
    assert.doesNotMatch(czytaj('app/globals.css'), /panel\.css/)
})

test('łatka P5: useParams w panelu zawsze z ?. – na VPS typ zwraca „| null” i next build przerywał wdrożenie (TS2339)', () => {
    const pliki = ['app/keystatic/panel/lista/[kolekcja]/page.tsx', 'app/keystatic/panel/materialy/[id]/page.tsx', 'app/keystatic/panel/materialy/[id]/objasnienia/page.tsx']
    for (const p of pliki) {
        const kod = czytaj(p)
        for (const m of kod.matchAll(/useParams<[^>]*>\(\)(.{0,2})/g)) assert.equal(m[1], '?.', `${p}: useParams bez „?.”`)
        assert.doesNotMatch(kod, /const \{[^}]*\} = useParams/, `${p}: destrukturyzacja wyniku useParams`)
    }
})
