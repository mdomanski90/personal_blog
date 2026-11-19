// P6b (PD-10): „połącz” – wzmianki z kontekstem, wybór, wstawienie od końca, ochrona przed zmienionym tekstem (dane syntetyczne).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { polaczWTekscie, rozdzielPlik, wzmiankiWTekscie, wzorcePozycji, type TekstDoPolaczenia } from './polacz'
import { slownikOdnosnikow, type PozycjaSieci } from '../odnosniki'

const POZ: PozycjaSieci[] = [
    { cel: { rodzaj: 'miejsce', id: 'wola', nazwa: 'Wola', adres: '/miejsca/wola' }, nazwy: ['Wola', 'Woli'] },
    { cel: { rodzaj: 'miejsce', id: 'wola-przykladowa', nazwa: 'Wola Przykładowa', adres: '/miejsca/wola-przykladowa' }, nazwy: ['Wola Przykładowa', 'Woli Przykładowej'] },
    { cel: { rodzaj: 'obiekt', id: 'mlyn', nazwa: 'Młyn Testowy', adres: '/obiekty/mlyn' }, nazwy: ['Młyn Testowy'] },
    { cel: { rodzaj: 'haslo', id: 'kluka', nazwa: 'kluka', adres: '/biblioteka/slownik/kluka' }, nazwy: ['kluka'] },
    { cel: { rodzaj: 'temat', id: 'bieg', nazwa: 'bieżeństwo', adres: '/tematy/bieg' }, nazwy: ['bieżeństwo'] },
]
const rozwiaz = slownikOdnosnikow(POZ)
const wz = wzorcePozycji(POZ)
const ZRODLO = { rodzaj: 'temat' as const, id: 'bieg', nazwa: 'bieżeństwo', adres: '/tematy/bieg' }
const tekst = (zawartosc: string, extra: Partial<TekstDoPolaczenia> = {}): TekstDoPolaczenia => ({ plik: 'content/tematy/bieg.mdoc', zrodlo: ZRODLO, zawartosc, zwiazane: new Set(), ...extra })
const PLIK = `---\ntitle: bieżeństwo\n---\nW Woli Przykładowej stał Młyn Testowy. Z Woli wyjechano w 1915. W Woli była kluka.\n\n# Wola w nagłówku\n\n[[Młyn Testowy]] i \`Wola\` w kodzie.\n`

test('PD-10: wzmianki z kontekstem; dłuższa nazwa wygrywa; pierwsza zaznaczona; własny tekst i hasła pominięte', () => {
    const w = wzmiankiWTekscie(tekst(PLIK), wz, rozwiaz)
    assert.deepEqual(w.map((x) => [x.cel.id, x.slowo, x.pierwsza]), [['wola-przykladowa', 'Woli Przykładowej', true], ['wola', 'Woli', true], ['wola', 'Woli', false]])
    // Młyn ma już odnośnik w tekście → nie jest wzmianką; nagłówek i kod pominięte; temat nie łączy się sam ze sobą
    assert.ok(!w.some((x) => x.cel.id === 'mlyn' || x.cel.id === 'bieg' || x.cel.id === 'kluka'))
    assert.match(w[1].przed, /stał Młyn Testowy\. Z $/)
    assert.equal(w[0].nowy, '[[Wola Przykładowa|Woli Przykładowej]]')
    assert.ok(w[0].start > rozdzielPlik(PLIK).naglowek.length)
})

test('PD-10: pozycja powiązana polem w panelu nie jest wzmianką', () => {
    const w = wzmiankiWTekscie(tekst(PLIK, { zwiazane: new Set(['miejsce:wola']) }), wz, rozwiaz)
    assert.ok(!w.some((x) => x.cel.id === 'wola'))
})

test('PD-10: wstawienie wybranych od końca; nagłówek YAML bez zmian; zmieniony tekst → błąd', () => {
    const w = wzmiankiWTekscie(tekst(PLIK), wz, rozwiaz)
    const wynik = polaczWTekscie(PLIK, [w[0], w[2]])
    assert.ok(wynik.startsWith('---\ntitle: bieżeństwo\n---\n'))
    assert.match(wynik, /W \[\[Wola Przykładowa\|Woli Przykładowej\]\] stał .* Z Woli wyjechano .* W \[\[Wola\|Woli\]\] była kluka/)
    // po wstawieniu wybrane miejsca nie są już wzmiankami, a pozostała pierwsza „Woli” – tak
    const po = wzmiankiWTekscie(tekst(wynik), wz, rozwiaz)
    assert.equal(po.filter((x) => x.cel.id === 'wola-przykladowa').length, 0)
    assert.equal(po.filter((x) => x.cel.id === 'wola').length, 0) // [[Wola|…]] w tekście = już połączone
    assert.throws(() => polaczWTekscie(PLIK.replace('Z Woli', 'Ze wsi'), [w[1]]), /zmienił się/)
})
