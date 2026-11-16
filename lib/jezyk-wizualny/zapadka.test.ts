// JW-1 (JW-01, zasada 5.1): test języka wizualnego z zapadką per plik.
// Nowy plik – zero naruszeń. Istniejący – liczba naruszeń danego rodzaju nie może rosnąć;
// gdy zmalała, zapadkę trzeba obniżyć (`npm run jw:zapadka`), żeby nie wróciła.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, czytajZapadke, naruszeniaPliku, plikiPubliczne, policz } from './zapadka'
import type { Rodzaj } from './skaner'

const RODZAJE: Rodzaj[] = ['styl', 'hex']
const OPIS: Record<Rodzaj, string> = { styl: 'styl inline (rozmiar / wymiar / kolor / odstęp / ramka)', hex: 'kolor hex poza tokenami' }

test('język wizualny: liczba naruszeń w żadnym pliku nie rośnie (zapadka per plik)', () => {
    const zapadka = czytajZapadke().pliki
    const za_duzo: string[] = []
    const do_obnizenia: string[] = []
    const suma: Record<Rodzaj, number> = { styl: 0, hex: 0 }
    for (const plik of plikiPubliczne()) {
        const n = naruszeniaPliku(plik)
        const l = policz(n)
        for (const r of RODZAJE) {
            const ile = l[r] ?? 0
            const limit = zapadka[plik]?.[r] ?? 0
            suma[r] += ile
            if (ile > limit) {
                const lista = n.filter((x) => x.rodzaj === r).map((x) => `    ${plik}:${x.linia}  ${x.co}`).join('\n')
                za_duzo.push(`${plik} – ${OPIS[r]}: ${ile} (dozwolone ${limit})\n${lista}`)
            } else if (ile < limit) do_obnizenia.push(`${plik} – ${r}: ${ile} < ${limit}`)
        }
    }
    console.log(`język wizualny: ${suma.styl} stylów inline, ${suma.hex} kolorów hex poza tokenami (cel: 0 poza wyjątkami „styl-dynamiczny”)`)
    assert.equal(za_duzo.length, 0, `Naruszenia języka wizualnego ponad zapadkę – użyj klas, komponentów i tokenów z app/globals.css; wartości liczone w działaniu opisz komentarzem /* styl-dynamiczny: … */:\n${za_duzo.join('\n')}`)
    assert.equal(do_obnizenia.length, 0, `Mniej naruszeń niż w zapadce – obniż ją (npm run jw:zapadka), żeby nie wróciły:\n${do_obnizenia.join('\n')}`)
})

test('zapadka nie wskazuje plików, których już nie ma', () => {
    const brak = Object.keys(czytajZapadke().pliki).filter((p) => !fs.existsSync(path.join(ROOT, p)))
    assert.deepEqual(brak, [], 'usuń wpisy z lib/jezyk-wizualny/zapadka.json (npm run jw:zapadka)')
})
