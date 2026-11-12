import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.HASLO_BLISKICH_HASH = ''
process.env.SEKRET_SESJI = 'sekret-testowy'

test('hasło, token sesji, zmiana hasła wylogowuje', async () => {
    const s = await import('./sesja')
    assert.equal(s.logowanieWlaczone(), false)
    assert.equal(s.sprawdzHaslo('cokolwiek'), false)
    process.env.HASLO_BLISKICH_HASH = s.hashHasla('Babcia z Olszanki 1915')
    assert.equal(s.sprawdzHaslo('Babcia z Olszanki 1915'), true)
    assert.equal(s.sprawdzHaslo('babcia z olszanki 1915'), false)
    const token = s.tokenSesji()!
    assert.equal(s.sesjaWazna(token), true)
    assert.equal(s.sesjaWazna(token + 'x'), false)
    assert.equal(s.sesjaWazna(undefined), false)
    process.env.HASLO_BLISKICH_HASH = s.hashHasla('nowe hasło 2026')
    assert.equal(s.sesjaWazna(token), false)
})

test('limit prób i bezpieczny adres powrotu', async () => {
    const s = await import('./sesja')
    for (let i = 0; i < 5; i++) {
        assert.equal(s.mozeProbowac('1.2.3.4'), true)
        s.zapiszNieudana('1.2.3.4')
    }
    assert.equal(s.mozeProbowac('1.2.3.4'), false)
    assert.equal(s.mozeProbowac('5.6.7.8'), true)
    s.wyczyscProby('1.2.3.4')
    assert.equal(s.mozeProbowac('1.2.3.4'), true)
    assert.equal(s.adresPowrotu('/archiwum/x'), '/archiwum/x')
    assert.equal(s.adresPowrotu('//zla.strona'), '/')
    assert.equal(s.adresPowrotu('https://zla.strona'), '/')
    assert.equal(s.adresPowrotu(null), '/')
})
