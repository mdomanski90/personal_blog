import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dataWydruku, napisCss } from './druk'

test('data wydruku DD.MM.RRRR z zerami wiodącymi', () => {
    assert.equal(dataWydruku(new Date(2026, 10, 6)), '06.11.2026')
    assert.equal(dataWydruku(new Date(1999, 0, 31)), '31.01.1999')
})

test('napis CSS: cudzysłów i ukośnik zabezpieczone, białe znaki zwinięte', () => {
    assert.equal(napisCss('Akt chrztu  „Piotra”\n1848'), '"Akt chrztu „Piotra” 1848"')
    assert.equal(napisCss('a "b" \\ c'), '"a \\"b\\" \\\\ c"')
})
