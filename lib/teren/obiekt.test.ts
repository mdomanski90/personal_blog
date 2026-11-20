// P7c (TER-04): obiekt ze skrzynki „z terenu”. Czysta logika + trasa wywoływana bezpośrednio w katalogu tymczasowym,
// bez kont (pełny dostęp jak przed P7a). Dane wyłącznie syntetyczne.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import * as yaml from 'js-yaml'
import { NAZWY_OBIEKTOW } from '../tarcze'
import { RODZAJE_TERENU, type MiejsceTerenu } from './miejsca'
import { RODZAJ_OBIEKTU, naglowekObiektu, plikZdjeciaObiektu, slugObiektu, sprawdzPola, szkicObiektu } from './obiekt'

const KAT = fs.mkdtempSync(path.join(os.tmpdir(), 'p7c-ter04-'))
process.chdir(KAT)
for (const k of ['KONTA_ADRES', 'KONTA_STRONA', 'PANEL_TYLKO_KONTA']) delete process.env[k]

const WPIS: MiejsceTerenu = {
    id: 'miejsce-test-0001', czas: '2026-11-19T10:00:00.000Z', kto: 'p7b-jan', imie: 'Jan Terenowy', rodzaj: 'krzyz', nazwa: '', notatka: 'Żeliwny, na kamiennym cokole.',
    lat: 52.210451, lon: 22.710132, dokl: 6, blisko: { id: 'testowo', nazwa: 'Testowo', km: 0.4, kierunek: 'na północ' },
    zdjecia: [{ plik: 'zdjecie-a1.jpg', szer: 300, wys: 200 }, { plik: 'zdjecie-b2.jpg', szer: 300, wys: 200 }], stan: 'nowe',
}

test('TER-04: każdy rodzaj z telefonu ma rodzaj obiektu istniejący w NAZWY_OBIEKTOW (albo wybór redakcji – cmentarz)', () => {
    for (const [k] of RODZAJE_TERENU) {
        assert.ok(k in RODZAJ_OBIEKTU, k)
        const r = RODZAJ_OBIEKTU[k]
        if (r !== null) assert.ok(r in NAZWY_OBIEKTOW, `${k} → ${r}`)
    }
    assert.equal(RODZAJ_OBIEKTU.cmentarz, null)
})

test('TER-04: szkic z wpisu – nazwa, rodzaj, miejscowość, współrzędne, przybliżenie, „nie istnieje” dla śladu', () => {
    const s = szkicObiektu(WPIS)
    assert.deepEqual(s, { nazwa: 'krzyż przydrożny – Testowo', rodzaj: 'krzyz', miejsce: 'testowo', wspolrzedne: '52.21045, 22.71013', przyblizone: false, istnieje: true, zdjecia: ['zdjecie-a1.jpg', 'zdjecie-b2.jpg'], autor: 'Jan Terenowy' })
    assert.equal(szkicObiektu({ ...WPIS, dokl: 40 }).przyblizone, true)
    assert.equal(szkicObiektu({ ...WPIS, lat: undefined, lon: undefined, dokl: undefined }).wspolrzedne, '')
    assert.equal(szkicObiektu({ ...WPIS, rodzaj: 'slad' }).istnieje, false)
    assert.equal(szkicObiektu({ ...WPIS, rodzaj: 'cmentarz' }).rodzaj, '')
    assert.equal(szkicObiektu({ ...WPIS, nazwa: 'krzyż Kowalskich' }).nazwa, 'krzyż Kowalskich')
})

