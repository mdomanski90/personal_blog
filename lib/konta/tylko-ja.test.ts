// P7c (KON-08): pozycje „tylko ja” w panelu tylko dla konta z rolą administratora. Czysta logika + trasy wywoływane bezpośrednio
// w katalogu tymczasowym z włączonymi kontami (sesje podpisane testowo). Dane wyłącznie syntetyczne.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { sciezkiPozycji, ukrytaSciezka, ukrytyAdresPanelu, widocznoscPliku, zbudujUkryte, zapomnijUkryte } from './tylko-ja'
import { planBezTylkoJa, plikiUkrytychElementow, scalZUkrytymi, BLAD_TYLKO_JA } from '../plany/tylko-ja'
import { ciasteczkoSesji } from './sesja'
import type { Plan } from '../plany/model'

// ---------- czysta logika ----------
test('KON-08: widoczność z pliku – .mdoc (nagłówek), .yaml, .json; bez pola / nieczytelny – null', () => {
    assert.equal(widocznoscPliku('a.mdoc', '---\ntitle: X\nvisibility: ja\n---\nTreść visibility: publiczne\n'), 'ja')
    assert.equal(widocznoscPliku('a.mdoc', '---\ntitle: X\n---\nvisibility: ja\n'), null, 'tylko nagłówek, nie treść')
    assert.equal(widocznoscPliku('a.yaml', 'title: X\nvisibility: bliscy\n'), 'bliscy')
    assert.equal(widocznoscPliku('p.json', '{"widocznosc":"ja"}'), 'ja')
    assert.equal(widocznoscPliku('p.json', '[1,2]'), null)
    assert.equal(widocznoscPliku('a.mdoc', '---\n: [\n---\n'), null)
})

test('KON-08: ścieżki pozycji – plik, katalog treści, zdjęcia, strony skanów materiału; adresy panelu', () => {
    const u = zbudujUkryte([{ kolekcja: 'materialy', slug: 'nagranie', plik: 'nagranie.mdoc' }, { kolekcja: 'plany', slug: 'cm', plik: 'cm.json' }])
    for (const s of ['content/materialy/nagranie.mdoc', 'materialy/nagranie.mdoc', 'pliki-archiwum/strony/nagranie/s1.jpg', 'pliki-archiwum/materialy/nagranie/plik.mp3', 'content/materialy/nagranie', 'pliki-archiwum/plany/cm/podklad.jpg'])
        assert.ok(ukrytaSciezka(s, u), s)
    for (const s of ['content/materialy/nagranie-2.mdoc', 'content/materialy/nagranie.mdoc.tmp', 'pliki-archiwum/strony/nagranie-2/s1.jpg', 'content/tematy/nagranie.mdoc'])
        assert.ok(!ukrytaSciezka(s, u), s)
    assert.ok(ukrytyAdresPanelu('/keystatic/collection/materialy/item/nagranie', u))
    assert.ok(ukrytyAdresPanelu('/keystatic/plany/cm?el=g1', u))
    assert.ok(!ukrytyAdresPanelu('/keystatic/collection/materialy/item/inne', u))
    assert.deepEqual(sciezkiPozycji('tematy', 't', 't.mdoc'), ['content/tematy/t.mdoc', 'content/tematy/t/', 'pliki-archiwum/tematy/t/', 'public/images/tematy/t/'])
})

