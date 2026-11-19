// P7b (TER-01): czynności z terenu – reguły zapisu, konto tylko terenowe a redakcja, napis „do decyzji”, plan dla terenu.
// Dane syntetyczne.
import test from 'node:test'
import assert from 'node:assert/strict'
import { popraw, dlaCzytelnika, type Element, type Plan } from '../plany/model'
import { USTAWIENIA_DOMYSLNE } from '../plany/typy'
import { odczytajCzynnosc, planDlaTerenu, plikiDlaTerenu, postepPlanu, rozstrzygnij, zastosujCzynnosc, type Czynnosc } from './czynnosci'

const U = USTAWIENIA_DOMYSLNE
const grob = (id: string, x: number, w: Partial<Element> = {}): Element => ({ id, typ: 'grob', g: { k: 'r', x, y: 0, w: 10, h: 20, a: 0 }, ...w }) as Element
const plan = (elementy: Element[], w: Partial<Plan> = {}): Plan => popraw({ slug: 'cmentarz-testowo', tytul: 'cmentarz w Testowie', elementy, ...w })
const TEREN = { id: 'k-teren', imie: 'Jan Testowy', pelne: false }, REDAKTOR = { id: 'k-red', imie: 'Anna Testowa', pelne: true }
const ID = (n: number) => `czynnosc-${String(n).padStart(4, '0')}`
const T = new Date('2026-11-19T10:00:00Z')
const el = (p: Plan, id: string) => p.elementy.find((e) => e.id === id)!

test('odczyt czynności: identyfikator, grób i rodzaj są wymagane; teksty przycinane; położenie tylko w zakresie', () => {
    assert.equal(typeof odczytajCzynnosc(null), 'string')
    assert.equal(typeof odczytajCzynnosc({ id: 'x', rodzaj: 'napis', grob: 'a', napis: 'Jan' }), 'string')
    assert.equal(typeof odczytajCzynnosc({ id: ID(1), rodzaj: 'napis', napis: 'Jan' }), 'string')
    assert.equal(typeof odczytajCzynnosc({ id: ID(1), rodzaj: 'usun', grob: 'a' }), 'string')
    assert.equal(typeof odczytajCzynnosc({ id: ID(1), rodzaj: 'zdjecie', grob: 'a', plik: '../../etc/passwd' }), 'string')
    assert.equal(typeof odczytajCzynnosc({ id: ID(1), rodzaj: 'notatka', grob: 'a', tekst: '   ' }), 'string')
    assert.deepEqual(odczytajCzynnosc({ id: ID(1), rodzaj: 'zdjecie', grob: 'a', plik: 'zdjecie-ab12.jpg', lat: 52.123456789, lon: 22.5, data: '2026-11-19T10:00:00' }),
        { id: ID(1), rodzaj: 'zdjecie', grob: 'a', plik: 'zdjecie-ab12.jpg', lat: 52.123457, lon: 22.5, data: '2026-11-19T10:00:00' })
    assert.deepEqual(odczytajCzynnosc({ id: ID(1), rodzaj: 'zdjecie', grob: 'a', plik: 'z.jpg', lat: 520, lon: 22 }), { id: ID(1), rodzaj: 'zdjecie', grob: 'a', plik: 'z.jpg' })
    assert.deepEqual(odczytajCzynnosc({ id: ID(2), rodzaj: 'napis', grob: 'a', napis: ' Jan\r\nTestowy ', podstawa: '' }), { id: ID(2), rodzaj: 'napis', grob: 'a', napis: 'Jan\nTestowy', podstawa: '' })
})

test('konto terenowe: zdjęcie zapisuje się od razu, grób „narysowany” → „opracowany” i dostaje znak „z terenu”', () => {
    const p = plan([grob('a', 0), grob('b', 20)])
    const w = zastosujCzynnosc(p, { id: ID(1), rodzaj: 'zdjecie', grob: 'a', plik: 'zdjecie-1.jpg', lat: 52.1, lon: 22.2 }, TEREN, U, T)
    assert.ok('plan' in w && w.zmieniono)
    assert.deepEqual(el(w.plan, 'a').zdjecia, [{ plik: 'zdjecie-1.jpg', lat: 52.1, lon: 22.2, data: '2026-11-19T10:00:00' }])
    assert.equal(el(w.plan, 'a').etap, 'opracowany')
    assert.deepEqual(el(w.plan, 'a').zTerenu, { kto: 'k-teren', czas: T.toISOString() })
    assert.equal(el(w.plan, 'b').zTerenu, undefined)
    assert.equal(w.plan.wersja, p.wersja, 'wersję podbija dopiero zapis na serwerze')
    assert.deepEqual({ kto: w.wpis.kto, rodzaj: w.wpis.rodzaj, wynik: w.wpis.wynik, plik: w.wpis.plik }, { kto: 'k-teren', rodzaj: 'zdjecie', wynik: 'zapisano', plik: 'zdjecie-1.jpg' })
    // to samo zdjęcie drugi raz – nic się nie dubluje
    const w2 = zastosujCzynnosc(w.plan, { id: ID(2), rodzaj: 'zdjecie', grob: 'a', plik: 'zdjecie-1.jpg' }, TEREN, U, T)
    assert.ok('plan' in w2 && !w2.zmieniono)
})

