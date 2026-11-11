// Uzupełnia pole „Formy odmiany” miejsc i tematów, które go jeszcze nie mają.
// Formy liczy lib/odmiana.ts – z nazwy i z „innych nazw” (np. Stare Łepki). Wpisów z już
// wypełnionym polem nie rusza, więc ręczne poprawki w panelu zostają.
//
//   npm run formy -- --podglad   # tylko pokazuje
//   npm run formy                # zapisuje

import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { formyOdmiany } from '../lib/odmiana'

const PODGLAD = process.argv.includes('--podglad')
const KATALOGI = ['content/miejsca', 'content/tematy']
let zmienione = 0
const bezUprawnien: string[] = []

for (const katalog of KATALOGI) {
    const pelny = path.join(process.cwd(), katalog)
    if (!fs.existsSync(pelny)) continue
    for (const plik of fs.readdirSync(pelny).filter((f) => f.endsWith('.mdoc')).sort()) {
        const rel = path.join(katalog, plik)
        const tekst = fs.readFileSync(path.join(pelny, plik), 'utf8')
        const m = tekst.match(/^---\n([\s\S]*?)\n?---\n?([\s\S]*)$/)
        if (!m) continue
        // CORE_SCHEMA: daty zostają tekstem „2026-02-04”, jak zapisuje panel
        const pola = (yaml.load(m[1], { schema: yaml.CORE_SCHEMA }) as Record<string, unknown>) ?? {}
        if (Array.isArray(pola.inflections) && pola.inflections.length) continue
        const nazwy = [String(pola.title ?? ''), ...((pola.alternative as string[]) ?? [])].filter((n) => n && !/^(w|we|z|ze|do|na)\s/i.test(n))
        const formy = [...new Set(nazwy.flatMap((n) => formyOdmiany(n)))].filter((f) => !nazwy.includes(f))
        if (!formy.length) continue
        pola.inflections = formy
        zmienione++
        console.log(`  ${PODGLAD ? '(podgląd) ' : ''}${rel}: ${formy.join(', ')}`)
        if (PODGLAD) continue
        try {
            fs.writeFileSync(path.join(pelny, plik), `---\n${yaml.dump(pola, { lineWidth: -1, noRefs: true, schema: yaml.CORE_SCHEMA })}---\n${m[2]}`, 'utf8')
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'EACCES') throw e
            bezUprawnien.push(rel)
            zmienione--
        }
    }
}

if (bezUprawnien.length) console.log(`\n! Brak uprawnień do zapisu: ${bezUprawnien.join(', ')} – sudo chmod -R g+w content i jeszcze raz`)
console.log(PODGLAD ? `\nPodgląd: ${zmienione} wpisów do uzupełnienia.` : `\nGotowe – uzupełniono ${zmienione} wpisów.`)
