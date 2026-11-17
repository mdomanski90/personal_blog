import { test } from 'node:test'
import assert from 'node:assert/strict'
import { elementyLegendy, liniaWskazujaca, nowyPowtorzonyNrLegendy, poUsunieciu, poWstawieniu, poprawPolaPH3, probkiOsi, punktKotwicy, sciezka, wierszeNapisu, wstega, doCzytania } from './ph3'
import { popraw, dlaCzytelnika, type Plan } from './model'

const P = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

test('PH3: brak nowych pól = ścieżka jak przed PH3 (łamana w tym samym zapisie)', () => {
    const p: [number, number][] = [[0, 0], [10, 5], [20, 0]]
    assert.equal(sciezka(p), 'M' + P(p))
    assert.equal(sciezka(p, { zamknieta: true }), 'M' + P(p) + 'Z')
    assert.equal(sciezka(p, { gladka: false, ostre: [1] }), 'M' + P(p))
})

test('PH-05: gładka krzywa przechodzi przez węzły; ostry węzeł = narożnik (punkt kontrolny w węźle)', () => {
    const p: [number, number][] = [[0, 0], [10, 0], [10, 10], [20, 10]]
    const d = sciezka(p, { gladka: true })
    assert.match(d, /^M0\.0,0\.0C/)
    assert.equal((d.match(/C/g) ?? []).length, 3)
    assert.ok(d.includes(' 10.0,0.0C') && d.endsWith(' 20.0,10.0'), 'krzywa przechodzi przez każdy węzeł')
    // narożnik w węźle 1: ostatni punkt kontrolny odcinka 0 i pierwszy odcinka 1 leżą w węźle
    const ostra = sciezka(p, { gladka: true, ostre: [1] })
    assert.ok(ostra.includes('10.0,0.0 10.0,0.0C10.0,0.0'), ostra)
})

test('PH-04: szerokość w węzłach interpolowana po osi; wstęga zamknięta i szersza przy większej szerokości', () => {
    const pr = probkiOsi([[0, 0], [100, 0]], [2, 10], 5, {}, 4)
    assert.deepEqual(pr.map((q) => q[2]), [2, 4, 6, 8, 10])
    assert.equal(pr[2][0], 50)
    const d = wstega(pr)
    assert.match(d, /^M0\.0,1\.0/)        // lewy brzeg przy pierwszym węźle: połowa szerokości 2
    assert.ok(d.includes('L100.0,5.0') || d.includes('100.0,5.0A'), d) // przy ostatnim: połowa szerokości 10
    assert.ok(d.endsWith('Z'))
    assert.ok(wstega(pr, 2).includes('100.0,6.0'), 'dodatek poszerza wstęgę (brzeg, obwódka)')
})

test('PH-04/05: wstawienie i usunięcie węzła przenosi szerokości i ostre narożniki', () => {
    assert.deepEqual(poWstawieniu({ s: [2, 4, 8], ostre: [0, 2] }, 0), { s: [2, 3, 4, 8], ostre: [0, 3] })
    assert.deepEqual(poUsunieciu({ s: [2, 3, 4, 8], ostre: [0, 3] }, 1), { s: [2, 4, 8], ostre: [0, 2] })
    assert.deepEqual(poUsunieciu({ ostre: [1] }, 1), {})
})

test('PH3: popraw() przepuszcza tylko pola w dobrym kształcie; brak pól nie zmienia elementu', () => {
    assert.deepEqual(poprawPolaPH3({ s: [1, 2], gladka: true, ostre: [5, 1, 1], wyrownanie: 'x', tlo: 'tak', wzdluz: 'Zła', wskaznik: 'strzalka', kotwica: [0.2, 1.5], nrLegendy: ' 12 ', nieznanePolozenie: true }, 3),
        { gladka: true, ostre: [1], wskaznik: 'strzalka', nrLegendy: '12', nieznanePolozenie: true })
    assert.deepEqual(poprawPolaPH3({ s: [1, 2, 3], kotwica: [0, 1], wyrownanie: 'l', tlo: true, wzdluz: 'abcd2345' }, 3), { s: [1, 2, 3], kotwica: [0, 1], wyrownanie: 'l', tlo: true, wzdluz: 'abcd2345' })
    assert.deepEqual(poprawPolaPH3({ gladka: true }, 2), {}, 'krzywa potrzebuje co najmniej 3 węzłów')
    const plan = popraw({ slug: 'p', elementy: [{ id: 'a1', typ: 'rzeka', g: { k: 'l', p: [[0, 0], [5, 5], [9, 0]] }, s: [1, 2] } as never, { id: 'b1', typ: 'droga', g: { k: 'l', p: [[0, 0], [5, 5]] } } as never] })
    assert.equal(plan.elementy[0].s, undefined, 's o złej długości usunięte przy odczycie')
    assert.deepEqual(Object.keys(plan.elementy[1]).sort(), ['g', 'id', 'typ'])
})

