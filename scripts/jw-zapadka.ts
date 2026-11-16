/**
 * JW-1: obniżenie zapadki języka wizualnego (lib/jezyk-wizualny/zapadka.json) do bieżących liczb.
 * Zapadka może tylko maleć: gdy w którymś pliku naruszeń przybyło, skrypt kończy się błędem i nic nie zapisuje.
 * `--pierwsza` – jednorazowe utworzenie zapadki ze stanu wyjściowego (JW-1, GitHub d70eed3).
 * Użycie: npm run jw:zapadka [-- --pierwsza]
 */
import fs from 'node:fs'
import { PLIK_ZAPADKI, czytajZapadke, naruszeniaPliku, plikiPubliczne, policz, type Liczby, type Zapadka } from '../lib/jezyk-wizualny/zapadka'

const pierwsza = process.argv.includes('--pierwsza')
const stara = pierwsza ? null : czytajZapadke()
const nowe: Record<string, Liczby> = {}
const wzrost: string[] = []
let styl = 0, hex = 0
for (const plik of plikiPubliczne()) {
    const l = policz(naruszeniaPliku(plik))
    for (const r of ['styl', 'hex'] as const) {
        const ile = l[r] ?? 0
        if (stara && ile > (stara.pliki[plik]?.[r] ?? 0)) wzrost.push(`${plik} ${r}: ${stara.pliki[plik]?.[r] ?? 0} → ${ile}`)
    }
    if (l.styl || l.hex) nowe[plik] = { ...(l.styl ? { styl: l.styl } : {}), ...(l.hex ? { hex: l.hex } : {}) }
    styl += l.styl ?? 0; hex += l.hex ?? 0
}
if (wzrost.length) { console.error(`Przybyło naruszeń – zapadka może tylko maleć:\n${wzrost.join('\n')}`); process.exit(1) }
const z: Zapadka = { opis: 'JW-1: dozwolona liczba naruszeń języka wizualnego per plik (styl = style inline z rozmiarem/wymiarem/kolorem/odstępem/ramką, hex = kolory poza tokenami). Może tylko maleć – npm run jw:zapadka.', pliki: nowe }
fs.writeFileSync(PLIK_ZAPADKI + '.tmp', JSON.stringify(z, null, 2) + '\n')
fs.renameSync(PLIK_ZAPADKI + '.tmp', PLIK_ZAPADKI)
console.log(`zapadka: ${Object.keys(nowe).length} plików, ${styl} stylów, ${hex} hex`)
