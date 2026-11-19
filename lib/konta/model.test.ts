// P7a (KON-01): reguły kont – role z odstępstwami, administrator na żądanie, ostatni administrator, trasy API, zapis treści.
// Dane wyłącznie syntetyczne.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { MENU } from '../panel/menu'
import {
    UPRAWNIENIA, definicjeRol, dzialSciezki, liczbaAdministratorow, mozeTylkoJa, ocenZapis, odczytajPlik, odmowaZmianyKont, opisMozesz, opisRoliZDzialami, opisZakresu,
    pozycjaMenuDlaKonta, uprawnieniaKonta, uprawnieniaTrasy, uprawnienieStrony, wZakresie, PUSTY_PLIK, celStronyPanelu, maTeren, planWTerenie, type Konto, type PlikKont,
} from './model'

const konto = (z: Partial<Konto> = {}): Konto => ({ id: 'k1', imie: 'Anna Przykładowa', role: ['redaktor'], dodane: [], odebrane: [], zakres: { kregi: [], miejsca: [] }, stan: 'aktywny', utworzono: '2026-11-10T10:00:00Z', ...z })
const ROLE = definicjeRol(null)

test('role domyślne: administrator ma wszystko; „konta, kopie, ustawienia” nie ma nikt inny; bliski tylko czyta', () => {
    assert.deepEqual(ROLE.find((r) => r.klucz === 'administrator')!.uprawnienia.sort(), UPRAWNIENIA.map((u) => u.klucz).sort())
    for (const r of ROLE.filter((x) => x.klucz !== 'administrator')) assert.ok(!r.uprawnienia.includes('administracja'), r.klucz)
    assert.deepEqual(ROLE.find((r) => r.klucz === 'bliski')!.uprawnienia, ['bliscy'])
    assert.deepEqual(ROLE.find((r) => r.klucz === 'podglad')!.uprawnienia, ['bliscy', 'panel'])
    assert.equal(ROLE.find((r) => r.klucz === 'teren')!.nazwa, 'współpracownik terenowy')
})

test('zmiany ról z panelu: nazwa i zestaw; administratorowi nie da się nic odebrać ani dać „administracji” innej roli', () => {
    const r = definicjeRol({ role: { teren: { nazwa: 'pomocnik w terenie' }, redaktor: { uprawnienia: ['panel', 'wpisy', 'administracja'] }, administrator: { nazwa: 'opiekun', uprawnienia: ['panel'] } } })
    assert.equal(r.find((x) => x.klucz === 'teren')!.nazwa, 'pomocnik w terenie')
    assert.deepEqual(r.find((x) => x.klucz === 'redaktor')!.uprawnienia, ['panel', 'wpisy'])
    assert.equal(r.find((x) => x.klucz === 'administrator')!.nazwa, 'opiekun')
    assert.equal(r.find((x) => x.klucz === 'administrator')!.uprawnienia.length, UPRAWNIENIA.length)
})

test('uprawnienia konta: rola + dodane − odebrane; zablokowany i zaproszony nie mają nic', () => {
    const k = konto({ dodane: ['publikowanie'], odebrane: ['plany', 'osoby', 'biblioteka'] })
    const u = uprawnieniaKonta(k, ROLE)
    assert.ok(u.has('wpisy') && u.has('publikowanie') && u.has('zgloszenia') && u.has('bliscy'))
    assert.ok(!u.has('plany') && !u.has('osoby') && !u.has('usuwanie') && !u.has('administracja'))
    assert.equal(uprawnieniaKonta(konto({ stan: 'zablokowany' }), ROLE).size, 0)
    assert.equal(uprawnieniaKonta(konto({ stan: 'zaproszony' }), ROLE).size, 0)
    assert.equal(opisMozesz(u), 'edytować wpisy i tematy, miejsca i obiekty, archiwum, słownik; dodawać zdjęcia grobów i napisy na wybranych planach; zapisywać nowe miejsca z telefonu; publikować; obsługiwać zgłoszenia')
    assert.equal(opisRoliZDzialami(k, ROLE), 'redaktor: wpisy i tematy, miejsca i obiekty, archiwum, słownik')
})