test('konto terenowe: zmiana w grobie „sprawdzonym” cofa go do „opracowany”; „sprawdzony” stawia tylko redakcja', () => {
    const p = plan([grob('a', 0, { etap: 'sprawdzony', napis: 'Jan Testowy' })])
    const w = zastosujCzynnosc(p, { id: ID(1), rodzaj: 'napis', grob: 'a', napis: 'Jan Testowy\n1900–1950', podstawa: 'Jan Testowy' }, TEREN, U, T)
    assert.ok('plan' in w && w.zmieniono)
    assert.equal(el(w.plan, 'a').napis, 'Jan Testowy\n1900–1950')
    assert.equal(el(w.plan, 'a').etap, 'opracowany')
    const odmowa = zastosujCzynnosc(w.plan, { id: ID(2), rodzaj: 'sprawdzony', grob: 'a' }, TEREN, U, T)
    assert.ok('blad' in odmowa && odmowa.status === 403)
    const s = zastosujCzynnosc(w.plan, { id: ID(3), rodzaj: 'sprawdzony', grob: 'a' }, REDAKTOR, U, T)
    assert.ok('plan' in s && s.zmieniono)
    assert.equal(el(s.plan, 'a').etap, 'sprawdzony')
    assert.equal('zTerenu' in el(s.plan, 'a'), false, '„sprawdzony” zdejmuje znak „z terenu”')
})

test('redaktor w terenie: zapis bez znaku „z terenu” i bez cofania etapu', () => {
    const p = plan([grob('a', 0, { etap: 'sprawdzony', napis: 'Jan' })])
    const w = zastosujCzynnosc(p, { id: ID(1), rodzaj: 'zdjecie', grob: 'a', plik: 'z.jpg' }, REDAKTOR, U, T)
    assert.ok('plan' in w && w.zmieniono)
    assert.equal(el(w.plan, 'a').etap, 'sprawdzony')
    assert.equal(el(w.plan, 'a').zTerenu, undefined)
})

test('napis zmieniony w panelu po pobraniu planu: plan bez zmian, obie wersje w dzienniku – „do decyzji”', () => {
    const p = plan([grob('a', 0, { napis: 'Jan Testowy, zm. 1950' })])
    const cz: Czynnosc = { id: ID(1), rodzaj: 'napis', grob: 'a', napis: 'Jan Testowy 1900', podstawa: 'Jan Testowy' }
    const w = zastosujCzynnosc(p, cz, TEREN, U, T)
    assert.ok('plan' in w && !w.zmieniono)
    assert.equal(w.plan, p)
    assert.deepEqual({ wynik: w.wpis.wynik, napis: w.wpis.napis, bylo: w.wpis.bylo }, { wynik: 'do-decyzji', napis: 'Jan Testowy 1900', bylo: 'Jan Testowy, zm. 1950' })
    // redakcja wybiera wersję z terenu → wpisana do planu; drugi raz rozstrzygnąć się nie da
    const r = rozstrzygnij(p, w.wpis, 'teren', { id: 'k-red' }, U, T)
    assert.ok('plan' in r && r.zmieniono)
    assert.equal(el(r.plan, 'a').napis, 'Jan Testowy 1900')
    assert.equal(r.wpis.rozstrzygnieto?.wybor, 'teren')
    assert.ok('blad' in rozstrzygnij(r.plan, r.wpis, 'redakcja', { id: 'k-red' }, U, T))
    // redakcja zostawia swoją wersję → plan bez zmian
    const z = rozstrzygnij(p, w.wpis, 'redakcja', { id: 'k-red' }, U, T)
    assert.ok('plan' in z && !z.zmieniono && z.plan === p)
    // ten sam napis co w planie (ktoś już go wpisał) – to nie konflikt
    const ten = zastosujCzynnosc(p, { ...cz, napis: 'Jan Testowy, zm. 1950' }, TEREN, U, T)
    assert.ok('plan' in ten && !ten.zmieniono && ten.wpis.wynik === 'zapisano')
})