const el = (id: string, w?: string) => ({ id, typ: 'grob', g: { k: 'r', x: 0, y: 0, w: 1, h: 1, a: 0 }, ...(w ? { widocznosc: w } : {}), ...(id === 'g2' ? { zdjecia: [{ plik: 'zdjecie-g2.jpg' }] } : {}) }) as unknown as Plan['elementy'][number]
test('KON-08: plan – elementy „tylko ja” wycięte z odczytu, przy zapisie wracają na swoje miejsce; „tylko ja” ustawia tylko administrator', () => {
    const stary = { widocznosc: 'bliscy' as const, elementy: [el('g1'), el('g2', 'ja'), el('g3'), el('g4', 'ja')] }
    assert.deepEqual(planBezTylkoJa(stary).elementy.map((e) => e.id), ['g1', 'g3'])
    assert.deepEqual([...plikiUkrytychElementow(stary)], ['zdjecie-g2.jpg'])
    const nowy = { widocznosc: 'bliscy' as const, elementy: [el('g1'), el('g3'), el('g5')] }
    const s = scalZUkrytymi(nowy, stary)
    assert.ok(typeof s === 'object')
    assert.deepEqual(s.elementy.map((e) => e.id), ['g1', 'g2', 'g3', 'g4', 'g5'], 'ukryte na dawnych miejscach, nowe zostają')
    assert.equal(scalZUkrytymi({ ...nowy, elementy: [...nowy.elementy, el('g6', 'ja')] }, stary), BLAD_TYLKO_JA)
    assert.equal(scalZUkrytymi({ ...nowy, widocznosc: 'ja' as const }, stary), BLAD_TYLKO_JA)
    assert.equal(scalZUkrytymi(nowy, { ...stary, widocznosc: 'ja' }), 'Nie ma takiego planu.')
    // element o id ukrytego przysłany z edytora (zgadnięty) nie nadpisuje ukrytego
    const z = scalZUkrytymi({ ...nowy, elementy: [el('g1'), { ...el('g2'), napis: 'podmiana' } as Plan['elementy'][number]] }, stary)
    assert.ok(typeof z === 'object' && !('napis' in z.elementy.find((e) => e.id === 'g2')!))
})

// ---------- trasy: redaktor i podgląd bez „tylko ja”, administrator wszystko ----------
const KAT = fs.mkdtempSync(path.join(os.tmpdir(), 'p7c-kon08-'))
process.chdir(KAT)
const SEKRET = 'sekret-sesji-do-testu-p7c-0123456789'
Object.assign(process.env, { KONTA_ADRES: 'https://konto.example.test', KONTA_KLIENT_ID: 'klient', KONTA_KLIENT_SEKRET: 'sekret', SEKRET_SESJI: SEKRET, KONTA_STRONA: 'http://localhost' })
delete process.env.PANEL_TYLKO_KONTA
const w = (p: string, t: string) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t) }
const wj = (p: string, o: unknown) => w(p, JSON.stringify(o, null, 1))
const konto = (id: string, role: string[]) => ({ id, imie: id, role, dodane: [], odebrane: [], zakres: { kregi: [], miejsca: [] }, stan: 'aktywny', utworzono: '2026-11-20T00:00:00.000Z' })
wj('content/_panel/konta.json', { wersja: 1, konta: [konto('adm', ['redaktor', 'administrator']), konto('red', ['redaktor']), konto('pod', ['podglad'])] })
w('content/tematy/temat-jawny.mdoc', '---\ntitle: Temat jawny syntetyczny\nvisibility: publiczne\n---\nOpis.\n')
w('content/tematy/temat-ukryty.mdoc', '---\ntitle: TEMAT-UKRYTY-SYNTETYCZNY\nvisibility: ja\n---\nOpis ukryty.\n')
w('content/materialy/nagranie-ukryte.mdoc', '---\ntitle: NAGRANIE-UKRYTE-SYNTETYCZNE\ntype: nagranie\nvisibility: ja\n---\nOpis.\n')
w('content/miejsca/testowo.mdoc', '---\ntitle: Testowo\ntype: wies\nvisibility: publiczne\n---\nOpis.\n')
const plan = (slug: string, tytul: string, widocznosc: string, elementy: unknown[]) => ({ slug, tytul, widocznosc, szer: 100, wys: 60, skala: null, obrot: 0, geo: [], podklady: [], warstwy: {}, elementy, wersja: 1, zmieniono: '2026-11-01T10:00:00.000Z' })
wj('content/plany/plan-ukryty.json', plan('plan-ukryty', 'PLAN-UKRYTY-SYNTETYCZNY', 'ja', [el('g1')]))
wj('content/plany/plan-jawny.json', plan('plan-jawny', 'Plan jawny syntetyczny', 'bliscy', [el('g1'), { ...el('g2', 'ja'), napis: 'NAPIS-UKRYTY-SYNTETYCZNY' }, el('g3')]))
wj('content/plany/_ustawienia.json', { progLat: 30, ukryteTypy: [], wlasneTypy: [] })
wj('content/osoby/osoba-jawna.json', { id: 'osoba-jawna', imiona: 'Jan', nazwisko: 'Jawny', plec: 'M', zdarzenia: [{ id: 'z1', typ: 'urodzenie', data: '1850' }], zyje: 'nie', widocznosc: 'publiczne', wersja: 1 })
wj('content/osoby/osoba-ukryta.json', { id: 'osoba-ukryta', imiona: 'Anna', nazwisko: 'UKRYTA-SYNTETYCZNA', plec: 'K', zdarzenia: [{ id: 'z1', typ: 'urodzenie', data: '1850' }], zyje: 'nie', widocznosc: 'ja', wersja: 1 })
for (const d of ['content/osoby/_rodziny', 'content/_operacje', 'content/_historia', 'content/_kosz']) fs.mkdirSync(d, { recursive: true })
wj('content/osoby/_zrodla.json', [])

