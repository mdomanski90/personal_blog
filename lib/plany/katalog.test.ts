import { test } from 'node:test'
import assert from 'node:assert/strict'
import { popraw, dlaCzytelnika, type Element } from './model'
import { katalog, USTAWIENIA_DOMYSLNE } from './typy'
import { adresPlanu, opisPlanu } from './katalog'

// dane wyłącznie syntetyczne
const grob = (id: string, r: Partial<Element> = {}): Element => ({ id, typ: 'grob', g: { k: 'r', x: 0, y: 0, w: 1, h: 2, a: 0 }, ...r })

test('opis planu cmentarza liczy groby z wersji dla czytelnika – element ukryty nie zwiększa liczby', () => {
    const pelny = popraw({ slug: 'c', elementy: [grob('a'), grob('b'), grob('c', { widocznosc: 'ja' })] })
    const typy = katalog()
    assert.equal(opisPlanu(dlaCzytelnika(pelny, 'publiczne', USTAWIENIA_DOMYSLNE), typy).prawa, '2 groby')
    assert.equal(opisPlanu(pelny, typy).prawa, '3 groby')
})

test('opis planu historycznego: rodzaj, dwie daty, źródło; prawa = stan przedstawiony', () => {
    const p = popraw({ slug: 'h', rodzaj: 'historyczny', okres: '1939', sporzadzono: '198X', rodzajZrodla: 'wspomnieniowy', tworca: 'Autor X', elementy: [] })
    const o = opisPlanu(p, katalog())
    assert.equal(o.prawa, '1939')
    assert.deepEqual(o.pola.map(([e]) => e), ['rodzaj', 'stan przedstawiony', 'sporządzono', 'źródło', 'na planie'])
    assert.equal(o.pola.find(([e]) => e === 'źródło')?.[1], 'szkic z pamięci · Autor X')
    assert.equal(o.linia, 'plan historyczny · 1939')
})

test('adres planu ze skanu: strona materiału tylko, gdy czytelnik widzi materiał', () => {
    const p = popraw({ slug: 'h', zrodlo: { material: 'skan-a' } })
    assert.equal(adresPlanu(p, new Set(['skan-a'])), '/archiwum/skan-a#rekonstrukcja')
    assert.equal(adresPlanu(p, new Set()), '/plany/h')
    assert.equal(adresPlanu(popraw({ slug: 'c' }), new Set(['skan-a'])), '/plany/c')
})
