// P5 (D-PA-11, decyzja właściciela 18.11): kopia nocna na serwerze – uruchamiana przez timer systemd
// (scripts/systemd/odniepamieci-kopia-nocna.timer), ręcznie: npx tsx scripts/kopia-nocna.ts [katalog]
// To samo archiwum co „pobierz kopię na komputer” w panelu (content/, pliki-archiwum/, data/ ze spójnymi bazami SQLite,
// kopia.json), nazwa odniepamieci-nocna-RRRRMMDD-GGMMSS.tar.gz, 7 najnowszych. Węzeł domowy pobiera je tylko do odczytu
// (rrsync -ro) – instrukcja: scripts/systemd/kopie-nocne.md. Kod niczego nie usuwa poza własnymi starymi kopiami nocnymi.
import { execFileSync } from 'node:child_process'
import { zapiszNocna, ZACHOWAJ_NOCNYCH } from '../lib/panel/kopia'

const KATALOG = process.argv[2] || process.env.KOPIE_NOCNE || '/var/backups/odniepamieci/nocne'

function commit(): string | null {
    try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return null }
}

async function main() {
    const start = Date.now()
    const w = await zapiszNocna(KATALOG, { commit: commit() })
    if (typeof w === 'string') { console.error(`KOPIA NOCNA – BŁĄD: ${w}`); process.exitCode = 1; return }
    const mb = (w.bajty / 1048576).toFixed(1)
    console.log(`KOPIA NOCNA: ${w.plik} (${mb} MB, ${Math.round((Date.now() - start) / 1000)} s; zostaje ${ZACHOWAJ_NOCNYCH} najnowszych)${w.uwaga ? ` – uwaga: ${w.uwaga}` : ''}`)
}
main().catch((e) => { console.error('KOPIA NOCNA – BŁĄD:', e); process.exitCode = 1 })
