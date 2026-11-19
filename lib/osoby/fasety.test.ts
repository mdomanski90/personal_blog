// P6b (PPL-02, PPL-03, PPL-07): wynik osoby, filtry katalogu osób, cyrylica w wyszukiwaniu – dane syntetyczne.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adresOsob, fasetyOsoby, filtryZAdresu, opcjeFiltrow, opisOsoby, pasujeDoFiltrow, tekstZawodu, type DaneFaset } from './fasety'
import type { Osoba, Zdarzenie } from './model'
import { normalizujDoSzukania, transliteruj } from '../tekst'
import { ocenaDokumentu, type DokumentSzukania } from '../indeks-szukania'
import { pasuje, przygotujZapytanie } from '../szukanie'

const z = (rodzaj: Zdarzenie['rodzaj'], extra: Partial<Zdarzenie> = {}): Zdarzenie => ({ id: `z-${rodzaj}-${Math.random().toString(36).slice(2, 6)}`, rodzaj, ...extra })
const osoba = (id: string, zdarzenia: Zdarzenie[], extra: Partial<Osoba> = {}): Osoba => ({ id, imiona: 'Jan', nazwisko: 'Testowy', plec: 'M', zdarzenia, zyje: 'nie', widocznosc: 'publiczne', wersja: 1, ...extra })
const NAZWY: Record<string, string> = { testowo: 'Testowo', wola: 'Wola Przykładowa' }
const dane = (extra: Partial<DaneFaset> = {}): DaneFaset => ({ zdarzeniaMalzenstw: [], funkcje: [], groby: [], nazwaMiejsca: (id) => NAZWY[id], ...extra })
const PUSTE = { zajecie: '', miejsce: '', zwiazek: '', wyznanie: '' }

const jan = osoba('t-jan', [
    z('urodzenie', { data: '1850', miejsce: 'Testowo, gm. Przykładowa', miejsceId: 'testowo' }),
    z('chrzest', { data: '1850', miejsce: 'Testowo', obrzadek: 'unicki' }),
    z('zawod', { data: '1880', opis: 'Rolnik\nnotatka z aktu' }),
    z('zgon', { data: '1910', miejsce: 'Wola Przykładowa', miejsceId: 'wola' }),
])
const fJan = fasetyOsoby(jan, dane({
    zdarzeniaMalzenstw: [z('slub', { data: '1875', miejsce: 'Wola Przykładowa', obrzadek: 'prawoslawny' })],
    groby: ['wola'],
}))
const ksiadz = osoba('t-ksiadz', [z('urodzenie', { data: '1830', miejsce: 'Dalekie' })], { imiona: 'Piotr' })
const fKsiadz = fasetyOsoby(ksiadz, dane({ funkcje: [{ rola: 'Proboszcz', instytucja: { nazwa: 'Parafia prawosławna w Testowie', wyznanie: 'prawoslawna', siedziba: 'testowo' } }] }))

test('PPL-02: zajęcie z pierwszej linii zdarzenia „zawód” i z funkcji w instytucji', () => {
    assert.equal(tekstZawodu({ opis: '  Rolnik\nnotatka' }), 'Rolnik')
    assert.deepEqual(fJan.zajecia.map((x) => x.nazwa), ['rolnik'])
    assert.deepEqual(fKsiadz.zajecia.map((x) => x.nazwa), ['proboszcz'])
})

test('PPL-02: wynik – lata · miejscowość urodzenia · zajęcie, bez pustych etykiet', () => {
    assert.equal(opisOsoby(jan, fJan), '1850–1910 · Testowo · rolnik')
    const bezNiczego = osoba('t-nic', [])
    assert.equal(opisOsoby(bezNiczego, fasetyOsoby(bezNiczego, dane())), '')
    assert.ok(!opisOsoby(ksiadz, fKsiadz).includes(' ·  · '))
})

test('PPL-03: miejscowości z rodzajem związku – zdarzenia, małżeństwo, siedziba instytucji, grób', () => {
    const wola = fJan.miejsca.find((m) => m.klucz === 'wola przykladowa')!
    assert.deepEqual(wola.zwiazki.sort(), ['pochowek', 'slub', 'zgon'])
    assert.deepEqual(fJan.miejsca.find((m) => m.klucz === 'testowo')!.zwiazki, ['urodzenie'])
    assert.deepEqual(fKsiadz.miejsca.find((m) => m.klucz === 'testowo')!.zwiazki, ['praca'])
    // zapis „Testowo, gm. Przykładowa” z identyfikatorem i „Testowo” bez – ta sama miejscowość
    assert.equal(fJan.miejsca.filter((m) => m.klucz === 'testowo').length, 1)
})

test('PPL-03: wyznanie tylko z zapisu i z instytucji – z wyjaśnieniem', () => {
    assert.deepEqual(fJan.wyznania.map((w) => [w.klucz, w.powod]), [['unicki', 'chrzest unicki'], ['prawoslawny', 'ślub prawosławny']])
    assert.deepEqual(fKsiadz.wyznania.map((w) => [w.klucz, w.powod]), [['prawoslawny', 'Proboszcz: Parafia prawosławna w Testowie']])
})

