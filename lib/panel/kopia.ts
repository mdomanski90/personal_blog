// Etap 0A (audyt nr 2): kopia zapasowa z panelu.
// Jedno archiwum .tar.gz z content/, pliki-archiwum/ i data/ (bazy SQLite skopiowane spójnie przez .backup(), nie „na żywo”)
// oraz kopia.json z czasem, wersją kodu i listą części. Dwa sposoby:
//  • „pobierz na komputer” – archiwum strumieniowane do przeglądarki; to jest kopia POZA serwerem,
//  • „zapisz na serwerze” – do katalogu wskazanego w panelu (poza katalogiem strony), z zachowaniem kilku ostatnich.
// Znacznik ostatnich kopii: content/_panel/kopia.json (panel ostrzega, gdy kopii poza serwerem długo nie ma).
// Kod niczego nie usuwa poza własnymi starymi archiwami w katalogu kopii (wzorzec nazwy odniepamieci-kopia-*.tar.gz).
import fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, type ChildProcessByStdio } from 'node:child_process'
import type { Readable } from 'node:stream'

export const CZESCI = ['content', 'pliki-archiwum', 'data'] as const
export const ZACHOWAJ_NA_SERWERZE = 5
const WZOR = /^odniepamieci-kopia-\d{8}-\d{6}\.tar\.gz$/

export interface Znacznik {
    komputer?: { czas: string; bajty: number }
    serwer?: { czas: string; bajty: number; plik: string }
    katalog?: string
}

const plikZnacznika = (korzen: string) => path.join(korzen, 'content', '_panel', 'kopia.json')

export async function wczytajZnacznik(korzen = process.cwd()): Promise<Znacznik> {
    try { return JSON.parse(await fs.readFile(plikZnacznika(korzen), 'utf8')) as Znacznik } catch { return {} }
}

async function zapiszZnacznik(z: Znacznik, korzen: string) {
    const p = plikZnacznika(korzen)
    await fs.mkdir(path.dirname(p), { recursive: true })
    const tmp = `${p}.${process.pid}.tmp`
    await fs.writeFile(tmp, JSON.stringify(z, null, 1))
    await fs.rename(tmp, p)
}

export const nazwaArchiwum = (d = new Date()) => {
    const z = (n: number) => String(n).padStart(2, '0')
    return `odniepamieci-kopia-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}.tar.gz`
}

/**
 * Katalog kopii na serwerze: ścieżka bezwzględna, bez „..”, poza katalogiem strony (żeby kopia nie trafiała do kolejnej kopii
 * ani do repozytorium), istniejąca i zapisywalna. Zwraca komunikat błędu albo null.
 */
export async function sprawdzKatalog(katalog: string, korzen = process.cwd()): Promise<string | null> {
    if (!katalog || !path.isAbsolute(katalog)) return 'Podaj pełną ścieżkę zaczynającą się od /.'
    if (katalog.split(/[\\/]/).includes('..')) return 'Ścieżka nie może zawierać „..”.'
    const k = path.resolve(/*turbopackIgnore: true*/ katalog), r = path.resolve(/*turbopackIgnore: true*/ korzen)
    if (k === r || k.startsWith(r + path.sep) || r.startsWith(k + path.sep)) return 'Katalog kopii musi leżeć poza katalogiem strony.'
    try {
        if (!(await fs.stat(/*turbopackIgnore: true*/ k)).isDirectory()) return 'To nie jest katalog.'
        await fs.access(/*turbopackIgnore: true*/ k, fs.constants.W_OK)
    } catch { return `Katalog nie istnieje albo serwer nie może w nim zapisywać. Na serwerze: sudo install -d -o blog -g blog -m 0750 ${k}` }
    return null
}

export async function ustawKatalog(katalog: string, korzen = process.cwd()): Promise<string | null> {
    const blad = await sprawdzKatalog(katalog, korzen)
    if (blad) return blad
    await zapiszZnacznik({ ...(await wczytajZnacznik(korzen)), katalog: path.resolve(katalog) }, korzen)
    return null
}

let trwa = false

