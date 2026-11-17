// Etap R (17.11): WSP-02 (zadania z braków tylko z rekordów publicznych, decyzje redakcji), WSP-03 (zgłoszenia),
// PD-07 (podpis i strona bloku), SRC-02 (notatka robocza poza stroną). Dane wyłącznie syntetyczne.
import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import Markdoc from '@markdoc/markdoc'
import type { Material, Miejsce, Obiekt } from './archiwum'
import { brakiMaterialu, brakiObiektu, etykietaBraku, zrodlaWTekscie } from './wspoltworz-reguly'
import { kontekstUzupelnienia, probkaDnia, zbierzZadania } from './wspoltworz'
import { zgloszenieZDanych } from './zgloszenia'
import { indeksStrony, podzielWstawki } from './markdoc'
import { stanUwagi, uwagiJakosci, zignorowaneUwagi } from './panel/jakosc'

const doc = (t: string) => Markdoc.parse(t)
const mat = (id: string, x: Partial<Material> = {}): Material => ({
    id, nazwa: `Materiał ${id}`, rodzaj: 'dokument', plik: `/pliki/${id}.png`, strony: [{ adres: `/pliki/${id}.png` }], czas: '1925', tworca: '', przekazal: '', opracowal: '',
    pochodzenie: '', sygnatura: '', prawa: '', jezyk: 'polski', miejsca: ['testowo'], tematy: [], obiekty: [], zbiory: [], instytucje: [], osobyIds: [], miejscePrzechowywania: '',
    podpisZrodla: '', kadr: 'srodek', transkrypcja: '', widocznosc: 'publiczne', dodano: null, zrodla: [], opis: doc('Opis materiału.'), bezWspoltworz: false, ...x,
})
const msc = (id: string, x: Partial<Miejsce> = {}): Miejsce => ({
    id, nazwa: id === 'testowo' ? 'Testowo' : `Wieś ${id}`, inneNazwy: [], formy: [], rodzaj: 'wies', wspolrzedne: null, przyblizone: false, wyznania: [], wyznaniaRowne: false,
    nalezyDo: null, parafie: [], sameAs: null, widocznosc: 'publiczne', dodano: null, zrodloOpisu: '', wstep: '', zrodla: [], opis: null, bezWspoltworz: false, ...x,
})
const obi = (id: string, x: Partial<Obiekt> = {}): Obiekt => ({
    id, nazwa: `obiekt ${id}`, inneNazwy: [], rodzaj: 'krzyz', miejsce: 'testowo', miejsca: ['testowo'], wspolrzedne: null, przyblizone: false, czas: '', istnieje: true,
    widocznosc: 'publiczne', dodano: null, opis: null, zdjecia: [], zrodla: [], bezWspoltworz: false, ...x,
})
const zbierz = (d: { materialy?: Material[]; obiekty?: Obiekt[]; miejsca?: Miejsce[]; zignorowane?: Set<string> }) => zbierzZadania({
    materialy: d.materialy ?? [], obiekty: d.obiekty ?? [], miejsca: d.miejsca ?? [msc('testowo', { opis: doc('Historia.') })], zignorowane: d.zignorowane ?? new Set(),
    odczyty: () => ({ odczyt: false, tlumaczenie: false }), rodzajMiejsca: () => ({ nazwa: 'wieś', obszar: false }),
})

test('WSP-02: definicja braków – transkrypcja, tłumaczenie (tylko język obcy), zdjęcie, obiekt nieistniejący', () => {
    const baza = { rodzaj: 'dokument', maSkan: true, maTranskrypcje: false, maTlumaczenie: false, jezyk: 'polski', maCzas: true, maMiejsca: true, maOpis: true }
    assert.deepEqual(brakiMaterialu(baza), ['brak-transkrypcji'])
    assert.deepEqual(brakiMaterialu({ ...baza, rodzaj: 'mapa' }), [], 'mapa ze skanem nie czeka na odczyt')
    assert.deepEqual(brakiMaterialu({ ...baza, maTranskrypcje: true }), [], 'polski – bez tłumaczenia')
    assert.deepEqual(brakiMaterialu({ ...baza, maTranskrypcje: true, jezyk: 'łacina, polski' }), ['brak-tlumaczenia'])
    assert.deepEqual(brakiMaterialu({ ...baza, maTranskrypcje: true, jezyk: '' }), [], 'pusty język – nie zgadujemy')
    assert.deepEqual(brakiMaterialu({ ...baza, rodzaj: 'zdjecie', maCzas: false }), ['zdjecie-do-rozpoznania'])
    assert.deepEqual(brakiObiektu({ maOpis: true, maWspolrzedne: true, maZdjecie: false, istnieje: false }), [], 'obiekt, którego nie ma, nie prosi o zdjęcie z dzisiaj')
    assert.deepEqual(brakiObiektu({ maOpis: false, maWspolrzedne: false, maZdjecie: false, istnieje: true }), ['bez-opisu', 'brak-wspolrzednych', 'brak-zdjecia-obiektu'])
    assert.equal(etykietaBraku('brak-transkrypcji', { jezyk: 'łacina' }), 'brak transkrypcji · łacina')
    assert.equal(etykietaBraku('zdjecie-do-rozpoznania', { zdjecie: { maOpis: false, maCzas: true, maMiejsca: false } }), 'kto jest na zdjęciu? · gdzie?')
    assert.deepEqual(zrodlaWTekscie('{% zrodlo rodzaj="transkrypcja" %}\nAnno 1850\n{% /zrodlo %}\n'), { transkrypcja: true, tlumaczenie: false, opis: false })
})

