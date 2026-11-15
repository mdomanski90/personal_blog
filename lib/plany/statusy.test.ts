import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { dlaCzytelnika, popraw, type Element, type Plan } from './model'
import { katalog, USTAWIENIA_DOMYSLNE } from './typy'
import { etapElementu, migrujElement, migrujPlan, poZmianieDanych, raportStatusow } from './statusy'
import { kopia } from './edycja'

const typy = katalog()
const grob = (id: string, reszta: Partial<Element> = {}): Element => ({ id, typ: 'grob', g: { k: 'r', x: 0, y: 0, w: 10, h: 20, a: 0 }, ...reszta })

// plan syntetyczny – przekrój przypadków z audytu (ok bez danych, ok z danymi, auto, przyp, bez statusu)
const syntetyczny = (): Plan => popraw({
    slug: 'test-statusy', wersja: 7,
    elementy: [
        grob('a', { weryfikacja: 'ok' }),
        grob('b', { weryfikacja: 'ok', napis: 'Ś.P. Jan Testowy 1880' }),
        grob('c', { weryfikacja: 'ok', zdjecia: [{ plik: 'z.jpg' }] }),
        grob('d', { weryfikacja: 'auto' }),
        grob('e', { weryfikacja: 'przyp', osoby: [{ nazwa: 'Anna Próbna' }] }),
        grob('f'),
        grob('g', { zrodla: 'księga zgonów 1901, akt 3' }),
        { id: 'k', typ: 'kwatera', g: { k: 'w', p: [[0, 0], [1, 0], [1, 1]] }, nazwa: 'A' },
    ],
} as Plan)

test('migracja statusów: ok bez danych → narysowany, z danymi → opracowany, auto/przyp → osobne pole położenia', () => {
    const m = migrujPlan(syntetyczny(), typy)
    const e = new Map(m.elementy.map((x) => [x.id, x]))
    assert.deepEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => e.get(id)!.etap), ['narysowany', 'opracowany', 'opracowany', 'narysowany', 'opracowany', 'narysowany', 'opracowany'])
    assert.equal(e.get('d')!.polozenie, 'auto')
    assert.equal(e.get('e')!.polozenie, 'przyp')
    assert.equal(e.get('a')!.polozenie, undefined)
    for (const x of m.elementy) assert.equal(x.weryfikacja, undefined)
    assert.equal(e.get('k')!.etap, undefined, 'kwatera nie dostaje statusu')
    assert.ok(!m.elementy.some((x) => x.etap === 'sprawdzony'), 'migracja nigdy nie nadaje „sprawdzony”')
})

test('migracja jest powtarzalna i raport liczy przed/po', () => {
    const p = syntetyczny()
    const r = raportStatusow(p, typy)
    assert.equal(r.grobow, 7)
    assert.deepEqual(r.przed, { ok: 3, auto: 1, przyp: 1, brak: 2, juz: 0 })
    assert.deepEqual(r.po, { narysowany: 3, opracowany: 4, sprawdzony: 0 })
    assert.equal(r.zmienione, 7)
    assert.equal(r.przejscia['ok → narysowany'], 1)
    const m = migrujPlan(p, typy)
    assert.equal(migrujPlan(m, typy), m, 'druga migracja zwraca ten sam obiekt')
    assert.equal(raportStatusow(m, typy).zmienione, 0)
    assert.deepEqual(raportStatusow(m, typy).po, r.po, 'wyświetlany etap przed migracją = etap po migracji')
})

test('zapisany etap nie jest zmieniany przez migrację', () => {
    const e = grob('x', { etap: 'sprawdzony' })
    assert.equal(migrujElement(e, typy.get('grob')), e)
    assert.equal(etapElementu(grob('y', { etap: 'sprawdzony', napis: 'x' })), 'sprawdzony')
})

