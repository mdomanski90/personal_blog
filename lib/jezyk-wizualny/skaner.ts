/**
 * JW-1 (JW-01, zasada 5.1): skaner języka wizualnego.
 * W plikach publicznych (app/ bez /keystatic/) zakazane są:
 *  – style inline (`style={{…}}`) z rozmiarem/typografią, wymiarem (szerokość, wysokość), kolorem, odstępem albo ramką;
 *  – kolory hex poza blokami tokenów (CSS: deklaracje `--…` w :root / .dark / html.dark / html:not(.dark) / @theme).
 * Wyjątek: wartości liczone w działaniu z komentarzem `/* styl-dynamiczny: uzasadnienie *\/`
 * (w atrybucie style albo – dla hex – w tej samej linii). Zmienne CSS (`--x`) przekazywane do klasy są dozwolone.
 * Zapadka per plik: lib/jezyk-wizualny/zapadka.test.ts + zapadka.json.
 */
import ts from 'typescript'

export type Rodzaj = 'styl' | 'hex'
export interface Naruszenie { rodzaj: Rodzaj; co: string; linia: number }

export const ZNACZNIK_WYJATKU = /styl-dynamiczny:\s*[^\s*]/

const ZAKAZANE: RegExp[] = [
    /^(font|fontSize|lineHeight|fontWeight|letterSpacing)$/, // rozmiar i typografia
    /^(width|minWidth|maxWidth|height|minHeight|maxHeight|flexBasis|inlineSize|blockSize|minInlineSize|maxInlineSize|gridTemplateColumns|gridTemplateRows|gridAutoColumns|gridAutoRows)$/, // wymiary
    /^(color|background|backgroundColor|fill|stroke|outlineColor|boxShadow|textDecorationColor|accentColor|caretColor)$/, // kolory
    /^(margin|padding)(Top|Right|Bottom|Left|Inline|Block|InlineStart|InlineEnd|BlockStart|BlockEnd)?$/, // odstępy
    /^(gap|rowGap|columnGap)$/,
    /^(border|outline)/, // ramki (także borderRadius, borderTop…)
]

const naCamel = (s: string) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
export const zakazana = (wlasciwosc: string) => !wlasciwosc.startsWith('--') && ZAKAZANE.some((r) => r.test(naCamel(wlasciwosc)))

const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g

function rozpakuj(e: ts.Expression): ts.Expression {
    while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isTypeAssertionExpression(e) || ts.isNonNullExpression(e)) e = e.expression
    return e
}

function nazwa(p: ts.PropertyName): string | null {
    if (ts.isIdentifier(p) || ts.isStringLiteral(p) || ts.isNoSubstitutionTemplateLiteral(p)) return p.text
    if (ts.isComputedPropertyName(p)) {
        const e = rozpakuj(p.expression)
        if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text
    }
    return null
}

/** Naruszenia w pliku .tsx/.ts (kod źródłowy). */
export function skanujTsx(kod: string, plik = 'plik.tsx'): Naruszenie[] {
    const sf = ts.createSourceFile(plik, kod, ts.ScriptTarget.Latest, true, plik.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.TSX)
    const linie = kod.split('\n')
    const linia = (pos: number) => sf.getLineAndCharacterOfPosition(pos).line + 1
    const wyn: Naruszenie[] = []

    const stylObiektu = (e: ts.Expression) => {
        e = rozpakuj(e)
        if (ts.isConditionalExpression(e)) { stylObiektu(e.whenTrue); stylObiektu(e.whenFalse); return }
        if (e.kind === ts.SyntaxKind.UndefinedKeyword || e.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(e) && e.text === 'undefined')) return
        if (!ts.isObjectLiteralExpression(e)) { wyn.push({ rodzaj: 'styl', co: '(zmienna)', linia: linia(e.getStart()) }); return }
        for (const p of e.properties) {
            if (ts.isSpreadAssignment(p)) { wyn.push({ rodzaj: 'styl', co: '(rozwinięcie)', linia: linia(p.getStart()) }); continue }
            if (!p.name) continue
            const n = nazwa(p.name)
            if (n === null) { wyn.push({ rodzaj: 'styl', co: '(nazwa liczona)', linia: linia(p.getStart()) }); continue }
            if (zakazana(n)) wyn.push({ rodzaj: 'styl', co: n, linia: linia(p.getStart()) })
        }
    }

    const odwiedz = (w: ts.Node) => {
        if (ts.isJsxAttribute(w) && w.name.getText() === 'style' && w.initializer && ts.isJsxExpression(w.initializer) && w.initializer.expression) {
            if (!ZNACZNIK_WYJATKU.test(w.getFullText())) stylObiektu(w.initializer.expression)
        }
        let tekst: string | null = null
        if (ts.isStringLiteral(w) || ts.isNoSubstitutionTemplateLiteral(w) || ts.isTemplateHead(w) || ts.isTemplateMiddle(w) || ts.isTemplateTail(w) || ts.isJsxText(w)) tekst = w.getText()
        if (tekst !== null) {
            const start = w.getStart()
            for (const m of tekst.matchAll(HEX)) {
                const l = linia(start + (m.index ?? 0))
                if (!ZNACZNIK_WYJATKU.test(linie[l - 1] ?? '')) wyn.push({ rodzaj: 'hex', co: m[0], linia: l })
            }
        }
        ts.forEachChild(w, odwiedz)
    }
    odwiedz(sf)
    return wyn.sort((a, b) => a.linia - b.linia)
}

const SELEKTORY_TOKENOW = new Set([':root', '.dark', 'html.dark', 'html:not(.dark)', '@theme', '@theme inline'])

/** Naruszenia w arkuszu CSS: kolor hex poza deklaracją tokenu w bloku tokenów.
 *  `blokTokenow` – własna reguła rozpoznawania bloku tokenów (PK: arkusz panelu ma tokeny w `.pn` i `.dark .pn`). */
export function skanujCss(css: string, blokTokenow: (selektor: string) => boolean = (s) => SELEKTORY_TOKENOW.has(s)): Naruszenie[] {
    // komentarze → spacje (zachowane końce linii, więc numery linii się zgadzają)
    const czysty = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    const wyn: Naruszenie[] = []
    const stos: string[] = []
    let poczatek = 0
    const liniaW = (pos: number) => czysty.slice(0, pos).split('\n').length

    const deklaracja = (od: number, do_: number) => {
        const tekst = czysty.slice(od, do_)
        const dw = tekst.indexOf(':')
        if (dw < 0 || !stos.length) return
        const prop = tekst.slice(0, dw).trim()
        const token = prop.startsWith('--') && blokTokenow(stos[stos.length - 1])
        if (token) return
        for (const m of tekst.matchAll(HEX)) wyn.push({ rodzaj: 'hex', co: m[0], linia: liniaW(od + (m.index ?? 0)) })
    }

    for (let i = 0; i < czysty.length; i++) {
        const c = czysty[i]
        if (c === '"' || c === "'") { const k = czysty.indexOf(c, i + 1); i = k < 0 ? czysty.length : k; continue }
        if (c === '{') { stos.push(czysty.slice(poczatek, i).trim().replace(/\s+/g, ' ')); poczatek = i + 1 }
        else if (c === ';') { deklaracja(poczatek, i); poczatek = i + 1 }
        else if (c === '}') { deklaracja(poczatek, i); stos.pop(); poczatek = i + 1 }
    }
    return wyn
}