test('WSP-02: rekord niepubliczny, „nie pokazuj w współtwórz” i „zignoruj” nie trafiają do zadań; bez śladu nazw niepublicznych', () => {
    const z = zbierz({
        materialy: [mat('jawny'), mat('ukryty', { widocznosc: 'ja' }), mat('bliscy', { widocznosc: 'bliscy' }), mat('wylaczony', { bezWspoltworz: true }), mat('zignorowany'), mat('w-ukrytej-wsi', { miejsca: ['tajna'] })],
        obiekty: [obi('obj-a', { opis: doc('Opis.'), wspolrzedne: [52, 22], zdjecia: [{ plik: 'x.jpg', podpis: '', data: '', autor: '', prawa: '' }] }), obi('obj-ukryty', { widocznosc: 'bliscy' })],
        miejsca: [msc('testowo', { opis: doc('Historia.') }), msc('bez-historii'), msc('tajna', { widocznosc: 'ja' })],
        zignorowane: new Set(['materialy:zignorowany:brak-transkrypcji']),
    })
    const klucze = z.map((x) => x.klucz).sort()
    assert.deepEqual(klucze, ['materialy:jawny:brak-transkrypcji', 'materialy:w-ukrytej-wsi:brak-transkrypcji', 'miejsca:bez-historii:bez-opisu'])
    const wUkrytej = z.find((x) => x.id === 'w-ukrytej-wsi')!
    assert.deepEqual(wUkrytej.miejsca, [], 'filtr miejscowości bez wsi niepublicznej')
    assert.ok(!wUkrytej.linia.includes('tajna') && !wUkrytej.linia.includes('Wieś tajna'), 'linia pozycji bez nazwy wsi niepublicznej')
    assert.equal(kontekstUzupelnienia(z, 'materialy:ukryty:brak-transkrypcji'), null, '?uzupelnij= dla rekordu niepublicznego – bez kontekstu')
    assert.equal(kontekstUzupelnienia(z, 'materialy:jawny:brak-transkrypcji')?.czegoDotyczy, 'Materiał jawny · brak transkrypcji · polski')
    const lista = Array.from({ length: 20 }, (_, i) => ({ klucz: `k${i}` }))
    assert.deepEqual(probkaDnia(lista, 5, new Date('2026-11-17T10:00:00Z')), probkaDnia(lista, 5, new Date('2026-11-17T22:00:00Z')), 'próbka stała w ciągu doby')
})

test('WSP-02: reguły w panelu („do opracowania”) i „zignoruj” widziane przez stronę (syntetyczne pliki)', async () => {
    const przed = process.cwd()
    const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'odniepamieci-wsp-'))
    try {
        process.chdir(tmp)
        await fsp.mkdir('content/materialy', { recursive: true })
        await fsp.mkdir('content/obiekty', { recursive: true })
        await fsp.writeFile('content/materialy/skan.mdoc', '---\ntitle: Skan\ntype: dokument\nfile: /pliki/skan.png\nsource: archiwum\nrights: domena publiczna\nlanguage: polski\n---\nOpis.\n')
        await fsp.writeFile('content/materialy/akt.mdoc', '---\ntitle: Akt\ntype: akt\nfile: /pliki/akt.png\nsource: archiwum\nrights: dp\nlanguage: łacina\n---\n{% zrodlo rodzaj="transkrypcja" %}\nAnno\n{% /zrodlo %}\n')
        await fsp.writeFile('content/obiekty/obj-mlyn.mdoc', '---\ntitle: młyn\ntype: mlyn\nspatial: testowo\nexists: false\n---\nOpis.\n')
        const u = await uwagiJakosci()
        assert.ok(u.some((x) => x.id === 'materialy:skan:brak-transkrypcji'))
        assert.ok(u.some((x) => x.id === 'materialy:akt:brak-tlumaczenia'))
        assert.ok(!u.some((x) => x.id === 'materialy:akt:brak-transkrypcji'), 'znacznik transkrypcji liczy się jako odczyt')
        assert.ok(!u.some((x) => x.id === 'obiekty:obj-mlyn:brak-zdjecia-obiektu'), 'obiekt nieistniejący bez reguły zdjęcia')
        assert.equal(await stanUwagi('materialy:skan:brak-transkrypcji', 'ignorowane', 'np. dokument nieczytelny'), true)
        assert.ok((await zignorowaneUwagi()).has('materialy:skan:brak-transkrypcji'))
    } finally {
        process.chdir(przed)
        await fsp.rm(tmp, { recursive: true, force: true })
    }
})

