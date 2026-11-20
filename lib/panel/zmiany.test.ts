import { test } from 'node:test'
import assert from 'node:assert/strict'
import { opisTechniczny } from './zmiany'

const r = (p: string) => opisTechniczny(p.split('/'))

test('ostatnie zmiany: kopie wersji i stan pracy panelu pomijane (zrzut właściciela 20.11: 7 z 10 wierszy; konta.json zapisuje się przy logowaniu)', () => {
    for (const p of ['_historia/hasla/mowic-po-chachlacku.yaml/20261120-080851-70903-89e8', '_historia/hasla/mowic-po-chachlacku.yaml/20261120-080851-70903-89e8.kto',
        '_panel/praca-0b923c7e-c958-46e1-9b33-fdd26bc11fc9.json', '_panel/konta.json', '_panel/jakosc.json', '_panel/listy.json', '_panel/katalog.json', '_kosz/x.json', '_operacje/1.json', '_nieznany/a'])
        assert.deepEqual(r(p), { pomin: true }, p)
})

test('ostatnie zmiany: ustawienia z nazwą i miejscem w panelu, skrzynka „z terenu” jednym wierszem', () => {
    assert.deepEqual(r('_panel/przekierowania.json'), { opis: 'przekierowania adresów', href: '/keystatic/singleton/przekierowania', klucz: '_panel/przekierowania.json' })
    assert.equal((r('_panel/strona-glowna.yaml') as { opis: string }).opis, 'strona główna (ustawienia)')
    assert.equal((r('_teren/miejsca/abc.json') as { klucz: string }).klucz, '_teren')
})

test('ostatnie zmiany: zwykła treść nie jest plikiem technicznym', () => {
    for (const p of ['hasla/mowic-po-chachlacku.yaml', 'plany/_zgloszenia/x.json', 'osoby/I1.json', 'o-projekcie.mdoc']) assert.equal(r(p), null, p)
})
