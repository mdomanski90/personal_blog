import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { importujGedcom } from './gedcom'
import { idOsobRecznych, polaczZRecznymi, wczytajDrzewo, zapiszImport, zapiszOsobe, zapiszRodzine } from './dane'
import { poprawOsobe, poprawRodzine, type Drzewo } from './model'

// osoby zmyślone; cały test w katalogu tymczasowym (dane.ts liczy ścieżki od process.cwd())
const kat = fs.mkdtempSync(path.join(os.tmpdir(), 'osoby-reczne-'))
process.chdir(kat)
test.after(() => { process.chdir(os.tmpdir()); fs.rmSync(kat, { recursive: true, force: true }) })

const GED = ['0 HEAD', '0 @I1@ INDI', '1 NAME Jan /Testowy/', '1 SEX M', '1 BIRT', '2 DATE 1860', '0 @I2@ INDI', '1 NAME Anna /Próbna/', '1 SEX F', '0 @F1@ FAM', '1 HUSB @I1@', '1 WIFE @I2@', '0 TRLR'].join('\n')
const osoba = (id: string, reszta = {}) => poprawOsobe({ id, imiona: 'X', nazwisko: 'Y', plec: 'M', zdarzenia: [], zyje: 'nie', widocznosc: 'auto', wersja: 1, ...reszta })

test('import nie używa identyfikatorów osób dodanych w panelu', () => {
    const bez = importujGedcom(GED, []).drzewo
    assert.ok(bez.osoby.has('jan-testowy-1860'))
    const z = importujGedcom(GED, [], new Set(['jan-testowy-1860'])).drzewo
    assert.ok(!z.osoby.has('jan-testowy-1860'))
    assert.ok(z.osoby.has('jan-testowy-1860-2'))
})

test('łączenie: osoby z panelu zostają, rodziny z panelu – gdy osoby istnieją; z GEDCOM – zastąpione', () => {
    const stare: Drzewo = {
        osoby: new Map([
            ['stara-z-gedcom', osoba('stara-z-gedcom', { gedcomId: 'I9' })],
            ['ks-test-1850', osoba('ks-test-1850')],
            ['dziecko-test', osoba('dziecko-test')],
        ]),
        rodziny: new Map([
            ['r1', poprawRodzine({ id: 'r1', maz: 'ks-test-1850', dzieci: ['dziecko-test'], zdarzenia: [], wersja: 1 })],
            ['r2', poprawRodzine({ id: 'r2', maz: 'stara-z-gedcom', dzieci: ['dziecko-test'], zdarzenia: [], wersja: 1 })],
            ['r3', poprawRodzine({ id: 'r3', maz: 'stara-z-gedcom', zona: 'x', dzieci: [], zdarzenia: [], gedcomId: 'F9', wersja: 1 })],
        ]),
        zrodla: new Map(),
    }
    const nowe = importujGedcom(GED, [], idOsobRecznych(stare)).drzewo
    const { drzewo, zachowane } = polaczZRecznymi(stare, nowe)
    assert.deepEqual(zachowane, { osoby: 2, rodziny: 1, rodzinyPominiete: 1 })
    assert.ok(drzewo.osoby.has('ks-test-1850') && drzewo.osoby.has('dziecko-test'))
    assert.ok(!drzewo.osoby.has('stara-z-gedcom'), 'osoba z poprzedniego GEDCOM zastąpiona nowym importem')
    const ks = [...drzewo.rodziny.values()].find((f) => f.maz === 'ks-test-1850')!
    assert.notEqual(ks.id, 'r1', 'zajęty identyfikator rodziny (r1 z GEDCOM) – nowy')
    assert.deepEqual(ks.dzieci, ['dziecko-test'])
    assert.equal(drzewo.rodziny.get('r1')!.gedcomId, 'F1')
})

test('ponowny import zapisuje drzewo z GEDCOM i zachowuje kartę utworzoną z grobu; kolizja przerywa bez zapisu', async () => {
    await zapiszImport(importujGedcom(GED, []).drzewo, { data: '2026-11-01', plik: 'a.ged', podsumowanie: { osoby: 2, rodziny: 1, zdarzenia: 1, zrodla: 0, cytaty: 0, multimedia: 0 } })
    await zapiszOsobe(osoba('maria-zgrobu-1890', { imiona: 'Maria', nazwisko: 'Zgrobu', uwagi: ['karta utworzona z planu'] }))
    await zapiszRodzine(poprawRodzine({ id: 'r7', zona: 'maria-zgrobu-1890', maz: 'jan-testowy-1860', dzieci: [], zdarzenia: [], wersja: 0 }))
    const przed = await wczytajDrzewo()
    const zach = await zapiszImport(importujGedcom(GED, [], idOsobRecznych(przed)).drzewo, { data: '2026-11-16', plik: 'b.ged', podsumowanie: { osoby: 2, rodziny: 1, zdarzenia: 1, zrodla: 0, cytaty: 0, multimedia: 0 } })
    assert.deepEqual(zach, { osoby: 1, rodziny: 1, rodzinyPominiete: 0 })
    const po = await wczytajDrzewo()
    assert.equal(po.osoby.get('maria-zgrobu-1890')?.imiona, 'Maria')
    assert.ok(po.osoby.has('jan-testowy-1860') && po.osoby.has('anna-probna'))
    assert.equal(po.rodziny.get('r7')?.maz, 'jan-testowy-1860', 'rodzina dopisana w panelu łączy kartę z osobą z GEDCOM')
    assert.ok(fs.readdirSync(path.join(kat, 'content', 'osoby', '_kosz')).some((x) => x.startsWith('przed-importem-')), 'kopia sprzed importu')
    // import bez zarezerwowanych identyfikatorów kolidowałby z kartą z panelu → błąd, drzewo bez zmian
    const kolizja = importujGedcom(['0 HEAD', '0 @I5@ INDI', '1 NAME Maria /Zgrobu/', '1 BIRT', '2 DATE 1890', '0 TRLR'].join('\n'), []).drzewo
    await assert.rejects(zapiszImport(kolizja, { data: 'x', plik: 'c.ged', podsumowanie: { osoby: 1, rodziny: 0, zdarzenia: 0, zrodla: 0, cytaty: 0, multimedia: 0 } }), /przerwano/)
    assert.ok((await wczytajDrzewo()).osoby.has('anna-probna'), 'nic nie przeniesiono do kosza')
})