/** Przygotowuje katalog tymczasowy: spójne kopie baz SQLite + kopia.json. Pliki content/ i pliki-archiwum/ czyta tar bez kopiowania. */
async function przygotuj(korzen: string, commit: string | null) {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'kopia-'))
    const dataSrc = path.join(korzen, 'data')
    const dataDst = path.join(tmp, 'data')
    await fs.mkdir(dataDst)
    const bazy: string[] = [], inne: string[] = []
    let wpisy: import('node:fs').Dirent[] = []
    try { wpisy = await fs.readdir(/*turbopackIgnore: true*/ dataSrc, { withFileTypes: true }) } catch { /* brak data/ */ }
    for (const w of wpisy) {
        if (!w.isFile()) continue
        const src = path.join(dataSrc, w.name), dst = path.join(dataDst, w.name)
        if (/-(wal|shm|journal)$/.test(w.name)) continue // pliki pomocnicze SQLite – .backup() zawiera ich treść
        if (/\.(db|sqlite3?)$/i.test(w.name)) {
            const { default: Database } = await import('better-sqlite3')
            const db = new Database(src, { readonly: true, fileMustExist: true })
            try { await db.backup(dst) } finally { db.close() }
            bazy.push(w.name)
        } else { await fs.copyFile(src, dst); inne.push(w.name) }
    }
    const czesci = [] as string[]
    for (const c of ['content', 'pliki-archiwum'] as const) {
        try { await fs.access(path.join(/*turbopackIgnore: true*/ korzen, c)); czesci.push(c) } catch { /* brak części */ }
    }
    await fs.writeFile(path.join(tmp, 'kopia.json'), JSON.stringify({
        utworzono: new Date().toISOString(), commit, czesci: [...czesci, 'data'], bazySQLite: bazy, inneZData: inne,
        przywracanie: 'Rozpakuj do pustego katalogu: tar -xzf <plik> -C /tmp/test-kopii; porównaj z bieżącymi danymi, zanim cokolwiek nadpiszesz.',
    }, null, 1))
    return { tmp, czesci }
}

function tar(korzen: string, tmp: string, czesci: string[]): ChildProcessByStdio<null, Readable, Readable> {
    // GNU tar: kilka -C w jednym archiwum; gzip -1 – skany JPEG i tak się nie kompresują, liczy się czas
    return spawn('tar', ['--use-compress-program=gzip -1', '-cf', '-', '-C', korzen, ...czesci, '-C', tmp, 'data', 'kopia.json'],
        { stdio: ['ignore', 'pipe', 'pipe'] })
}

export interface Strumien { nazwa: string; strumien: Readable; koniec: Promise<{ ok: boolean; bajty: number; blad?: string }> }

/** Archiwum jako strumień (do pobrania lub zapisu). Przy sukcesie zapisuje znacznik danego rodzaju. */
export async function utworzKopie(rodzaj: 'komputer' | 'serwer', opcje: { korzen?: string; commit?: string | null } = {}): Promise<Strumien | string> {
    const korzen = opcje.korzen ?? process.cwd()
    if (trwa) return 'Kopia już się tworzy – poczekaj, aż się skończy.'
    trwa = true
    let tmp = ''
    try {
        const p = await przygotuj(korzen, opcje.commit ?? null)
        tmp = p.tmp
        const t = tar(korzen, tmp, p.czesci)
        let bajty = 0, stderr = ''
        t.stdout.on('data', (b: Buffer) => { bajty += b.length })
        t.stderr.on('data', (b: Buffer) => { stderr += b.toString().slice(0, 500) })
        const sprzataj = () => { trwa = false; return fs.rm(tmp, { recursive: true, force: true }) }
        const koniec = new Promise<{ ok: boolean; bajty: number; blad?: string }>((ok) => {
            t.on('error', (e) => { void sprzataj(); ok({ ok: false, bajty, blad: e.message }) })
            t.on('close', async (kod) => {
                await sprzataj()
                // tar zwraca 1, gdy plik zmienił się w trakcie czytania – archiwum jest wtedy użyteczne, ale zgłaszamy to
                if (kod !== 0 && kod !== 1) return ok({ ok: false, bajty, blad: stderr || `tar zakończył się kodem ${kod}` })
                if (rodzaj === 'komputer') await zapiszZnacznik({ ...(await wczytajZnacznik(korzen)), komputer: { czas: new Date().toISOString(), bajty } }, korzen).catch(() => {})
                ok({ ok: true, bajty, blad: kod === 1 ? 'Część plików zmieniła się w trakcie kopii – zrób kopię jeszcze raz, gdy nikt nie edytuje.' : undefined })
            })
        })
        return { nazwa: nazwaArchiwum(), strumien: t.stdout, koniec }
    } catch (e) {
        trwa = false
        if (tmp) await fs.rm(tmp, { recursive: true, force: true })
        return `Nie udało się przygotować kopii: ${(e as Error).message}`
    }
}

