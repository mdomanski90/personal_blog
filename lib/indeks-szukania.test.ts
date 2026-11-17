// P2 · PD-13: indeks SQLite – równoważność ze skanem pamięci (stary algorytm) i prywatność plików poziomów (dane syntetyczne).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { odciskTresci, ponumeruj, szukajIndeksowo, szukajSkanem, zaladujSqlite, zapomnijOdciski, zapytanieFts, zbudujIndeks, zrodloZIndeksu, szukajWZrodle, type DokumentSzukania, plikIndeksu } from './indeks-szukania'
import { przygotujZapytanie } from './szukanie'

const d = (rodzaj: DokumentSzukania['rodzaj'], id: string, tytul: string, tekst = '', extra: Partial<DokumentSzukania> = {}): DokumentSzukania => ({
    rodzaj, etykieta: rodzaj, id, tytul, adres: `/${rodzaj}/${id}`, nazwy: [tytul], tekst, tekstFragmentu: tekst, fragment: `skrót ${tytul}`, ...extra,
})
const KORPUS: DokumentSzukania[] = [
    d('miejsce', 'olszanka', 'Olszanka', 'Wieś w gminie Łosice, parafia unicka, młyn nad rzeką.', { bonus: 0.3, nazwy: ['Olszanka', 'Olszanki'] }),
    d('miejsce', 'losice', 'Łosice', 'Miasto powiatowe nad Toczną.', { bonus: 0.3 }),
    d('osoba', 'os-jan', 'Jan Przykładowy', 'organista w Olszance', { stalyFragment: true, nazwy: ['Jan Przykładowy', 'Przykładowy Jan'] }),
    d('wpis', 'bieżeństwo', 'Bieżeństwo 1915', 'Wyjazd mieszkańców w głąb Rosji; powrót po 1918 roku.', { miejsca: ['olszanka'], fragmentPrzez: 'zapowiedź wpisu' }),
    d('wpis', 'mlyn', 'Młyn w Olszance', 'Opis młyna wodnego i jego właścicieli.', { miejsca: ['olszanka'], fragmentPrzez: 'zapowiedź młyna' }),
    d('materiał', 'akt-1', 'Akt chrztu 1850', 'Księga metrykalna parafii unickiej; wpis nr 12.', { miejsca: ['olszanka', 'losice'], fragmentPrzez: '1850' }),
    d('obiekt', 'cerkiew', 'Cerkiew unicka', 'Drewniana cerkiew z XVIII wieku.', { miejsca: ['olszanka'], fragmentPrzez: '' }),
    d('temat', 'unia', 'Unia brzeska', 'Zawarta w 1596 roku; kasata unii w 1875.', { miejsca: ['losice'], fragmentPrzez: '' }),
    d('księga', 'k1', 'Księga urodzeń Olszanka', 'sygnatura 12/34 tomy 1810–1825', { miejsca: ['olszanka'], fragmentPrzez: '1810–1825', stalyFragment: true }),
    d('hasło', 'soltys', 'sołtys', 'Przedstawiciel wsi. wójt wiejski', { stalyFragment: true, fragment: 'Przedstawiciel wsi.' }),
    d('publikacja', 'p1', 'Dzieje Podlasia', 'Jan Kowalski 1999 Wydawnictwo Przykładowe', { tryb: 'p5', fragment: 'Jan Kowalski · 1999' }),
    d('zbiór', 'z1', 'Zbiór rodziny Przykładowych', 'pochodzenie: dar rodziny, Olszanka', { tryb: 'p5', fragment: 'dar rodziny' }),
    d('objaśnienie', 'akt-1/o-abcd', 'Akt chrztu 1850', 'Odczyt: Anno Domini 1850 baptizatus est Joannes.', { stalyFragment: true, fragment: 'odczyt' }),
]
const ZAPYTANIA = ['olszanka', 'w Olszance', 'olszank', 'zanka', 'młyn', 'mlyn wodnego', 'unicka', 'unitów', 'unii', 'łosice', 'losicach', 'jan przykładowy', 'przykladowych', 'wójt', 'sołtysa',
    'baptizatus', 'bieżeństwa', 'księga urodzeń', '1850', 'dzieje podlasia', 'dar rodziny', 'xyz', 'o', 'cerkiew z XVIII', 'kasata 1875']

