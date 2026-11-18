// Raport diagnostyczny (tylko odczyt); uruchom: npx tsx scripts/sprawdz-powiazania-ksieg.ts
// P5: te same reguły co raport ksiąg w panelu (/keystatic/panel/raport-ksiag, lib/ksiegi-raport.ts). Niczego nie zmienia.
import { dlaEksportu } from '../lib/archiwum'
import { raportKsiag } from '../lib/ksiegi-raport'

async function main() {
    const [ksiegi, miejsca, parafie] = await Promise.all([dlaEksportu.ksiegi(), dlaEksportu.miejsca(), dlaEksportu.parafie()])
    const r = raportKsiag(ksiegi, miejsca, parafie)
    console.log(`Kontrola: ${r.ksiag} ksiąg (${r.publicznych} publicznych), ${miejsca.length} miejsc, ${parafie.length} parafii/urzędów`)
    for (const m of r.miejsca) if (m.katalog !== m.karta) console.log(`• ${m.nazwa}: katalog ${m.katalog}, karta ${m.karta} – tylko w katalogu: ${m.brakNaKarcie.map((k) => k.id).join(', ')}`)
    for (const i of r.instytucje) if (i.katalog !== i.karta) console.log(`• ${i.nazwa}: katalog „wg parafii” ${i.katalog}, karta ${i.karta}`)
    for (const u of r.uwagi) console.log(`${u.rodzaj === 'blad' ? '✗' : '•'} ${u.tekst}`)
    if (!r.uwagi.length && r.miejsca.every((m) => m.katalog === m.karta)) console.log('Nie wykryto nieprawidłowości.')
    else console.log(`Łącznie ${r.uwagi.length} uwag. Nie zmieniono żadnych danych.`)
}
main().catch((e) => { console.error('Nie można sprawdzić powiązań:', e); process.exitCode = 1 })