/** Zapis na serwerze do wskazanego katalogu: .part → rename, potem usunięcie najstarszych własnych archiwów ponad limit. */
export async function zapiszNaSerwerze(opcje: { korzen?: string; commit?: string | null } = {}): Promise<{ plik: string; bajty: number; uwaga?: string } | string> {
    const korzen = opcje.korzen ?? process.cwd()
    const z = await wczytajZnacznik(korzen)
    if (!z.katalog) return 'Najpierw wskaż katalog kopii na serwerze.'
    const blad = await sprawdzKatalog(z.katalog, korzen)
    if (blad) return blad
    const s = await utworzKopie('serwer', opcje)
    if (typeof s === 'string') return s
    const cel = path.join(/*turbopackIgnore: true*/ z.katalog, s.nazwa), part = `${cel}.part`
    const out = createWriteStream(/*turbopackIgnore: true*/ part, { mode: 0o640 })
    s.strumien.pipe(out)
    const [wynik] = await Promise.all([s.koniec, new Promise<void>((ok, zle) => { out.on('finish', () => ok()); out.on('error', zle) })])
    if (!wynik.ok) { await fs.rm(part, { force: true }); return `Kopia nie powstała: ${wynik.blad}` }
    await fs.rename(part, cel)
    const stare = (await fs.readdir(/*turbopackIgnore: true*/ z.katalog)).filter((n) => WZOR.test(n)).sort().reverse().slice(ZACHOWAJ_NA_SERWERZE)
    for (const n of stare) await fs.rm(path.join(/*turbopackIgnore: true*/ z.katalog, n), { force: true })
    await zapiszZnacznik({ ...(await wczytajZnacznik(korzen)), serwer: { czas: new Date().toISOString(), bajty: wynik.bajty, plik: cel } }, korzen)
    return { plik: cel, bajty: wynik.bajty, uwaga: wynik.blad }
}

export async function kopieNaSerwerze(korzen = process.cwd()): Promise<{ nazwa: string; bajty: number; czas: string }[]> {
    const z = await wczytajZnacznik(korzen)
    if (!z.katalog) return []
    try {
        const n = (await fs.readdir(/*turbopackIgnore: true*/ z.katalog)).filter((x) => WZOR.test(x)).sort().reverse()
        return Promise.all(n.map(async (x) => { const s = await fs.stat(path.join(/*turbopackIgnore: true*/ z.katalog!, x)); return { nazwa: x, bajty: s.size, czas: s.mtime.toISOString() } }))
    } catch { return [] }
}

/**
 * P5 (decyzja właściciela 18.11): import drzewa tylko po świeżej kopii poza serwerem (pobranej na komputer).
 * Zwraca null, gdy kopia z ostatnich `godzin` jest, inaczej komunikat dla panelu.
 */
export async function brakSwiezejKopii(korzen = process.cwd(), godzin = 24, teraz = Date.now()): Promise<string | null> {
    const z = await wczytajZnacznik(korzen)
    const czas = z.komputer?.czas ? Date.parse(z.komputer.czas) : NaN
    if (Number.isFinite(czas) && teraz - czas <= godzin * 3600_000 && teraz >= czas) return null
    return Number.isFinite(czas)
        ? `Ostatnia kopia na komputerze jest starsza niż ${godzin} godziny (${new Date(czas).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })}). Pobierz kopię teraz, potem wczytaj drzewo.`
        : 'Przed wczytaniem drzewa pobierz kopię na komputer (przycisk obok) – bez niej import jest zablokowany.'
}
