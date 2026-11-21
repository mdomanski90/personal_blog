// Miejscowości projektu w ustalonej kolejności: wiersze stopki i „kręgi” (filtr na stronie osób).
// OPS-07 (P3, decyzja 17.11): ustawiane w panelu (singleton „Kręgi i stopka”, content/_panel/kregi-stopka.json).
// Poniższe listy to wyłącznie wartości domyślne – używane, dopóki ustawienie nie zostanie zapisane (stan sprzed P3, wygląd bez zmian).
// Kręgi mogą się przenikać: osoba związana z wsiami z obu kręgów pokazuje się w obu.

import { normalizuj } from './tekst'

export type WierszStopki = { krag: number | null; miejsca: string[] }
export type Krag = { id: string; nazwa: string; opis: string; miejsca: string[] }
export type UstawieniaKregow = { kregi: { nazwa: string; opis: string }[]; wiersze: WierszStopki[] }

export const WIERSZE_DOMYSLNE: WierszStopki[] = [
    { krag: 1, miejsca: ['Aleksandrówka', 'Bejdy', 'Bolesty', 'Dawidy', 'Hadynów', 'Klimy', 'Korczówka', 'Korczówka-Kolonia', 'Łepki Nowe', 'Łepki Stare', 'Mszanna', 'Olszanka', 'Pietrusy', 'Próchenki', 'Radlnia', 'Szawły', 'Szydłówka', 'Wyczółki', 'Łosice'] },
    { krag: 2, miejsca: ['Kożuszki', 'Krawce', 'Krzewica', 'Łuby', 'Łuniew', 'Pościsze', 'Międzyrzec Podlaski'] },
    { krag: 2, miejsca: ['Krzesk-Majątek', 'Krzesk Stary', 'Krzesk-Królowa Niwa'] },
]
export const KREGI_DOMYSLNE = [
    { nazwa: 'krąg 1', opis: 'okolice Olszanki i Łosic' },
    { nazwa: 'krąg 2', opis: 'okolice Międzyrzeca i Krzesk' },
]

/** Czysta funkcja: ustawienia → wiersze stopki i kręgi (krąg n = miejscowości wierszy z numerem n, w kolejności). Puste ustawienie – domyślne. */
export function zbudujKregi(u: Partial<UstawieniaKregow> | null | undefined): { wiersze: string[][]; kregi: Krag[] } {
    const wiersze = (u?.wiersze?.length ? u.wiersze : WIERSZE_DOMYSLNE).map((w) => ({ krag: w.krag ?? null, miejsca: (w.miejsca ?? []).map((m) => String(m).trim()).filter(Boolean) })).filter((w) => w.miejsca.length)
    const opisy = u?.kregi?.length ? u.kregi : KREGI_DOMYSLNE
    const kregi = opisy.map((k, i) => ({ id: String(i + 1), nazwa: k.nazwa || `krąg ${i + 1}`, opis: k.opis ?? '', miejsca: wiersze.filter((w) => w.krag === i + 1).flatMap((w) => w.miejsca) })).filter((k) => k.miejsca.length)
    return { wiersze: wiersze.map((w) => w.miejsca), kregi }
}

/** Ustawienie z panelu (serwer). Brak pliku albo błąd odczytu – wartości domyślne. */
export async function wczytajKregi(): Promise<{ wiersze: string[][]; kregi: Krag[] }> {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    try {
        const j = JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', '_panel', 'kregi-stopka.json'), 'utf8')) as Partial<UstawieniaKregow>
        return zbudujKregi(j)
    } catch {
        return zbudujKregi(null)
    }
}

/** Klucz porównania nazw miejscowości: bez znaków diakrytycznych, wielkości liter i łączników („Krzesk-Majątek” = „krzesk majatek”). */
export const kluczMiejsca = (s: string) => normalizuj(s)
