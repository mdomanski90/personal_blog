// P7c (TER-04): „utwórz obiekt…” ze skrzynki „z terenu” – podgląd i zapis.
// Zapis = jedna operacja (lib/panel/operacje.ts: kopia, „cofnij” w historii operacji) z dwoma plikami: nowy obiekt
// `content/obiekty/<slug>.mdoc` (serializacja jak Keystatic – lib/panel/listy.ts) i wpis skrzynki (stan „opracowane”, obiekt).
// Po zapisie kontrola czytnikiem Keystatic – obiekt, którego strona by nie odczytała, cofa całość (zasada 3.6).
// Zdjęcia KOPIOWANE do `pliki-archiwum/obiekty/<slug>/` (wpis w skrzynce zostaje nienaruszony – zasada 1.7, jawne polecenie
// z podglądem); zdjęcia wpisu są już bez EXIF i GPS (P7b), a trasa /pliki/obiekty i tak wydaje je bez metadanych (zasada 1.8).
// „Cofnij” usuwa obiekt i przywraca wpis do „nowych”; skopiowane zdjęcia zostają w katalogu obiektu (żaden obiekt na nie nie wskazuje,
// więc nie są wydawane) i zostaną użyte ponownie przy kolejnym „utwórz obiekt…” z tym samym identyfikatorem.
import fs from 'node:fs'
import path from 'node:path'
import { NAZWY_OBIEKTOW } from '../tarcze'
import { miejsca as miejscaArchiwum, type Widocznosc } from '../archiwum'
import { serializuj } from '../panel/listy'
import { wykonajOperacje } from '../panel/operacje'
import { ID_MIEJSCA, type MiejsceTerenu, odczytajMiejsce } from './miejsca'
import { naglowekObiektu, plikZdjeciaObiektu, slugObiektu, sprawdzPola, szkicObiektu, type PolaObiektu } from './obiekt'

const kat = (korzen: string, ...c: string[]) => path.join(/*turbopackIgnore: true*/ korzen, ...c)

export interface PodgladObiektu {
    szkic: PolaObiektu
    rodzaje: [string, string][]
    miejsca: { id: string; nazwa: string }[]
    /** identyfikator, który dostanie obiekt przy obecnej nazwie i miejscowości */
    slug: string
}

async function zajeteSlugi(korzen: string): Promise<Set<string>> {
    try { return new Set((await fs.promises.readdir(kat(korzen, 'content', 'obiekty'))).filter((p) => p.endsWith('.mdoc')).map((p) => p.slice(0, -5))) }
    catch { return new Set() }
}

async function wpisZPliku(id: string, korzen: string): Promise<{ m: MiejsceTerenu; tekst: string } | null> {
    if (!ID_MIEJSCA.test(id)) return null
    try {
        const tekst = await fs.promises.readFile(kat(korzen, 'content', '_teren', 'miejsca', `${id}.json`), 'utf8')
        const m = odczytajMiejsce(JSON.parse(tekst))
        return m ? { m, tekst } : null
    } catch { return null }
}

const RODZAJE: [string, string][] = Object.entries(NAZWY_OBIEKTOW)

export async function podgladObiektu(id: string, poziom: Widocznosc, korzen = process.cwd()): Promise<PodgladObiektu | null> {
    const w = await wpisZPliku(id, korzen)
    if (!w) return null
    const miejsca = (await miejscaArchiwum(poziom)).map((x) => ({ id: x.id, nazwa: x.nazwa })).sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'))
    const szkic = szkicObiektu(w.m)
    if (szkic.miejsce && !miejsca.some((x) => x.id === szkic.miejsce)) szkic.miejsce = ''
    const nazwaMiejsca = miejsca.find((x) => x.id === szkic.miejsce)?.nazwa ?? ''
    return { szkic, rodzaje: RODZAJE, miejsca, slug: slugObiektu(szkic.nazwa, nazwaMiejsca, await zajeteSlugi(korzen)) }
}

export type WynikObiektu =
    | { ok: true; slug: string; nazwa: string; operacja: string | null; juz?: boolean }
    | { ok: false; status: number; blad: string }

