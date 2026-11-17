import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DLUGOSC_ZAPOWIEDZI, PROG_WSTEPU_MINIATURY, adresMiniatury, czyKrotkaZapowiedz, miniaturaWBoku } from './zapowiedzi'

// uwagi właściciela 16.11 (wariant B): tekst w kolumnach z limitem wierszy; krótka zapowiedź (do ok. jednej kolumny) bez kolumn
test('zapowiedź: długość wypełnia kolumny, krótka do ok. jednej kolumny', () => {
    assert.ok(DLUGOSC_ZAPOWIEDZI.zObrazem >= 2 * 7 * 37, 'z miniaturą: 2 kolumny × 7 wierszy')
    assert.ok(DLUGOSC_ZAPOWIEDZI.bezObrazu >= 3 * 9 * 33, 'bez miniatury: 3 kolumny × 9 wierszy')
    assert.equal(czyKrotkaZapowiedz('Krótka zapowiedź jednego zdania.', true), true)
    assert.equal(czyKrotkaZapowiedz('x'.repeat(400), true), false)
    assert.equal(czyKrotkaZapowiedz('x'.repeat(220), false), true)
    assert.equal(czyKrotkaZapowiedz('x'.repeat(250), true), false)
    assert.equal(czyKrotkaZapowiedz('x'.repeat(400), false), false)
    assert.equal(czyKrotkaZapowiedz('', true), true)
})

test('miniatura wpisu: strona skanu, obraz, inne pliki bez miniatury (zapowiedź i strona wpisu)', () => {
    assert.equal(adresMiniatury({ strony: [{ adres: '/pliki/strony/m/s-1.jpg' }], plik: null }), '/pliki/strony/m/s-1.jpg?w=640')
    assert.equal(adresMiniatury({ strony: [{ adres: '/pliki/strony/m/s-1.jpg' }] }, 480), '/pliki/strony/m/s-1.jpg?w=480')
    assert.equal(adresMiniatury({ strony: [], plik: '/pliki/zdj.JPG' }), '/pliki/zdj.JPG?w=640')
    assert.equal(adresMiniatury({ strony: [], plik: '/pliki/akt.pdf' }), undefined)
    assert.equal(adresMiniatury(undefined), undefined)
})

test('strona wpisu (uwaga 17.11, wariant B): miniatura w pasku znika przy krótkim wstępie przed wstawką ze skanem', () => {
    const krotki = '<h2>Kontekst</h2><p>Akapit wpisu przed wstawką.</p>'
    const dlugi = `<p>${'a '.repeat(PROG_WSTEPU_MINIATURY / 2 + 5)}</p>`
    assert.equal(miniaturaWBoku([{ html: krotki }, { material: 'm' }, { html: '<p>po</p>' }]), false)
    assert.equal(miniaturaWBoku([{ html: dlugi }, { material: 'm' }]), true)
    assert.equal(miniaturaWBoku([{ material: 'm' }]), false, 'wstawka na samym początku')
    assert.equal(miniaturaWBoku([{ html: krotki }]), true, 'bez wstawki – miniatura zostaje')
    assert.equal(miniaturaWBoku([{ html: `<p>${'&nbsp;'.repeat(900)}</p>` }, { material: 'm' }]), false, 'znaczniki i encje się nie liczą')
})
