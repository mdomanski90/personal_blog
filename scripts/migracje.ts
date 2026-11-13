// Jednorazowe przeróbki zapisu treści po zmianach w schemacie Keystatic. Uruchamiane przy każdym
// budowaniu (npm run build) – każda migracja sprawdza, czy jest jeszcze potrzebna, więc ponowne
// uruchomienie niczego nie zmienia. Zmienia tylko pojedyncze wiersze, reszta pliku zostaje bez zmian.

import fs from 'node:fs'
import path from 'node:path'

const CONTENT = path.join(process.cwd(), 'content')
let zmienione = 0

function przerob(katalog: string, rozszerzenia: string[], f: (tekst: string) => string) {
    const kat = path.join(CONTENT, katalog)
    if (!fs.existsSync(kat)) return
    for (const nazwa of fs.readdirSync(kat)) {
        if (!rozszerzenia.some((r) => nazwa.endsWith(r))) continue
        const plik = path.join(kat, nazwa)
        const stary = fs.readFileSync(plik, 'utf8')
        const nowy = f(stary)
        if (nowy !== stary) { fs.writeFileSync(plik, nowy); zmienione++; console.log(`  ${katalog}/${nazwa}`) }
    }
}

// 1. Księgi: jeden rodzaj aktów („type: zgony”) → lista rodzajów („types: [zgony]”)
przerob('ksiegi', ['.yaml', '.yml'], (t) => {
    if (/^types:/m.test(t)) return t
    return t.replace(/^type:\s*['"]?([\w-]+)['"]?\s*$/m, (_, r) => `types:\n  - ${r}`)
})

// 2. Miejscowości: jedno wyznanie („religion: mieszana”) → lista wyznań („religions: […]”)
const ZAMIANA_WYZNAN: Record<string, string[]> = {
    unicka: ['unickie'], katolicka: ['rzymskokatolickie'], mieszana: ['unickie', 'rzymskokatolickie'], prawoslawna: ['prawoslawne'],
    zydowska: ['mojzeszowe'], mojzeszowa: ['mojzeszowe'], ewangelicka: ['ewangelickie'],
}
przerob('miejsca', ['.mdoc'], (t) => {
    const kon = t.indexOf('\n---', 3)
    if (kon < 0) return t
    let glowa = t.slice(0, kon)
    if (/^religions:/m.test(glowa)) return t
    const m = glowa.match(/^religion:\s*['"]?([\w-]*)['"]?\s*$/m)
    if (!m) return t
    const lista = ZAMIANA_WYZNAN[m[1]] ?? []
    const rownorzedne = m[1] === 'mieszana'
    glowa = glowa.replace(m[0], lista.length ? `religions:\n${lista.map((w) => `  - ${w}`).join('\n')}${rownorzedne ? '\nreligionsEqual: true' : ''}` : 'religions: []')
    return glowa + t.slice(kon)
})

console.log(zmienione ? `Migracje treści: zmieniono ${zmienione} plik(ów).` : 'Migracje treści: nic do zmiany.')