test('TER-04: kontrola pól – nazwa i rodzaj wymagane, miejscowość z listy, współrzędne w zapisie, zdjęcia tylko z wpisu, bez e-maila', () => {
    const d = { rodzaje: Object.keys(NAZWY_OBIEKTOW), miejsca: ['testowo'] }
    const ok = { nazwa: ' krzyż  przy drodze ', rodzaj: 'krzyz', miejsce: 'testowo', wspolrzedne: '52.21, 22.71', przyblizone: true, istnieje: true, zdjecia: ['zdjecie-b2.jpg', '../../etc/passwd', 'zdjecie-a1.jpg'], autor: 'Jan <jan@example.org>' }
    const p = sprawdzPola(ok, WPIS, d)
    assert.ok(typeof p === 'object')
    assert.equal(p.nazwa, 'krzyż przy drodze')
    assert.deepEqual(p.zdjecia, ['zdjecie-a1.jpg', 'zdjecie-b2.jpg'], 'tylko pliki wpisu, w kolejności wpisu')
    assert.ok(!p.autor.includes('@'))
    assert.equal(sprawdzPola({ ...ok, nazwa: ' ' }, WPIS, d), 'Wpisz nazwę obiektu.')
    assert.equal(sprawdzPola({ ...ok, rodzaj: '' }, WPIS, d), 'Wybierz rodzaj obiektu.')
    assert.match(String(sprawdzPola({ ...ok, miejsce: 'nieznane' }, WPIS, d)), /Nie ma takiej miejscowości/)
    assert.match(String(sprawdzPola({ ...ok, wspolrzedne: 'tu' }, WPIS, d)), /Współrzędne/)
    assert.equal(typeof sprawdzPola(null, WPIS, d), 'string')
})

test('TER-04: identyfikator „obj-…” – zajęty: z miejscowością, potem z numerem', () => {
    assert.equal(slugObiektu('Krzyż przydrożny', 'Testowo', new Set()), 'obj-krzyz-przydrozny')
    assert.equal(slugObiektu('Krzyż przydrożny', 'Testowo', new Set(['obj-krzyz-przydrozny'])), 'obj-krzyz-przydrozny-testowo')
    assert.equal(slugObiektu('Krzyż przydrożny', 'Testowo', new Set(['obj-krzyz-przydrozny', 'obj-krzyz-przydrozny-testowo'])), 'obj-krzyz-przydrozny-testowo-2')
    assert.equal(slugObiektu('!!!', '', new Set()), 'obj-obiekt')
    assert.equal(plikZdjeciaObiektu(0, 'zdjecie-x.JPG'), 'teren-1.jpg')
})

test('TER-04: nagłówek – „tylko ja”, zdjęcia pod /pliki/obiekty/<slug>/, notatka z pochodzeniem; bez „zgłosił(a)” (tylko za zgodą)', () => {
    const p = sprawdzPola(szkicObiektu(WPIS), WPIS, { rodzaje: Object.keys(NAZWY_OBIEKTOW), miejsca: ['testowo'] })
    assert.ok(typeof p === 'object')
    const n = naglowekObiektu(WPIS, p, 'obj-krzyz')
    assert.equal(n.visibility, 'ja')
    assert.deepEqual((n.photos as { image: string }[]).map((x) => x.image), ['/pliki/obiekty/obj-krzyz/teren-1.jpg', '/pliki/obiekty/obj-krzyz/teren-2.jpg'])
    assert.match(String(n.note), /Jan Terenowy, 2026-11-19, położenie z telefonu ±6 m/)
    assert.match(String(n.note), /Żeliwny/)
    assert.equal(n.dateSubmitted, '2026-11-19')
    assert.ok(!('reportedBy' in n))
})

// ---------- trasa: podgląd → zapis → powtórka → cofnij ----------
const wj = (p: string, o: unknown) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(o, null, 1)) }
fs.mkdirSync('content/miejsca', { recursive: true })
fs.writeFileSync('content/miejsca/testowo.mdoc', '---\ntitle: Testowo\ntype: wies\ncoordinates: 52.2100, 22.7100\nvisibility: publiczne\n---\nOpis syntetyczny.\n')
fs.writeFileSync('content/miejsca/ukryta.mdoc', '---\ntitle: Ukryta wieś\ntype: wies\nvisibility: ja\n---\nOpis syntetyczny.\n')
fs.mkdirSync('content/obiekty', { recursive: true })
wj(`content/_teren/miejsca/${WPIS.id}.json`, WPIS)

