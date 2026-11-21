// Łatka 21.11: nowe karty same zapowiadają się na stronie głównej (bez wpisu, który dublowałby kartę) – dane syntetyczne.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MIN_OPISU, scalZWpisami, wybierzNowosci, type Nowosc } from './nowosci'

const opis = (t: string) => ({ t }) as never
const P = { tekst: (n: unknown) => (n as { t?: string } | null)?.t ?? '', reszta: (n: unknown) => n as never, rodzajMaterialu: (r: string) => `R:${r}`,
    rodzajTematu: (r: string) => r, rodzajObiektu: (r: string) => r, rodzajMiejsca: (r: string) => r, czas: (c: string) => `C:${c}` }
const DLUGI = 'x'.repeat(MIN_OPISU)
const mat = (id: string, dodano: string | null, o: Record<string, unknown> = {}) => ({ id, nazwa: `M ${id}`, rodzaj: 'dokument', czas: '1917-08-05', przekazal: 'zbiory rodzinne', miejsca: ['olszanka'], tematy: [], strony: [{ adres: '/pliki/strony/a/s-1.webp' }], plik: null, kadr: 'srodek', dodano, opis: opis(DLUGI), ...o }) as never

test('nowości: tylko z datą „Dodano”, nieodznaczone i z opisem co najmniej MIN_OPISU znaków; od najnowszych', () => {
    const n = wybierzNowosci({
        materialy: [mat('a', '2026-11-20'), mat('b', null), mat('c', '2026-11-21', { naGlownej: false }), mat('d', '2026-11-19', { opis: opis('za krótki') }), mat('e', '2026-11-22')],
        tematy: [{ id: 'mazurzenie', nazwa: 'Mazurzenie', rodzaj: 'zjawisko', czas: '', miejsca: [], dodano: '2026-11-21', opis: opis(DLUGI) } as never],
        obiekty: [], miejsca: [],
    }, P)
    assert.deepEqual(n.map((x) => x.klucz), ['material:e', 'temat:mazurzenie', 'material:a'])
    const a = n[2]
    assert.deepEqual([a.etykieta, a.linia, a.href, a.data], ['nowe w archiwum', ['R:dokument', 'C:1917-08-05', 'zbiory rodzinne'], '/archiwum/a', '2026-11-20'])
    assert.ok(a.obraz?.strony.length)
    assert.deepEqual([n[1].etykieta, n[1].href], ['nowe w leksykonie', '/leksykon/mazurzenie'])
})
test('nowości razem z wpisami: od najnowszych, przy tej samej dacie wpis pierwszy, limit', () => {
    const w = (id: string, data: string) => ({ id, data }) as never
    const x = (k: string, data: string) => ({ typ: 'nowosc', klucz: k, data }) as Nowosc
    const l = scalZWpisami([w('w1', '2026-11-20'), w('w2', '2026-11-10')], [x('n1', '2026-11-20'), x('n2', '2026-11-21'), x('n3', '2026-11-01')], 4)
    assert.deepEqual(l.map((e) => ('typ' in e ? e.klucz : (e as { id: string }).id)), ['n2', 'w1', 'n1', 'w2'])
})
