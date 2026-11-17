import test from 'node:test'
import assert from 'node:assert/strict'
import { AKCENT_DOMYSLNY, cssAkcentu, koloryAkcentu, normalizujAkcent, prawidlowyHex } from './wyglad'
import { DZIALY, znormalizujWstep, bezpiecznyAdres } from '../strony/wstepy'

test('6C: domyślny akcent zachowuje obecny wygląd', () => {
    assert.equal(normalizujAkcent(null), AKCENT_DOMYSLNY)
    assert.equal(koloryAkcentu(AKCENT_DOMYSLNY).ciemny, '#419cff')
})
test('6C: kolor z HTML i CSS injection nie jest akceptowany', () => {
    assert.equal(prawidlowyHex('#123456'), true)
    assert.equal(prawidlowyHex('red; background:url(https://x)'), false)
    assert.equal(prawidlowyHex('#12345'), false)
    assert.equal(normalizujAkcent('#FFFaaa'), '#fffaaa')
})
test('6C: kontrast w obu motywach co najmniej 4.5:1', () => {
    for (const v of ['#ffffff', '#000000', '#ff0000', '#0a0a8a', '#00ff00', '#4c3cc4']) {
        const k = koloryAkcentu(v)
        assert.ok(k.kontrastJasny >= 4.5, `jasny ${v}: ${k.kontrastJasny}`)
        assert.ok(k.kontrastCiemny >= 4.5, `ciemny ${v}: ${k.kontrastCiemny}`)
        assert.ok(!cssAkcentu(v).includes('undefined'))
    }
})
test('6C: edycja sekcji jest opcjonalna, linki są ograniczone do bezpiecznych adresów', () => {
    assert.equal(DZIALY.length, 13, 'ADM-06: + księgi, słownik, plany')
    assert.equal(bezpiecznyAdres('/archiwum/zbiory'), true)
    assert.equal(bezpiecznyAdres('https://example.org'), true)
    assert.equal(bezpiecznyAdres('//evil.example.org'), false)
    assert.equal(bezpiecznyAdres('javascript:alert(1)'), false)
    assert.deepEqual(znormalizujWstep({}, 'osoby').wstep, '')
    assert.equal(znormalizujWstep({ osoby: { wstep: '  Tekst  ', linkAdres: 'javascript:alert(1)' } }, 'osoby').linkAdres, '')
})
test('7A-1: domyślny akcent nocą – błękit #419cff, wypełnienie #0a6fd6 z białym napisem', () => {
    const css = cssAkcentu(AKCENT_DOMYSLNY)
    const ciemny = css.slice(css.indexOf('html.dark'))
    assert.ok(ciemny.includes('--link:#419cff'))
    assert.ok(ciemny.includes('--primary:#0a6fd6'))
    assert.ok(ciemny.includes('--primary-foreground:#ffffff'))
})
