// P7a (KON-01): plik kont na serwerze – content/_panel/konta.json (poza repozytorium, w kopiach).
// Odczyt synchroniczny z pamięcią po czasie zmiany pliku (strażnik tras jest synchroniczny i działa przy każdym żądaniu).
// Zapis atomowy (.tmp → rename) z kontrolą wersji: zmiana na nieaktualnej wersji = konflikt, nie nadpisanie (zasada 2.5).
import fs from 'node:fs'
import path from 'node:path'
import { odczytajPlik, odmowaZmianyKont, PUSTY_PLIK, type PlikKont } from './model'

export const plikKont = (korzen = process.cwd()) => path.join(/*turbopackIgnore: true*/ korzen, 'content', '_panel', 'konta.json')

let pamiec: { plik: string; odcisk: string; dane: PlikKont } | null = null

/** Plik kont; brak pliku = brak kont. Nieczytelny plik = brak kont (nikt nie dostaje dostępu) i wpis w dzienniku. */
export function wczytajKonta(korzen = process.cwd()): PlikKont {
    const p = plikKont(korzen)
    let st: fs.Stats
    try { st = fs.statSync(/*turbopackIgnore: true*/ p) } catch { return { ...PUSTY_PLIK } }
    const odcisk = `${st.mtimeMs}:${st.size}`
    if (pamiec && pamiec.plik === p && pamiec.odcisk === odcisk) return pamiec.dane
    let dane: PlikKont
    try { dane = odczytajPlik(JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ p, 'utf8'))) }
    catch (e) { console.error(`[konta] nieczytelny plik kont: ${(e as Error).message}`); return { ...PUSTY_PLIK } }
    pamiec = { plik: p, odcisk, dane }
    return dane
}

export class KonfliktKont extends Error { constructor() { super('Lista kont zmieniła się w międzyczasie – odśwież stronę i powtórz.') } }
export class OdmowaKont extends Error {}

/**
 * Zmiana pliku kont: funkcja dostaje bieżący stan i zwraca nowy. `wersja` – wersja, którą widział panel (kontrola konfliktu);
 * bez niej (logowanie, skrypty) zmiana dotyczy zawsze bieżącego stanu.
 */
export function zmienKonta(zmiana: (p: PlikKont) => PlikKont, opcje: { korzen?: string; wersja?: number } = {}): PlikKont {
    const korzen = opcje.korzen ?? process.cwd()
    const p = plikKont(korzen)
    pamiec = null
    const przed = wczytajKonta(korzen)
    if (opcje.wersja !== undefined && opcje.wersja !== przed.wersja) throw new KonfliktKont()
    const po = odczytajPlik(zmiana(structuredClone(przed)))
    const odmowa = odmowaZmianyKont(przed, po)
    if (odmowa) throw new OdmowaKont(odmowa)
    po.wersja = przed.wersja + 1
    fs.mkdirSync(path.dirname(p), { recursive: true })
    const tmp = `${p}.${process.pid}.tmp`
    // 0660: plik zapisuje usługa (użytkownik blog) i komenda właściciela na serwerze (grupa blog) – npm run konta:administrator
    fs.writeFileSync(tmp, JSON.stringify(po, null, 1) + '\n', { mode: 0o660 })
    fs.renameSync(tmp, p)
    pamiec = null
    return po
}
