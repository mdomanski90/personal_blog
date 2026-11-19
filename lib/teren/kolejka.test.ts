// P7b-2 (TER-06): kolejka w telefonie – ocena odpowiedzi, kolejność, cudze konto, plan z czekającymi czynnościami, wygasanie.
// Dane syntetyczne.
import test from 'node:test'
import assert from 'node:assert/strict'
import { popraw, type Element } from '../plany/model'
import { USTAWIENIA_DOMYSLNE } from '../plany/typy'
import { cudze, czyLokalny, doWyslania, ocenOdpowiedz, opisPozycji, plikLokalny, rozmiar, wygaslo, wymiaryPoZmniejszeniu, zOczekujacymi, type PozycjaKolejki } from './kolejka'

const U = USTAWIENIA_DOMYSLNE
const grob = (id: string, x: number, w: Partial<Element> = {}): Element => ({ id, typ: 'grob', g: { k: 'r', x, y: 0, w: 10, h: 20, a: 0 }, ...w }) as Element
const JAN = { id: 'k-jan', imie: 'Jan Testowy', pelne: false }
const cz = (id: string, czas: string, w: Partial<PozycjaKolejki> & Record<string, unknown>): PozycjaKolejki =>
    ({ id, konto: 'k-jan', czas, stan: 'czeka', rodzaj: 'czynnosc', plan: 'cmentarz-testowo', tytul: 'cmentarz w Testowie', czynnosc: { id, rodzaj: 'notatka', grob: 'a', tekst: 'x' }, ...w }) as PozycjaKolejki

test('ocena odpowiedzi: brak sieci i błędy serwera – ponów; 401 – zaloguj; 403/404/409/413/422 – problem z opisem', () => {
    assert.deepEqual(ocenOdpowiedz('siec'), { co: 'ponow' })
    assert.deepEqual(ocenOdpowiedz(502), { co: 'ponow' })
    assert.deepEqual(ocenOdpowiedz(503, 'panel zamknięty'), { co: 'ponow' })
    assert.deepEqual(ocenOdpowiedz(200), { co: 'wyslane' })
    assert.deepEqual(ocenOdpowiedz(401), { co: 'zaloguj' })
    assert.equal(ocenOdpowiedz(404).co, 'problem')
    assert.match((ocenOdpowiedz(403) as { blad: string }).blad, /nie jest już przydzielony/)
    assert.deepEqual(ocenOdpowiedz(422, 'Dodaj zdjęcie albo wpisz nazwę.'), { co: 'problem', blad: 'Dodaj zdjęcie albo wpisz nazwę.' })
    assert.equal(ocenOdpowiedz(400).co, 'problem')
})

test('kolejność wysyłki: od najstarszej, tylko czekające i tylko bieżącego konta; cudze osobno', () => {
    const L = [cz('c3', '2026-11-19T10:03:00Z', {}), cz('c1', '2026-11-19T10:01:00Z', {}), cz('c2', '2026-11-19T10:02:00Z', { stan: 'problem' }), cz('c0', '2026-11-19T10:00:00Z', { konto: 'k-ola' })]
    assert.deepEqual(doWyslania(L, 'k-jan').map((p) => p.id), ['c1', 'c3'])
    assert.deepEqual(cudze(L, 'k-jan').map((p) => p.id), ['c0'])
})

test('plan z czekającymi czynnościami: zdjęcie z nazwą lokalną, napis i notatka nałożone jak na serwerze; inny plan i inne konto pominięte', () => {
    const plan = popraw({ slug: 'cmentarz-testowo', tytul: 'cmentarz w Testowie', elementy: [grob('a', 0), grob('b', 20, { napis: 'Maria' })] })
    const L: PozycjaKolejki[] = [
        cz('zd-0001aaaa', '2026-11-19T10:00:00Z', { czynnosc: { id: 'zd-0001aaaa', rodzaj: 'zdjecie', grob: 'a', plik: 'zdjecie.jpg', lat: 52.1, lon: 22.1 } }),
        cz('np-0001aaaa', '2026-11-19T10:01:00Z', { czynnosc: { id: 'np-0001aaaa', rodzaj: 'napis', grob: 'b', napis: 'Maria Testowa', podstawa: 'Maria' } }),
        cz('np-0002aaaa', '2026-11-19T10:02:00Z', { plan: 'cmentarz-przykladowo', czynnosc: { id: 'np-0002aaaa', rodzaj: 'notatka', grob: 'a', tekst: 'inny plan' } }),
        cz('np-0003aaaa', '2026-11-19T10:03:00Z', { konto: 'k-ola', czynnosc: { id: 'np-0003aaaa', rodzaj: 'notatka', grob: 'a', tekst: 'Ola' } }),
        cz('np-0004aaaa', '2026-11-19T10:04:00Z', { czynnosc: { id: 'np-0004aaaa', rodzaj: 'notatka', grob: 'zniknal', tekst: 'grobu nie ma' } }),
    ]
    const p = zOczekujacymi(plan, L, JAN, U, new Date('2026-11-19T11:00:00Z'))
    const a = p.elementy.find((e) => e.id === 'a')!, b = p.elementy.find((e) => e.id === 'b')!
    assert.deepEqual(a.zdjecia?.map((z) => z.plik), [plikLokalny('zd-0001aaaa')])
    assert.ok(czyLokalny(a.zdjecia![0].plik) && a.zTerenu?.kto === 'k-jan')
    assert.equal(b.napis, 'Maria Testowa')
    assert.equal(a.notatka, undefined, 'notatka z innego planu i z innego konta pominięta')
    assert.equal(plan.elementy[0].zdjecia, undefined, 'pobrany plan bez zmian')
})

test('dane w telefonie wygasają po 30 dniach bez otwarcia; zła data – wygasło', () => {
    const T = new Date('2026-12-19T12:00:00Z')
    assert.equal(wygaslo('2026-11-20T12:00:00Z', T), false)
    assert.equal(wygaslo('2026-11-19T11:00:00Z', T), true)
    assert.equal(wygaslo('', T), true)
})

test('rozmiar i zmniejszanie zdjęcia: 2400 px dłuższego boku, bez powiększania', () => {
    assert.equal(rozmiar(500), '1 kB')
    assert.equal(rozmiar(3.4 * 1024 * 1024), '3,4 MB')
    assert.equal(rozmiar(38.2 * 1024 * 1024), '38 MB')
    assert.deepEqual(wymiaryPoZmniejszeniu(4032, 3024), { szer: 2400, wys: 1800 })
    assert.deepEqual(wymiaryPoZmniejszeniu(3024, 4032), { szer: 1800, wys: 2400 })
    assert.deepEqual(wymiaryPoZmniejszeniu(1200, 900), { szer: 1200, wys: 900 })
})

test('opis pozycji na liście „do wysłania”', () => {
    assert.deepEqual(opisPozycji(cz('c1', 't', { numer: 'A · rząd 2 · miejsce 5', czynnosc: { id: 'c1', rodzaj: 'napis', grob: 'a', napis: 'x' } }), () => ''), { tytul: 'cmentarz w Testowie · A · rząd 2 · miejsce 5', opis: 'napis z nagrobka' })
    assert.deepEqual(opisPozycji({ id: 'm1', konto: 'k', czas: 't', stan: 'czeka', rodzaj: 'miejsce', pola: { rodzaj: 'krzyz', nazwa: '', notatka: '' }, zdjec: 2 }, () => 'krzyż przydrożny'), { tytul: 'krzyż przydrożny', opis: 'nowe miejsce · zdjęcia: 2' })
})
