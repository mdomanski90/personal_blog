// P1 · dostępność (WCAG 2.2 AA): testy odtwarzające błędy z raportu 17.11 (UX-02/04/05/06/09/14, KIER-03, ADM-04, D-UX-NEW-04).
// Statyczne (przegląd kodu) – zachowanie w przeglądarce sprawdza e2e.py (klawiatura, mysz, axe 4.14).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { zakladkaKlawisza, idZakladki } from './zakladki'

const ROOT = path.resolve(import.meta.dirname, '..')
const czytaj = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const CSS = czytaj('app/globals.css')

/** Zawartość wszystkich bloków `@media <warunek> { … }` (z dopasowaniem nawiasów). */
export function blokiMedia(css: string, warunek: RegExp): string[] {
    const wynik: string[] = []
    const re = /@media\s*([^{]+)\{/g
    for (let m = re.exec(css); m; m = re.exec(css)) {
        if (!warunek.test(m[1])) continue
        let g = 1, i = re.lastIndex
        while (i < css.length && g > 0) { if (css[i] === '{') g++; else if (css[i] === '}') g--; i++ }
        wynik.push(css.slice(re.lastIndex, i - 1))
        re.lastIndex = i
    }
    return wynik
}

test('zakładki: strzałki, Home, End; pozostałe klawisze nic nie robią (WAI-ARIA tabs)', () => {
    const z = ['a', 'b', 'c']
    assert.equal(zakladkaKlawisza(z, 'a', 'ArrowRight'), 'b')
    assert.equal(zakladkaKlawisza(z, 'c', 'ArrowRight'), 'a')
    assert.equal(zakladkaKlawisza(z, 'a', 'ArrowLeft'), 'c')
    assert.equal(zakladkaKlawisza(z, 'b', 'Home'), 'a')
    assert.equal(zakladkaKlawisza(z, 'b', 'End'), 'c')
    assert.equal(zakladkaKlawisza(z, 'b', 'Enter'), null)
    assert.equal(zakladkaKlawisza([], 'a', 'ArrowRight'), null)
})

test('zakładki: identyfikatory karty i panelu są powiązane i różne dla różnych instancji', () => {
    assert.equal(idZakladki('x1', 'plan', 'karta'), 'x1-zakl-plan')
    assert.equal(idZakladki('x1', 'plan', 'panel'), 'x1-panel-plan')
    assert.notEqual(idZakladki('x1', 'plan', 'karta'), idZakladki('x2', 'plan', 'karta'))
})

test('zakładki: role="tab" tylko we wspólnym komponencie (UX-04, D-UX-NEW-04)', () => {
    const zle: string[] = []
    const przejdz = (dir: string) => {
        for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
            const rel = path.join(dir, e.name)
            if (e.isDirectory()) { if (!rel.startsWith('app/keystatic')) przejdz(rel); continue }
            if (!/\.tsx$/.test(e.name) || rel === 'app/components/Zakladki.tsx') continue
            if (/role=["']tab["']/.test(czytaj(rel))) zle.push(rel)
        }
    }
    przejdz('app')
    assert.deepEqual(zle, [], 'zakładki rób komponentem ListaZakladek (strzałki, Home/End, tabIndex, aria-controls)')
})

test('zakładki: ListaZakladek ma strzałki, roving tabindex i aria-controls', () => {
    const k = czytaj('app/components/Zakladki.tsx')
    assert.match(k, /role="tablist"/)
    assert.match(k, /zakladkaKlawisza/)
    assert.match(k, /tabIndex=\{[^}]*\? 0 : -1\}/)
    assert.match(k, /aria-controls/)
    assert.match(k, /aria-labelledby/)
})

test('UX-09: „przejdź do treści” zawsze prowadzi do <main id="tresc">, także na stronie głównej', () => {
    const h = czytaj('app/components/SiteHeader.tsx')
    assert.match(h, /<a href="#tresc" className="pomin-do-tresci">/)
    assert.doesNotMatch(h, /pomin-do-tresci[^>]*wysz-start|wysz-start[^>]*pomin-do-tresci/)
    assert.match(czytaj('app/components/Uklad.tsx'), /<main id="tresc" tabIndex=\{-1\}/)
})

test('UX-09 (panel, ADM-04): panel ma skip link i <main id> jako cel', () => {
    const p = czytaj('app/keystatic/panel/layout.tsx')
    assert.match(p, /href="#panel-tresc"/)
    assert.match(p, /<main[^>]*id="panel-tresc"/)
})

test('UX-02: przy prefers-reduced-motion przejście całej strony (view transitions) bez animacji', () => {
    const bloki = blokiMedia(CSS, /prefers-reduced-motion:\s*reduce/).join('\n')
    assert.match(bloki, /::view-transition-old\(\*\)/)
    assert.match(bloki, /::view-transition-new\(\*\)/)
    assert.match(bloki, /animation:\s*none\s*!important/)
    assert.match(czytaj('lib/ruch.ts'), /bezRuchu\(\) \|\| typeof d\.startViewTransition/)
})

test('UX-06 / KIER-03: obszary dotyku 44 px przy (pointer: coarse), nie tylko ≤640 px', () => {
    const bloki = blokiMedia(CSS, /pointer:\s*coarse/).join('\n')
    assert.ok(bloki.length > 0, 'brak bloku @media (pointer: coarse)')
    assert.match(bloki, /44px/)
    const wymagane = ['.k-grupa>button', '.dok-grupa>button', '.dok-grupa>.dok-stan', '.menu-zakladki .zakladka', '.menu-zakladki .menu-rozwij', '.szukaj-filtr', '.kl-pauza', '.kl-strzalka',
        '.spis-tresci summary', '.plan-panel-wynik', '.plan-panel-odn', '.plan-legenda-element', '.plan-panel-typ', '.plan-panel-x', '.lista-litera', 'button.odn', '.pole-szukania>button',
        '.wysz-pole button', '.maplibregl-ctrl-group button', '.stopka a', '.przycisk-do-gory']
    const brak = wymagane.filter((s) => !bloki.includes(s))
    assert.deepEqual(brak, [], 'te kontrolki muszą mieć 44 px przy (pointer: coarse)')
})

test('UX-14: nazwa dostępna zawiera widoczny napis (WCAG 2.5.3, axe label-content-name-mismatch)', () => {
    const t = czytaj('app/components/ThemeToggle.tsx')
    assert.match(t, /aria-label="A−[^"]*mniejsza czcionka"/)
    assert.match(t, /aria-label="A\+[^"]*większa czcionka"/)
    const h = czytaj('app/components/SiteHeader.tsx')
    assert.match(h, /aria-label="kapliczka w Olszance[^"]*odniepamieci\.pl[^"]*"/)
})

test('UX-14: strona główna ma jeden h1; pola szukania mają odrębne nazwy (axe page-has-heading-one, landmark-unique)', () => {
    assert.match(czytaj('app/page.tsx'), /<h1[ >]/)
    assert.match(czytaj('app/components/Wyszukiwarka.tsx'), /role="search" aria-label="szukaj w serwisie"/)
    assert.match(czytaj('app/components/PoleSzukania.tsx'), /obszar = 'szukaj na tej stronie'/)
})

test('UX-14: KartaPozycji ma poziom nagłówka (axe heading-order na listach bez h2)', () => {
    assert.match(czytaj('app/components/KartaPozycji.tsx'), /poziom/)
    assert.match(czytaj('app/biblioteka/publikacje/page.tsx'), /poziom=\{2\}/)
})

test('VIEW-01/03: pełny ekran skanu – pułapka fokusu, klik w tło, role dialog', () => {
    const d = czytaj('app/components/PrzegladarkaDokumentu.tsx')
    assert.match(d, /punktPozaProstokatem/)
    assert.match(d, /useUwiezionyFokus|useFokusWOknie/)
    assert.match(d, /role=\{pelny \? 'dialog'|role="dialog"/)
    assert.match(d, /aria-modal/)
})

test('ADM-04: panel – stan zwinięcia zapamiętany, fokus przeniesiony po schowaniu i pokazaniu menu', () => {
    const p = czytaj('app/keystatic/panel/layout.tsx')
    assert.match(p, /KLUCZ_SCHOWANY|odniepamieci-panel-menu/)
    assert.match(p, /aria-expanded/)
    assert.match(p, /pokazRef|przyciskPokaz/)
})
