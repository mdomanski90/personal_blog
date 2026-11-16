// KAT-02: numery katalogowe („nr kat.”) – migracja istniejących treści i nadawanie brakujących.
//   npm run kat:nadaj                 – podgląd (nic nie zapisuje): lista pozycji publicznych i numerów, które dostaną
//   npm run kat:nadaj -- --zapisz     – zapis; pierwszy zapis tworzy rejestr content/_panel/katalog.json (= migracja, za zgodą właściciela)
//   npm run kat:nadaj -- --cofnij     – cofnięcie migracji: rejestr do content/_panel/_kosz, nadawanie automatyczne wyłączone
//   tsx scripts/kat-nadaj.ts --auto   – przy budowaniu (npm run build): nadaje brakujące tylko, gdy rejestr już istnieje
// Numery dostają wyłącznie pozycje widoczne dla czytelnika publicznego; kolejność w rodzaju: data dodania, potem nazwa.
// Wypisuje tylko pozycje publiczne (te same nazwy, które widać na stronie).

import fs from 'node:fs'
import { PLIK_REJESTRU, kopiaRejestru, nadajBrakujace, wczytajRejestr } from '../lib/katalog/dane'
import { PREFIKSY, type RodzajKat } from '../lib/katalog/model'

const arg = (a: string) => process.argv.includes(a)

async function main() {
    if (arg('--cofnij')) {
        const kopia = kopiaRejestru('przed-cofnieciem')
        if (!kopia) { console.log('Rejestru nie ma – nie ma czego cofać.'); return }
        fs.rmSync(PLIK_REJESTRU())
        console.log(`Cofnięto: rejestr przeniesiony do ${kopia}. Nadawanie automatyczne wyłączone (przywrócenie: skopiuj plik z powrotem do ${PLIK_REJESTRU()}).`)
        return
    }
    const auto = arg('--auto')
    const istnieje = wczytajRejestr() !== null
    if (auto && !istnieje) { console.log('kat: rejestru nie ma (migracja nie wykonana) – pomijam.'); return }
    const zapisz = auto || arg('--zapisz')
    if (zapisz && !istnieje) console.log(`Kopia przed migracją: brak (rejestr powstaje pierwszy raz).`)
    else if (zapisz && !auto) console.log(`Kopia: ${kopiaRejestru('przed-nadaniem')}`)
    const w = await nadajBrakujace({ zapisz, utworz: !auto })
    if (auto) { console.log(`kat: nadano ${w.nadane.length}${w.przeniesione.length ? `, przeniesiono ${w.przeniesione.length}` : ''}`); return }

    console.log(istnieje ? '\nNADANIE BRAKUJĄCYCH NUMERÓW' : '\nMIGRACJA – pierwsze nadanie numerów katalogowych')
    for (const r of Object.keys(PREFIKSY) as RodzajKat[]) {
        const l = w.nadane.filter((x) => x.rodzaj === r)
        if (!l.length) continue
        console.log(`\n${PREFIKSY[r]} (${r}): ${l.length}`)
        for (const x of l) console.log(`  ${x.nr}  ${x.nazwa}  [${x.id}]`)
    }
    for (const p of w.przeniesione) console.log(`  przeniesiono ${p.nr}: ${p.z} → ${p.na} (zmiana identyfikatora z przekierowaniem)`)
    const suma = Object.entries((w.rejestr ?? { licznik: {} }).licznik).map(([p, n]) => `${p} ${n}`).join(' · ')
    console.log(`\nRazem nowych: ${w.nadane.length}${suma ? ` · liczniki po nadaniu: ${suma}` : ''}`)
    console.log(zapisz ? (w.zapisano ? `ZAPISANO: ${PLIK_REJESTRU()} (wersja ${w.rejestr!.wersja})` : 'Nic do zapisania.') : '\nTo był podgląd – nic nie zapisano. Zapis: npm run kat:nadaj -- --zapisz')
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
