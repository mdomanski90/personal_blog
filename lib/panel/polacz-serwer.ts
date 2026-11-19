// P6b (PD-10): „połącz” – odczyt tekstów z dysku, lista wzmianek i zapis jako operacja z „cofnij”.
import fs from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { daneSieci } from '../archiwum'
import { slownikOdnosnikow } from '../odnosniki'
import { komunikatPrawa, type BrakPrawa } from './prawa-zapisu'
import { wykonajOperacje } from './operacje'
import { polaczWTekscie, wzmiankiWTekscie, wzorcePozycji, type TekstDoPolaczenia, type Wzmianka } from './polacz'

export interface DanePolacz { wzmianki: Wzmianka[]; teksty: number }

async function tekstyZDysku(korzen: string) {
    const { pozycje, teksty } = await daneSieci('ja')
    const wyn: TekstDoPolaczenia[] = []
    for (const t of teksty) {
        const zawartosc = await fs.readFile(path.join(/*turbopackIgnore: true*/ korzen, t.plik), 'utf8').catch(() => null)
        if (zawartosc !== null) wyn.push({ plik: t.plik, zrodlo: t.zrodlo, zawartosc, zwiazane: t.zwiazane })
    }
    return { pozycje, teksty: wyn }
}

export async function wzmiankiDoPolaczenia(korzen = process.cwd()): Promise<DanePolacz> {
    const { pozycje, teksty } = await tekstyZDysku(korzen)
    const rozwiaz = slownikOdnosnikow(pozycje)
    const wzorce = wzorcePozycji(pozycje)
    return { wzmianki: teksty.flatMap((t) => wzmiankiWTekscie(t, wzorce, rozwiaz)), teksty: teksty.length }
}

/** Zapis tymczasowego pliku i zamiana wymagają prawa zapisu w katalogu (lib/panel/operacje.ts – zapiszPlik). */
async function brakPrawKatalogow(korzen: string, pliki: string[]): Promise<BrakPrawa[]> {
    const wyn: BrakPrawa[] = []
    for (const plik of pliki) {
        const kat = path.dirname(path.join(/*turbopackIgnore: true*/ korzen, plik))
        const moze = await fs.access(kat, constants.W_OK).then(() => true, () => false)
        if (!moze) wyn.push({ plik, katalog: path.relative(korzen, kat).split(path.sep).join('/') })
    }
    return wyn
}

/** Zapisuje wybrane wzmianki jako odnośniki – jedna operacja (kopia „przed”, „cofnij”), kontrola czytnikiem Keystatic. */
export async function zapiszPolaczenia(klucze: string[], korzen = process.cwd()) {
    const wybrane = new Set(klucze)
    const { wzmianki } = await wzmiankiDoPolaczenia(korzen)
    const doZmiany = wzmianki.filter((w) => wybrane.has(w.klucz))
    if (doZmiany.length !== wybrane.size) throw new Error('Część zaznaczonych wzmianek już nie istnieje (tekst zmienił się od podglądu) – odśwież listę.')
    const poPlikach = new Map<string, Wzmianka[]>()
    for (const w of doZmiany) poPlikach.set(w.plik, [...(poPlikach.get(w.plik) ?? []), w])
    const brak = await brakPrawKatalogow(korzen, [...poPlikach.keys()])
    if (brak.length) throw new Error(komunikatPrawa(brak))
    const zmiany: { plik: string; poprzedni: string; wynik: string }[] = []
    for (const [plik, L] of poPlikach) {
        const poprzedni = await fs.readFile(path.join(/*turbopackIgnore: true*/ korzen, plik), 'utf8')
        // operacje liczą ścieżki względem content/ (lib/panel/operacje.ts – sciezkaTresci); teksty sieci mają „content/…”
        zmiany.push({ plik: plik.replace(/^content\//, ''), poprzedni, wynik: polaczWTekscie(poprzedni, L) })
    }
    const w = await wykonajOperacje({
        korzen, rodzaj: 'polacz', opis: `połącz: ${doZmiany.length} ${doZmiany.length === 1 ? 'odnośnik' : 'odnośników'} w ${zmiany.length} ${zmiany.length === 1 ? 'tekście' : 'tekstach'}`,
        zmiany, szczegoly: { odnosniki: doZmiany.slice(0, 200).map((x) => ({ plik: x.plik, cel: `${x.cel.rodzaj}:${x.cel.id}`, slowo: x.slowo })) },
        sprawdz: async () => {
            const { createReader } = await import('@keystatic/core/reader')
            const cfg = (await import('../../keystatic.config')).default
            const r = createReader(korzen, cfg) as unknown as { collections: Record<string, { read: (s: string) => Promise<unknown> }> }
            for (const z of zmiany) {
                const m = z.plik.match(/^([a-z]+)\/([^/]+)\.mdoc$/)
                if (!m || !r.collections[m[1]]) continue
                try { if (!(await r.collections[m[1]].read(m[2]))) throw new Error('brak wpisu') }
                catch (e) { throw new Error(`Po zmianie „${z.plik}” byłby nieczytelny dla strony (${String(e instanceof Error ? e.message : e).slice(0, 160)}) – nic nie zapisano.`) }
            }
        },
    })
    return { id: w.id, zapisane: doZmiany.length, teksty: zmiany.length }
}