/** Kopiuje zdjęcia wpisu do katalogu obiektu. Zwraca pliki utworzone teraz (do usunięcia, gdy operacja się nie uda). */
async function kopiujZdjecia(id: string, slug: string, zdjecia: string[], korzen: string): Promise<string[]> {
    const cel = kat(korzen, 'pliki-archiwum', 'obiekty', slug)
    await fs.promises.mkdir(cel, { recursive: true })
    const nowe: string[] = []
    try {
        for (let i = 0; i < zdjecia.length; i++) {
            const z = kat(korzen, 'pliki-archiwum', 'teren', id, zdjecia[i]), d = path.join(cel, plikZdjeciaObiektu(i, zdjecia[i]))
            try { await fs.promises.copyFile(z, d, fs.constants.COPYFILE_EXCL); nowe.push(d) }
            catch (e) {
                if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
                // po „cofnij” zostaje kopia z poprzedniego razu – ta sama treść: używamy jej; inna – nie nadpisujemy cudzego pliku
                const [a, b] = await Promise.all([fs.promises.readFile(z), fs.promises.readFile(d)])
                if (!a.equals(b)) throw new Error(`W katalogu obiektu jest już inny plik ${path.basename(d)} – nic nie zapisano.`)
            }
        }
        return nowe
    } catch (e) {
        await Promise.all(nowe.map((p) => fs.promises.rm(p, { force: true })))
        throw e
    }
}

/**
 * Tworzy obiekt z wpisu skrzynki. Powtórka (wpis ma już obiekt) zwraca ten sam obiekt bez zmian.
 * `kto` – podpis w wpisie skrzynki (rozstrzygnął); `poziom` – lista miejscowości dostępna dla konta.
 */
export async function utworzObiektZTerenu(id: string, dane: unknown, kto: string, poziom: Widocznosc, korzen = process.cwd()): Promise<WynikObiektu> {
    const w = await wpisZPliku(id, korzen)
    if (!w) return { ok: false, status: 404, blad: 'Nie ma takiego wpisu.' }
    // powtórka (zgubiona odpowiedź, drugie kliknięcie): obiekt już jest – ten sam wynik; plik usunięty ręcznie – można utworzyć od nowa
    if (w.m.obiekt && fs.existsSync(kat(korzen, 'content', 'obiekty', `${w.m.obiekt}.mdoc`))) return { ok: true, slug: w.m.obiekt, nazwa: w.m.opis ?? w.m.obiekt, operacja: null, juz: true }
    if (w.m.stan !== 'nowe') return { ok: false, status: 409, blad: 'Ten wpis jest już rozstrzygnięty – przywróć go do nowych, jeśli chcesz utworzyć obiekt.' }
    const miejsca = await miejscaArchiwum(poziom)
    const p = sprawdzPola(dane, w.m, { rodzaje: RODZAJE.map(([k]) => k), miejsca: miejsca.map((x) => x.id) })
    if (typeof p === 'string') return { ok: false, status: 400, blad: p }
    const slug = slugObiektu(p.nazwa, miejsca.find((x) => x.id === p.miejsce)?.nazwa ?? '', await zajeteSlugi(korzen))
    const nowe = await kopiujZdjecia(id, slug, p.zdjecia, korzen).catch((e: Error) => e)
    if (nowe instanceof Error) return { ok: false, status: 500, blad: nowe.message }
    const teraz = new Date().toISOString()
    const wpis: MiejsceTerenu = { ...w.m, stan: 'opracowane', opis: `obiekt: ${p.nazwa}`.slice(0, 300), rozstrzygnal: kto || 'redakcja', rozstrzygnieto: teraz, obiekt: slug }
    try {
        const op = await wykonajOperacje({
            korzen, rodzaj: 'z-terenu', opis: `obiekt „${p.nazwa}” ze skrzynki „z terenu” (${w.m.imie})`,
            zmiany: [
                { plik: `obiekty/${slug}.mdoc`, poprzedni: null, wynik: serializuj(naglowekObiektu(w.m, p, slug), '') },
                { plik: `_teren/miejsca/${id}.json`, poprzedni: w.tekst, wynik: JSON.stringify(wpis, null, 1) },
            ],
            szczegoly: { wpis: id, obiekt: slug, zdjec: p.zdjecia.length },
            sprawdz: async () => {
                const { createReader } = await import('@keystatic/core/reader')
                const cfg = (await import('../../keystatic.config')).default
                const r = createReader(korzen, cfg) as unknown as { collections: Record<string, { read: (s: string) => Promise<unknown> }> }
                try { if (!(await r.collections.obiekty.read(slug))) throw new Error('brak wpisu') }
                catch (e) { throw new Error(`Obiekt „${slug}” byłby nieczytelny dla strony (${String(e instanceof Error ? e.message : e).slice(0, 160)}) – nic nie zapisano.`) }
            },
        })
        return { ok: true, slug, nazwa: p.nazwa, operacja: op.id }
    } catch (e) {
        await Promise.all(nowe.map((f) => fs.promises.rm(f, { force: true })))
        const blad = String(e instanceof Error ? e.message : e)
        return { ok: false, status: /zmienił się od podglądu|blokada|trwa/i.test(blad) ? 409 : 500, blad: blad.slice(0, 400) }
    }
}
