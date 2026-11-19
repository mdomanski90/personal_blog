// Wzmianki bez odnośnika – podpowiedzi, gdzie wstawić [[…]] (odpowiednik „unlinked references” z Logseq).
//
//   npm run wzmianki                # tylko pokazuje (nic nie zmienia)
//   npm run wzmianki -- --polacz    # w każdym tekście zamienia PIERWSZĄ wzmiankę danej pozycji na [[…]]
//
// P6b (PD-10): ta sama logika co „połącz” w panelu (lib/panel/polacz.ts) – w panelu z podglądem, wyborem i „cofnij”;
// tu bez kopii, więc zalecany jest panel.

import fs from 'node:fs'
import path from 'node:path'
import { daneSieci } from '../lib/archiwum'
import { odmiana } from '../lib/tekst'
import { slownikOdnosnikow } from '../lib/odnosniki'
import { polaczWTekscie, wzmiankiWTekscie, wzorcePozycji } from '../lib/panel/polacz'

const POLACZ = process.argv.includes('--polacz')
const KORZEN = process.cwd()

async function main() {
    const { pozycje, teksty } = await daneSieci('ja')
    const rozwiaz = slownikOdnosnikow(pozycje)
    const wzorce = wzorcePozycji(pozycje)
    let ileWzmianek = 0
    let ilePolaczonych = 0
    const bezUprawnien: string[] = []
    for (const t of teksty) {
        const sciezka = path.join(KORZEN, t.plik)
        if (!fs.existsSync(sciezka)) continue
        const zawartosc = fs.readFileSync(sciezka, 'utf8')
        const w = wzmiankiWTekscie({ plik: t.plik, zrodlo: t.zrodlo, zawartosc, zwiazane: t.zwiazane }, wzorce, rozwiaz)
        if (!w.length) continue
        ileWzmianek += w.length
        console.log(`\n${t.plik} (${t.zrodlo.rodzaj} „${t.zrodlo.nazwa}”)`)
        for (const x of w.filter((x) => x.pierwsza)) console.log(`  ${x.cel.rodzaj} „${x.cel.nazwa}”: ${w.filter((y) => y.cel.id === x.cel.id && y.cel.rodzaj === x.cel.rodzaj).length}× – ${x.przed}»${x.slowo}«${x.po}\n      → ${x.nowy}`)
        if (!POLACZ) continue
        const pierwsze = w.filter((x) => x.pierwsza)
        try {
            fs.writeFileSync(sciezka, polaczWTekscie(zawartosc, pierwsze), 'utf8')
            ilePolaczonych += pierwsze.length
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'EACCES') throw e
            bezUprawnien.push(t.plik)
        }
    }
    if (bezUprawnien.length) console.log(`\n! Brak uprawnień do zapisu: ${bezUprawnien.join(', ')} – użyj „połącz” w panelu (pokaże komendę)`)
    if (!ileWzmianek) console.log('Brak wzmianek bez odnośnika.')
    else if (POLACZ) console.log(`\nGotowe – wstawiono ${odmiana(ilePolaczonych, ['odnośnik', 'odnośniki', 'odnośników'])} (pierwsza wzmianka w każdym tekście). Sprawdź w panelu.`)
    else console.log(`\nZnaleziono ${odmiana(ileWzmianek, ['wzmiankę', 'wzmianki', 'wzmianek'])}. Wygodniej: panel → narzędzia → „połącz wzmianki” (podgląd i „cofnij”). Z terminala: npm run wzmianki -- --polacz`)
}

void main()