const t = Math.floor(Date.now() / 1000) - 5
const cookie = (id: string) => `odp_konto=${ciasteczkoSesji(SEKRET, { id, wydano: t })}`
const req = (kto: string, adres: string, init: RequestInit = {}) => new Request(`http://localhost${adres}`, { ...init, headers: { cookie: cookie(kto), 'sec-fetch-site': 'same-origin', 'no-cors': '1', ...(init.body ? { 'content-type': 'application/json' } : {}), ...(init.headers ?? {}) } })
const tekst = async (r: Response) => r.text()
const UKRYTE = ['TEMAT-UKRYTY', 'NAGRANIE-UKRYTE', 'PLAN-UKRYTY', 'NAPIS-UKRYTY', 'UKRYTA-SYNTETYCZNA', 'temat-ukryty', 'nagranie-ukryte', 'plan-ukryty', 'osoba-ukryta']
const bezUkrytych = (s: string, opis: string) => { for (const x of UKRYTE) assert.ok(!s.includes(x), `${opis}: znaleziono „${x}”`) }

test('KON-08: Keystatic – lista plików i treść: redaktor i podgląd bez „tylko ja”, administrator wszystko', async () => {
    zapomnijUkryte()
    const { GET } = await import('../../app/api/keystatic/[[...params]]/route')
    for (const kto of ['red', 'pod']) {
        const r = await GET(req(kto, '/api/keystatic/tree'))
        assert.equal(r.status, 200, kto)
        const s = await tekst(r)
        assert.ok(s.includes('content/tematy/temat-jawny.mdoc'), `${kto}: jawny temat jest`)
        bezUkrytych(s, `${kto} tree`)
    }
    const a = await tekst(await GET(req('adm', '/api/keystatic/tree')))
    assert.ok(a.includes('temat-ukryty') && a.includes('nagranie-ukryte'), 'administrator widzi wszystko')
    const sha = (JSON.parse(a) as { path: string; sha: string }[]).find((x) => x.path === 'content/tematy/temat-ukryty.mdoc')!.sha
    assert.equal((await GET(req('red', `/api/keystatic/blob/${sha}/content/tematy/temat-ukryty.mdoc`))).status, 404)
    assert.equal((await GET(req('adm', `/api/keystatic/blob/${sha}/content/tematy/temat-ukryty.mdoc`))).status, 200)
})

