// OPS-07 (P3): kręgi i stopka z danych; domyślnie – stan sprzed P3 (bez zmiany wyglądu do pierwszego zapisu w panelu).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { zbudujKregi, WIERSZE_DOMYSLNE } from './kregi'

test('OPS-07: bez ustawienia – trzy wiersze stopki i dwa kręgi jak przed P3', () => {
    const k = zbudujKregi(null)
    assert.equal(k.wiersze.length, 3)
    assert.deepEqual(k.kregi.map((x) => [x.id, x.miejsca.length]), [['1', 19], ['2', 10]])
    assert.ok(k.kregi[1].miejsca.includes('Krzesk Stary'))
})
test('OPS-07: nowa wieś dopisana w ustawieniu trafia do kręgu i stopki bez zmiany kodu', () => {
    const k = zbudujKregi({ kregi: [{ nazwa: 'okolice', opis: '' }], wiersze: [{ krag: 1, miejsca: ['Testowo', ' ', 'Wola Przykładowa'] }, { krag: null, miejsca: ['Tylko Stopka'] }] })
    assert.deepEqual(k.wiersze, [['Testowo', 'Wola Przykładowa'], ['Tylko Stopka']])
    assert.deepEqual(k.kregi.map((x) => x.miejsca), [['Testowo', 'Wola Przykładowa']])
})
test('OPS-07: nazwy miejscowości tylko w wartościach domyślnych – stopka i strona osób czytają ustawienie', () => {
    for (const f of ['app/components/Footer.tsx', 'app/osoby/page.tsx']) {
        const t = fs.readFileSync(path.join(process.cwd(), f), 'utf8')
        assert.ok(!/WIERSZE_STOPKI|KREGI\b/.test(t), `${f} nie używa list z kodu`)
        assert.ok(/wczytajKregi/.test(t), `${f} czyta ustawienie`)
        for (const n of WIERSZE_DOMYSLNE.flatMap((w) => w.miejsca)) assert.ok(!t.includes(`'${n}'`), `${f}: nazwa „${n}” wpisana w kod`)
    }
})