test('dwie role: na co dzień redaktor, administrator tylko po przełączeniu; „administracji” nie da się dodać odstępstwem', () => {
    const k = konto({ role: ['redaktor', 'administrator'], dodane: ['administracja' as never] })
    assert.ok(!uprawnieniaKonta(k, ROLE).has('administracja'))
    assert.ok(!uprawnieniaKonta(k, ROLE).has('usuwanie'))
    assert.ok(uprawnieniaKonta(k, ROLE, true).has('administracja') && uprawnieniaKonta(k, ROLE, true).has('usuwanie'))
    // konto bez roli administratora nie zostaje administratorem, nawet gdy sesja tak twierdzi
    assert.ok(!uprawnieniaKonta(konto(), ROLE, true).has('administracja'))
    // sam administrator poza trybem administratora: ogląda panel, niczego nie zmienia
    const sam = uprawnieniaKonta(konto({ role: ['administrator'] }), ROLE)
    assert.deepEqual([...sam].sort(), ['bliscy', 'panel'])
    assert.ok(mozeTylkoJa(k) && !mozeTylkoJa(konto()) && !mozeTylkoJa(konto({ role: ['administrator'], stan: 'zablokowany' })))
})

test('ostatniego administratora nie da się odebrać, zablokować ani usunąć; drugi administrator to odblokowuje', () => {
    const adm = konto({ id: 'a', imie: 'Mateusz', role: ['redaktor', 'administrator'] })
    const przed: PlikKont = { wersja: 3, role: {}, konta: [adm, konto()] }
    assert.equal(liczbaAdministratorow(przed), 1)
    assert.match(odmowaZmianyKont(przed, { ...przed, konta: [{ ...adm, role: ['redaktor'] }, konto()] })!, /jedyne konto z rolą administratora/)
    assert.match(odmowaZmianyKont(przed, { ...przed, konta: [{ ...adm, stan: 'zablokowany' }, konto()] })!, /jedyne konto/)
    assert.match(odmowaZmianyKont(przed, { ...przed, konta: [konto()] })!, /jedyne konto/)
    const dwoch = { ...przed, konta: [adm, konto({ role: ['redaktor', 'administrator'] })] }
    assert.equal(odmowaZmianyKont(dwoch, { ...dwoch, konta: [{ ...adm, role: ['redaktor'] }, dwoch.konta[1]] }), null)
    // zaproszony administrator jeszcze się nie zaloguje – nie liczy się jako zapas
    assert.match(odmowaZmianyKont({ ...przed, konta: [adm, konto({ role: ['administrator'], stan: 'zaproszony' })] }, { ...przed, konta: [konto({ role: ['administrator'], stan: 'zaproszony' })] })!, /jedyne konto/)
    assert.match(odmowaZmianyKont(przed, { ...przed, konta: [adm, konto({ role: [] })] })!, /co najmniej jedną rolę/)
    // pierwsze konto (plik pusty) – bez odmowy
    assert.equal(odmowaZmianyKont({ wersja: 0, role: {}, konta: [] }, { wersja: 0, role: {}, konta: [konto()] }), null)
})

test('odczyt pliku kont: śmieci pomijane, nieznane role i uprawnienia nie dają dostępu, powtórzone id pomijane', () => {
    const p = odczytajPlik({ wersja: 2, role: { redaktor: { uprawnienia: ['wpisy', 'wszystko'] }, szef: { uprawnienia: ['administracja'] } }, konta: [
        { id: 'x', imie: ' Jan\u0000Testowy ', role: ['redaktor', 'szef'], dodane: ['administracja', 'publikowanie', 'cokolwiek'], zakres: { kregi: ['1', 7], miejsca: 'testowo' }, stan: 'właściciel', zaproszenie: { skrot: 'krótki', do: '2026-11-26' } },
        { id: 'x', imie: 'powtórzony' }, { imie: 'bez id' }, null, 'tekst',
    ] })
    assert.equal(p.konta.length, 1)
    assert.deepEqual(p.konta[0], { id: 'x', imie: 'Jan Testowy', role: ['redaktor'], dodane: ['publikowanie'], odebrane: [], zakres: { kregi: ['1'], miejsca: [] }, stan: 'zaproszony', utworzono: new Date(0).toISOString() })
    assert.deepEqual(p.role, { redaktor: { uprawnienia: ['wpisy'] } })
    assert.deepEqual(odczytajPlik('nie obiekt'), { wersja: 0, role: {}, konta: [] })
})