test('PPL-03: filtry z adresu – nieznane wartości odrzucone, „związek” tylko przy miejscowości', () => {
    assert.deepEqual(filtryZAdresu({ zwiazek: 'slub', wyznanie: 'nieznane' }), PUSTE)
    assert.deepEqual(filtryZAdresu({ miejsce: 'Wola Przykładowa', zwiazek: 'slub', wyznanie: 'unicki', zajecie: 'Rolnik' }), { zajecie: 'rolnik', miejsce: 'wola przykladowa', zwiazek: 'slub', wyznanie: 'unicki' })
    assert.equal(adresOsob('wszystkie', { ...PUSTE, zwiazek: 'slub' }), '/osoby')
    assert.equal(adresOsob('krag-1', { ...PUSTE, miejsce: 'wola przykladowa', zwiazek: 'slub' }, 'jan'), '/osoby?krag=krag-1&miejsce=wola+przykladowa&zwiazek=slub&q=jan')
})

test('PPL-03: filtry łączą się; wynik wyjaśnia trafienie', () => {
    const w = filtryZAdresu({ miejsce: 'wola przykladowa', zwiazek: 'slub' })
    assert.ok(pasujeDoFiltrow(fJan, w))
    assert.ok(!pasujeDoFiltrow(fKsiadz, w))
    assert.ok(!pasujeDoFiltrow(fJan, { ...w, zwiazek: 'urodzenie' }))
    assert.ok(!pasujeDoFiltrow(fJan, { ...w, zajecie: 'proboszcz' }))
    assert.equal(opisOsoby(jan, fJan, w), '1850–1910 · Wola Przykładowa (ślub) · rolnik')
    assert.equal(opisOsoby(jan, fJan, { ...PUSTE, wyznanie: 'prawoslawny' }), '1850–1910 · Testowo · rolnik · ślub prawosławny')
})

test('PPL-03 (prywatność): osoba niewidoczna nie zmienia liczników ani listy opcji', () => {
    // strona podaje do opcjeFiltrow wyłącznie osoby widoczne – tu: „ukryta” po prostu nie trafia na listę
    const ukryta = osoba('t-ukryta', [z('zawod', { opis: 'Kowal' }), z('urodzenie', { miejsce: 'Testowo', miejsceId: 'testowo' }), z('chrzest', { obrzadek: 'ewangelicki' })])
    const fUkryta = fasetyOsoby(ukryta, dane())
    const widoczne = [fJan, fKsiadz]
    const bez = opcjeFiltrow(widoczne, PUSTE)
    assert.ok(!bez.zajecie.some((o) => o.id === 'kowal'))
    assert.ok(!bez.wyznanie.some((o) => o.id === 'ewangelicki'))
    assert.deepEqual(bez.miejsce.find((o) => o.id === 'testowo')!.ile, 2)
    // kontrola: z ukrytą liczba by się zmieniła – test rzeczywiście sprawdza filtr widoczności strony
    assert.equal(opcjeFiltrow([...widoczne, fUkryta], PUSTE).miejsce.find((o) => o.id === 'testowo')!.ile, 3)
})

test('PPL-03: liczniki opcji przy pozostałych filtrach; związek tylko po wyborze miejscowości', () => {
    const o = opcjeFiltrow([fJan, fKsiadz], { ...PUSTE, zajecie: 'proboszcz' })
    assert.deepEqual(o.miejsce.map((x) => [x.id, x.ile]), [['dalekie', 1], ['testowo', 1]])
    assert.deepEqual(o.zwiazek, [])
    const z2 = opcjeFiltrow([fJan, fKsiadz], { ...PUSTE, miejsce: 'testowo' })
    assert.deepEqual(z2.zwiazek.map((x) => [x.id, x.ile]), [['urodzenie', 1], ['praca', 1]])
})

test('PPL-07: cyrylica ↔ łacinka w wyszukiwaniu', () => {
    assert.equal(transliteruj('Иван Щербань'), 'iwan szczerban')
    assert.equal(normalizujDoSzukania('Йосиф Жуковский'), 'josif zukowskij')
    assert.ok(pasuje(przygotujZapytanie('Iwan')!, 'Иван Тестовый'))
    assert.ok(pasuje(przygotujZapytanie('Иван')!, 'Iwan Testowy'))
    assert.ok(!pasuje(przygotujZapytanie('Jan')!, 'Иван'))
})

test('PPL-07: trafienie w pełnej treści biogramu – fragment wokół trafienia; w zajęciu – stały opis osoby', () => {
    const d: DokumentSzukania = { rodzaj: 'osoba', etykieta: 'osoba', id: 't-jan', tytul: 'Jan Testowy', adres: '/osoby/t-jan', nazwy: ['Jan Testowy'],
        tekst: 'Wstęp. Długi biogram: w 1905 r. wyjechał do Ameryki. rolnik Testowo', tekstFragmentu: 'Wstęp. Długi biogram: w 1905 r. wyjechał do Ameryki.', fragmentGdyBrak: true, fragment: '1850–1910 · Testowo · rolnik' }
    assert.match(ocenaDokumentu(d, przygotujZapytanie('Ameryki')!)!.fragment, /wyjechał do Ameryki/)
    assert.equal(ocenaDokumentu(d, przygotujZapytanie('rolnik')!)!.fragment, '1850–1910 · Testowo · rolnik')
})
