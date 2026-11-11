// Jednorazowe przygotowanie treści dla etapu 1 (bezpieczne przy ponownym uruchomieniu – niczego nie nadpisuje):
//   - 23 miejscowości w content/miejsca (bez współrzędnych – uzupełnij w panelu),
//   - 3 tematy w content/tematy z widocznością „tylko ja” (do opisania w panelu),
//   - szkic strony „o projekcie”,
//   - usunięcie starego wpisu content/miejsca/miejsca.mdoc (sama ramka z mapą).
//
//   npm run zasiej
//
// Pliki dostają uprawnienia 664 (katalogi 2775), żeby panel (usługa „blog”) mógł je edytować.

import fs from 'node:fs'
import path from 'node:path'
import { identyfikatorZNazwy } from '../lib/tekst'

const KORZEN = process.cwd()
const dzis = new Date().toISOString().slice(0, 10)
let utworzone = 0

function katalog(rel: string) {
    const p = path.join(KORZEN, rel)
    if (!fs.existsSync(p)) {
        fs.mkdirSync(p, { recursive: true })
        fs.chmodSync(p, 0o2775)
    }
}

function zapisz(rel: string, tresc: string) {
    const p = path.join(KORZEN, rel)
    if (fs.existsSync(p)) {
        console.log(`  = ${rel} (już jest, pomijam)`)
        return
    }
    fs.writeFileSync(p, tresc, 'utf8')
    fs.chmodSync(p, 0o664)
    utworzone++
    console.log(`  + ${rel}`)
}

const MIEJSCOWOSCI: [string, string][] = [
    ['Olszanka', 'wies'], ['Korczówka', 'wies'], ['Próchenki', 'wies'], ['Szydłówka', 'wies'],
    ['Bejdy', 'wies'], ['Dawidy', 'wies'], ['Łepki Stare', 'wies'], ['Łepki Nowe', 'wies'],
    ['Hadynów', 'wies'], ['Pietrusy', 'wies'], ['Mszanna', 'wies'], ['Bolesty', 'wies'],
    ['Szawły', 'wies'], ['Wyczółki', 'wies'], ['Radlnia', 'wies'], ['Łosice', 'miasto'],
    ['Łuniew', 'wies'], ['Łuby', 'wies'], ['Kożuszki', 'wies'], ['Krzewica', 'wies'],
    ['Pościsze', 'wies'], ['Krzesk', 'wies'], ['Międzyrzec Podlaski', 'miasto'],
]

const TEMATY: [string, string, string][] = [
    ['Unici', 'zjawisko', ''],
    ['Kasata unii 1875', 'wydarzenie', '1875'],
    ['Bieżeństwo', 'zjawisko', '1915'],
]

console.log('Miejsca:')
katalog('content/miejsca')
const stary = path.join(KORZEN, 'content/miejsca/miejsca.mdoc')
if (fs.existsSync(stary) && fs.readFileSync(stary, 'utf8').includes('<iframe')) {
    fs.unlinkSync(stary)
    console.log('  - content/miejsca/miejsca.mdoc (stary wpis z samą ramką mapy)')
}
for (const [nazwa, rodzaj] of MIEJSCOWOSCI) {
    zapisz(
        `content/miejsca/${identyfikatorZNazwy(nazwa)}.mdoc`,
        `---\ntitle: ${nazwa}\ntype: ${rodzaj}\nvisibility: publiczne\ndateSubmitted: ${dzis}\n---\n`,
    )
}

console.log('Tematy (widoczność „tylko ja” – opisz i ustaw „publiczne” w panelu):')
katalog('content/tematy')
for (const [nazwa, rodzaj, czas] of TEMATY) {
    zapisz(
        `content/tematy/${identyfikatorZNazwy(nazwa)}.mdoc`,
        `---\ntitle: ${nazwa}\ntype: ${rodzaj}\n${czas ? `temporal: '${czas}'\n` : ''}visibility: ja\ndateSubmitted: ${dzis}\n---\n`,
    )
}

console.log('O projekcie:')
zapisz(
    'content/o-projekcie.mdoc',
    `---\n---\nodniepamieci.pl to społeczne archiwum pamięci lokalnej. Zbieram i opisuję dokumenty, zdjęcia, nagrania i wspomnienia z wsi wokół Olszanki i Łosic – o ludziach, miejscach i wydarzeniach, o których pamięta coraz mniej osób.

## jak przysłać materiał

Jeśli masz zdjęcie, dokument albo wspomnienie związane z tymi miejscami, napisz na adres podany niżej. Każdy materiał opisuję i publikuję dopiero za zgodą osoby, która go przekazała.

## prawa

[do uzupełnienia: na jakich zasadach można korzystać z materiałów]
`,
)

console.log(`\nGotowe – utworzono ${utworzone} plików.`)
