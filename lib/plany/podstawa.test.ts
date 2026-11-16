import { test } from 'node:test'
import assert from 'node:assert/strict'
import { popraw, dlaCzytelnika, type Element } from './model'
import { USTAWIENIA_DOMYSLNE } from './typy'
import { odnosnikiElementu, podstawaDlaCzytelnika } from './podstawa'

// dane wyłącznie syntetyczne
const ratusz = (r: Partial<Element> = {}): Element => ({ id: 'r1', typ: 'ratusz', g: { k: 'p', x: 1, y: 1 }, ...r })

test('PH-02/09/19: pola elementu zostają w dobrym kształcie, złe są odrzucane', () => {
    const p = popraw({ slug: 'h', elementy: [ratusz({ powiazania: ['obj-ratusz', 'zły/cel', 'obj-ratusz'], podstawa: [{ material: 'szkic-a', objasnienie: 'o-abcd1234' }, { material: 'Zły' } as never, { material: 'szkic-a', objasnienie: 'x' }], nazwaZrodlowa: '  Magistrat ', identyfikacja: 'przypuszczalna' })] })
    const e = p.elementy[0]
    assert.deepEqual(e.powiazania, ['obj-ratusz'])
    assert.deepEqual(e.podstawa, [{ material: 'szkic-a', objasnienie: 'o-abcd1234' }, { material: 'szkic-a' }])
    assert.equal(e.nazwaZrodlowa, 'Magistrat')
    assert.equal(e.identyfikacja, 'przypuszczalna')
    const zly = popraw({ slug: 'h', elementy: [ratusz({ identyfikacja: 'może' as never, powiazania: 'obj-a' as never })] }).elementy[0]
    assert.equal(zly.identyfikacja, undefined)
    assert.equal(zly.powiazania, undefined)
})

test('czytelnik nie dostaje surowych identyfikatorów powiązań i podstawy (mogą wskazywać pozycje ukryte); niepewność i nazwa ze źródła są publiczne', () => {
    const p = popraw({ slug: 'h', widocznosc: 'publiczne', elementy: [ratusz({ powiazania: ['obj-ukryty'], podstawa: [{ material: 'szkic-ukryty' }], nazwaZrodlowa: 'Magistrat', identyfikacja: 'nieustalona' })] })
    const e = dlaCzytelnika(p, 'publiczne', USTAWIENIA_DOMYSLNE).elementy[0]
    assert.equal(e.powiazania, undefined)
    assert.equal(e.podstawa, undefined)
    assert.equal(e.nazwaZrodlowa, 'Magistrat')
    assert.equal(e.identyfikacja, 'nieustalona')
})

test('odnośniki i podstawa dla czytelnika – tylko cele i objaśnienia, które widzi', () => {
    const widoczne = new Map([['obj-ratusz', { nazwa: 'Ratusz', adres: '/obiekty/obj-ratusz' }]])
    assert.deepEqual(odnosnikiElementu(['obj-ratusz', 'obj-ukryty'], (id) => widoczne.get(id) ?? null), [{ nazwa: 'Ratusz', adres: '/obiekty/obj-ratusz' }])
    const mat = new Set(['szkic-a']), obj = new Set(['o-abcd1234'])
    assert.deepEqual(podstawaDlaCzytelnika([{ material: 'szkic-a', objasnienie: 'o-abcd1234' }, { material: 'szkic-a', objasnienie: 'o-ukryte00' }, { material: 'szkic-ukryty' }], mat, obj),
        [{ material: 'szkic-a', objasnienie: 'o-abcd1234' }, { material: 'szkic-a' }])
})
