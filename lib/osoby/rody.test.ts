// PK: „całe drzewo” – rody (osobne części drzewa) tylko z osób widocznych, korzeń = najstarsza para z największą liczbą potomków.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import type { Drzewo, Osoba, Rodzina } from './model'
import { rodyDrzewa, wybranyRod } from './rody'
import { DOMYSLNE_CALEGO_DRZEWA, parametryDrzewa, zastosujParametryDrzewa } from './drzewo-adres'

const os = (id: string, nazwisko: string, plec: 'M' | 'K', ur?: string): Osoba => ({ id, imiona: id, nazwisko, plec, zyje: 'nie', widocznosc: 'auto', wersja: 1, zdarzenia: ur ? [{ id: `${id}-u`, rodzaj: 'urodzenie', data: ur }] : [] } as Osoba)
const rodz = (id: string, maz: string | undefined, zona: string | undefined, dzieci: string[]): Rodzina => ({ id, maz, zona, dzieci, zdarzenia: [], wersja: 1 })
function drzewo(): Drzewo {
    const o = [os('pra', 'A', 'M', '1770'), os('praba', 'A', 'K', '1775'), os('syn', 'A', 'M', '1800'), os('synowa', 'B', 'K', '1805'), os('tesc', 'B', 'M', '1780'),
        os('wnuk', 'A', 'M', '1830'), os('ukryty', 'C', 'M', '1700'), os('c1', 'D', 'M', '1850'), os('c2', 'D', 'K', '1855'), os('sam', 'E', 'M', '1900')]
    const f = [rodz('f1', 'pra', 'praba', ['syn']), rodz('f2', 'syn', 'synowa', ['wnuk']), rodz('f3', 'tesc', undefined, ['synowa']), rodz('f4', 'ukryty', undefined, ['pra']), rodz('f5', 'c1', 'c2', [])]
    return { osoby: new Map(o.map((x) => [x.id, x])), rodziny: new Map(f.map((x) => [x.id, x])), zrodla: new Map() }
}
const widac = (x: string) => x !== 'ukryty'

test('rody: części połączone rodzinami, od największej; pojedyncze osoby pominięte', () => {
    const r = rodyDrzewa(drzewo(), widac)
    assert.deepEqual(r.map((x) => [x.korzen, x.osob]), [['pra', 6], ['c1', 2]])
})

test('korzeń: osoba bez widocznych rodziców z największą liczbą potomków (teść ma mniej potomków niż pradziad)', () => {
    assert.equal(rodyDrzewa(drzewo(), widac)[0].korzen, 'pra')
})

test('osoba niewidoczna nie jest korzeniem ani nie wchodzi do liczby (zasada 1.6)', () => {
    const r = rodyDrzewa(drzewo(), widac)
    assert.ok(r.every((x) => x.korzen !== 'ukryty'))
    assert.equal(r[0].osob, 6)
    const wszystko = rodyDrzewa(drzewo(), () => true)
    assert.equal(wszystko[0].korzen, 'ukryty')
    assert.equal(wszystko[0].osob, 7)
})

test('wybór rodu z adresu: znany korzeń – ten ród; nieznany albo ukryty – największy', () => {
    const r = rodyDrzewa(drzewo(), widac)
    assert.equal(wybranyRod(r, 'c1')?.korzen, 'c1')
    assert.equal(wybranyRod(r, 'ukryty')?.korzen, 'pra')
    assert.equal(wybranyRod(r, undefined)?.korzen, 'pra')
    assert.equal(wybranyRod([], 'x'), null)
})

test('całe drzewo: domyślnie 0 pokoleń w górę i wszystkie w dół; powrót do 2 w górę zostaje w adresie', () => {
    assert.deepEqual(parametryDrzewa({}, DOMYSLNE_CALEGO_DRZEWA), { wstecz: 0, naprzod: 15, zakres: 'malzonkowie' })
    const q = zastosujParametryDrzewa(new URLSearchParams('od=pra'), { wstecz: 2, naprzod: 15, zakres: 'malzonkowie' }, DOMYSLNE_CALEGO_DRZEWA)
    assert.equal(q.toString(), 'od=pra&wstecz=2')
    assert.equal(zastosujParametryDrzewa(new URLSearchParams(), { wstecz: 2, naprzod: 2, zakres: 'malzonkowie' }).toString(), '', 'karta osoby bez zmian')
})

test('uwagi 18.11: „po mężu” w nagłówku karty, odnośnik „całe drzewo” na /osoby, klik na drzewie z przejściem strony, cieńsza obwódka', () => {
    const czytaj = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
    assert.match(czytaj('app/osoby/[id]/page.tsx'), /po mężu: \$\{poMezu\.join/)
    assert.match(czytaj('app/osoby/page.tsx'), /href="\/osoby\/drzewo"/)
    assert.match(czytaj('app/components/DrzewoKarty.tsx'), /useTransitionRouter/)
    assert.match(czytaj('app/components/DrzewaLinie.tsx'), /opcje\.otworz\(/)
    const css = czytaj('app/globals.css').match(/\.drzewo \.dr-glowna \{[^}]*\}/)?.[0] ?? ''
    assert.match(css, /border: 2px solid var\(--akcent\)/)
    assert.doesNotMatch(css, /box-shadow/)
})
