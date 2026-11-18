// P6a: zanim Keystatic zapisze – czy serwer (użytkownik usługi) może pisać tam, gdzie chce zapisać albo usunąć.
// Keystatic przy braku prawa rzuca EACCES, a w panelu zostaje pusty czerwony komunikat („Create”/„Unsaved”) – VPS 18.11 21:20:
// content/strona-glowna.yaml w katalogu content/ bez prawa zapisu dla usługi. Tu: czytelny komunikat z katalogiem i komendą.
import fs from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'

/** Najbliższy istniejący katalog nad ścieżką (Keystatic zakłada brakujące katalogi po drodze). */
async function istniejacyKatalog(abs: string): Promise<string> {
    let k = path.dirname(abs)
    for (;;) {
        try { if ((await fs.stat(k)).isDirectory()) return k } catch { /* nie ma – wyżej */ }
        const w = path.dirname(k)
        if (w === k) return k
        k = w
    }
}

export interface BrakPrawa { plik: string; katalog: string }

/** Pliki z zapisu Keystatic, których serwer nie zapisze (zmiana: plik albo katalog; nowy plik i usunięcie: katalog). */
export async function brakPrawaZapisu(korzen: string, dodawane: string[], usuwane: string[]): Promise<BrakPrawa[]> {
    const wyn: BrakPrawa[] = []
    const moze = (p: string) => fs.access(p, constants.W_OK).then(() => true, () => false)
    for (const rel of dodawane) {
        const abs = path.join(/*turbopackIgnore: true*/ korzen, ...rel.split('/'))
        const jest = await fs.stat(abs).then((s) => s.isFile(), () => false)
        const kat = jest ? path.dirname(abs) : await istniejacyKatalog(abs)
        if (jest ? !(await moze(abs)) : !(await moze(kat))) wyn.push({ plik: rel, katalog: path.relative(korzen, kat).split(path.sep).join('/') || '.' })
    }
    for (const rel of usuwane) {
        const abs = path.join(/*turbopackIgnore: true*/ korzen, ...rel.split('/'))
        if (!(await fs.stat(abs).then(() => true, () => false))) continue
        if (!(await moze(path.dirname(abs)))) wyn.push({ plik: rel, katalog: path.relative(korzen, path.dirname(abs)).split(path.sep).join('/') })
    }
    return wyn
}

/** Komunikat dla panelu: co i gdzie; komenda tylko dla katalogów podrzędnych (sam content/ zostaje bez zapisu – decyzja 18.11). */
export function komunikatPrawa(b: BrakPrawa[]): string {
    const katalogi = [...new Set(b.map((x) => x.katalog))]
    const podrzedne = katalogi.filter((k) => k !== 'content' && k.startsWith('content/'))
    return `Zapis wstrzymany – serwer nie ma prawa zapisu: ${b.slice(0, 3).map((x) => x.plik).join(', ')} (katalog ${katalogi.join(', ')}). Nic nie zmieniono.` +
        (podrzedne.length ? ` Jednorazowo na serwerze: cd /opt/personal_blog && sudo chmod g+w ${podrzedne.join(' ')}` : ' Zgłoś to w sesji wykonawcy – plik powinien leżeć w katalogu, do którego serwer ma zapis.')
}