async function trasa(metoda: 'GET' | 'POST', dane?: unknown) {
    const { GET, POST } = await import('../../app/api/keystatic/teren/miejsca/[id]/obiekt/route')
    const req = new Request(`http://localhost/api/keystatic/teren/miejsca/${WPIS.id}/obiekt`, { method: metoda, headers: { authorization: 'Basic dGVzdDp0ZXN0', 'content-type': 'application/json' }, ...(dane ? { body: JSON.stringify(dane) } : {}) })
    const r = await (metoda === 'GET' ? GET : POST)(req, { params: Promise.resolve({ id: WPIS.id }) })
    return { s: r.status, j: await r.json() }
}

test('TER-04: trasa – podgląd, zapis jako operacja, plik czytelny dla Keystatic, zdjęcia skopiowane, wpis „opracowane”; powtórka bez drugiego obiektu; cofnij', async () => {
    for (const [i, p] of WPIS.zdjecia.entries()) {
        fs.mkdirSync(`pliki-archiwum/teren/${WPIS.id}`, { recursive: true })
        fs.writeFileSync(`pliki-archiwum/teren/${WPIS.id}/${p.plik}`, await sharp({ create: { width: 300, height: 200, channels: 3, background: i ? '#887766' : '#778877' } }).jpeg().toBuffer())
    }
    const g = await trasa('GET')
    assert.equal(g.s, 200)
    assert.equal(g.j.mozna, true)
    assert.equal(g.j.slug, 'obj-krzyz-przydrozny-testowo')
    assert.deepEqual(g.j.miejsca.map((m: { id: string }) => m.id).sort(), ['testowo', 'ukryta'], 'bez kont – poziom „ja” (wszystko)')

    const blad = await trasa('POST', { ...g.j.szkic, rodzaj: '' })
    assert.equal(blad.s, 400)
    assert.equal(fs.readdirSync('content/obiekty').length, 0, 'błędne pola – nic nie zapisano')

    const z = await trasa('POST', { ...g.j.szkic, zdjecia: ['zdjecie-b2.jpg'] })
    assert.equal(z.s, 200, JSON.stringify(z.j))
    assert.equal(z.j.slug, 'obj-krzyz-przydrozny-testowo')
    const tekst = fs.readFileSync(`content/obiekty/${z.j.slug}.mdoc`, 'utf8')
    const nagl = yaml.load(tekst.split('---\n')[1]) as Record<string, unknown>
    assert.equal(nagl.visibility, 'ja')
    assert.equal(nagl.type, 'krzyz')
    assert.equal(nagl.spatial, 'testowo')
    const { createReader } = await import('@keystatic/core/reader')
    const cfg = (await import('../../keystatic.config')).default
    const o = await createReader(KAT, cfg).collections.obiekty.read(z.j.slug) as unknown as { title: string; photos: { image: string }[]; visibility: string }
    assert.equal(o.title, 'krzyż przydrożny – Testowo')
    assert.deepEqual(o.photos.map((x) => x.image), [`/pliki/obiekty/${z.j.slug}/teren-1.jpg`])
    assert.ok(fs.readFileSync(`pliki-archiwum/obiekty/${z.j.slug}/teren-1.jpg`).equals(fs.readFileSync(`pliki-archiwum/teren/${WPIS.id}/zdjecie-b2.jpg`)), 'skopiowane drugie zdjęcie')
    assert.equal(fs.readdirSync(`pliki-archiwum/teren/${WPIS.id}`).length, 2, 'zdjęcia wpisu zostają')
    const wpis = JSON.parse(fs.readFileSync(`content/_teren/miejsca/${WPIS.id}.json`, 'utf8'))
    assert.equal(wpis.stan, 'opracowane')
    assert.equal(wpis.obiekt, z.j.slug)
    assert.equal(wpis.opis, 'obiekt: krzyż przydrożny – Testowo')

    const p2 = await trasa('POST', g.j.szkic)
    assert.equal(p2.s, 200)
    assert.equal(p2.j.juz, true)
    assert.equal(fs.readdirSync('content/obiekty').length, 1, 'powtórka nie tworzy drugiego obiektu')

    const { cofnijOperacje, wczytajManifest } = await import('../panel/operacje')
    assert.equal((await wczytajManifest(z.j.operacja, KAT))?.rodzaj, 'z-terenu')
    await cofnijOperacje(z.j.operacja, { korzen: KAT })
    assert.equal(fs.existsSync(`content/obiekty/${z.j.slug}.mdoc`), false, 'cofnij usuwa obiekt')
    assert.equal(JSON.parse(fs.readFileSync(`content/_teren/miejsca/${WPIS.id}.json`, 'utf8')).stan, 'nowe', 'cofnij przywraca wpis do nowych')

    const z2 = await trasa('POST', { ...g.j.szkic, zdjecia: ['zdjecie-b2.jpg'] })
    assert.equal(z2.s, 200, 'po cofnięciu można utworzyć obiekt ponownie (ta sama kopia zdjęcia)')
    assert.equal(z2.j.slug, z.j.slug)
})

