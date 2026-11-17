// OPS-07 (P3): jednorazowe wypełnienie ustawienia „Kręgi i stopka” obecną listą domyślną, żeby edytować ją w panelu.
// Bez --zapisz – tylko raport. Plik istniejący nigdy nie jest nadpisywany. Zapis atomowy (.tmp → rename).
import fs from 'node:fs'
import path from 'node:path'
import { KREGI_DOMYSLNE, WIERSZE_DOMYSLNE } from '../lib/kregi'

const plik = path.join(process.cwd(), 'content', '_panel', 'kregi-stopka.json')
const dane = { kregi: KREGI_DOMYSLNE, wiersze: WIERSZE_DOMYSLNE }
if (fs.existsSync(plik)) { console.log(`ustawienie już istnieje (${plik}) – nic nie zmieniam`); process.exit(0) }
console.log(`do zapisania: ${dane.kregi.length} kręgi, ${dane.wiersze.length} wiersze stopki, ${dane.wiersze.reduce((a, w) => a + w.miejsca.length, 0)} miejscowości → ${plik}`)
if (!process.argv.includes('--zapisz')) { console.log('raport – bez zmian (dodaj --zapisz)'); process.exit(0) }
fs.mkdirSync(path.dirname(plik), { recursive: true })
fs.writeFileSync(`${plik}.tmp`, JSON.stringify(dane, null, 2) + '\n')
fs.renameSync(`${plik}.tmp`, plik)
console.log('zapisano')
