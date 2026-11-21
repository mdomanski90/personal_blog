// P7c łatka (uwaga właściciela 20.11 09:31, ankieta A): porządek uwag tomów ksiąg jako operacja panelu –
// podgląd z liczbami → zapis (kopie, „cofnij” w „operacje”) → kontrola czytnikiem Keystatic (błąd cofa całość).
// Reguły: lib/panel/ksiegi-uwagi.ts. Odczyt bez zamiany dat w obiekty (CORE_SCHEMA) – plik po zapisie różni się tylko porządkowanymi polami. Księgi „tylko ja” pomijane dla konta bez roli administratora (KON-08).
import fs from 'node:fs'
import * as yaml from 'js-yaml'
import { uporzadkujKsiege } from './ksiegi-uwagi'
import { ukrytaSciezka, type UkrytePozycje } from '../konta/tylko-ja'
import { sciezkaTresci, wykonajOperacje, type ZmianaPliku } from './operacje'

export interface PodgladPorzadku {
    ksiag: number; tomow: number
    przeniesione: { tytul: number; skany: number; status: number; zrodla: number }
    sprzecznosci: string[]
    pozycje: { id: string; nazwa: string; tomow: number }[]
}

const zrzut = (x: unknown) => yaml.dump(x, { lineWidth: -1, noRefs: true, quotingType: '"', forceQuotes: false })

async function przygotuj(korzen: string, u: UkrytePozycje) {
    const kat = sciezkaTresci(korzen, 'ksiegi')
    let pliki: string[] = []
    try { pliki = (await fs.promises.readdir(/*turbopackIgnore: true*/ kat)).filter((f) => /\.ya?ml$/.test(f)).sort() } catch { /* brak ksiąg */ }
    const zmiany: ZmianaPliku[] = [], podglad: PodgladPorzadku = { ksiag: 0, tomow: 0, przeniesione: { tytul: 0, skany: 0, status: 0, zrodla: 0 }, sprzecznosci: [], pozycje: [] }
    for (const f of pliki) {
        const rel = `ksiegi/${f}`
        if (ukrytaSciezka(rel, u)) continue
        const tekst = await fs.promises.readFile(/*turbopackIgnore: true*/ sciezkaTresci(korzen, rel), 'utf8')
        let k: unknown
        try { k = yaml.load(tekst, { schema: yaml.CORE_SCHEMA }) } catch { continue } // nieczytelny plik zgłasza panel jakości – tu go nie ruszamy
        if (!k || typeof k !== 'object' || Array.isArray(k)) continue
        const w = uporzadkujKsiege(k as Record<string, unknown>)
        if (!w) continue
        const wynik = zrzut(w.ksiega)
        yaml.load(wynik) // kontrola odczytu przed zapisem
        const id = f.replace(/\.ya?ml$/, '')
        zmiany.push({ plik: rel, poprzedni: tekst, wynik })
        podglad.ksiag++; podglad.tomow += w.tomow
        for (const x of ['tytul', 'skany', 'status', 'zrodla'] as const) podglad.przeniesione[x] += w.przeniesione[x]
        podglad.sprzecznosci.push(...w.sprzecznosci.map((s) => `${id}: ${s}`))
        podglad.pozycje.push({ id, nazwa: String((k as Record<string, unknown>).title ?? id), tomow: w.tomow })
    }
    return { zmiany, podglad }
}

export async function podgladPorzadkuTomow(u: UkrytePozycje, korzen = process.cwd()): Promise<PodgladPorzadku> {
    return (await przygotuj(korzen, u)).podglad
}

export async function zapiszPorzadekTomow(u: UkrytePozycje, korzen = process.cwd()) {
    const { zmiany, podglad } = await przygotuj(korzen, u)
    if (!zmiany.length) return { operacja: null, ksiag: 0, tomow: 0 }
    const op = await wykonajOperacje({
        korzen, rodzaj: 'porzadek-tomow', zmiany,
        opis: `porządek uwag tomów: ${podglad.ksiag} ksiąg, ${podglad.tomow} tomów (tytuł ${podglad.przeniesione.tytul}, liczba skanów ${podglad.przeniesione.skany}, do notatki ${podglad.przeniesione.status + podglad.przeniesione.zrodla})`,
        szczegoly: { ksiag: podglad.ksiag, tomow: podglad.tomow, ...podglad.przeniesione, sprzecznosci: podglad.sprzecznosci.length },
        sprawdz: async () => {
            const { createReader } = await import('@keystatic/core/reader')
            const cfg = (await import('../../keystatic.config')).default
            const r = createReader(korzen, cfg) as unknown as { collections: { ksiegi: { read: (s: string) => Promise<unknown> } } }
            for (const p of podglad.pozycje) {
                try { if (!(await r.collections.ksiegi.read(p.id))) throw new Error('brak wpisu') }
                catch (e) { throw new Error(`Księga „${p.id}” byłaby nieczytelna dla strony (${String(e instanceof Error ? e.message : e).slice(0, 160)}) – nic nie zapisano.`) }
            }
        },
    })
    return { operacja: op.id, ksiag: podglad.ksiag, tomow: podglad.tomow }
}