test('TER-04: drugi obiekt z innego wpisu dostaje własny identyfikator; wpis rozstrzygnięty (odrzucony) nie daje obiektu – 409', async () => {
    const id = 'miejsce-test-0002'
    wj(`content/_teren/miejsca/${id}.json`, { ...WPIS, id, zdjecia: [] })
    const { utworzObiektZTerenu } = await import('./obiekt-serwer')
    const w = await utworzObiektZTerenu(id, { ...szkicObiektu({ ...WPIS, id, zdjecia: [] }), nazwa: 'drugi krzyż' }, 'test', 'ja', KAT)
    assert.equal(w.ok, true, 'poprawny zapis przechodzi')
    if (w.ok) assert.equal(w.slug, 'obj-drugi-krzyz')
    const id3 = 'miejsce-test-0003'
    wj(`content/_teren/miejsca/${id3}.json`, { ...WPIS, id: id3, zdjecia: [], stan: 'odrzucone' })
    const w3 = await utworzObiektZTerenu(id3, szkicObiektu(WPIS), 'test', 'ja', KAT)
    assert.equal(w3.ok, false)
    if (!w3.ok) assert.equal(w3.status, 409)
})

test('TER-04: wpis przywrócony do nowych – obiekt istnieje: ten sam; obiekt usunięty ręcznie: można utworzyć nowy', async () => {
    const id = 'miejsce-test-0004'
    wj(`content/_teren/miejsca/${id}.json`, { ...WPIS, id, zdjecia: [], nazwa: 'kapliczka czwarta', stan: 'nowe', obiekt: 'obj-kapliczka-czwarta' })
    const { utworzObiektZTerenu } = await import('./obiekt-serwer')
    const s = szkicObiektu({ ...WPIS, id, zdjecia: [], nazwa: 'kapliczka czwarta' })
    const a = await utworzObiektZTerenu(id, s, 'test', 'ja', KAT)
    assert.ok(a.ok && !a.juz && a.slug === 'obj-kapliczka-czwarta', 'pliku obiektu nie ma – nowy obiekt')
    wj(`content/_teren/miejsca/${id}.json`, { ...JSON.parse(fs.readFileSync(`content/_teren/miejsca/${id}.json`, 'utf8')), stan: 'nowe' })
    const b = await utworzObiektZTerenu(id, s, 'test', 'ja', KAT)
    assert.ok(b.ok && b.juz === true, 'obiekt jest – ten sam, bez drugiego pliku')
    assert.equal(fs.readdirSync('content/obiekty').filter((x) => x.startsWith('obj-kapliczka-czwarta')).length, 1)
})

test.after(() => fs.rmSync(KAT, { recursive: true, force: true }))
