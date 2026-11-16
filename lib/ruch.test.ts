// 5A · system ruchu (UX-01, PD-18): tokeny czasu, lib/ruch.ts i „zero czasów ruchu spoza tokenów”.
// Pilnuje zasady z planszy Main („czasy tylko z tokenów – pilnuje tego test, nie pamięć”):
//  – CSS (app/**/*.css): transition / animation bez czasów wpisanych liczbą (0 s dozwolone), tylko var(--ruch-…);
//  – pliki publiczne (app/ bez /keystatic/ + używane przez nie components/ui): bez czasów ruchu w JS
//    (duration / animationTime liczbą ≠ 0, 'smooth' poza lib/ruch.ts, flyTo, klasy Tailwinda duration-N / delay-N,
//    transition / animation z czasem w stylach i <style>);
//  – każdy <details> ma treść w jednym opakowaniu .rozwin-tresc (rozwijanie siatką 0fr→1fr).
// Wyjątek: w tej samej linii komentarz `ruch-wyjatek: uzasadnienie`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { ROOT, plikiPubliczne } from './jezyk-wizualny/zapadka'
import { KRZYWA, TOKENY_MS, animuj, czasRuchu, krzywa, naMilisekundy, przywrocFokus } from './ruch'

const WYJATEK = /ruch-wyjatek:\s*\S/
const css = fs.readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8')

// ---------- tokeny ----------
test('tokeny ruchu w globals.css = lib/ruch.ts (0,25 / 0,4 / 0,5 s, krzywa przejścia stron)', () => {
    const root = css.slice(css.indexOf(':root {'), css.indexOf('\n}', css.indexOf(':root {')))
    for (const [t, ms] of Object.entries(TOKENY_MS)) {
        const m = new RegExp(`--ruch-${t}:\\s*([^;]+);`).exec(root)
        assert.ok(m, `brak --ruch-${t} w :root`)
        assert.equal(naMilisekundy(m[1]), ms, `--ruch-${t}`)
    }
    const k = /--ruch-krzywa:\s*cubic-bezier\(([^)]+)\)/.exec(root)
    assert.ok(k, 'brak --ruch-krzywa')
    assert.deepEqual(k[1].split(',').map(Number), [...KRZYWA])
})

test('ograniczenie ruchu zeruje wszystkie tokeny czasu', () => {
    const m = /@media \(prefers-reduced-motion: reduce\) \{\s*:root \{([^}]*)\}/.exec(css)
    assert.ok(m, 'brak bloku @media (prefers-reduced-motion: reduce) { :root { … } }')
    for (const t of Object.keys(TOKENY_MS)) assert.match(m[1], new RegExp(`--ruch-${t}:\\s*0s;`), `--ruch-${t} przy ograniczeniu ruchu`)
})

// ---------- lib/ruch.ts ----------
test('naMilisekundy', () => {
    assert.equal(naMilisekundy('0.25s'), 250)
    assert.equal(naMilisekundy(' 400ms '), 400)
    assert.equal(naMilisekundy('0s'), 0)
    assert.equal(naMilisekundy('.5s'), 500)
    assert.equal(naMilisekundy(''), null)
    assert.equal(naMilisekundy('var(--x)'), null)
})

test('krzywa = cubic-bezier(.4, 0, .2, 1): końce, monotoniczność, punkty krzywej', () => {
    assert.equal(krzywa(0), 0)
    assert.equal(krzywa(1), 1)
    let poprz = 0
    for (let i = 1; i <= 100; i++) { const y = krzywa(i / 100); assert.ok(y >= poprz - 1e-9); poprz = y }
    // punkt krzywej Béziera dla parametru s musi dać y przy x(s)
    const [x1, y1, x2, y2] = KRZYWA
    for (const s of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const x = 3 * x1 * s * (1 - s) ** 2 + 3 * x2 * s * s * (1 - s) + s ** 3
        const y = 3 * y1 * s * (1 - s) ** 2 + 3 * y2 * s * s * (1 - s) + s ** 3
        assert.ok(Math.abs(krzywa(x) - y) < 1e-6, `s=${s}`)
    }
    assert.ok(krzywa(0.5) > 0.5, 'szybki start, łagodne wygaszenie')
})

