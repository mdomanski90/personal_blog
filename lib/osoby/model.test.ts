import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nazwaOsoby, nazwaOsobyKatalog, nazwiskaPoMezu, formaZenskaNazwiska, formaOwaNazwiska, dopiskiPoMezu, type Drzewo, type Osoba } from './model'

// uwaga właściciela 16.11: w katalogu osób (alfabet po nazwisku) najpierw nazwisko, potem imiona; gdzie indziej „Imię Nazwisko”
test('nazwa w katalogu osób: nazwisko przed imionami; braki bez podwójnych spacji', () => {
    assert.equal(nazwaOsobyKatalog({ imiona: 'Jan Piotr', nazwisko: 'Przykładowski' }), 'Przykładowski Jan Piotr')
    assert.equal(nazwaOsobyKatalog({ imiona: '', nazwisko: 'Przykładowska' }), 'Przykładowska')
    assert.equal(nazwaOsobyKatalog({ imiona: 'Anna', nazwisko: '' }), 'Anna')
    assert.equal(nazwaOsobyKatalog({ imiona: '', nazwisko: '' }), 'bez imienia')
    assert.equal(nazwaOsoby({ imiona: 'Jan', nazwisko: 'Przykładowski' }), 'Jan Przykładowski')
})

// P2 (decyzja 17.11): kobieta znajdowana w wyszukiwarce także po nazwisku męża – bez zdradzania ukrytego męża
const os = (id: string, imiona: string, nazwisko: string, inne: string[] = []) => ({ id, imiona, nazwisko, inneNazwiska: inne, plec: id.startsWith('k') ? 'K' : 'M', zdarzenia: [], wersja: 1 }) as unknown as Osoba
const drzewo = (): Drzewo => ({
    osoby: new Map([os('k1', 'Maria', 'Nowak'), os('m1', 'Jan', 'Kowalski'), os('m2', 'Piotr', 'Zawadzki'), os('m3', 'Adam', 'Nowak'), os('k2', 'Anna', 'Wiśniewska', ['Kowalska'])].map((o) => [o.id, o])),
    rodziny: new Map([
        ['r1', { id: 'r1', maz: 'm1', zona: 'k1', dzieci: [], zdarzenia: [], wersja: 1 }],
        ['r2', { id: 'r2', maz: 'm2', zona: 'k1', dzieci: [], zdarzenia: [], wersja: 1 }],
        ['r3', { id: 'r3', maz: 'm3', zona: 'k1', dzieci: [], zdarzenia: [], wersja: 1 }],
        ['r4', { id: 'r4', maz: 'm1', zona: 'k2', dzieci: [], zdarzenia: [], wersja: 1 }],
        ['r5', { id: 'r5', maz: 'm1', dzieci: [], zdarzenia: [], wersja: 1 }],
    ]),
    zrodla: new Map(),
})

test('nazwisko po mężu: forma żeńska i zapis męża, kilka małżeństw, bez nazwisk już znanych', () => {
    const d = drzewo()
    assert.deepEqual(nazwiskaPoMezu(d, d.osoby.get('k1')!), ['Kowalska', 'Kowalski', 'Zawadzka', 'Zawadzki', 'Nowakowa'], 'Nowak (mąż m3) to nazwisko podstawowe – pomijane; od P3 (SRCH-D-20) dochodzi forma „Nowakowa”')
    assert.deepEqual(nazwiskaPoMezu(d, d.osoby.get('k2')!), ['Kowalski'], '„Kowalska” już jest w innych nazwiskach')
    assert.deepEqual(nazwiskaPoMezu(d, d.osoby.get('m1')!), [], 'mężczyzna bez żony: nic')
})

test('nazwisko po mężu: widoczność męża nie ma znaczenia (decyzja właściciela 17.11) – liczy się tylko, że mąż jest w rodzinie', () => {
    const d = drzewo()
    d.rodziny.delete('r1'); d.rodziny.delete('r2'); d.rodziny.delete('r3')
    assert.deepEqual(nazwiskaPoMezu(d, d.osoby.get('k1')!), [], 'bez rodziny – brak')
    d.rodziny.set('r9', { id: 'r9', maz: 'm2', zona: 'k1', dzieci: [], zdarzenia: [], wersja: 1 })
    assert.deepEqual(nazwiskaPoMezu(d, d.osoby.get('k1')!), ['Zawadzka', 'Zawadzki'])
})

test('forma żeńska nazwiska męża', () => {
    assert.equal(formaZenskaNazwiska('Kowalski'), 'Kowalska')
    assert.equal(formaZenskaNazwiska('Zawadzki'), 'Zawadzka')
    assert.equal(formaZenskaNazwiska('Nowak'), 'Nowak')
    assert.equal(formaZenskaNazwiska('Wójcicki'), 'Wójcicka')
})

// SRCH-D-20 (P3): formy na „-owa” (Nowak → Nowakowa) i dopisek „po mężu” z zapisem męża dosłownie
test('SRCH-D-20: forma na -owa – nazwiska nieprzymiotnikowe zakończone spółgłoską albo -o', () => {
    assert.equal(formaOwaNazwiska('Nowak'), 'Nowakowa')
    assert.equal(formaOwaNazwiska('Kowal'), 'Kowalowa')
    assert.equal(formaOwaNazwiska('Moniuszko'), 'Moniuszkowa')
    assert.equal(formaOwaNazwiska('Kowalski'), null, 'przymiotnikowe – forma żeńska, nie -owa')
    assert.equal(formaOwaNazwiska('Zaręba'), null, 'zakończone na -a – bez zgadywania')
    assert.equal(formaOwaNazwiska('Nowakowa'), null, 'już forma -owa')
})

test('SRCH-D-20: dopiski po mężu – forma żeńska albo -owa i zapis męża dosłownie, także gdy nazwisko żony jest takie samo', () => {
    const d = drzewo()
    assert.deepEqual(dopiskiPoMezu(d, d.osoby.get('k1')!), ['Kowalska (Kowalski)', 'Zawadzka (Zawadzki)', 'Nowakowa (Nowak)'])
    // wyszukiwarka dostaje wszystkie formy (k1 nosi „Nowak” – Nowakowa dochodzi jako nowa forma)
    assert.ok(nazwiskaPoMezu(d, d.osoby.get('k1')!).includes('Nowakowa'))
})

test('KRT-01 (P3): „zgłosił(a)” w karcie osoby – podpis zostaje, adres e-mail odrzucony przy zapisie', async () => {
    const { poprawOsobe } = await import('./model')
    assert.equal(poprawOsobe({ id: 'x', zglosil: ' Jan z Testowa ' }).zglosil, 'Jan z Testowa')
    assert.equal(poprawOsobe({ id: 'x', zglosil: 'jan@example.org' }).zglosil, undefined)
})