test('PH-06: wiersze napisu i kierunek do czytania', () => {
    assert.deepEqual(wierszeNapisu('Rynek\nmiejski\n'), ['Rynek', 'miejski'])
    assert.deepEqual(wierszeNapisu('a\n\nb'), ['a', '', 'b'])
    const p: [number, number][] = [[10, 0], [0, 0]]
    assert.deepEqual(doCzytania(p), [[0, 0], [10, 0]], 'linia w lewo odwrócona')
    assert.deepEqual(doCzytania([[0, 0], [10, 0]], 180), [[10, 0], [0, 0]], 'przy obrocie planu o 180° też do czytania')
})

test('PH-07: linia od krawędzi etykiety do punktu; strzałka z grotem; punkt pod etykietą – bez linii; obrót etykiety', () => {
    const l = liniaWskazujaca([0, 0], 10, 2, [30, 0])!
    assert.equal(l.d, 'M10.0,0.0L30.0,0.0')
    const s = liniaWskazujaca([0, 0], 10, 2, [30, 0], 4)!
    assert.equal(s.d, 'M10.0,0.0L26.0,0.0')
    assert.ok(s.grot?.startsWith('M30.0,0.0'))
    assert.equal(liniaWskazujaca([0, 0], 10, 2, [5, 1]), null)
    // etykieta obrócona o 90°: jej szerokość leży w pionie – punkt 8 pod środkiem jest jeszcze pod etykietą
    assert.equal(liniaWskazujaca([0, 0], 10, 2, [0, 8], 0, 90), null)
    assert.deepEqual(punktKotwicy([[0, 0], [10, 20]], [1, 0.5]), [10, 10])
    assert.deepEqual(punktKotwicy([[0, 0], [10, 20]], undefined, [3, 3]), [3, 3])
})

test('PH-08: legenda w kolejności numerów; nowy powtórzony numer odrzucony przy zapisie, dawny nie blokuje', () => {
    assert.deepEqual(elementyLegendy([{ id: 'a', nrLegendy: '10' }, { id: 'b' }, { id: 'c', nrLegendy: '2' }, { id: 'd', nrLegendy: 'A' }]).map((e) => e.id), ['c', 'a', 'd'])
    const po = { elementy: [{ id: 'a', nrLegendy: '3' }, { id: 'b', nrLegendy: '3' }] }
    assert.match(nowyPowtorzonyNrLegendy({ elementy: [{ id: 'a', nrLegendy: '3' }, { id: 'b' }] }, po) ?? '', /powtórzony numer w legendzie planu: 3/)
    assert.equal(nowyPowtorzonyNrLegendy(po, po), null, 'powtórzenie sprzed zapisu nie blokuje pracy')
    assert.match(nowyPowtorzonyNrLegendy(null, { elementy: [{ id: 'a', nrLegendy: 'a' }, { id: 'b', nrLegendy: 'A' }] }) ?? '', /powtórzony/)
})

test('PH-08 (K3): „położenie nieznane” trafia do czytelnika (legenda), widoczność elementu obowiązuje jak zawsze', () => {
    const plan = popraw({ slug: 'p', widocznosc: 'publiczne', elementy: [
        { id: 'a1', typ: 'kosciol', g: { k: 'p', x: 1, y: 1 }, nazwa: 'kościół', nrLegendy: '2', nieznanePolozenie: true } as never,
        { id: 'b1', typ: 'kosciol', g: { k: 'p', x: 2, y: 2 }, nazwa: 'ukryty', nrLegendy: '3', widocznosc: 'ja' } as never,
    ] }) as Plan
    const L = dlaCzytelnika(plan, 'publiczne', { progLat: 25 } as never).elementy
    assert.deepEqual(L.map((e) => [e.id, e.nrLegendy, e.nieznanePolozenie]), [['a1', '2', true]])
})
