// P7a (KON-01): sesja konta – podpis, 30 dni, administrator najwyżej 30 minut, „wyloguj ze wszystkich urządzeń”, zaproszenia.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ADMINISTRATOR_S, SESJA_S, ciasteczkoSesji, odczytajPodpisane, odczytajSesje, podpisz, sesjaUniewazniona, zNaglowka } from './sesja'
import { kontoZKodu, skrotKodu } from './zaproszenia'
import { nazwaUzytkownika } from './pocket-id'
import { kodQr } from './qr'
import { metaPliku } from './zapis-tresci'
import type { Konto } from './model'

const S = 'sekret-testowy-0123456789', T = Date.UTC(2026, 10, 19, 12, 0, 0), t = Math.floor(T / 1000)

test('sesja: dobry podpis czytany, zmieniona treść albo inny sekret – odrzucone', () => {
    const c = ciasteczkoSesji(S, { id: 'konto-1', wydano: t })
    assert.deepEqual(odczytajSesje(S, c, T), { id: 'konto-1', wydano: t })
    assert.equal(odczytajSesje('inny-sekret', c, T), null)
    const [tresc, podpis] = c.split('.')
    const podmieniona = Buffer.from(JSON.stringify({ i: 'konto-2', w: t })).toString('base64url')
    assert.equal(odczytajSesje(S, `${podmieniona}.${podpis}`, T), null)
    assert.equal(odczytajSesje(S, `${tresc}.`, T), null)
    assert.equal(odczytajSesje(S, undefined, T), null)
    assert.equal(odczytajSesje('', c, T), null)
    // podpis z innego ciasteczka (przejście logowania) nie jest sesją
    assert.equal(odczytajSesje(S, podpisz(S, 'logowanie', { i: 'konto-1', w: t }), T), null)
    assert.equal(odczytajPodpisane(S, 'logowanie', podpisz(S, 'sesja', { x: 1 })), null)
})

test('sesja ważna 30 dni; z przyszłości odrzucona', () => {
    const c = ciasteczkoSesji(S, { id: 'k', wydano: t })
    assert.ok(odczytajSesje(S, c, T + (SESJA_S - 5) * 1000))
    assert.equal(odczytajSesje(S, c, T + (SESJA_S + 5) * 1000), null)
    assert.equal(odczytajSesje(S, ciasteczkoSesji(S, { id: 'k', wydano: t + 3600 }), T), null)
})

test('administrator: najwyżej 30 minut, potem sesja wraca do roli na co dzień (nie wygasa)', () => {
    const c = ciasteczkoSesji(S, { id: 'k', wydano: t, adminDo: t + ADMINISTRATOR_S })
    assert.equal(odczytajSesje(S, c, T + 60_000)?.adminDo, t + ADMINISTRATOR_S)
    assert.deepEqual(odczytajSesje(S, c, T + (ADMINISTRATOR_S + 1) * 1000), { id: 'k', wydano: t })
    // dłuższy czas wpisany w ciasteczko nie przedłuża roli
    assert.equal(odczytajSesje(S, ciasteczkoSesji(S, { id: 'k', wydano: t, adminDo: t + 24 * 3600 }), T)?.adminDo, undefined)
})

test('„wyloguj ze wszystkich urządzeń”: sesje wydane wcześniej są nieważne, nowe działają', () => {
    assert.ok(sesjaUniewazniona({ id: 'k', wydano: t }, new Date(T + 1000).toISOString()))
    assert.ok(!sesjaUniewazniona({ id: 'k', wydano: t + 5 }, new Date(T + 1000).toISOString()))
    assert.ok(!sesjaUniewazniona({ id: 'k', wydano: t }, undefined))
})

test('ciasteczko z nagłówka', () => {
    assert.equal(zNaglowka('a=1; odp_konto=abc.def; b=2', 'odp_konto'), 'abc.def')
    assert.equal(zNaglowka('odp_konto_logowanie=x', 'odp_konto'), undefined)
    assert.equal(zNaglowka(null, 'odp_konto'), undefined)
})

test('zaproszenie: w pliku tylko skrót kodu; ważne do terminu; zablokowane konto i zły kod – brak', () => {
    const k = (z: Partial<Konto>): Konto => ({ id: 'k', imie: 'Piotr Nowy', role: ['redaktor'], dodane: [], odebrane: [], zakres: { kregi: [], miejsca: [] }, stan: 'zaproszony', utworzono: '', zaproszenie: { skrot: skrotKodu('QJacE1ge5S09'), do: new Date(T + 7 * 864e5).toISOString() }, ...z })
    assert.equal(kontoZKodu({ konta: [k({})] }, 'QJacE1ge5S09', T)?.imie, 'Piotr Nowy')
    assert.equal(kontoZKodu({ konta: [k({})] }, 'QJacE1ge5S09', T + 8 * 864e5), null)
    assert.equal(kontoZKodu({ konta: [k({})] }, 'innyKod12345', T), null)
    assert.equal(kontoZKodu({ konta: [k({})] }, '../../etc', T), null)
    assert.equal(kontoZKodu({ konta: [k({ stan: 'zablokowany' })] }, 'QJacE1ge5S09', T), null)
    assert.ok(!JSON.stringify(k({})).includes('QJacE1ge5S09'))
})

test('nazwa użytkownika dla usługi logowania: bez polskich znaków i spacji', () => {
    assert.equal(nazwaUzytkownika('Żaneta Łącka-Śliwińska', 'ab12'), 'zaneta-lacka-sliwinska-ab12')
    assert.equal(nazwaUzytkownika('  ', 'ab12'), 'osoba-ab12')
})

test('kod QR linku: kwadrat z marginesem 4 modułów', () => {
    const q = kodQr('https://odniepamieci.pl/zaproszenie/QJacE1ge5S09')
    assert.ok(q.rozmiar >= 29 && q.sciezka.startsWith('M') && !/M[0-3] /.test(q.sciezka.slice(0, 4)))
})

test('nagłówek pliku treści: widoczność i miejscowości (.mdoc, .yaml, .json); miejscowość = własny slug', () => {
    assert.deepEqual(metaPliku('content/posts/a.mdoc', '---\ntitle: A\nvisibility: bliscy\nspatial:\n  - testowo\n  - wola\n---\nTreść\n'), { widocznosc: 'bliscy', miejsca: ['testowo', 'wola'] })
    assert.deepEqual(metaPliku('content/miejsca/testowo.mdoc', '---\ntitle: Testowo\nvisibility: publiczne\n---\n'), { widocznosc: 'publiczne', miejsca: ['testowo'] })
    assert.deepEqual(metaPliku('content/obiekty/mlyn.mdoc', '---\nspatial: wola\nvisibility: ja\n---\n'), { widocznosc: 'ja', miejsca: ['wola'] })
    assert.deepEqual(metaPliku('content/parafie/p.yaml', 'title: P\nseat: wola\n'), { widocznosc: null, miejsca: ['wola'] })
    assert.deepEqual(metaPliku('content/osoby/os-jan.json', '{"widocznosc":"ja"}'), { widocznosc: 'ja', miejsca: [] })
    assert.deepEqual(metaPliku('public/images/posts/a.jpg', '\u0000binarne'), { widocznosc: null, miejsca: [] })
    assert.deepEqual(metaPliku('content/posts/zly.mdoc', '---\n: : :\n---\n'), { widocznosc: null, miejsca: [] })
    assert.equal(metaPliku('content/posts/brak.mdoc', null), null)
})