test('trasy API panelu: każda trasa i metoda z app/api/keystatic ma regułę; odczyt = panel, zapis = dział', () => {
    const korzen = path.join(process.cwd(), 'app', 'api', 'keystatic')
    const pliki: string[] = []
    const idz = (k: string) => { for (const e of fs.readdirSync(k, { withFileTypes: true })) { if (e.isDirectory()) idz(path.join(k, e.name)); else if (e.name === 'route.ts') pliki.push(path.join(k, e.name)) } }
    idz(korzen)
    assert.ok(pliki.length >= 30, `za mało tras: ${pliki.length}`)
    for (const p of pliki) {
        const rel = path.relative(korzen, path.dirname(p)).split(path.sep).join('/')
        if (rel.startsWith('[[')) continue // trasa Keystatic sprawdza pliki sama (lib/konta/zapis-tresci.ts)
        const adres = '/api/keystatic/' + rel.replace(/\[[^\]]+\]/g, 'x')
        const kod = fs.readFileSync(p, 'utf8')
        const metody = [...kod.matchAll(/export (?:async function|const) (GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1])
        assert.ok(metody.length > 0, `${rel}: brak metod`)
        assert.match(kod, /brakDostepu\(|odmowaKonta\(/, `${rel}: trasa bez strażnika`)
        for (const m of metody) {
            const reg = uprawnieniaTrasy(adres, m)
            assert.ok(reg, `brak reguły: ${m} ${adres}`)
            // pusta lista (wystarczy zalogowanie) tylko w trasach terenowych, które same wydają wyłącznie dane tego konta (P7b)
            if (!reg.length) assert.match(kod, /osobaWTerenie\(|osobaZKonta\(/, `${rel}: trasa bez uprawnień musi sama sprawdzać konto terenowe`)
        }
    }
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/plany/x', 'GET'), ['panel'])
    // P7b (TER-01): teren
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/plany/x/teren', 'GET'), ['plany-teren'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/plany/x/teren', 'POST'), ['plany-teren'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/plany/x/plik/y', 'GET'), [])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/plany/x/plik', 'POST'), ['plany'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/teren/miejsca', 'POST'), ['teren'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/teren/miejsca/x', 'POST'), ['miejsca'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/teren/zmiany', 'POST'), ['plany'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/teren', 'GET'), [])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/plany/x', 'PUT'), ['plany'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/plany/x', 'DELETE'), ['plany', 'usuwanie'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/plany/x/szkic', 'DELETE'), ['plany'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/osoby/x', 'DELETE'), ['osoby', 'usuwanie'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/panel/kopia', 'GET'), ['administracja'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/panel/konta', 'GET'), ['administracja'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/osoby/eksport', 'GET'), ['administracja'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/panel/lista', 'POST'), ['operacje'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/panel', 'POST'), ['operacje'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/panel/praca', 'POST'), ['panel'])
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/panel/wyglad', 'PUT'), ['administracja'])
    assert.equal(uprawnieniaTrasy('/api/keystatic/cos-nowego', 'POST'), null)
})

