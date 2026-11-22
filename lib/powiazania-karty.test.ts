// JW-16: test odtwarzający błąd – odnośniki do osób i instytucji na karcie materiału mają nazwy, nie identyfikatory.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { odnosnikiInstytucji, odnosnikiOsob } from './powiazania-karty'

const osoby = new Map<string, { imiona: string; nazwisko: string; plec: 'M' | 'K' | 'U' }>([
    ['jan-testowy-1820', { imiona: 'Jan', nazwisko: 'Testowy', plec: 'M' as const }],
    ['anna-probna-1825', { imiona: 'Anna', nazwisko: 'Próbna', plec: 'K' as const }],
    ['ukryta-1990', { imiona: 'Ukryta', nazwisko: 'Osoba', plec: 'K' as const }],
])

test('osoby: nazwa zamiast identyfikatora, kolor płci, tylko widoczne i istniejące, bez powtórzeń', () => {
    const w = odnosnikiOsob(['jan-testowy-1820', 'ukryta-1990', 'nie-ma-takiej', 'anna-probna-1825', 'jan-testowy-1820'], osoby, (id) => id !== 'ukryta-1990')
    assert.deepEqual(w, [
        { id: 'jan-testowy-1820', href: '/osoby/jan-testowy-1820', nazwa: 'Jan Testowy', plec: 'M' },
        { id: 'anna-probna-1825', href: '/osoby/anna-probna-1825', nazwa: 'Anna Próbna', plec: 'K' },
    ])
    for (const x of w) assert.notEqual(x.nazwa, x.id, 'tekst odnośnika nie może być identyfikatorem')
})

test('instytucje: nazwa parafii zamiast identyfikatora; nieznane pominięte', () => {
    const w = odnosnikiInstytucji(['parafia-testowa', 'nieznana'], [{ id: 'parafia-testowa', nazwa: 'parafia unicka w Testowie' }])
    assert.deepEqual(w, [{ id: 'parafia-testowa', href: '/parafie/parafia-testowa', nazwa: 'parafia unicka w Testowie' }])
})

test('karta materiału nie wypisuje identyfikatora jako tekstu odnośnika (regresja JW-16)', () => {
    const kod = fs.readFileSync(path.join(path.resolve(import.meta.dirname, '..'), 'app/archiwum/[slug]/page.tsx'), 'utf8')
    assert.doesNotMatch(kod, />\{id\}<\/Link>/, 'wiersz karty z „{id}” jako tekstem odnośnika')
    assert.match(kod, /odnosnikiOsob\(/)
    assert.match(kod, /odnosnikiInstytucji\(/)
})

// Decyzja 22.11: karta osoby – bez portretu pasek boczny pokazuje fotografię z archiwum przypiętą do osoby
test('zdjęcie osoby z archiwum: tylko fotografie ze skanem, najstarsza; bez – null', async () => {
    const { zdjecieOsoby } = await import('./powiazania-karty')
    const m = (id: string, rodzaj: string, rok: number | null, adres?: string) => ({ id, nazwa: id, rodzaj, czas: rok ? String(rok) : '', strony: adres ? [{ adres }] : [], lata: rok ? [rok, rok] as [number, number] : null })
    const L = [
        m('list-1910', 'dokument', 1910, '/pliki/strony/list-1910/s-1.jpg'),
        m('foto-1957', 'zdjecie', 1957, '/pliki/strony/foto-1957/s-1.jpg'),
        m('foto-1910', 'zdjecie', 1910, '/pliki/strony/foto-1910/s-1.jpg'),
        m('foto-bez-skanu', 'zdjecie', 1900),
        m('foto-bez-daty', 'zdjecie', null, '/pliki/strony/foto-bez-daty/s-1.jpg'),
    ]
    const z = zdjecieOsoby(L, (x) => x.lata)
    assert.equal(z?.material.id, 'foto-1910')
    assert.equal(z?.adres, '/pliki/strony/foto-1910/s-1.jpg')
    assert.equal(zdjecieOsoby(L.filter((x) => x.rodzaj !== 'zdjecie'), (x) => x.lata), null, 'dokumenty nie zastępują zdjęcia')
    assert.equal(zdjecieOsoby([L[4]], (x) => x.lata)?.material.id, 'foto-bez-daty', 'bez daty – też, gdy nie ma innego')
})

test('karta osoby: materiały jako siatka miniatur pod tabelą (bez listy tytułów w tabeli), zdjęcie z archiwum w pasku bocznym', () => {
    const kod = fs.readFileSync(path.join(import.meta.dirname, '..', 'app', 'osoby', '[id]', 'page.tsx'), 'utf8')
    assert.ok(!kod.includes('<KrotkieMaterialy'), 'lista tytułów w tabeli zastąpiona siatką')
    assert.match(kod, /<Sekcja tytul="zdjęcia i materiały"[\s\S]*?<ListaMaterialow/)
    assert.ok(kod.includes('zdjecieOsoby('), 'pasek boczny korzysta ze zdjęcia z archiwum')
})
