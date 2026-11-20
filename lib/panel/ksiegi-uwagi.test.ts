// P7c łatka (20.11): porządek uwag tomów ksiąg. Dane syntetyczne.
import test from 'node:test'
import assert from 'node:assert/strict'
import { maWierszeDoPorzadku, uporzadkujKsiege, uporzadkujTom } from './ksiegi-uwagi'

const ZESPOL = 'https://www.szukajwarchiwach.gov.pl/zespol/-/zespol/99999'
const uwagi = (n: number) => `Tytuł jednostki: Akta urodzin, małżeństw, zgonów\nLiczba skanów: ${n}\nStatus linku: link przekazany przez użytkownika (bez testu dostępności)\nŹródło: ${ZESPOL}`

test('uwagi tomu: wiersze rozpoznane także w jednym ciągu (bez podziału linii)', () => {
    assert.equal(maWierszeDoPorzadku(uwagi(25)), true)
    assert.equal(maWierszeDoPorzadku(uwagi(25).replace(/\n/g, ' ')), true)
    assert.equal(maWierszeDoPorzadku('brak kart 5–8'), false)
    assert.equal(maWierszeDoPorzadku(undefined), false)
})

test('uwagi tomu: tytuł i liczba skanów do pól, status do notatki, powtórzony adres zespołu znika', () => {
    const w = uporzadkujTom({ years: '1826', identifier: '99/1/0/-/1', gaps: uwagi(25) }, new Set([ZESPOL]))
    assert.equal(w.zmieniony, true)
    assert.equal(w.tom.title, 'Akta urodzin, małżeństw, zgonów')
    assert.equal(w.tom.scanCount, 25)
    assert.equal(w.tom.digitization, 'online')
    assert.equal('gaps' in w.tom, false, 'puste uwagi usunięte')
    assert.deepEqual(w.doNotatki, { status: ['link przekazany przez użytkownika (bez testu dostępności)'], zrodla: [] })
})

test('uwagi tomu: własna uwaga zostaje, sprzeczność nie nadpisuje pola', () => {
    const w = uporzadkujTom({ years: '1827', title: 'Inny tytuł', scanCount: 30, gaps: `brak kart 5–8 ${uwagi(33).replace(/\n/g, ' ')}` }, new Set())
    assert.equal(w.tom.title, 'Inny tytuł')
    assert.equal(w.tom.scanCount, 30)
    assert.match(String(w.tom.gaps), /^brak kart 5–8 Tytuł jednostki: Akta urodzin, małżeństw, zgonów Liczba skanów: 33$/)
    assert.equal(w.sprzecznosci.length, 2)
    assert.deepEqual(w.doNotatki.zrodla, [ZESPOL], 'adres spoza księgi idzie do notatki')
})

test('uwagi tomu: liczba 0 przy linku do skanów to sprzeczność', () => {
    const w = uporzadkujTom({ years: '1828', scans: 'https://example.org/s', gaps: 'Liczba skanów: 0' }, new Set())
    assert.equal(w.tom.scanCount, undefined)
    assert.equal(w.tom.gaps, 'Liczba skanów: 0')
})

test('księga: notatka robocza dostaje status i źródło raz, tomy bez wierszy nietknięte', () => {
    const k = { title: 'Testowo – akta', scans: ZESPOL, note: 'notatka', volumes: [
        { years: '1826', gaps: uwagi(25) }, { years: '1827', gaps: uwagi(33) }, { years: '1828', gaps: 'brak kart' },
    ] }
    const w = uporzadkujKsiege(k)!
    assert.equal(w.tomow, 2)
    assert.deepEqual(w.przeniesione, { tytul: 2, skany: 2, status: 2, zrodla: 0 })
    assert.equal(w.ksiega.note, 'notatka\n\nstatus linku tomów (z uwag tomów): link przekazany przez użytkownika (bez testu dostępności)')
    assert.deepEqual((w.ksiega.volumes as unknown[])[2], { years: '1828', gaps: 'brak kart' })
    assert.equal(uporzadkujKsiege({ volumes: [{ years: '1826', gaps: 'brak kart' }] }), null)
    assert.equal(uporzadkujKsiege(w.ksiega), null, 'drugi przebieg nic nie zmienia')
})
