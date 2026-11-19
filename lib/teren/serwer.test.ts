// P7b-2 (TER-06): powtórzona wysyłka z kolejki telefonu nie może zostawiać plików bez właściciela (raport P7b-2, p. 2).
// Trasa wywoływana bezpośrednio, w katalogu tymczasowym, bez kont (pełny dostęp jak przed P7a). Dane syntetyczne.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

const KAT = fs.mkdtempSync(path.join(os.tmpdir(), 'p7b2-'))
process.chdir(KAT)
for (const k of ['KONTA_ADRES', 'KONTA_STRONA', 'PANEL_TYLKO_KONTA']) delete process.env[k]
fs.mkdirSync('content/plany', { recursive: true })
const PLAN = { tytul: 'cmentarz w Testowie', szer: 100, wys: 60, geo: [], podklady: [], warstwy: {}, wersja: 1, elementy: [{ id: 'g1', typ: 'grob', g: { k: 'r', x: 10, y: 10, w: 10, h: 20, a: 0 } }] }
fs.writeFileSync('content/plany/cmentarz-testowo.json', JSON.stringify(PLAN))
const pliki = (d: string) => (fs.existsSync(d) ? fs.readdirSync(d).filter((x) => !x.startsWith('.')) : [])

async function wyslijZdjecie(id: string, nazwa = 'IMG_0001.jpg') {
    const { POST } = await import('../../app/api/keystatic/plany/[slug]/teren/route')
    const jpg = await sharp({ create: { width: 300, height: 200, channels: 3, background: '#778877' } }).jpeg().toBuffer()
    const fd = new FormData()
    fd.append('plik', new File([new Uint8Array(jpg)], nazwa, { type: 'image/jpeg' }))
    for (const [k, v] of Object.entries({ id, grob: 'g1', lat: '52.21', lon: '22.71', data: '2026-11-19T10:00:00' })) fd.append(k, v)
    const r = await POST(new Request('http://localhost/api/keystatic/plany/cmentarz-testowo/teren', { method: 'POST', body: fd, headers: { authorization: 'Basic dGVzdDp0ZXN0' } }), { params: Promise.resolve({ slug: 'cmentarz-testowo' }) })
    return { s: r.status, j: await r.json() }
}

test('to samo zdjęcie wysłane dwa razy (zgubiona odpowiedź): jeden plik, jedno zdjęcie w planie', async () => {
    const a = await wyslijZdjecie('kolejka-zdjecie-0001')
    assert.equal(a.s, 200)
    const b = await wyslijZdjecie('kolejka-zdjecie-0001')
    assert.equal(b.s, 200)
    assert.equal(b.j.powtorzona, true)
    assert.equal(b.j.wpis.plik, a.j.wpis.plik, 'powtórka zwraca pierwszy plik')
    assert.deepEqual(pliki(path.join(KAT, 'pliki-archiwum/plany/cmentarz-testowo')), [a.j.wpis.plik], 'na dysku tylko pierwszy plik')
    const p = JSON.parse(fs.readFileSync('content/plany/cmentarz-testowo.json', 'utf8'))
    assert.equal(p.elementy[0].zdjecia.length, 1)
})

test('dwie wysyłki tej samej czynności naraz: drugi plik trafia do kosza, nie zostaje obok', async () => {
    const [a, b] = await Promise.all([wyslijZdjecie('kolejka-zdjecie-0002'), wyslijZdjecie('kolejka-zdjecie-0002')])
    assert.equal(a.s, 200); assert.equal(b.s, 200)
    assert.equal(a.j.wpis.plik, b.j.wpis.plik)
    const naDysku = pliki(path.join(KAT, 'pliki-archiwum/plany/cmentarz-testowo'))
    const p = JSON.parse(fs.readFileSync('content/plany/cmentarz-testowo.json', 'utf8'))
    assert.deepEqual(naDysku.sort(), p.elementy[0].zdjecia.map((z: { plik: string }) => z.plik).sort(), 'na dysku tylko pliki użyte w planie')
})

test('nowe miejsce po przerwanej wysyłce (zdjęcia zapisane, wpisu brak): powtórka nie zostawia starych plików', async () => {
    const { POST } = await import('../../app/api/keystatic/teren/miejsca/route')
    const id = 'kolejka-miejsce-0001', kat = path.join(KAT, 'pliki-archiwum/teren', id)
    fs.mkdirSync(kat, { recursive: true }); fs.writeFileSync(path.join(kat, 'zdjecie-1-abcdef.jpg'), 'resztka po przerwanej wysyłce')
    const jpg = await sharp({ create: { width: 200, height: 100, channels: 3, background: '#887766' } }).jpeg().toBuffer()
    const fd = new FormData()
    for (const [k, v] of Object.entries({ id, rodzaj: 'krzyz', nazwa: 'krzyż testowy', notatka: '', lat: '52.21', lon: '22.71', dokl: '6' })) fd.append(k, v)
    fd.append('zdjecie', new File([new Uint8Array(jpg)], 'IMG_0002.jpg', { type: 'image/jpeg' }))
    const r = await POST(new Request('http://localhost/api/keystatic/teren/miejsca', { method: 'POST', body: fd, headers: { authorization: 'Basic dGVzdDp0ZXN0' } }))
    const j = await r.json()
    assert.equal(r.status, 200)
    assert.deepEqual(pliki(kat), j.miejsce.zdjecia.map((z: { plik: string }) => z.plik))
})

test.after(() => { process.chdir(os.tmpdir()); fs.rmSync(KAT, { recursive: true, force: true }) })
