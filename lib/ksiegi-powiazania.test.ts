import test from 'node:test'
import assert from 'node:assert/strict'
import { ksiegaDotyczyMiejsca } from './ksiegi-powiazania'

const miejscowosc = { id: 'miejscowosc-a', parafie: [{ parafia: 'parafia-a', od: 1600, do: 1788 }] }
const ksiega = { parafia: 'parafia-a', miejsca: [] as string[], zakresy: [[1826, 1858]] as [number, number][] }

test('stara przynależność nie obejmuje późniejszych ksiąg', () => {
    assert.equal(ksiegaDotyczyMiejsca(ksiega, miejscowosc), false)
})
test('jawnie wskazana miejscowosc jest uwzględniana także poza datami parafii', () => {
    assert.equal(ksiegaDotyczyMiejsca({ ...ksiega, miejsca: ['miejscowosc-a'] }, miejscowosc), true)
})
test('zamknięta lista miejsc w księdze wyklucza inne wsie', () => {
    assert.equal(ksiegaDotyczyMiejsca({ ...ksiega, miejsca: ['miejscowosc-b'] }, miejscowosc), false)
})
test('przedział lat przynależności ma pierwszeństwo przed okresem istnienia parafii', () => {
    assert.equal(ksiegaDotyczyMiejsca({ ...ksiega, zakresy: [[1700, 1750]] }, miejscowosc), true)
})
test('nieznany okres nie powoduje automatycznego przypisania ksiąg', () => {
    const m = { ...miejscowosc, parafie: [{ parafia: 'parafia-a', od: null, do: null }] }
    assert.equal(ksiegaDotyczyMiejsca(ksiega, m), false)
})
test('częściowo udokumentowany okres jest uwzględniany', () => {
    const m = { ...miejscowosc, parafie: [{ parafia: 'parafia-a', od: 1800, do: null }] }
    assert.equal(ksiegaDotyczyMiejsca(ksiega, m), true)
})
test('wiele przedziałów lat zachowuje luki', () => {
    const m = { ...miejscowosc, parafie: [{ parafia: 'parafia-a', od: 1826, do: 1858 }] }
    assert.equal(ksiegaDotyczyMiejsca({ ...ksiega, zakresy: [[1826, 1830], [1850, 1858]] }, m), true)
    assert.equal(ksiegaDotyczyMiejsca({ ...ksiega, zakresy: [[1800, 1810]] }, m), false)
})

test('księga powiązana z wieloma instytucjami może dotyczyć ich miejscowości', () => {
    const ks = { ...ksiega, parafia: '', instytucje: ['parafia-a', 'parafia-b'], zakresy: [[1700, 1750]] as [number, number][] }
    assert.equal(ksiegaDotyczyMiejsca(ks, miejscowosc), true)
    const inne = { id: 'miejscowosc-b', parafie: [{ parafia: 'parafia-b', od: 1700, do: 1800 }] }
    assert.equal(ksiegaDotyczyMiejsca(ks, inne), true)
})


test('księga bez ustalonego wytwórcy jest widoczna dla wsi przypisanej wprost', () => {
    const ks = { parafia: '', instytucje: [] as string[], miejsca: ['miejscowosc-a'], zakresy: [[1850, 1850]] as [number, number][] }
    assert.equal(ksiegaDotyczyMiejsca(ks, miejscowosc), true)
    assert.equal(ksiegaDotyczyMiejsca({ ...ks, miejsca: [] }, miejscowosc), false)
})
