import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Element } from './model'
import { podgladDanych, POLA_DANYCH_GROBU, przeniesDane, zamienDane } from './edycja'

const grob = (id: string, x: number, reszta: Partial<Element> = {}): Element => ({ id, typ: 'grob', g: { k: 'r', x, y: 0, w: 10, h: 20, a: 3 }, ...reszta })
const A = grob('a', 0, { napis: 'Ś.P. Jan Testowy', osoby: [{ nazwa: 'Jan Testowy', id: 'jan-testowy-1880', zm: '1931' }], rokZgonu: 1931, zdjecia: [{ plik: 'a.jpg' }], zrodla: 'akt 3/1931', zrodlaStan: 'potwierdzona', etap: 'sprawdzony', ukryjNapis: true, widocznosc: 'bliscy', notatka: 'n', stan: 'istnieje', polozenie: 'przyp' })
const B = grob('b', 30, { napis: 'Anna Próbna', etap: 'opracowany', stan: 'do-sprawdzenia' })
const C = grob('c', 60, { weryfikacja: 'auto' })
const dane = (e: Element) => Object.fromEntries(POLA_DANYCH_GROBU.filter((p) => e[p] !== undefined).map((p) => [p, e[p]]))
const ksztalt = (e: Element) => ({ id: e.id, typ: e.typ, g: e.g, stan: e.stan, polozenie: e.polozenie })

test('zamień: dane przechodzą w całości, kształt, id, stan i położenie zostają; etap do ponownego sprawdzenia', () => {
    const L = zamienDane([A, B, C], 'a', 'b')
    assert.ok(Array.isArray(L))
    const [a2, b2, c2] = L
    assert.deepEqual(dane(a2), dane(B))
    assert.deepEqual(dane(b2), dane(A))
    assert.deepEqual(ksztalt(a2), ksztalt(A))
    assert.deepEqual(ksztalt(b2), ksztalt(B))
    assert.equal(c2, C, 'inne groby bez zmian')
    assert.equal(b2.etap, 'opracowany', '„sprawdzony” nie przechodzi z danymi')
    assert.equal(b2.ukryjNapis, true, 'ochrona napisu idzie z napisem')
    assert.equal(b2.widocznosc, 'bliscy')
    assert.equal(a2.ukryjNapis, undefined)
})

test('zamień dwa razy = te same dane i kształty (cofnięcie w edytorze przywraca dokładny stan z historii)', () => {
    const L1 = zamienDane([A, B], 'a', 'b') as Element[]
    const L2 = zamienDane(L1, 'a', 'b') as Element[]
    assert.deepEqual(L2.map(dane), [A, B].map(dane))
    assert.deepEqual(L2.map(ksztalt), [A, B].map(ksztalt))
    const przed = JSON.stringify([A, B])
    zamienDane([A, B], 'a', 'b')
    assert.equal(JSON.stringify([A, B]), przed, 'operacja nie zmienia wejścia (historia cofania zostaje nietknięta)')
})

test('przenieś: do pustego grobu; źródło zostaje samym kształtem „narysowany”', () => {
    const L = przeniesDane([A, C], 'a', 'c') as Element[]
    const [a2, c2] = L
    assert.deepEqual(dane(c2), dane(A))
    assert.deepEqual(dane(a2), {})
    assert.equal(a2.etap, 'narysowany')
    assert.equal(c2.etap, 'opracowany')
    assert.equal(c2.polozenie, 'auto', 'pewność położenia celu z dawnego pola')
    assert.equal(c2.weryfikacja, undefined)
    assert.deepEqual(ksztalt(a2), ksztalt(A))
})

test('przenieś: odmowa, gdy cel ma dane albo źródło puste; podgląd pokazuje pola', () => {
    assert.deepEqual(przeniesDane([A, B], 'a', 'b'), { blad: 'Docelowy grób ma już dane – użyj „zamień”.' })
    assert.deepEqual(przeniesDane([A, C], 'c', 'a'), { blad: 'Docelowy grób ma już dane – użyj „zamień”.' })
    assert.deepEqual(przeniesDane([C, grob('d', 90)], 'c', 'd'), { blad: 'Grób źródłowy nie ma danych do przeniesienia.' })
    const p = podgladDanych(A, B)
    assert.equal(p.celZajety, true)
    assert.deepEqual(p.pola.find((x) => x.pole === 'napis'), { pole: 'napis', nazwa: 'napis z nagrobka', a: true, b: true })
    assert.equal(p.pola.find((x) => x.pole === 'osoby')?.b, false)
})
