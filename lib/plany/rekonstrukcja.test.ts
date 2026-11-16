import { test } from 'node:test'
import assert from 'node:assert/strict'
import { popraw, dlaCzytelnika, type Podklad } from './model'
import { USTAWIENIA_DOMYSLNE } from './typy'
import { odwrocMacierz, wybierzRekonstrukcje } from './rekonstrukcja'

// dane wyłącznie syntetyczne
const podklad = (r: Partial<Podklad> = {}): Podklad => ({ id: 'p', plik: '', nazwa: 'skan', szer: 2000, wys: 1500, macierz: [0.5, 0, 0, 0.5, 10, 20], krycie: 1, widocznosc: 'edycja', material: { id: 'skan-a', strona: 1 }, ...r })

test('macierz odwrotna: punkt planu wraca do piksela skanu', () => {
    const M: [number, number, number, number, number, number] = [0.5, 0.1, -0.1, 0.5, 10, 20]
    const inv = odwrocMacierz(M)!
    const [a, b, c, d, e, f] = M, [x, y] = [300, 400]
    const px = a * x + c * y + e, py = b * x + d * y + f
    assert.ok(Math.abs(inv[0] * px + inv[2] * py + inv[4] - x) < 1e-9)
    assert.ok(Math.abs(inv[1] * px + inv[3] * py + inv[5] - y) < 1e-9)
    assert.equal(odwrocMacierz([0, 0, 0, 0, 1, 1]), null)
})

test('warstwa tylko dla planu widocznego dla czytelnika, z podkładem z tego materiału; podkład „tylko edycja” daje geometrię', () => {
    const jawny = popraw({ slug: 'h', widocznosc: 'publiczne', zrodlo: { material: 'skan-a' }, podklady: [podklad()] })
    const ukryty = popraw({ slug: 'u', widocznosc: 'ja', zrodlo: { material: 'skan-a' }, podklady: [podklad()] })
    const dla = (L: typeof jawny[]) => L.filter((p) => p.widocznosc === 'publiczne').map((p) => dlaCzytelnika(p, 'publiczne', USTAWIENIA_DOMYSLNE))
    const w = wybierzRekonstrukcje('skan-a', [ukryty, jawny], dla([ukryty, jawny]))
    assert.equal(w?.plan.slug, 'h')
    assert.equal(w?.podklad.strona, 1)
    assert.equal(w?.plan.podklady.length, 0) // czytelnik nie dostaje podkładu „tylko edycja” – rysujemy na stronie materiału
    assert.equal(wybierzRekonstrukcje('skan-a', [ukryty], dla([ukryty])), null)
    assert.equal(wybierzRekonstrukcje('skan-b', [jawny], dla([jawny])), null)
})