test('edycja: wpisanie danych w grobie „narysowanym” → „opracowany”, nigdy samo „sprawdzony”', () => {
    const t = typy.get('grob')
    assert.deepEqual(poZmianieDanych(grob('a', { etap: 'narysowany' }), { napis: 'Jan' }, t), { napis: 'Jan', etap: 'opracowany' })
    assert.deepEqual(poZmianieDanych(grob('a', { etap: 'opracowany' }), { napis: 'Jan' }, t), { napis: 'Jan' })
    assert.deepEqual(poZmianieDanych(grob('a', { etap: 'sprawdzony' }), { napis: '' }, t), { napis: '' })
    // dawny zapis: zmiana etapu usuwa stare pole i przenosi pewność położenia
    assert.deepEqual(poZmianieDanych(grob('a', { weryfikacja: 'przyp' }), { etap: 'sprawdzony' }, t), { etap: 'sprawdzony', weryfikacja: undefined, polozenie: 'przyp' })
    assert.deepEqual(poZmianieDanych(grob('a', { weryfikacja: 'ok' }), { napis: 'Jan' }, t), { napis: 'Jan', etap: 'opracowany', weryfikacja: undefined })
})

test('kopia grobu sprawdzonego = narysowany (zasada 1.9)', () => {
    const k = kopia(grob('a', { etap: 'sprawdzony', zrodlaStan: 'potwierdzona', polozenie: 'przyp', napis: 'x' }), 5, 0)
    assert.equal(k.etap, undefined)
    assert.equal(k.zrodlaStan, undefined)
    assert.equal(etapElementu(k), 'narysowany')
})

test('czytelnik nie dostaje statusów pracy; GPS zdjęć tylko dla zalogowanych', () => {
    const plan = popraw({ slug: 'p', elementy: [grob('a', { napis: 'Ś.P. 1880', etap: 'sprawdzony', zrodlaStan: 'czesciowa', polozenie: 'auto', weryfikacja: 'ok', zdjecia: [{ plik: 'z.jpg', lat: 52.2, lon: 22.9, data: '2026-05-01' }] })] } as Plan)
    const pub = dlaCzytelnika(plan, 'publiczne', USTAWIENIA_DOMYSLNE).elementy[0]
    for (const k of ['etap', 'zrodlaStan', 'polozenie', 'weryfikacja'] as const) assert.equal(pub[k], undefined, k)
    assert.deepEqual(pub.zdjecia, [{ plik: 'z.jpg', data: '2026-05-01' }])
    assert.equal(plan.elementy[0].zdjecia![0].lat, 52.2, 'oryginał bez zmian')
    const bliscy = dlaCzytelnika(plan, 'bliscy', USTAWIENIA_DOMYSLNE).elementy[0]
    assert.equal(bliscy.zdjecia![0].lat, 52.2)
    assert.equal(bliscy.etap, undefined)
})

test('polecenie migracji: bez --zapisz nic nie zmienia; z --zapisz kopia w koszu, wersja +1, ponownie – bez zmian', () => {
    const kat = fs.mkdtempSync(path.join(os.tmpdir(), 'statusy-'))
    try {
        const dir = path.join(kat, 'content', 'plany')
        fs.mkdirSync(dir, { recursive: true })
        const plik = path.join(dir, 'test-statusy.json')
        fs.writeFileSync(plik, JSON.stringify(syntetyczny(), null, 1))
        const przed = fs.readFileSync(plik, 'utf8')
        const tsx = path.resolve('node_modules', '.bin', 'tsx'), skrypt = path.resolve('scripts', 'plany-statusy.ts')
        const raport = execFileSync(tsx, [skrypt], { cwd: kat, encoding: 'utf8' })
        assert.match(raport, /po: {4}narysowany 3 · opracowany 4 · sprawdzony 0/)
        assert.equal(fs.readFileSync(plik, 'utf8'), przed, 'raport niczego nie zapisuje')
        execFileSync(tsx, [skrypt, '--zapisz'], { cwd: kat, encoding: 'utf8' })
        const po = JSON.parse(fs.readFileSync(plik, 'utf8')) as Plan
        assert.equal(po.wersja, 8)
        assert.equal(po.elementy.filter((e) => e.weryfikacja).length, 0)
        const kosz = fs.readdirSync(path.join(dir, '_kosz'))
        assert.equal(kosz.length, 1)
        assert.equal(fs.readFileSync(path.join(dir, '_kosz', kosz[0]), 'utf8'), przed, 'oryginał w koszu')
        const drugi = execFileSync(tsx, [skrypt, '--zapisz'], { cwd: kat, encoding: 'utf8' })
        assert.match(drugi, /zmieniono 0 plan/)
        assert.equal((JSON.parse(fs.readFileSync(plik, 'utf8')) as Plan).wersja, 8)
    } finally { fs.rmSync(kat, { recursive: true, force: true }) }
})