test('czasRuchu: poza przeglądarką – wartości tokenów; z CSS – odczyt; przy ograniczeniu ruchu – 0', () => {
    assert.equal(czasRuchu('wolny'), 500)
    const g = globalThis as Record<string, unknown>
    const kopia = { window: g.window, document: g.document, getComputedStyle: g.getComputedStyle }
    try {
        let ograniczenie = false
        g.window = { matchMedia: () => ({ matches: ograniczenie }) }
        g.document = { documentElement: {} }
        g.getComputedStyle = () => ({ getPropertyValue: (n: string) => (n === '--ruch-sredni' ? ' 0.4s' : '') })
        assert.equal(czasRuchu('sredni'), 400)
        assert.equal(czasRuchu('szybki'), 250, 'nieczytelny token → wartość z TOKENY_MS')
        ograniczenie = true
        assert.equal(czasRuchu('wolny'), 0)
        const kroki: number[] = []
        animuj('wolny', (p) => kroki.push(p))
        assert.deepEqual(kroki, [1], 'bez ruchu animacja od razu kończy się na wartości końcowej')
    } finally {
        Object.assign(g, kopia)
    }
})

test('przywrocFokus: tylko na element obecny w dokumencie', () => {
    let ile = 0
    assert.equal(przywrocFokus(null), false)
    assert.equal(przywrocFokus({ isConnected: false, focus: () => { ile++ } }), false)
    assert.equal(przywrocFokus({ isConnected: true, focus: () => { ile++ } }), true)
    assert.equal(ile, 1)
})