test('KON-08: plany – lista, plan „tylko ja” (404), elementy „tylko ja” wycięte; zapis redaktora zachowuje ukryty element', async () => {
    const lista = await import('../../app/api/keystatic/plany/route')
    const s = await tekst(await lista.GET(req('red', '/api/keystatic/plany')))
    assert.ok(s.includes('plan-jawny')); bezUkrytych(s, 'lista planów')
    assert.ok((await tekst(await lista.GET(req('adm', '/api/keystatic/plany')))).includes('plan-ukryty'))
    const jeden = await import('../../app/api/keystatic/plany/[slug]/route')
    const P = (slug: string) => ({ params: Promise.resolve({ slug }) })
    assert.equal((await jeden.GET(req('pod', '/api/keystatic/plany/plan-ukryty'), P('plan-ukryty'))).status, 404)
    const pj = await (await jeden.GET(req('red', '/api/keystatic/plany/plan-jawny'), P('plan-jawny'))).json()
    assert.deepEqual(pj.elementy.map((e: { id: string }) => e.id), ['g1', 'g3'])
    const zapis = await jeden.PUT(req('red', '/api/keystatic/plany/plan-jawny', { method: 'PUT', body: JSON.stringify({ ...pj, tytul: 'Plan jawny – zmiana redaktora' }) }), P('plan-jawny'))
    assert.equal(zapis.status, 200, await zapis.clone().text())
    const plik = JSON.parse(fs.readFileSync('content/plany/plan-jawny.json', 'utf8'))
    assert.equal(plik.tytul, 'Plan jawny – zmiana redaktora')
    assert.deepEqual(plik.elementy.map((e: { id: string }) => e.id), ['g1', 'g2', 'g3'], 'ukryty element nie skasowany')
    assert.equal(plik.elementy[1].napis, 'NAPIS-UKRYTY-SYNTETYCZNY')
    const zle = await jeden.PUT(req('red', '/api/keystatic/plany/plan-jawny', { method: 'PUT', body: JSON.stringify({ ...pj, wersja: plik.wersja, widocznosc: 'ja' }) }), P('plan-jawny'))
    assert.equal(zle.status, 403)
    const nowy = await lista.POST(req('red', '/api/keystatic/plany', { method: 'POST', body: JSON.stringify({ akcja: 'nowy', slug: 'plan-redaktora', tytul: 'Plan redaktora' }) }))
    assert.equal((await nowy.json()).widocznosc, 'bliscy', 'nowy plan redaktora – „dla bliskich”, nie „tylko ja”')
})

test('KON-08: osoby – lista bez „tylko ja”, karta „tylko ja” 404; redaktor nie ustawia „tylko ja”', async () => {
    const lista = await import('../../app/api/keystatic/osoby/route')
    const s = await tekst(await lista.GET(req('red', '/api/keystatic/osoby')))
    assert.ok(s.includes('osoba-jawna')); bezUkrytych(s, 'lista osób')
    assert.ok((await tekst(await lista.GET(req('adm', '/api/keystatic/osoby')))).includes('osoba-ukryta'))
    const karta = await import('../../app/api/keystatic/osoby/[id]/route')
    const P = (id: string) => ({ params: Promise.resolve({ id }) })
    assert.equal((await karta.GET(req('red', '/api/keystatic/osoby/osoba-ukryta'), P('osoba-ukryta'))).status, 404)
    const kj = await karta.GET(req('red', '/api/keystatic/osoby/osoba-jawna'), P('osoba-jawna'))
    assert.equal(kj.status, 200); bezUkrytych(await kj.clone().text(), 'karta osoby (lista „wszystkie”)')
    const j = (await kj.json()).osoba
    assert.equal((await karta.PUT(req('red', '/api/keystatic/osoby/osoba-jawna', { method: 'PUT', body: JSON.stringify({ osoba: { ...j, widocznosc: 'ja' } }) }), P('osoba-jawna'))).status, 403)
})

test('KON-08: pulpit, wyszukiwarka Ctrl+K, lista panelu, materiały – bez „tylko ja” dla redaktora i podglądu', async () => {
    const panel = await import('../../app/api/keystatic/panel/route')
    for (const kto of ['red', 'pod']) {
        bezUkrytych(await tekst(await panel.GET(req(kto, '/api/keystatic/panel?czesc=indeks'))), `${kto} indeks`)
        bezUkrytych(await tekst(await panel.GET(req(kto, '/api/keystatic/panel'))), `${kto} pulpit`)
    }
    const ia = await tekst(await panel.GET(req('adm', '/api/keystatic/panel?czesc=indeks')))
    assert.ok(ia.includes('TEMAT-UKRYTY') && ia.includes('PLAN-UKRYTY') && ia.includes('UKRYTA-SYNTETYCZNA'), 'administrator: indeks z „tylko ja”')
    const lista = await import('../../app/api/keystatic/panel/lista/route')
    const lt = await tekst(await lista.GET(req('pod', '/api/keystatic/panel/lista?kolekcja=tematy')))
    assert.ok(lt.includes('temat-jawny')); bezUkrytych(lt, 'lista tematów')
    const mat = await import('../../app/api/keystatic/materialy/route')
    bezUkrytych(await tekst(await mat.GET(req('red', '/api/keystatic/materialy'))), 'materiały')
    assert.ok((await tekst(await mat.GET(req('adm', '/api/keystatic/materialy')))).includes('nagranie-ukryte'))
})

test.after(() => fs.rmSync(KAT, { recursive: true, force: true }))