test('notatka z terenu dopisuje się do notatki redakcji z imieniem i datą', () => {
    const p = plan([grob('a', 0, { notatka: 'sprawdzić w księdze' })])
    const w = zastosujCzynnosc(p, { id: ID(1), rodzaj: 'notatka', grob: 'a', tekst: 'Płyta pęknięta.' }, TEREN, U, T)
    assert.ok('plan' in w)
    assert.equal(el(w.plan, 'a').notatka, 'sprawdzić w księdze\n[z terenu, Jan Testowy, 2026-11-19] Płyta pęknięta.')
})

test('czynność tylko na grobie: inny element, brak elementu i grób „tylko ja” (dla konta terenowego) – odmowa', () => {
    const p = plan([grob('a', 0, { widocznosc: 'ja' }), { id: 'k', typ: 'krzyz', g: { k: 'p', x: 1, y: 1 } } as Element])
    for (const g of ['a', 'k', 'nie-ma']) {
        const w = zastosujCzynnosc(p, { id: ID(1), rodzaj: 'notatka', grob: g, tekst: 'x' }, TEREN, U, T)
        assert.ok('blad' in w && w.status === 404, g)
    }
    assert.ok('plan' in zastosujCzynnosc(p, { id: ID(1), rodzaj: 'notatka', grob: 'a', tekst: 'x' }, REDAKTOR, U, T))
})

test('plan dla konta terenowego: bez „tylko ja”, osób, źródeł i notatek; z punktami geo, etapem i znakiem „z terenu”; redakcja – cały plan', () => {
    const geo = [{ x: 0, y: 0, lat: 52, lon: 22 }, { x: 100, y: 0, lat: 52, lon: 22.001 }]
    const p = plan([
        grob('a', 0, { napis: 'Jan', etap: 'sprawdzony', notatka: 'robocza', zrodla: 'księga', osoby: [{ imie: 'Jan' }] as never, zdjecia: [{ plik: 'a.jpg', lat: 52, lon: 22 }] }),
        grob('b', 20, { widocznosc: 'ja', zdjecia: [{ plik: 'b.jpg' }] }),
        grob('c', 40, { zTerenu: { kto: 'k-teren', czas: T.toISOString() } }),
    ], { widocznosc: 'ja', geo, podklady: [{ id: 'p1', plik: 'podklad.jpg', nazwa: '', szer: 10, wys: 10, macierz: [1, 0, 0, 1, 0, 0], krycie: 1, widocznosc: 'edycja' }, { id: 'p2', plik: 'mapa.jpg', nazwa: '', szer: 10, wys: 10, macierz: [1, 0, 0, 1, 0, 0], krycie: 1, widocznosc: 'bliscy' }] as never })
    const t = planDlaTerenu(p, false, 'bliscy', U)
    assert.deepEqual(t.elementy.map((e) => e.id), ['a', 'c'])
    const a = el(t, 'a') as Element & Record<string, unknown>
    assert.equal(a.napis, 'Jan'); assert.equal(a.etap, 'sprawdzony')
    for (const pole of ['notatka', 'zrodla', 'osoby']) assert.equal(pole in a, false, pole)
    assert.deepEqual(el(t, 'c').zTerenu, { kto: 'k-teren', czas: T.toISOString() })
    assert.equal(t.geo.length, 2)
    assert.deepEqual([...plikiDlaTerenu(t)].sort(), ['a.jpg', 'mapa.jpg'])
    assert.equal(planDlaTerenu(p, true, 'ja', U), p)
    // czytelnik strony nigdy nie dostaje znaku „z terenu”
    assert.equal(dlaCzytelnika(p, 'bliscy', U).elementy.some((e) => 'zTerenu' in e), false)
})

test('postęp planu: groby, sprawdzone, bez zdjęcia', () => {
    const p = plan([grob('a', 0, { etap: 'sprawdzony', zdjecia: [{ plik: 'a.jpg' }] }), grob('b', 20), { id: 'k', typ: 'krzyz', g: { k: 'p', x: 1, y: 1 } } as Element])
    assert.deepEqual(postepPlanu(p, U), { groby: 2, sprawdzone: 1, bezZdjecia: 1 })
})
