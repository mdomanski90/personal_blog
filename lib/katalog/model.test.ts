// KAT-01: numeracja katalogowa – reguły na danych syntetycznych.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatujNr, nowyRejestr, numerDla, parsujNr, zaplanujNadanie, type Kandydat, type RodzajKat } from './model'

const k = (rodzaj: RodzajKat, id: string, sort: string, nazwa = id): Kandydat => ({ rodzaj, id, sort, nazwa })
const bezPrzekierowan = () => null

test('format i odczyt numeru: prefiks rodzaju + 4 cyfry; wielkość liter i zera wiodące nie mają znaczenia przy odczycie', () => {
    assert.equal(formatujNr('MA', 42), 'MA-0042')
    assert.equal(formatujNr('OS', 12345), 'OS-12345')
    assert.equal(parsujNr('ma-0042'), 'MA-0042')
    assert.equal(parsujNr(' MA-42 '), 'MA-0042')
    assert.equal(parsujNr('MA0042'), 'MA-0042')
    assert.equal(parsujNr('XX-0001'), null, 'nieznany prefiks')
    assert.equal(parsujNr('MA-0000'), null)
    assert.equal(parsujNr('Olszanka'), null)
})

test('pierwsze nadanie: osobny ciąg dla rodzaju, kolejność wg klucza sortu (data dodania), potem nazwy', () => {
    const r = nowyRejestr()
    const { rejestr, nadane } = zaplanujNadanie(r, [
        k('material', 'b', '2026-02-01'), k('material', 'a', '2026-01-01'), k('wpis', 'w1', '2026-03-01'),
        k('material', 'c', '2026-01-01', 'Ćma'), k('material', 'd', '2026-01-01', 'Ala'),
    ], bezPrzekierowan, '2026-11-16')
    assert.deepEqual(nadane.map((x) => `${x.nr}=${x.id}`), ['MA-0001=a', 'MA-0002=d', 'MA-0003=c', 'MA-0004=b', 'WP-0001=w1'])
    assert.equal(rejestr.licznik.MA, 4)
    assert.equal(rejestr.licznik.WP, 1)
    assert.equal(numerDla(rejestr, 'material', 'b'), 'MA-0004')
})

test('ponowne nadanie: istniejące numery bez zmian, nowe pozycje dostają kolejne; powtórzenie niczego nie zmienia', () => {
    const a = zaplanujNadanie(nowyRejestr(), [k('temat', 't1', '1'), k('temat', 't2', '2')], bezPrzekierowan, 'd1').rejestr
    const b = zaplanujNadanie(a, [k('temat', 't0', '0'), k('temat', 't1', '1'), k('temat', 't2', '2')], bezPrzekierowan, 'd2')
    assert.deepEqual(b.nadane.map((x) => x.nr), ['TE-0003'], 'nowa pozycja na końcu ciągu, mimo wcześniejszej daty')
    assert.equal(numerDla(b.rejestr, 'temat', 't1'), 'TE-0001')
    const c = zaplanujNadanie(b.rejestr, [k('temat', 't0', '0'), k('temat', 't1', '1'), k('temat', 't2', '2')], bezPrzekierowan, 'd3')
    assert.equal(c.nadane.length, 0)
    assert.deepEqual(c.rejestr, b.rejestr)
})

test('numer nie jest używany ponownie: pozycja wycofana (niepubliczna, usunięta) zostawia lukę, licznik nie maleje', () => {
    const a = zaplanujNadanie(nowyRejestr(), [k('obiekt', 'o1', '1'), k('obiekt', 'o2', '2')], bezPrzekierowan, 'd').rejestr
    const b = zaplanujNadanie(a, [k('obiekt', 'o2', '2'), k('obiekt', 'o3', '3')], bezPrzekierowan, 'd')
    assert.equal(numerDla(b.rejestr, 'obiekt', 'o1'), 'OB-0001', 'numer wycofanej pozycji zostaje zarezerwowany')
    assert.deepEqual(b.nadane.map((x) => x.nr), ['OB-0003'])
    assert.equal(b.rejestr.licznik.OB, 3)
})

test('zmiana identyfikatora z przekierowaniem: numer przechodzi na nowy identyfikator, nowego numeru nie ma', () => {
    const a = zaplanujNadanie(nowyRejestr(), [k('miejsce', 'olszanka-stara', '1')], bezPrzekierowan, 'd').rejestr
    const przekier = (rodzaj: RodzajKat, id: string) => (rodzaj === 'miejsce' && id === 'olszanka-stara' ? 'olszanka' : null)
    const b = zaplanujNadanie(a, [k('miejsce', 'olszanka', '1')], przekier, 'd2')
    assert.equal(b.nadane.length, 0)
    assert.deepEqual(b.przeniesione, [{ nr: 'MJ-0001', z: 'olszanka-stara', na: 'olszanka' }])
    assert.equal(numerDla(b.rejestr, 'miejsce', 'olszanka'), 'MJ-0001')
    assert.equal(numerDla(b.rejestr, 'miejsce', 'olszanka-stara'), null)
})

test('przekierowanie nie przenosi numeru na pozycję, która ma już własny numer (bez powtórzeń)', () => {
    const a = zaplanujNadanie(nowyRejestr(), [k('wpis', 'x', '1'), k('wpis', 'y', '2')], bezPrzekierowan, 'd').rejestr
    // „x” zniknął i ma przekierowanie na „y”, który ma już numer – x zostaje przy swoim numerze (luka)
    const b = zaplanujNadanie(a, [k('wpis', 'y', '2')], (r, id) => (id === 'x' ? 'y' : null), 'd')
    assert.deepEqual(b.przeniesione, [])
    assert.equal(numerDla(b.rejestr, 'wpis', 'y'), 'WP-0002')
})

test('unikalność: żaden numer i żadna pozycja nie występują dwa razy', () => {
    const kand = Array.from({ length: 40 }, (_, i) => k((['material', 'osoba', 'plan', 'instytucja', 'zbior', 'publikacja'] as RodzajKat[])[i % 6], `p${i}`, String(i % 7)))
    const r = zaplanujNadanie(nowyRejestr(), kand, bezPrzekierowan, 'd').rejestr
    const nry = Object.keys(r.pozycje)
    assert.equal(new Set(nry).size, 40)
    assert.equal(new Set(Object.values(r.pozycje).map((p) => `${p.rodzaj}:${p.id}`)).size, 40)
    assert.ok(nry.every((n) => parsujNr(n) === n))
})
