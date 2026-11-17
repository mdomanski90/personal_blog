// PH-20 · referencyjny test planu „przedwojenne Łosice” – scenariusz odtworzony na danych SYNTETYCZNYCH (prawa do skanu
// szkicu nieustalone, plan właściciela tylko na kopii): plan historyczny ze skanu materiału, legenda numerowana w jednym
// ciągu 2–13 (K3), obiekt „położenie nieznane”, identyfikacja przypuszczalna, objaśnienia skanu, styl „atrament”.
// Sprawdza całą ścieżkę czytelnika: zapis → popraw → dlaCzytelnika → wybór rekonstrukcji → przeglądarka (PH4).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dlaCzytelnika, popraw, type Element, type Plan } from './model'
import { katalog, USTAWIENIA_DOMYSLNE } from './typy'
import { elementyLegendy, powtorzoneNumeryLegendy } from './ph3'
import { wybierzRekonstrukcje } from './rekonstrukcja'
import { bladMetadanych } from './metadane'
import { elementyNawigacji, interfejsPlanu, obiektyListy, stanPlanu, szukajNaPlanie, znakObjasnienia } from './przegladarka'

const typy = katalog()
const pkt = (id: string, typ: string, nr: string, nazwa: string, reszta: Partial<Element> = {}): Element => ({ id, typ, nrLegendy: nr, nazwa, g: { k: 'p', x: 100 + Number(nr) * 40, y: 300 }, ...reszta })

function planReferencyjny(): Plan {
    return popraw({
        slug: 'przedwojenne-testowo', tytul: 'Przedwojenne Testowo (szkic)', widocznosc: 'publiczne', szer: 1200, wys: 1600,
        rodzaj: 'historyczny', okres: '1939', sporzadzono: '198X', rodzajZrodla: 'wspomnieniowy', tworca: 'Autor X', dokladnosc: 'schematyczny',
        zrodlo: { material: 'szkic-testowa' }, prawa: 'do ustalenia', styl: 'atrament',
        podklady: [{ id: 'p1', plik: '', nazwa: 'strona 1', szer: 1200, wys: 1600, macierz: [1, 0, 0, 1, 0, 0], krycie: 1, widocznosc: 'publiczne', material: { id: 'szkic-testowa', strona: 0 } }],
        elementy: [
            { id: 'rynek', typ: 'napis', nazwa: 'RYNEK', g: { k: 't', x: 600, y: 500, a: 0 } },
            pkt('kos', 'kosciol', '2', 'kościół', { nazwaZrodlowa: 'Church', notatka: 'robocza – nie dla czytelnika', etap: 'opracowany' } as Partial<Element>),
            ...Array.from({ length: 10 }, (_, i) => pkt(`o${i + 3}`, 'krzyz', String(i + 3), `obiekt ${i + 3}`)),
            pkt('mlyn', 'krzyz', '13', 'młyn', { identyfikacja: 'przypuszczalna' }),
            pkt('karczma', 'krzyz', '14', 'karczma', { nieznanePolozenie: true }),
        ],
    } as Partial<Plan> & { slug: string })
}

test('PH-20: zapis planu referencyjnego przechodzi walidację, a numery legendy tworzą jeden ciąg bez powtórzeń (K3)', () => {
    const p = planReferencyjny()
    assert.equal(bladMetadanych(p), null)
    assert.equal(powtorzoneNumeryLegendy(p.elementy).size, 0)
    assert.deepEqual(elementyLegendy(p.elementy).map((e) => e.nrLegendy), ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'])
    assert.equal(p.styl, 'atrament')
})

test('PH-20: czytelnik publiczny – bez pól roboczych; rekonstrukcja wybrana dla materiału; legenda z „położenie nieznane”', () => {
    const pelny = planReferencyjny()
    const pub = dlaCzytelnika(pelny, 'publiczne', USTAWIENIA_DOMYSLNE)
    const kos = pub.elementy.find((e) => e.id === 'kos')!
    assert.equal((kos as Element & { notatka?: string }).notatka, undefined)
    assert.equal(kos.etap, undefined)
    assert.equal(kos.nazwaZrodlowa, 'Church')
    const r = wybierzRekonstrukcje('szkic-testowa', [pelny], [pub])
    assert.ok(r, 'materiał ma warstwę rekonstrukcji')
    assert.equal(r!.podklad.strona, 0)
    assert.ok(elementyLegendy(r!.plan.elementy).some((e) => e.id === 'karczma' && e.nieznanePolozenie))
})

test('PH-20 / PH-13 / PH4: przeglądarka planu historycznego bez interfejsu grobowego; lista obiektów, szukanie, litery objaśnień', () => {
    const pub = dlaCzytelnika(planReferencyjny(), 'publiczne', USTAWIENIA_DOMYSLNE)
    const i = interfejsPlanu(pub)
    assert.equal(i.grobowy, false)
    assert.equal(i.zakladkaListy, 'lista obiektów')
    assert.equal(stanPlanu(pub, typy, new Set()).groby, 0)
    // lista obiektów: numery legendy po kolei, bez samych napisów i bez obiektów bez położenia
    const lista = obiektyListy(pub, typy).map((e) => e.nrLegendy)
    assert.deepEqual(lista, ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'])
    assert.deepEqual(elementyNawigacji(pub, typy, new Map()).map((e) => e.id)[0], 'kos')
    assert.deepEqual(szukajNaPlanie(pub, 'church').map((e) => e.id), ['kos'])
    // plan ma legendę numerowaną → objaśnienia skanu literami
    assert.equal(znakObjasnienia(0, pub.elementy.some((e) => e.nrLegendy)), 'a')
})
