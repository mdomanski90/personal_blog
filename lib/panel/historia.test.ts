// P6a (PNL-10): historia wersji i kosz treści – dane syntetyczne w katalogu tymczasowym (zasada 1.1).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
    przedZapisemKeystatic, listaWersji, trescWersji, przywrocWersje, listaKoszaTresci, przywrocZKoszaTresci, usunZKoszaTresci,
    doKosza, roznica, odczytajZadanie, relTresci, DNI_PLIKOW_W_KOSZU, doUsuniecia, czasId, osHistorii, przywrocSprzedOperacji, koszRodzaju,
} from './historia'
import { listaOperacji, cofnijOperacje } from './operacje'

const b64 = (s: string) => Buffer.from(s).toString('base64url')
async function korzen() {
    const k = await fs.mkdtemp(path.join(os.tmpdir(), 'historia-'))
    await fs.mkdir(path.join(k, 'content', 'obiekty'), { recursive: true })
    await fs.writeFile(path.join(k, 'content', 'obiekty', 'testowa-kapliczka.mdoc'), '---\ntitle: Testowa kapliczka\n---\nOpis 1\n')
    return k
}
const czytaj = (k: string, p: string) => fs.readFile(path.join(k, p), 'utf8').catch(() => null)
const keystaticZapisuje = async (k: string, z: { additions: { path: string; contents: string }[]; deletions: { path: string }[] }) => {
    for (const a of z.additions) { await fs.mkdir(path.dirname(path.join(k, a.path)), { recursive: true }); await fs.writeFile(path.join(k, a.path), Buffer.from(a.contents, 'base64url')) }
    for (const d of z.deletions) await fs.rm(path.join(k, d.path), { force: true })
}