test('dział pliku: kolekcje, obrazy kolekcji, pliki archiwum; ustawienia i nieznane – tylko administrator', () => {
    assert.equal(dzialSciezki('content/posts/wpis.mdoc'), 'wpisy')
    assert.equal(dzialSciezki('content/tematy/t.mdoc'), 'wpisy')
    assert.equal(dzialSciezki('content/obiekty/mlyn.mdoc'), 'miejsca')
    assert.equal(dzialSciezki('content/ksiegi/k.yaml'), 'biblioteka')
    assert.equal(dzialSciezki('content/biogramy/os-jan.mdoc'), 'osoby')
    assert.equal(dzialSciezki('public/images/posts/wpis/a.jpg'), 'wpisy')
    assert.equal(dzialSciezki('pliki-archiwum/mat-00/skan.jpg'), 'archiwum')
    assert.equal(dzialSciezki('pliki-archiwum/obiekty/mlyn/a.jpg'), 'miejsca')
    for (const p of ['content/_panel/konta.json', 'content/_panel/menu-panelu.json', 'content/o-projekcie.mdoc', 'content/nowa-kolekcja/x.mdoc', 'package.json', '.env.local'])
        assert.equal(dzialSciezki(p), 'administracja', p)
})

test('zapis treści: dział, usuwanie, „tylko ja”, publikowanie, zakres – komunikat prostym językiem, bez numerów plików', () => {
    const k = konto({ odebrane: ['plany'] })
    const kto = { uprawnienia: uprawnieniaKonta(k, ROLE), zakres: k.zakres, tylkoJa: false, opisRoli: opisRoliZDzialami(k, ROLE) }
    const meta = (widocznosc: string | null, miejsca: string[] = []) => ({ widocznosc, miejsca })
    assert.equal(ocenZapis(kto, [{ sciezka: 'content/posts/a.mdoc', przed: meta('bliscy'), po: meta('bliscy') }]), null)
    assert.equal(ocenZapis(kto, [{ sciezka: 'content/plany/p.json', przed: meta(null), po: meta(null) }]),
        'Zapis wstrzymany. Twoja rola (redaktor: wpisy i tematy, miejsca i obiekty, archiwum, biblioteka i księgi, osoby i drzewo, słownik) nie obejmuje działu „plany”. Nic nie zmieniono – poproś administratora o uprawnienie.')
    assert.match(ocenZapis(kto, [{ sciezka: 'content/_panel/menu-panelu.json', przed: meta(null), po: meta(null) }])!, /zmienia tylko administrator/)
    assert.match(ocenZapis(kto, [{ sciezka: 'content/posts/a.mdoc', przed: meta('bliscy'), po: null }])!, /nie obejmuje usuwania/)
    assert.match(ocenZapis(kto, [{ sciezka: 'content/posts/a.mdoc', przed: meta('bliscy'), po: meta('publiczne') }])!, /nie obejmuje publikowania/)
    assert.match(ocenZapis(kto, [{ sciezka: 'content/posts/nowy.mdoc', przed: null, po: meta('publiczne') }])!, /publikowania/)
    // pozycja już publiczna – zwykła poprawka nie wymaga publikowania
    assert.equal(ocenZapis(kto, [{ sciezka: 'content/posts/a.mdoc', przed: meta('publiczne'), po: meta('publiczne') }]), null)
    assert.match(ocenZapis(kto, [{ sciezka: 'content/posts/a.mdoc', przed: meta('ja'), po: meta('bliscy') }])!, /tylko ja/)
    assert.match(ocenZapis(kto, [{ sciezka: 'content/posts/a.mdoc', przed: meta('bliscy'), po: meta('ja') }])!, /tylko ja/)
    assert.equal(ocenZapis({ ...kto, tylkoJa: true }, [{ sciezka: 'content/posts/a.mdoc', przed: meta('ja'), po: meta('ja') }]), null)
    // jedna odmowa zatrzymuje cały zapis
    assert.ok(ocenZapis(kto, [{ sciezka: 'content/posts/a.mdoc', przed: meta('bliscy'), po: meta('bliscy') }, { sciezka: 'content/plany/p.json', przed: null, po: meta(null) }]))
    // zakres: krąg 1 = testowo; pozycja spoza zakresu odrzucona (przed i po), pozycja bez miejscowości – decyduje dział
    const wKregu = { ...kto, zakres: { kregi: ['1'], miejsca: ['wola-przykladowa'] } }
    const kregi = (id: string) => (id === '1' ? ['testowo'] : [])
    assert.equal(ocenZapis(wKregu, [{ sciezka: 'content/miejsca/testowo.mdoc', przed: meta('publiczne', ['testowo']), po: meta('publiczne', ['testowo']) }], kregi), null)
    assert.equal(ocenZapis(wKregu, [{ sciezka: 'content/posts/a.mdoc', przed: meta('bliscy', ['dalekie', 'wola-przykladowa']), po: meta('bliscy', ['wola-przykladowa']) }], kregi), null)
    assert.match(ocenZapis(wKregu, [{ sciezka: 'content/miejsca/dalekie.mdoc', przed: meta('publiczne', ['dalekie']), po: meta('publiczne', ['dalekie']) }], kregi)!, /spoza Twojego zakresu/)
    assert.match(ocenZapis(wKregu, [{ sciezka: 'content/posts/a.mdoc', przed: meta('bliscy', ['testowo']), po: meta('bliscy', ['dalekie']) }], kregi)!, /spoza Twojego zakresu/)
    assert.equal(ocenZapis(wKregu, [{ sciezka: 'content/hasla/arenda.mdoc', przed: meta('bliscy'), po: meta('bliscy') }], kregi), null)
    assert.ok(wZakresie({ kregi: [], miejsca: [] }, ['gdziekolwiek'], kregi))
})