async function wTmp<T>(f: (kat: string) => Promise<T>): Promise<T> {
    const kat = fs.mkdtempSync(path.join(os.tmpdir(), 'odniepamieci-indeks-'))
    try { return await f(kat) } finally { fs.rmSync(kat, { recursive: true, force: true }) }
}

test('PD-13: zapytanie FTS – prefiksy rdzeni, słowa łączone AND, bez zawężenia gdy brak liter', () => {
    const m = zapytanieFts(przygotujZapytanie('w Olszance')!)
    assert.equal(m, '("olszanc"* OR "olszank"* OR "olszant"*)', 'rdzeń „olszanc” + oboczności (k, t)')
    assert.equal(zapytanieFts(przygotujZapytanie('jan kowal')!)!.includes(' AND '), true)
})

test('PD-13: indeks daje dokładnie te same wyniki co skan pamięci (stary algorytm), także kolejność i „przez miejscowość”', async () => {
    assert.equal(await zaladujSqlite(), true, 'better-sqlite3 musi działać w tym środowisku')
    await wTmp(async (kat) => {
        const plik = path.join(kat, 'idx.db')
        zbudujIndeks(plik, ponumeruj(KORPUS), 'x')
        const zr = zrodloZIndeksu(plik)
        try {
            for (const q of ZAPYTANIA) {
                assert.deepEqual(szukajWZrodle(zr, q), szukajSkanem(KORPUS, q), `zapytanie „${q}”`)
            }
        } finally { zr.zamknij() }
    })
    // sprawdzamy też, że testowe zapytania coś znajdują (żeby równość nie była pusta)
    assert.ok(szukajSkanem(KORPUS, 'olszanka').length >= 6)
    assert.ok(szukajSkanem(KORPUS, 'zanka').some((w) => w.id === 'olszanka'), 'podciąg w nazwie (jak dotąd)')
    assert.ok(szukajSkanem(KORPUS, 'baptizatus').some((w) => w.rodzaj === 'objaśnienie'), 'objaśnienia skanów są w wynikach')
})

test('PD-13: odcisk treści zmienia się po zmianie pliku i po zmianie daty (widoczność osób zależy od dat)', async () => {
    await wTmp(async (kat) => {
        fs.mkdirSync(path.join(kat, 'content', 'miejsca'), { recursive: true })
        fs.mkdirSync(path.join(kat, 'content', 'zgloszenia'), { recursive: true })
        fs.writeFileSync(path.join(kat, 'content', 'miejsca', 'a.mdoc'), 'x')
        const dzien = new Date('2026-11-17T10:00:00Z')
        const o1 = odciskTresci(kat, dzien)
        assert.equal(odciskTresci(kat, dzien), o1)
        assert.notEqual(odciskTresci(kat, new Date('2026-11-18T10:00:00Z')), o1, 'inna data')
        fs.writeFileSync(path.join(kat, 'content', 'zgloszenia', 'z.json'), '{}')
        assert.equal(odciskTresci(kat, dzien), o1, 'zgłoszenia nie unieważniają indeksu')
        fs.writeFileSync(path.join(kat, 'content', 'miejsca', 'b.mdoc'), 'yy')
        assert.notEqual(odciskTresci(kat, dzien), o1, 'nowy plik')
    })
})

test('PD-13: odbudowa leniwa – ten sam odcisk nie przebudowuje indeksu, zmiana treści i daty – tak', async () => {
    await wTmp(async (kat) => {
        fs.mkdirSync(path.join(kat, 'content', 'miejsca'), { recursive: true })
        fs.writeFileSync(path.join(kat, 'content', 'miejsca', 'a.mdoc'), 'x')
        let dzien = new Date('2026-11-17T10:00:00Z'), budowy = 0
        const zrodlo = async () => { budowy++; return KORPUS }
        const szukaj = (q: string) => { zapomnijOdciski(); return szukajIndeksowo(q, 'publiczne', zrodlo, { korzen: kat, teraz: () => dzien }) }
        assert.ok((await szukaj('olszanka')).length > 0); assert.equal(budowy, 1)
        await szukaj('losice'); assert.equal(budowy, 1, 'bez zmian – bez przebudowy')
        fs.writeFileSync(path.join(kat, 'content', 'miejsca', 'b.mdoc'), 'yy')
        await szukaj('losice'); assert.equal(budowy, 2, 'zmiana treści')
        dzien = new Date('2026-11-18T10:00:00Z')
        await szukaj('losice'); assert.equal(budowy, 3, 'nowy dzień')
        assert.ok(fs.existsSync(plikIndeksu('publiczne', kat)))
        assert.deepEqual(fs.readdirSync(path.join(kat, 'data')).filter((n) => n.endsWith('.tmp')), [], 'bez plików tymczasowych')
    })
})

