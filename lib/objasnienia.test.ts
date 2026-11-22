import { test } from 'node:test'
import assert from 'node:assert/strict'
import { naW3C, poprawObjasnienie, stronaW3C, wKolejnosci, zW3C, type Objasnienie } from './objasnienia'

const o: Objasnienie = {
    id: 'o-abc123', strona: 's-k1-aa.jpg', x: 10.5, y: 20, w: 30, h: 5.25, rodzaj: 'odczyt', tekst: 'Działo się we wsi Olszanka…', jezyki: ['ru'],
    powiazania: ['olszanka', 'jan-testowy-1880'], opracowal: 'redakcja', weryfikacja: 'Zgodne z indeksem Geneteki.', widocznosc: 'bliscy', utworzono: '2026-11-13',
}

test('objaśnienie → W3C → objaśnienie', () => {
    const a = naW3C(o, { zWidocznoscia: true })
    assert.equal(a.motivation, 'transcribing')
    assert.equal((a.target.selector as { value: string }).value, 'xywh=percent:10.5,20,30,5.25')
    assert.deepEqual(a.body.filter((b) => b.purpose === 'linking').map((b) => b.source), ['olszanka', 'jan-testowy-1880'])
    assert.deepEqual(zW3C(JSON.parse(JSON.stringify(a))), o)
})

test('eksport publiczny: pełne adresy, bez widoczności', () => {
    const s = stronaW3C([o], { id: 'https://x/a.json', zrodlo: (p) => `https://x/pliki/${p}`, powiazanie: (p) => (p === 'olszanka' ? 'https://x/miejsca/olszanka' : null), idAdnotacji: (i) => `https://x/a.json#${i}` })
    const a = s.items[0]
    assert.equal(s.type, 'AnnotationPage')
    assert.equal(a.target.source, 'https://x/pliki/s-k1-aa.jpg')
    assert.equal(a.id, 'https://x/a.json#o-abc123')
    assert.equal('odniepamieci:widocznosc' in a, false)
    assert.deepEqual(a.body.filter((b) => b.purpose === 'linking').map((b) => b.source), ['https://x/miejsca/olszanka'])
    // z eksportu da się odczytać (nazwa pliku z adresu)
    assert.equal(zW3C(a)?.strona, 's-k1-aa.jpg')
})

test('poprawianie: zły identyfikator, prostokąt poza stroną, nieznany rodzaj', () => {
    assert.equal(poprawObjasnienie({ ...o, id: 'zle' }), null)
    assert.equal(poprawObjasnienie({ ...o, strona: '../x.jpg' }), null)
    const p = poprawObjasnienie({ ...o, x: 90, w: 30, rodzaj: 'cokolwiek' as never, jezyki: ['łacina'], widocznosc: 'x' as never })!
    assert.equal(p.w, 10)
    assert.equal(p.rodzaj, 'objasnienie')
    assert.equal(p.jezyki, undefined)
    assert.equal(p.widocznosc, 'publiczne')
})

test('kolejność czytania: strony, wiersze, od lewej', () => {
    const z = (id: string, strona: string, x: number, y: number) => ({ id, strona, x, y, h: 4 })
    const l = wKolejnosci([z('c', 's-2.jpg', 0, 0), z('b', 's-1.jpg', 50, 31), z('a', 's-1.jpg', 10, 30), z('d', 's-1.jpg', 0, 60)], ['s-1.jpg', 's-2.jpg'])
    assert.deepEqual(l.map((x) => x.id), ['a', 'b', 'd', 'c'])
})

// Łatka 21.11: kilka języków w jednym objaśnieniu (np. nadruk „Absender / Отправитель / Mittente”); W3C – language jako lista
test('języki: kilka kodów → W3C language jako lista → z powrotem; jeden kod – napis jak dotąd', () => {
    const wiele = poprawObjasnienie({ ...o, jezyki: ['de', 'ru', 'it', 'de', 'zle!'] })!
    assert.deepEqual(wiele.jezyki, ['de', 'ru', 'it'])
    const a = naW3C(wiele)
    assert.deepEqual((a.body as { language?: unknown }[])[0].language, ['de', 'ru', 'it'])
    assert.deepEqual(zW3C(JSON.parse(JSON.stringify(a)))!.jezyki, ['de', 'ru', 'it'])
    const jeden = naW3C(poprawObjasnienie({ ...o, jezyki: ['fr'] })!)
    assert.equal((jeden.body as { language?: unknown }[])[0].language, 'fr')
    assert.deepEqual(zW3C(JSON.parse(JSON.stringify(jeden)))!.jezyki, ['fr'])
})
test('języki: dawny zapis „jezyk” (jeden kod) czytany jako lista; brak języka – bez pola', () => {
    assert.deepEqual(poprawObjasnienie({ ...o, jezyki: undefined, jezyk: 'la' } as never)!.jezyki, ['la'])
    assert.equal(poprawObjasnienie({ ...o, jezyki: [] })!.jezyki, undefined)
})
test('lista języków: także włoski, czeski, węgierski, litewski, angielski', async () => {
    const { JEZYKI } = await import('./objasnienia-widok')
    for (const k of ['it', 'cs', 'hu', 'lt', 'en']) assert.ok(JEZYKI[k], k)
})

// Decyzja 22.11: „+ tłumaczenie / + odczyt tego zaznaczenia” – nowe objaśnienie z identycznym obszarem, bez powielania pary
test('para objaśnienia: odczyt ↔ tłumaczenie z tym samym obszarem; nie dla objaśnienia i pieczęci; nie, gdy para już jest', async () => {
    const { paraObjasnienia, maPare } = await import('./objasnienia-widok')
    const odczyt = { id: 'o-aaaa', strona: 's-1.jpg', x: 10, y: 20, w: 30, h: 5, rodzaj: 'odczyt' as const, tekst: 'На долгую память', jezyki: ['ru'], powiazania: ['maria-testowa'], opracowal: 'MD', weryfikacja: 'x', widocznosc: 'bliscy' as const, utworzono: '2026-11-22T08:00:00Z', ksztalt: { k: 'w' as const, p: [[10, 20], [40, 20], [40, 25]] as [number, number][] } }
    const t = paraObjasnienia(odczyt, 'o-bbbb')!
    assert.deepEqual({ ...t }, { id: 'o-bbbb', strona: 's-1.jpg', x: 10, y: 20, w: 30, h: 5, rodzaj: 'tlumaczenie', tekst: '', jezyki: ['pl'], powiazania: ['maria-testowa'], opracowal: 'MD', widocznosc: 'bliscy', ksztalt: odczyt.ksztalt })
    const o2 = paraObjasnienia({ ...odczyt, rodzaj: 'tlumaczenie' as const, jezyki: ['pl'] }, 'o-cccc')!
    assert.equal(o2.rodzaj, 'odczyt'); assert.equal(o2.jezyki, undefined, 'język oryginału do wybrania')
    assert.equal(paraObjasnienia({ ...odczyt, rodzaj: 'objasnienie' as const }, 'o-dddd'), null)
    assert.equal(maPare(odczyt, [odczyt]), false)
    assert.equal(maPare(odczyt, [odczyt, t]), true, 'tłumaczenie o tym samym obszarze już jest')
    assert.equal(maPare(odczyt, [odczyt, { ...t, x: 11 }]), false, 'inny obszar – to nie para')
})