test('WSP-03: zgłoszenie – nowe rodzaje, rodzaj braku, zgoda na podpis; złe dane odrzucone', () => {
    assert.deepEqual(zgloszenieZDanych({ rodzaj: 'odczyt', adres: '/archiwum/x', tytul: 'X · brak transkrypcji', tresc: 'Anno Domini', kontakt: '', brak: 'brak-transkrypcji', podpis: true }),
        { rodzaj: 'odczyt', adres: '/archiwum/x', tytul: 'X · brak transkrypcji', tresc: 'Anno Domini', kontakt: '', brak: 'brak-transkrypcji', podpis: true })
    assert.equal(zgloszenieZDanych({ rodzaj: 'wspomnienie', adres: '/wpisy/a', tresc: 'Pamiętam szkołę', brak: 'cokolwiek', podpis: 'tak' })?.brak, undefined, 'nieznany brak pominięty')
    assert.equal(zgloszenieZDanych({ rodzaj: 'wspomnienie', adres: '/wpisy/a', tresc: 'Pamiętam szkołę', podpis: 'tak' })?.podpis, undefined, 'zgoda tylko jako true')
    assert.equal(zgloszenieZDanych({ rodzaj: 'komentarz', adres: '/', tresc: 'abc' }), null)
    assert.equal(zgloszenieZDanych({ rodzaj: 'odczyt', adres: '//obca.pl', tresc: 'abc' }), null)
    assert.equal(zgloszenieZDanych({ rodzaj: 'odczyt', adres: '/', tresc: 'abc', www: 'bot' }), null)
})

test('PD-07: podpis i strona z bloku „Materiał z archiwum” przechodzą do wstawki na pełnej szerokości', () => {
    const html = '<article><p>a</p><figure class="material-wstawka" data-id="pismo-1925" data-podpis="Pismo &quot;gminy&quot; &amp; wójta" data-strona="3" data-dokument="{}"><span class="dok-kadr"></span><figcaption>x</figcaption></figure><p>b</p></article>'
    const cz = podzielWstawki(html)
    assert.deepEqual(cz[1], { material: 'pismo-1925', podpis: 'Pismo "gminy" & wójta', strona: 3 })
    assert.equal(indeksStrony(3, 5), 2)
    assert.equal(indeksStrony(9, 5), 4, 'za duży numer – ostatnia strona')
    assert.equal(indeksStrony(undefined, 5), 0)
})

test('SRC-02: notatka robocza (pole note) nie jest czytana przez strony publiczne ani eksport', () => {
    const ROOT = path.resolve(import.meta.dirname, '..')
    const pliki: string[] = []
    const zbierzPliki = (k: string) => { for (const w of fs.readdirSync(path.join(ROOT, k), { withFileTypes: true })) {
        const p = path.join(k, w.name)
        if (w.isDirectory()) { if (!['keystatic', 'panel', 'node_modules'].includes(w.name)) zbierzPliki(p) }
        else if (/\.(ts|tsx|mjs)$/.test(w.name) && !w.name.endsWith('.test.ts')) pliki.push(p)
    } }
    for (const k of ['app', 'lib', 'scripts']) zbierzPliki(k)
    const zle = pliki.filter((p) => /\.note\b|\[['"]note['"]\]/.test(fs.readFileSync(path.join(ROOT, p), 'utf8')))
    assert.deepEqual(zle, [], 'pole „note” (notatka robocza) czytane poza panelem')
})

test('WSP-06: jedno zadanie na plan publiczny z napisami do odczytania; plan niepubliczny, bez napisów i „zignorowany” – bez zadania', () => {
    const baza = { materialy: [], obiekty: [], miejsca: [msc('testowo', { opis: doc('Historia.') })], odczyty: () => ({ odczyt: false, tlumaczenie: false }), rodzajMiejsca: () => ({ nazwa: 'wieś', obszar: false }) }
    const plany = [
        { slug: 'cmentarz-a', tytul: 'Cmentarz A', widocznosc: 'publiczne', miejsce: 'testowo', doOdczytania: 3 },
        { slug: 'cmentarz-b', tytul: 'Cmentarz B', widocznosc: 'bliscy', miejsce: 'testowo', doOdczytania: 5 },
        { slug: 'cmentarz-c', tytul: 'Cmentarz C', widocznosc: 'publiczne', doOdczytania: 0 },
    ]
    const z = zbierzZadania({ ...baza, zignorowane: new Set(), plany }).filter((x) => x.rodzaj === 'napisy')
    assert.deepEqual(z.map((x) => [x.id, x.etykieta, x.href, x.linia]), [['cmentarz-a', '3 napisy do odczytania', '/plany/cmentarz-a?napisy=1', 'Testowo · plan cmentarza']])
    const ign = zbierzZadania({ ...baza, zignorowane: new Set(['plany:cmentarz-a:napisy-do-odczytania']), plany }).filter((x) => x.rodzaj === 'napisy')
    assert.equal(ign.length, 0)
})