test('PD-13 prywatność: plik indeksu poziomu publicznego nie zawiera treści „dla bliskich” ani „tylko ja” – także w bajtach pliku', async () => {
    const TAJNE_BLISCY = 'zazielenionybliskich', TAJNE_JA = 'rozpoznanyjedynie'
    const wszystko: Record<'publiczne' | 'bliscy' | 'ja', DokumentSzukania[]> = {
        publiczne: [d('wpis', 'w-pub', 'Wpis publiczny', 'zwykły tekst publiczny')],
        bliscy: [d('wpis', 'w-pub', 'Wpis publiczny', 'zwykły tekst publiczny'), d('osoba', 'os-b', 'Osoba bliskich', TAJNE_BLISCY, { stalyFragment: true })],
        ja: [d('wpis', 'w-pub', 'Wpis publiczny', 'zwykły tekst publiczny'), d('osoba', 'os-b', 'Osoba bliskich', TAJNE_BLISCY, { stalyFragment: true }), d('objaśnienie', 'm/o-ja', 'Objaśnienie prywatne', TAJNE_JA)],
    }
    await wTmp(async (kat) => {
        await zaladujSqlite()
        const wyniki: Record<string, string[]> = {}
        for (const poziom of ['publiczne', 'bliscy', 'ja'] as const) {
            zapomnijOdciski()
            const q = (t: string) => szukajIndeksowo(t, poziom, async () => wszystko[poziom], { korzen: kat })
            wyniki[poziom] = [...await q(TAJNE_BLISCY), ...await q(TAJNE_JA)].map((w) => w.id)
        }
        assert.deepEqual(wyniki.publiczne, [])
        assert.deepEqual(wyniki.bliscy, ['os-b'])
        assert.deepEqual(wyniki.ja, ['os-b', 'm/o-ja'])
        const bajty = (poziom: string) => fs.readFileSync(plikIndeksu(poziom, kat)).toString('latin1')
        assert.ok(!bajty('publiczne').includes(TAJNE_BLISCY) && !bajty('publiczne').includes(TAJNE_JA), 'plik publiczny bez treści chronionych')
        assert.ok(!bajty('bliscy').includes(TAJNE_JA), 'plik „bliscy” bez treści „tylko ja”')
        assert.ok(bajty('ja').includes(TAJNE_JA))
    })
})

test('PD-13: nowe wydanie programu (inny .next/BUILD_ID) unieważnia indeks, choć treść się nie zmieniła – kod budujący dokumenty mógł się zmienić', async () => {
    await wTmp(async (kat) => {
        fs.mkdirSync(path.join(kat, 'content', 'miejsca'), { recursive: true })
        fs.writeFileSync(path.join(kat, 'content', 'miejsca', 'a.mdoc'), 'x')
        const dzien = new Date('2026-11-17T10:00:00Z')
        const bez = odciskTresci(kat, dzien)
        fs.mkdirSync(path.join(kat, '.next'), { recursive: true })
        fs.writeFileSync(path.join(kat, '.next', 'BUILD_ID'), 'wydanie-1')
        const w1 = odciskTresci(kat, dzien)
        assert.notEqual(w1, bez)
        assert.equal(odciskTresci(kat, dzien), w1, 'to samo wydanie – ten sam odcisk')
        fs.writeFileSync(path.join(kat, '.next', 'BUILD_ID'), 'wydanie-2')
        assert.notEqual(odciskTresci(kat, dzien), w1, 'inne wydanie')
    })
})
