// Łatka 21.11 (podgląd linku): obraz z dysku tylko z /pliki/… i tylko pliki graficzne – bez wyjścia poza pliki-archiwum.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { obrazPliku } from './karta'

test('obraz do podglądu: odrzuca ścieżki spoza /pliki/, z „..” i pliki niegraficzne; brak pliku – undefined', async () => {
    for (const a of [null, '', '/etc/passwd', '/pliki/../.env', '/pliki/strony/x/../../../etc/passwd.jpg', '/pliki/mat/plik.pdf', '/pliki//x.jpg', 'https://example.org/x.jpg'])
        assert.equal(await obrazPliku(a), undefined, String(a))
    assert.equal(await obrazPliku('/pliki/strony/nie-ma-takiego/s-x.webp'), undefined)
})
