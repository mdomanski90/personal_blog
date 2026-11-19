// KON-07: hasło nginx wyłączone (PANEL_TYLKO_KONTA=1) → bez działających kont panel i jego API są zamknięte.
import test from 'node:test'
import assert from 'node:assert/strict'
import { kontaWlaczone, panelZamkniety } from './straz'
import { brakDostepu } from '../plany/dane'

const KLUCZE = ['KONTA_ADRES', 'KONTA_KLIENT_ID', 'KONTA_KLIENT_SEKRET', 'SEKRET_SESJI', 'PANEL_TYLKO_KONTA', 'NODE_ENV', 'PLANY_BEZ_HASLA_NGINX'] as const
function zEnv(e: Partial<Record<(typeof KLUCZE)[number], string>>, f: () => void) {
    const env = process.env as Record<string, string | undefined>
    const przed = Object.fromEntries(KLUCZE.map((k) => [k, env[k]]))
    for (const k of KLUCZE) { if (e[k] === undefined) delete env[k]; else env[k] = e[k] }
    try { f() } finally { for (const k of KLUCZE) { if (przed[k] === undefined) delete env[k]; else env[k] = przed[k] } }
}
const KONTA = { KONTA_ADRES: 'https://konto.example.test', KONTA_KLIENT_ID: 'klient', KONTA_KLIENT_SEKRET: 'sekret-klienta', SEKRET_SESJI: 'sekret-sesji-do-testu-0123456789' }
const zadanie = (naglowki: Record<string, string> = {}) => new Request('http://127.0.0.1:3000/api/keystatic/osoby', { headers: naglowki })
const FALSZYWY = { authorization: 'Basic eDp4' }

test('przed KON-07 (hasło nginx jest): bez kont liczy się nagłówek z nginx – jak przed P7a', () => {
    zEnv({ NODE_ENV: 'production' }, () => {
        assert.equal(kontaWlaczone(), false); assert.equal(panelZamkniety(), false)
        assert.equal(brakDostepu(zadanie())?.status, 401)
        assert.equal(brakDostepu(zadanie(FALSZYWY)), null, 'nginx sprawdził hasło – aplikacja wpuszcza')
    })
})

test('po KON-07 konta działają: fałszywy nagłówek Authorization niczego nie otwiera', () => {
    zEnv({ ...KONTA, NODE_ENV: 'production', PANEL_TYLKO_KONTA: '1' }, () => {
        assert.equal(kontaWlaczone(), true); assert.equal(panelZamkniety(), false)
        assert.equal(brakDostepu(zadanie())?.status, 401)
        assert.equal(brakDostepu(zadanie(FALSZYWY))?.status, 401)
    })
})

test('po KON-07 konta przestały działać (zniknęło ustawienie): panel zamknięty, także z nagłówkiem Authorization', () => {
    for (const brak of ['SEKRET_SESJI', 'KONTA_KLIENT_ID', 'KONTA_ADRES'] as const) {
        zEnv({ ...KONTA, [brak]: undefined, NODE_ENV: 'production', PANEL_TYLKO_KONTA: '1' }, () => {
            assert.equal(panelZamkniety(), true, brak)
            assert.equal(brakDostepu(zadanie())?.status, 503, brak)
            assert.equal(brakDostepu(zadanie(FALSZYWY))?.status, 503, brak)
        })
    }
})
