import { test } from 'node:test'
import assert from 'node:assert/strict'
import { popraw, type Plan } from './model'
import { bladMetadanych, rodzajPlanu, stopienNapisu, ROZMIAR_STOPNIA, PROG_FILTROW_DOMYSLNY, planyWKolejnosci } from './metadane'

// dane wyłącznie syntetyczne
const baza = { slug: 'plan-testowy', tytul: 'Plan testowy' }

test('brak pól = dzisiejsze zachowanie: rodzaj cmentarz, metadane nieobecne', () => {
    const p = popraw(baza)
    assert.equal(rodzajPlanu(p), 'cmentarz')
    assert.equal(p.rodzaj, undefined)
    assert.equal(p.okres, undefined)
    assert.equal(p.zrodlo, undefined)
})

test('popraw zachowuje poprawne metadane i odrzuca błędne kształty', () => {
    const p = popraw({
        ...baza, rodzaj: 'historyczny', okres: '1939', sporzadzono: '198X', rodzajZrodla: 'wspomnieniowy', tworca: 'Autor X',
        zrodlo: { material: 'material-a', opis: 'szkic' }, prawa: 'do ustalenia', dokladnosc: 'schematyczny', zasieg: 'centrum', wyrozniony: true, kolejnosc: 2,
    } as Partial<Plan> & { slug: string })
    assert.equal(p.rodzaj, 'historyczny')
    assert.equal(p.okres, '1939')
    assert.equal(p.sporzadzono, '198X')
    assert.deepEqual(p.zrodlo, { material: 'material-a', opis: 'szkic' })
    assert.equal(p.dokladnosc, 'schematyczny')
    assert.equal(p.wyrozniony, true)
    assert.equal(p.kolejnosc, 2)
    const zly = popraw({ ...baza, rodzaj: 'wies', dokladnosc: 'dokladny', rodzajZrodla: 'x', zrodlo: { material: '../x' }, kolejnosc: 'a', wyrozniony: 'tak' } as unknown as Partial<Plan> & { slug: string })
    assert.equal(zly.rodzaj, undefined)
    assert.equal(zly.dokladnosc, undefined)
    assert.equal(zly.rodzajZrodla, undefined)
    assert.equal(zly.zrodlo, undefined)
    assert.equal(zly.kolejnosc, undefined)
    assert.equal(zly.wyrozniony, undefined)
})

test('walidacja przy zapisie: błędna data EDTF i zły identyfikator materiału odrzucone z opisem', () => {
    assert.equal(bladMetadanych(popraw({ ...baza, okres: '1939' })), null)
    assert.match(bladMetadanych({ ...popraw(baza), okres: 'przed wojną' }) ?? '', /stan przedstawiony/)
    assert.match(bladMetadanych({ ...popraw(baza), sporzadzono: '19-39' }) ?? '', /sporządzono/)
    assert.match(bladMetadanych({ ...popraw(baza), podklady: [{ material: { id: 'Zły/Id', strona: 0 } }] }) ?? '', /materiał/)
})

test('podkład wskazujący stronę materiału zostaje, stary podkład z plikiem bez zmian', () => {
    const p = popraw({ ...baza, podklady: [
        { id: 'a', plik: 'skan.jpg', nazwa: 'stary', szer: 10, wys: 10, macierz: [1, 0, 0, 1, 0, 0], krycie: 1, widocznosc: 'edycja' },
        { id: 'b', plik: '', nazwa: 'z archiwum', szer: 10, wys: 10, macierz: [1, 0, 0, 1, 0, 0], krycie: 1, widocznosc: 'publiczne', material: { id: 'kartka-1917', strona: 1 } },
    ] })
    assert.equal(p.podklady[0].material, undefined)
    assert.equal(p.podklady[0].plik, 'skan.jpg')
    assert.deepEqual(p.podklady[1].material, { id: 'kartka-1917', strona: 1 })
})

test('napisy w 6 stopniach: stare s/m/l czytane bez migracji, te same wielkości co dotąd', () => {
    assert.equal(stopienNapisu({ rozmiar: 's' }), 2)
    assert.equal(stopienNapisu({ rozmiar: 'm' }), 3)
    assert.equal(stopienNapisu({ rozmiar: 'l' }), 5)
    assert.equal(stopienNapisu({ stopien: 6, rozmiar: 's' }), 6)
    assert.equal(stopienNapisu({}, 3), 3)
    assert.equal(stopienNapisu({ stopien: 9 as never }, 2), 2)
    assert.deepEqual([ROZMIAR_STOPNIA[2], ROZMIAR_STOPNIA[3], ROZMIAR_STOPNIA[5]], [0.8, 1.05, 1.5])
    const p = popraw({ ...baza, elementy: [{ id: 'n', typ: 'napis', g: { k: 't', x: 0, y: 0, a: 0 }, stopien: 12 as never }] })
    assert.equal(p.elementy[0].stopien, undefined)
})

test('kolejność planów miejscowości: wyróżniony, potem kolejność, potem stan przedstawiony, potem tytuł; próg filtrów 7', () => {
    const p = (slug: string, r: Partial<Plan>) => popraw({ slug, tytul: slug, ...r })
    const L = planyWKolejnosci([p('c', { okres: '1939' }), p('a', { okres: '1880' }), p('b', { kolejnosc: 1 }), p('d', { wyrozniony: true })])
    assert.deepEqual(L.map((x) => x.slug), ['d', 'b', 'a', 'c'])
    assert.equal(PROG_FILTROW_DOMYSLNY, 7)
})