test('historia: zapis Keystatic zostawia poprzednią wersję; ten sam zapis drugi raz – bez nowej wersji; przywrócenie i cofnięcie', async () => {
    const k = await korzen()
    try {
        const z = { additions: [{ path: 'content/obiekty/testowa-kapliczka.mdoc', contents: b64('---\ntitle: Testowa kapliczka\n---\nOpis 2\n') }], deletions: [] }
        const p = await przedZapisemKeystatic(z, { korzen: k })
        assert.deepEqual([p.odrzuc, p.wersje], [null, 1])
        await keystaticZapisuje(k, z)
        assert.equal((await przedZapisemKeystatic(z, { korzen: k })).wersje, 0, 'bez zmiany treści – bez wersji')
        const L = await listaWersji('obiekty/testowa-kapliczka.mdoc', k)
        assert.equal(L.length, 1)
        assert.match((await trescWersji('obiekty/testowa-kapliczka.mdoc', L[0].id, k))!, /Opis 1/)
        const w = await przywrocWersje('obiekty/testowa-kapliczka.mdoc', L[0].id, { korzen: k })
        assert.match((await czytaj(k, 'content/obiekty/testowa-kapliczka.mdoc'))!, /Opis 1/)
        assert.equal((await listaWersji('obiekty/testowa-kapliczka.mdoc', k)).length, 2, 'treść sprzed przywrócenia też w historii')
        assert.equal((await listaOperacji(k))[0].rodzaj, 'przywrocenie')
        await cofnijOperacje(w.id!, { korzen: k })
        assert.match((await czytaj(k, 'content/obiekty/testowa-kapliczka.mdoc'))!, /Opis 2/, 'cofnięcie przywrócenia')
        assert.equal(await czytaj(k, 'content/_historia/.gitignore'), '*\n')
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})

test('historia: wszystko z 30 dni, starsze – najnowsza wersja z każdego tygodnia (plansza funkcji 4)', () => {
    const teraz = Date.UTC(2026, 10, 18, 12)
    const id = (dni: number, h = 0) => { const d = new Date(teraz - dni * 864e5 + h * 36e5); const z = (n: number, w = 2) => String(n).padStart(w, '0'); return `${d.getUTCFullYear()}${z(d.getUTCMonth() + 1)}${z(d.getUTCDate())}-${z(d.getUTCHours())}0000-00001-aaaa` }
    const swieze = [id(1), id(1, 2), id(29)]
    const stare = [id(40), id(40, 3), id(41), id(60)] // 40 i 41 dni temu: ten sam tydzień? – liczymy funkcją
    const usun = doUsuniecia([...swieze, ...stare], teraz)
    assert.ok(swieze.every((x) => !usun.includes(x)), 'z ostatnich 30 dni nic nie znika')
    assert.ok(!usun.includes(id(60)) && !usun.includes(id(40, 3)), 'najnowsza w tygodniu zostaje')
    assert.ok(usun.includes(id(40)), 'starsza z tego samego dnia znika')
    assert.ok(czasId(id(1)).startsWith('2026-11-17'))
})

test('oś historii: zapisy Keystatic pole po polu + zmiana zbiorcza; przywróć sprzed operacji; kosz rodzaju', async () => {
    const k = await korzen()
    try {
        const z = { additions: [{ path: 'content/obiekty/testowa-kapliczka.mdoc', contents: b64('---\ntitle: Testowa kapliczka\n---\nOpis 2 zmieniony\n') }], deletions: [] }
        await przedZapisemKeystatic(z, { korzen: k }); await keystaticZapisuje(k, z)
        const { wykonajOperacje } = await import('./operacje')
        await wykonajOperacje({ korzen: k, rodzaj: 'zbiorcza', opis: 'obiekty: widoczność publiczne (1)', zmiany: [{ plik: 'obiekty/testowa-kapliczka.mdoc', poprzedni: '---\ntitle: Testowa kapliczka\n---\nOpis 2 zmieniony\n', wynik: '---\ntitle: Testowa kapliczka\nvisibility: publiczne\n---\nOpis 2 zmieniony\n' }] })
        const os = await osHistorii('obiekty/testowa-kapliczka.mdoc', { visibility: 'widoczność' }, k)
        assert.deepEqual(os.map((x) => x.zrodlo), ['operacja', 'keystatic'])
        assert.deepEqual(os[0].zmiany!.map((x) => x.etykieta), ['widoczność'])
        const tresc = os[1].zmiany!.find((x) => x.pole === '__tresc')!
        assert.deepEqual(tresc.fragmenty.filter((f) => f.t !== '=').map((f) => [f.t, f.s.trim()]), [['-', '1'], ['+', '2 zmieniony']], 'różnica słów w treści')
        await przywrocSprzedOperacji('obiekty/testowa-kapliczka.mdoc', os[0].operacja!, { korzen: k })
        assert.doesNotMatch((await czytaj(k, 'content/obiekty/testowa-kapliczka.mdoc'))!, /visibility/)
        await doKosza(k, ['content/obiekty/testowa-kapliczka.mdoc'], 'obiekt'); await doKosza(k, ['content/zgloszenia/x.json'], 'zgłoszenie').catch(() => null)
        assert.equal((await koszRodzaju('obiekty/inny.mdoc', k)).length, 1)
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})

test('kosz: usunięcie w Keystatic → kopia w koszu; przywrócenie nie nadpisuje; przywrócenie po usunięciu – plik wraca', async () => {
    const k = await korzen()
    try {
        await fs.mkdir(path.join(k, 'pliki-archiwum', 'obiekty'), { recursive: true })
        await fs.writeFile(path.join(k, 'pliki-archiwum', 'obiekty', 'zdjecie.jpg'), Buffer.from([1, 2, 3]))
        const z = { additions: [], deletions: [{ path: 'content/obiekty/testowa-kapliczka.mdoc' }, { path: 'pliki-archiwum/obiekty/zdjecie.jpg' }] }
        const p = await przedZapisemKeystatic(z, { korzen: k, opis: () => 'obiekt „testowa-kapliczka”' })
        assert.ok(p.kosz)
        await keystaticZapisuje(k, z)
        const L = await listaKoszaTresci(k)
        assert.deepEqual([L.length, L[0].opis, L[0].pliki.length, L[0].wygasa], [1, 'obiekt „testowa-kapliczka”', 2, null], 'tekst w pozycji – bez terminu')
        // ktoś w międzyczasie utworzył wpis pod tym samym adresem – przywrócenie odmawia
        await fs.writeFile(path.join(k, 'content', 'obiekty', 'testowa-kapliczka.mdoc'), 'inny')
        assert.match((await przywrocZKoszaTresci(L[0].id, { korzen: k }))!, /jest już inny plik/)
        await fs.rm(path.join(k, 'content', 'obiekty', 'testowa-kapliczka.mdoc'))
        assert.equal(await przywrocZKoszaTresci(L[0].id, { korzen: k }), null)
        assert.match((await czytaj(k, 'content/obiekty/testowa-kapliczka.mdoc'))!, /Opis 1/)
        assert.deepEqual([...(await fs.readFile(path.join(k, 'pliki-archiwum', 'obiekty', 'zdjecie.jpg')))], [1, 2, 3])
        assert.deepEqual(await listaKoszaTresci(k), [], 'pozycja zdjęta z kosza')
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})

test('kosz: zmiana identyfikatora – stary plik do kosza; same pliki binarne wygasają po 30 dniach; usuń na stałe', async () => {
    const k = await korzen()
    try {
        const z = { additions: [{ path: 'content/obiekty/nowa-nazwa.mdoc', contents: b64('x') }], deletions: [{ path: 'content/obiekty/testowa-kapliczka.mdoc' }] }
        // Keystatic przy zmianie identyfikatora usuwa stary plik – to zwykłe usunięcie, więc trafia do kosza (stara treść jest bezpieczna)
        const p = await przedZapisemKeystatic(z, { korzen: k })
        assert.ok(p.kosz)
        await fs.mkdir(path.join(k, 'public', 'images', 'x'), { recursive: true })
        await fs.writeFile(path.join(k, 'public', 'images', 'x', 'a.png'), 'png')
        const id = await doKosza(k, ['public/images/x/a.png'], 'obraz', true)
        const poz = (await listaKoszaTresci(k)).find((x) => x.id === id)!
        assert.ok(poz.wygasa && Math.abs(Date.parse(poz.wygasa) - Date.now() - DNI_PLIKOW_W_KOSZU * 864e5) < 60_000)
        assert.equal(await czytaj(k, 'public/images/x/a.png'), null, 'usun=true usuwa oryginał')
        assert.equal(await usunZKoszaTresci(id!, k), null)
        assert.equal((await listaKoszaTresci(k)).some((x) => x.id === id), false)
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})

test('kosz: bez katalogu kosza usunięcie jest odrzucane (plik zostaje); ścieżki spoza dozwolonych – pomijane', async () => {
    const k = await korzen()
    try {
        await fs.writeFile(path.join(k, 'content', '_kosz'), 'plik zamiast katalogu') // odtwarza brak prawa zapisu
        const p = await przedZapisemKeystatic({ additions: [], deletions: [{ path: 'content/obiekty/testowa-kapliczka.mdoc' }] }, { korzen: k })
        assert.match(p.odrzuc!, /Usunięcie wstrzymane/)
        assert.equal(await doKosza(k, ['../etc/passwd', 'content/_operacje/x', 'data/baza.db'], 'x'), null)
        assert.equal(relTresci('content/_historia/a.mdoc'), null)
        assert.equal(relTresci('content/obiekty/a.mdoc'), 'obiekty/a.mdoc')
        assert.equal(relTresci('content/obiekty/zdjecie.jpg'), null)
    } finally { await fs.rm(k, { recursive: true, force: true }) }
})

test('różnica wierszy: zmiana w środku, zwinięte wspólne odcinki; odczyt żądania Keystatic', () => {
    const a = ['1', '2', '3', '4', '5', '6', '7', '8', 'stary', '9'].join('\n'), b = ['1', '2', '3', '4', '5', '6', '7', '8', 'nowy', '9'].join('\n')
    const r = roznica(a, b, 2)
    assert.deepEqual(r, [{ t: '…', n: 6 }, { t: '=', s: '7' }, { t: '=', s: '8' }, { t: '-', s: 'stary' }, { t: '+', s: 'nowy' }, { t: '=', s: '9' }])
    assert.deepEqual(roznica('a', 'a'), [{ t: '…', n: 1 }])
    assert.equal(odczytajZadanie({ additions: 'x' }), null)
    assert.deepEqual(odczytajZadanie({ additions: [{ path: 'a', contents: 'b' }, { path: 1 }], deletions: [] }), { additions: [{ path: 'a', contents: 'b' }], deletions: [] })
})
