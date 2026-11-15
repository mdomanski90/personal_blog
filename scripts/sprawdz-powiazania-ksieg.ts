// Raport diagnostyczny (tylko odczyt); uruchom: npx tsx scripts/sprawdz-powiazania-ksieg.ts
// Nie poprawia ani nie nadpisuje plików Keystatic, również po zmianie slugów.
import { dlaEksportu } from '../lib/archiwum'

async function main() {
    const [parafie, miejsca, ksiegi] = await Promise.all([
        dlaEksportu.parafie(), dlaEksportu.miejsca(), dlaEksportu.ksiegi(),
    ])
    const idParafii = new Set(parafie.map((p) => p.id))
    const idMiejsc = new Set(miejsca.map((m) => m.id))
    const problem: string[] = []
    const sygnatury = new Map<string, string[]>()
    for (const k of ksiegi) {
        if (!k.instytucje.length) problem.push(`księga ${k.id}: instytucja nieustalona (do weryfikacji, nie błąd techniczny)`)
        for (const p of k.instytucje) if (!idParafii.has(p)) problem.push(`księga ${k.id}: nieznana parafia/urząd „${p}”`)
        for (const id of k.miejsca) if (!idMiejsc.has(id)) problem.push(`księga ${k.id}: nieznana miejscowość „${id}”`)
        if (!k.miejsca.length && !k.zakresy.length) problem.push(`księga ${k.id}: brak lat; nie można sprawdzić przynależności`)
        const sig = k.sygnatura.trim()
        if (sig) sygnatury.set(sig, [...(sygnatury.get(sig) ?? []), k.id])
    }
    for (const [sygnatura, ids] of sygnatury) if (ids.length > 1)
        problem.push(`sygnatura ${sygnatura}: możliwe duplikaty wpisów ${ids.join(', ')}`)
    for (const m of miejsca) for (const p of m.parafie) {
        if (!idParafii.has(p.parafia)) problem.push(`miejsce ${m.id}: nieznana parafia/urząd „${p.parafia}”`)
        if (p.od === null && p.do === null) problem.push(`miejsce ${m.id}: nieokreślony okres przynależności do „${p.parafia}” (wymaga weryfikacji)`)
        if (p.od !== null && p.do !== null && p.od > p.do) problem.push(`miejsce ${m.id}: nieprawidłowy przedział ${p.od}–${p.do}`)
    }
    console.log(`Kontrola: ${ksiegi.length} ksiąg, ${miejsca.length} miejsc, ${parafie.length} parafii/urzędów`)
    if (!problem.length) { console.log('Nie wykryto nieprawidłowości.'); return }
    for (const s of problem) console.log('• ' + s)
    console.log(`Łącznie ${problem.length} uwag. Nie zmieniono żadnych danych.`)
    // Raport nie blokuje kompilacji; część uwag wymaga ręcznej oceny historycznej.
}
main().catch((e) => { console.error('Nie można sprawdzić powiązań:', e); process.exitCode = 1 })
