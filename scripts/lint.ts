/**
 * P7c (SRW-01): lint przy budowaniu – zastępuje „eslint . --quiet” jednym przebiegiem eslint, który:
 *  1. kończy się błędem przy błędach eslint (jak dotąd --quiet),
 *  2. pilnuje zapadki ostrzeżeń React (lib/zapadka-react.json): w pliku nie może ich przybyć, nowy plik – 0.
 * `--zapisz` – obniża zapadkę do bieżących liczb (tylko gdy nigdzie nie przybyło). `--pierwsza` – utworzenie zapadki.
 * Użycie: npm run lint [-- --zapisz]
 */
import fs from 'node:fs'
import path from 'node:path'
import { ESLint } from 'eslint'
import { policzReact, porownaj, suma, type ZapadkaReact } from '../lib/zapadka-react'

const PLIK = path.join(process.cwd(), 'lib', 'zapadka-react.json')
const zapisz = process.argv.includes('--zapisz'), pierwsza = process.argv.includes('--pierwsza')

async function main() {
    const wyniki = await new ESLint({ cwd: process.cwd() }).lintFiles(['.'])
    const bledy = wyniki.filter((w) => w.errorCount > 0)
    if (bledy.length) {
        const f = await new ESLint({ cwd: process.cwd() }).loadFormatter('stylish')
        console.error(await f.format(bledy.map((w) => ({ ...w, messages: w.messages.filter((m) => m.severity === 2), warningCount: 0, fixableWarningCount: 0 }))))
        process.exit(1)
    }
    const teraz = policzReact(wyniki.map((w) => ({ plik: path.relative(process.cwd(), w.filePath).split(path.sep).join('/'), komunikaty: w.messages })))
    const stara: ZapadkaReact | null = pierwsza ? null : JSON.parse(fs.readFileSync(PLIK, 'utf8'))
    const { wzrost, spadek } = porownaj(stara?.pliki ?? teraz, teraz)
    if (wzrost.length) {
        console.error(`Przybyło ostrzeżeń reguł React (react-hooks/*) – zapadka może tylko maleć (lib/zapadka-react.json):\n${wzrost.join('\n')}`)
        process.exit(1)
    }
    if (zapisz || pierwsza) {
        const z: ZapadkaReact = { opis: 'P7c (SRW-01): dozwolona liczba ostrzeżeń reguł kompilatora React (react-hooks/*) per plik. Może tylko maleć – npm run lint -- --zapisz.', pliki: teraz }
        fs.writeFileSync(PLIK + '.tmp', JSON.stringify(z, null, 1) + '\n')
        fs.renameSync(PLIK + '.tmp', PLIK)
        console.log(`zapadka React zapisana: ${Object.keys(teraz).length} plików, ${suma(teraz)} ostrzeżeń`)
    } else {
        console.log(`lint: 0 błędów; ostrzeżenia React ${suma(teraz)} (zapadka ${suma(stara!.pliki)})${spadek.length ? ` – można obniżyć zapadkę (npm run lint -- --zapisz): ${spadek.length} poz.` : ''}`)
    }
}
main().catch((e) => { console.error(e); process.exit(1) })