test('menu panelu według uprawnień: redaktor bez planów nie widzi planów ani administracji; podgląd widzi działy; bliski nic', () => {
    const u = uprawnieniaKonta(konto({ odebrane: ['plany', 'osoby', 'biblioteka'] }), ROLE)
    const widzi = (k: string) => pozycjaMenuDlaKonta(k, u)
    assert.ok(widzi('pulpit') && widzi('posts') && widzi('materialy') && widzi('hasla') && widzi('zgloszenia') && widzi('do-opracowania'))
    assert.ok(!widzi('plany-cmentarz') && !widzi('osoby') && !widzi('ksiegi') && !widzi('dostep') && !widzi('menuPanelu') && !widzi('polacz') && !widzi('operacje'))
    const podglad = uprawnieniaKonta(konto({ role: ['podglad'] }), ROLE)
    assert.ok(pozycjaMenuDlaKonta('posts', podglad) && pozycjaMenuDlaKonta('plany-cmentarz', podglad) && !pozycjaMenuDlaKonta('dostep', podglad) && !pozycjaMenuDlaKonta('zgloszenia', podglad))
    const bliski = uprawnieniaKonta(konto({ role: ['bliski'] }), ROLE)
    assert.ok(!pozycjaMenuDlaKonta('pulpit', bliski) && !pozycjaMenuDlaKonta('posts', bliski))
    const adm = uprawnieniaKonta(konto({ role: ['redaktor', 'administrator'] }), ROLE, true)
    // każda pozycja menu jest widoczna dla administratora
    for (const g of MENU) for (const kl of g.pozycje.length ? g.pozycje.map((p) => p.klucz) : [g.klucz]) assert.ok(pozycjaMenuDlaKonta(kl, adm), kl)
    assert.equal(uprawnienieStrony('/keystatic/panel/dostep'), 'administracja')
    assert.equal(uprawnienieStrony('/keystatic/singleton/menuPanelu'), 'administracja')
    assert.equal(uprawnienieStrony('/keystatic/panel'), 'panel')
    assert.equal(uprawnienieStrony('/keystatic/collection/posts/item/x'), 'panel')
})

test('kolumna „zakres” na liście kont', () => {
    assert.equal(opisZakresu(konto({ role: ['administrator'] }), ROLE), 'wszystko')
    assert.equal(opisZakresu(konto({ role: ['podglad'] }), ROLE), 'cały panel (bez zapisu)')
    assert.equal(opisZakresu(konto({ role: ['bliski'] }), ROLE), 'treści „dla bliskich”')
    assert.equal(opisZakresu(konto({ odebrane: ['miejsca', 'biblioteka', 'osoby', 'plany', 'slownik'], zakres: { kregi: ['1'], miejsca: [] } }), ROLE, { '1': 'krąg 1' }), 'wpisy i tematy, archiwum · krąg 1')
    assert.equal(opisZakresu(konto({ stan: 'zaproszony' }), ROLE), 'wszystkie działy')
})

