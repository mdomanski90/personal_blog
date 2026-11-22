// Decyzja 22.11: w polach osoby (materiał – „Powiązane osoby”, blok „Drzewo osoby”) działa identyfikator z drzewa i nr kat. „OS-…”
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { idOsoby, idsOsob } from './powiazane'

const drzewo = new Set(['maria-makaruk-1886', 'jan-testowy', 'os-12'])
const istnieje = (id: string) => drzewo.has(id)
const rejestr: Record<string, { rodzaj: string; id: string }> = { 'OS-0570': { rodzaj: 'osoba', id: 'maria-makaruk-1886' }, 'MA-0004': { rodzaj: 'material', id: 'x' }, 'OS-0012': { rodzaj: 'osoba', id: 'jan-testowy' } }
const zNumeru = (nr: string) => rejestr[nr]

test('identyfikator z drzewa – bez zmian; nr kat. OS-… – identyfikator osoby z rejestru', () => {
    assert.equal(idOsoby('maria-makaruk-1886', istnieje, zNumeru), 'maria-makaruk-1886')
    assert.equal(idOsoby('OS-0570', istnieje, zNumeru), 'maria-makaruk-1886')
    assert.equal(idOsoby(' os-570 ', istnieje, zNumeru), 'maria-makaruk-1886', 'zapis numeru jak na /k/ (wielkość liter, zera)')
})

test('nr kat. innego rodzaju albo nieznany – zostaje jak był (karta pominie, panel jakości ostrzeże)', () => {
    assert.equal(idOsoby('MA-0004', istnieje, zNumeru), 'MA-0004')
    assert.equal(idOsoby('OS-9999', istnieje, zNumeru), 'OS-9999')
    assert.equal(idOsoby('', istnieje, zNumeru), null)
})

test('identyfikator istniejącej osoby wygrywa z numerem o tym samym zapisie', () => {
    assert.equal(idOsoby('os-12', istnieje, zNumeru), 'os-12')
})

test('lista: rozwiązana, bez pustych i powtórzeń', () => {
    assert.deepEqual(idsOsob(['OS-0570', 'maria-makaruk-1886', '', 'jan-testowy'], istnieje, zNumeru), ['maria-makaruk-1886', 'jan-testowy'])
})