// ---------- zero czasów ruchu spoza tokenów ----------
const CZAS = /(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g
const niezerowe = (tekst: string) => [...tekst.matchAll(CZAS)].filter((m) => parseFloat(m[1]) !== 0).map((m) => m[0])

/** Naruszenia w CSS: deklaracje transition / animation (także -duration, -delay) z czasem wpisanym liczbą. */
export function czasyCss(kod: string): string[] {
    const wyn: string[] = []
    const linie = kod.split('\n')
    const bezKomentarzy = kod.replace(/\/\*[\s\S]*?\*\//g, (k) => k.replace(/[^\n]/g, ' '))
    const dekl = /(?<![\w-])(transition|animation)(-duration|-delay)?\s*:\s*([^;}]+)/g
    for (const m of bezKomentarzy.matchAll(dekl)) {
        const nr = bezKomentarzy.slice(0, m.index).split('\n').length
        if (WYJATEK.test(linie[nr - 1])) continue
        for (const c of niezerowe(m[3])) wyn.push(`${nr}: ${m[1]}${m[2] ?? ''} ${c}`)
    }
    return wyn
}

const REGULY_TS: [RegExp, string][] = [
    [/\b(duration|animationTime|animationDuration|transitionDuration|delay)\s*:\s*(\d*\.?[1-9]\d*|[1-9]\d*\.?\d*)\b/, 'czas ruchu liczbą – użyj czasRuchu() z lib/ruch.ts'],
    [/['"]smooth['"]/, "płynne przewijanie poza lib/ruch.ts – użyj przewin() / przewinDo()"],
    [/\.flyTo\(/, 'flyTo – mapa przesuwa się easeTo w czasie --ruch-wolny'],
    [/(?<![\w-])(duration|delay)-\d+\b/, 'klasa Tailwinda z czasem – czas z tokenu'],
]

/** Naruszenia w pliku TS/TSX (linia po linii, bez komentarzy jednoliniowych). */
export function czasyTs(kod: string): string[] {
    const wyn: string[] = []
    kod.split('\n').forEach((l, i) => {
        if (WYJATEK.test(l)) return
        const linia = l.replace(/^\s*\/\/.*$/, '').replace(/\s\/\/\s.*$/, '')
        for (const [r, opis] of REGULY_TS) if (r.test(linia)) wyn.push(`${i + 1}: ${opis}`)
        const t = /\b(transition|animation)\b[^\n]*/.exec(linia)
        if (t && /['"`]/.test(linia)) for (const c of niezerowe(t[0])) wyn.push(`${i + 1}: ${t[1]} ${c} – czas z tokenu var(--ruch-…)`)
    })
    return wyn
}

/** Pliki publiczne + komponenty components/ui, które importują. */
function plikiDoSprawdzenia(): string[] {
    const app = plikiPubliczne('app')
    const ui = new Set<string>()
    for (const p of app) {
        if (p.endsWith('.css')) continue
        for (const m of fs.readFileSync(path.join(ROOT, p), 'utf8').matchAll(/from ['"]@\/(components\/ui\/[\w-]+)['"]/g)) ui.add(`${m[1]}.tsx`)
    }
    return [...app, ...ui].sort()
}

test('test czasów ruchu wyłapuje czasy spoza tokenów (przykłady)', () => {
    assert.deepEqual(czasyCss('.a{transition:opacity .2s ease}'), ['1: transition .2s'])
    assert.deepEqual(czasyCss('.a{animation:x var(--ruch-wolny) var(--ruch-krzywa)}\n.b{transition:overflow 0s allow-discrete}'), [])
    assert.deepEqual(czasyCss('.a{transition:x max(var(--ruch-wolny), 1ms)} /* ruch-wyjatek: biblioteka */'), [])
    assert.deepEqual(czasyCss('.a{animation-delay:1.2s}'), ['1: animation-delay 1.2s'])
    assert.equal(czasyTs("m.flyTo({ center, duration: 900 })").length, 2)
    assert.equal(czasyTs("v.easeTo({ duration: czasRuchu('wolny') })").length, 0)
    assert.equal(czasyTs("m.fitBounds(b, { padding: 50, duration: 0 })").length, 0)
    assert.equal(czasyTs("<div style={{ transition: 'opacity .3s' }} />").length, 1)
    assert.equal(czasyTs("el.scrollTo({ top: 0, behavior: 'smooth' })").length, 1)
    assert.equal(czasyTs('<span className="transition-opacity duration-300" />').length, 1)
    assert.equal(czasyTs("animationTime: 0.35,").length, 1)
})

test('zero czasów ruchu spoza tokenów: CSS i pliki publiczne', () => {
    const bledy: string[] = []
    for (const p of plikiDoSprawdzenia()) {
        const kod = fs.readFileSync(path.join(ROOT, p), 'utf8')
        for (const b of p.endsWith('.css') ? czasyCss(kod) : czasyTs(kod)) bledy.push(`${p}:${b}`)
    }
    assert.deepEqual(bledy, [], 'czasy ruchu tylko z tokenów --ruch-szybki / -sredni / -wolny (CSS) i lib/ruch.ts (JS); wyjątek – komentarz `ruch-wyjatek: …` w tej samej linii')
})

// ---------- rozwijanie i zwijanie ----------
/** <details> bez opakowania: treść poza summary musi być jednym elementem z klasą rozwin-tresc. */
export function detailsBezOpakowania(kod: string, plik = 'plik.tsx'): number[] {
    const sf = ts.createSourceFile(plik, kod, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const wyn: number[] = []
    const klasa = (el: ts.JsxElement | ts.JsxSelfClosingElement) => {
        const atr = (ts.isJsxElement(el) ? el.openingElement : el).attributes.properties
        for (const a of atr) if (ts.isJsxAttribute(a) && a.name.getText() === 'className' && a.initializer) return a.initializer.getText()
        return ''
    }
    const nazwa = (el: ts.JsxElement | ts.JsxSelfClosingElement) => (ts.isJsxElement(el) ? el.openingElement : el).tagName.getText()
    const odwiedz = (n: ts.Node) => {
        if (ts.isJsxElement(n) && n.openingElement.tagName.getText() === 'details') {
            const dzieci = n.children.filter((c) => !(ts.isJsxText(c) && c.containsOnlyTriviaWhiteSpaces))
            const elementy = dzieci.filter((c): c is ts.JsxElement | ts.JsxSelfClosingElement => ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c))
            const tresc = elementy.filter((c) => nazwa(c) !== 'summary')
            const ok = dzieci.length === elementy.length && tresc.length === 1 && /\brozwin-tresc\b/.test(klasa(tresc[0]))
            if (!ok) wyn.push(sf.getLineAndCharacterOfPosition(n.getStart()).line + 1)
        }
        ts.forEachChild(n, odwiedz)
    }
    odwiedz(sf)
    return wyn
}

test('każdy <details> ma treść w jednym opakowaniu .rozwin-tresc', () => {
    assert.deepEqual(detailsBezOpakowania('<details><summary>a</summary><div className="rozwin-tresc"><p /></div></details>'), [])
    assert.deepEqual(detailsBezOpakowania('<details><summary>a</summary><p /><p /></details>'), [1])
    const bledy: string[] = []
    for (const p of plikiPubliczne('app').filter((x) => x.endsWith('.tsx'))) {
        for (const l of detailsBezOpakowania(fs.readFileSync(path.join(ROOT, p), 'utf8'), p)) bledy.push(`${p}:${l}`)
    }
    assert.deepEqual(bledy, [], 'treść <details> w <div className="rozwin-tresc"> (rozwijanie i zwijanie 5A, globals.css)')
})
