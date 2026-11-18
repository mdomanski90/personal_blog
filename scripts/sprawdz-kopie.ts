// P5 (OPS-02, decyzja właściciela 18.11): sprawdzenie i odtworzenie kopii zapasowej – zawsze najpierw obok, nigdy w ciemno.
//   npx tsx scripts/sprawdz-kopie.ts <kopia.tar.gz>
//       rozpakowuje do nowego katalogu w /tmp, sprawdza opis kopii, czytelność treści (ten sam parser co strona),
//       integralność baz SQLite i porównuje z bieżącymi danymi; NICZEGO nie zmienia
//   npx tsx scripts/sprawdz-kopie.ts <kopia.tar.gz> --przywroc miejsca/testowo.mdoc [osoby/ …]
//       pokazuje, co by się zmieniło w treściach (content/); katalog kończy „/” (wtedy także usunięcie plików,
//       których w kopii nie było)
//   … --przywroc … --tak
//       podmienia wskazane pliki jako operację – cofniesz ją w panelu (ostatnie operacje); data/ i pliki-archiwum/
//       tylko raport i instrukcja (podmiana ręczna z rozpakowanego katalogu)
// Uruchamiać jako użytkownik strony, w katalogu strony: cd /opt/personal_blog && sudo -u blog npx tsx scripts/sprawdz-kopie.ts …
import fs from 'node:fs/promises'
import path from 'node:path'
import { odtworzZKopii, raportKopii, rozpakuj, zmianyOdtworzenia } from '../lib/panel/odtwarzanie'

const argv = process.argv.slice(2)
const archiwum = argv[0]
const iP = argv.indexOf('--przywroc')
const doPrzywrocenia = iP >= 0 ? argv.slice(iP + 1).filter((x) => !x.startsWith('--')) : []
const tak = argv.includes('--tak'), zostaw = argv.includes('--zostaw')
const lista = (L: string[], n = 12) => L.length ? `${L.slice(0, n).join(', ')}${L.length > n ? ` … (+${L.length - n})` : ''}` : '—'

async function main() {
    if (!archiwum || archiwum.startsWith('--')) { console.log('Użycie: npx tsx scripts/sprawdz-kopie.ts <kopia.tar.gz> [--przywroc ścieżka… [--tak]] [--zostaw]'); process.exitCode = 2; return }
    const kat = await rozpakuj(path.resolve(archiwum))
    let bledy = 0
    try {
        const r = await raportKopii(kat)
        console.log(`Kopia: ${path.basename(archiwum)} → rozpakowana do ${kat}`)
        console.log(`  utworzono: ${r.opis?.utworzono ?? '?'} · kod: ${r.opis?.commit ?? '?'} · części: ${(r.opis?.czesci ?? []).join(', ') || '?'}`)
        for (const c of r.czesci) {
            console.log(`\n${c.nazwa}: w kopii ${c.wKopii} plików, teraz ${c.teraz}`)
            console.log(`  tylko w kopii (${c.tylkoWKopii.length}): ${lista(c.tylkoWKopii)}`)
            console.log(`  tylko teraz (${c.tylkoTeraz.length}): ${lista(c.tylkoTeraz)}`)
            console.log(`  różne (${c.rozne.length}): ${lista(c.rozne)}${c.nazwa === 'pliki-archiwum' ? '  [porównanie rozmiarów]' : ''}`)
        }
        console.log(`\nczytelność treści (YAML/JSON/nagłówki): ${r.nieczytelne.length ? `${r.nieczytelne.length} nieczytelnych` : 'wszystko czytelne'}`)
        for (const n of r.nieczytelne.slice(0, 20)) console.log(`  ✗ ${n.plik}: ${n.blad}`)
        for (const b of r.bazy) console.log(`baza ${b.nazwa}: ${b.ok ? 'integralność ok' : `BŁĄD – ${b.wynik}`}`)
        for (const b of r.bledy) console.log(`BŁĄD: ${b}`)
        bledy = r.bledy.length + r.nieczytelne.length
        if (doPrzywrocenia.length) {
            const zmiany = await zmianyOdtworzenia(kat, doPrzywrocenia)
            console.log(`\nOdtworzenie z kopii – ${zmiany.length} plików treści do zmiany:`)
            for (const z of zmiany.slice(0, 40)) console.log(`  ${z.poprzedni === null ? '+ przywrócony' : z.wynik === null ? '− usunięty  ' : '~ zmieniony '} ${z.plik}`)
            if (!zmiany.length) console.log('  nic – wskazane pliki są takie jak w kopii')
            else if (!tak) console.log('\nNic nie zmieniono. Żeby podmienić, powtórz z --tak (operację cofniesz w panelu: ostatnie operacje).')
            else {
                const w = await odtworzZKopii(kat, doPrzywrocenia, path.basename(archiwum))
                console.log(`\nODTWORZONO: ${w.zapisane} plików (operacja ${w.id}) – cofnięcie w panelu: ostatnie operacje.`)
            }
        } else console.log(`\nNiczego nie zmieniono. Odtworzenie wybranych treści: dodaj --przywroc <ścieżka w content/> (najpierw podgląd, potem --tak).`)
        if (r.czesci.some((c) => c.nazwa !== 'content' && (c.rozne.length || c.tylkoWKopii.length))) console.log(`data/ i pliki-archiwum/ odtwarzasz ręcznie z rozpakowanej kopii (uruchom z --zostaw; na czas podmiany bazy zatrzymaj stronę: sudo systemctl stop blog).`)
    } finally {
        if (zostaw) console.log(`\nRozpakowana kopia zostaje w ${kat} – usuń ją po pracy: rm -rf ${kat}`)
        else await fs.rm(kat, { recursive: true, force: true })
    }
    if (bledy) process.exitCode = 1
}
main().catch((e) => { console.error('BŁĄD:', e instanceof Error ? e.message : e); process.exitCode = 1 })