test('P7b: konto terenowe – tylko „w terenie”, wybrane plany, kolumna „zakres”', () => {
    const role = definicjeRol(PUSTY_PLIK)
    const teren: Konto = { id: 't', imie: 'Jan Testowy', role: ['teren'], dodane: [], odebrane: [], zakres: { kregi: [], miejsca: [], plany: ['cmentarz-testowo'] }, stan: 'aktywny', utworzono: '2026-11-19T00:00:00.000Z' }
    const u = uprawnieniaKonta(teren, role)
    assert.equal(u.has('panel'), false, 'rola terenowa nie daje wglądu w resztę panelu')
    assert.ok(maTeren(u))
    // plany: tylko z listy konta; redaktor (dział „plany”) – każdy
    assert.equal(planWTerenie(u, teren.zakres, 'cmentarz-testowo'), true)
    assert.equal(planWTerenie(u, teren.zakres, 'cmentarz-przykladowo'), false)
    const red = uprawnieniaKonta({ ...teren, role: ['redaktor'], zakres: { kregi: [], miejsca: [] } }, role)
    assert.equal(planWTerenie(red, { kregi: [], miejsca: [] }, 'cmentarz-przykladowo'), true)
    assert.equal(planWTerenie(uprawnieniaKonta({ ...teren, role: ['podglad'] }, role), teren.zakres, 'cmentarz-testowo'), false)
    // strony: konto terenowe trafia na „w terenie”, nie do panelu; podgląd nie wchodzi w teren
    assert.equal(celStronyPanelu('/keystatic/teren', u), null)
    assert.equal(celStronyPanelu('/keystatic/teren/plan/cmentarz-testowo', u), null)
    assert.equal(celStronyPanelu('/keystatic/panel', u), '/keystatic/teren')
    assert.equal(celStronyPanelu('/keystatic/osoby', u), '/keystatic/teren')
    assert.equal(celStronyPanelu('/keystatic/panel', red), null)
    assert.equal(celStronyPanelu('/keystatic/panel/dostep', red), '/keystatic/panel?odmowa=administrator')
    const podglad = uprawnieniaKonta({ ...teren, role: ['podglad'] }, role)
    assert.equal(celStronyPanelu('/keystatic/teren', podglad), '/keystatic/panel')
    assert.equal(celStronyPanelu('/keystatic/panel', uprawnieniaKonta({ ...teren, role: ['bliski'] }, role)), '/moje-konto?panel=brak')
    // odczyt reszty panelu wymaga „panel” – konto terenowe go nie ma
    assert.deepEqual(uprawnieniaTrasy('/api/keystatic/osoby', 'GET'), ['panel'])
    // menu i opisy
    assert.equal(pozycjaMenuDlaKonta('w-terenie', u), true)
    assert.equal(pozycjaMenuDlaKonta('z-terenu', u), false)
    assert.equal(pozycjaMenuDlaKonta('z-terenu', red), true)
    assert.equal(pozycjaMenuDlaKonta('osoby', u), false)
    assert.equal(opisZakresu(teren, role), 'w terenie: 1 plan')
    assert.equal(opisZakresu({ ...teren, zakres: { kregi: [], miejsca: [] } }, role), 'w terenie: żaden plan')
    assert.equal(opisMozesz(u), 'dodawać zdjęcia grobów i napisy na wybranych planach; zapisywać nowe miejsca z telefonu')
    // plik kont: lista planów przechodzi przez odczyt, śmieci odpadają
    const p = odczytajPlik({ konta: [{ ...teren, zakres: { plany: ['cmentarz-testowo', 5, ''] } }] })
    assert.deepEqual(p.konta[0].zakres, { kregi: [], miejsca: [], plany: ['cmentarz-testowo'] })
})
