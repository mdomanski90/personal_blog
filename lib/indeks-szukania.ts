// PD-13 (P2): indeks wyszukiwania w SQLite (FTS5) – osobny plik na każdy poziom czytelnika, odbudowywany leniwie.
// Zasady (decyzja właściciela, 17.11 – „SQLite” rozstrzygnięte; tu tylko „jak”):
//  1. Plik indeksu poziomu zawiera WYŁĄCZNIE dokumenty widoczne na tym poziomie (dane przefiltrowane wcześniej przez loadery z lib/archiwum),
//     więc zapytanie publiczne nie dotyka treści „dla bliskich” ani „tylko ja” – także fizycznie (test: lib/indeks-szukania.test.ts).
//  2. FTS5 służy tylko do wybrania kandydatów (prefiksy rdzeni z lib/szukanie + podciąg w nazwach); o trafieniu, wadze i fragmencie
//     rozstrzyga ten sam kod co przy skanie pamięci (ocenaDokumentu) – wyniki są identyczne ze skanem (test równoważności).
//  3. Odbudowa: odcisk treści (liczba plików, największy mtime, rozmiar w content/) + data (widoczność osób zależy od reguły 100/25 lat).
//  Czyste funkcje oprócz części SQLite; bez Next/React.
import fs from 'node:fs'
import path from 'node:path'
import { pasuje, pozycjaTrafienia, przygotujZapytanie, rdzenie, type Zapytanie } from './szukanie'
import { normalizujDoSzukania as normalizuj, porownajPl } from './tekst' // P6b (PPL-07): cyrylica ↔ łacinka

export type RodzajWyniku = 'osoba' | 'miejsce' | 'obiekt' | 'temat' | 'wpis' | 'materiał' | 'księga' | 'parafia' | 'hasło' | 'publikacja' | 'zbiór' | 'objaśnienie'
export interface Wynik {
    rodzaj: RodzajWyniku
    /** etykieta przy wyniku: osoba, wieś, cerkiew unicka, wpis, dokument… */
    etykieta: string
    id: string
    tytul: string
    adres: string
    fragment: string
    /** wynik dołączony przez powiązanie z miejscowością, nie przez sam tekst */
    przez?: string
    waga?: number
}

/** Dokument do wyszukania – jedna pozycja (miejsce, osoba, materiał, objaśnienie skanu…) już przefiltrowana dla czytelnika. */
export interface DokumentSzukania {
    rodzaj: RodzajWyniku
    etykieta: string
    id: string
    tytul: string
    adres: string
    /** „ocena” – nazwa dokładna 3 / w nazwie 2 / w nazwie i tekście 1; „p5” – publikacje i zbiory (waga 2 przy frazie w nazwie, inaczej 1) */
    tryb?: 'ocena' | 'p5'
    nazwy: string[]
    tekst: string
    /** tekst, z którego wycinamy fragment wokół trafienia (tylko trafienie w tekście, waga 1) */
    tekstFragmentu?: string
    /** fragment, gdy trafiono w nazwę – albo fragment stały (stalyFragment) */
    fragment: string
    stalyFragment?: boolean
    /** P6b (PPL-07): trafienie tylko w tekście, ale nie w tekstFragmentu (np. zajęcie osoby) – pokaż `fragment`, nie początek tekstu */
    fragmentGdyBrak?: boolean
    /** dodatek do wagi (miejscowości +0,3) */
    bonus?: number
    /** identyfikatory miejscowości, z którymi pozycja jest powiązana (dołączana, gdy trafiono w miejscowość) */
    miejsca?: string[]
    /** fragment przy dołączeniu przez miejscowość */
    fragmentPrzez?: string
    /** kolejność w zbiorze (nadawana przy numerowaniu) – remisy w wynikach zachowują kolejność źródła */
    ord?: number
}

export function fragmentWokol(tekst: string, z: Zapytanie): string {
    const i = pozycjaTrafienia(z, tekst)
    if (i < 0) return tekst.slice(0, 160)
    // normalizuj nie zmienia długości liter, ale skleja odstępy – miejsce w oryginale przybliżone
    const proporcja = tekst.length / Math.max(normalizuj(tekst).length, 1)
    const start = Math.max(0, Math.floor(i * proporcja) - 60)
    return (start > 0 ? '…' : '') + tekst.slice(start, start + 180).trim() + '…'
}

/** 3 – nazwa dokładnie taka; 2 – wszystkie słowa w nazwie; 1 – w nazwie i tekście razem; 0 – brak. */
export function ocen(z: Zapytanie, nazwy: string[], tekst: string): number {
    if (nazwy.some((n) => normalizuj(n) === z.fraza)) return 3
    if (nazwy.some((n) => normalizuj(n).includes(z.fraza)) || pasuje(z, nazwy.join(' '))) return 2
    if (pasuje(z, `${nazwy.join(' ')} ${tekst}`)) return 1
    return 0
}

export function ocenaDokumentu(d: DokumentSzukania, z: Zapytanie): { waga: number; fragment: string } | null {
    if (d.tryb === 'p5') {
        if (!pasuje(z, d.tekst)) return null
        return { waga: normalizuj(d.nazwy[0] ?? '').includes(z.fraza) ? 2 : 1, fragment: d.fragment }
    }
    const surowa = ocen(z, d.nazwy, d.tekst)
    if (!surowa) return null
    const fragment = d.stalyFragment || surowa !== 1 || (d.fragmentGdyBrak && pozycjaTrafienia(z, d.tekstFragmentu ?? '') < 0) ? d.fragment : fragmentWokol(d.tekstFragmentu ?? '', z)
    return { waga: surowa + (d.bonus ?? 0), fragment }
}

const DOLACZANE: RodzajWyniku[] = ['wpis', 'materiał', 'obiekt', 'temat', 'księga']
const naWynik = (d: DokumentSzukania, fragment: string, waga: number, przez?: string): Wynik & { waga: number } => ({
    rodzaj: d.rodzaj, etykieta: d.etykieta, id: d.id, tytul: d.tytul, adres: d.adres, fragment, ...(przez ? { przez } : {}), waga,
})

/** Źródło dokumentów: skan pamięci albo indeks SQLite – ta sama reguła wyboru wyników. */
export interface ZrodloDokumentow {
    kandydaci(z: Zapytanie): DokumentSzukania[]
    powiazane(idMiejscowosci: string): DokumentSzukania[]
}

export function szukajWZrodle(zrodlo: ZrodloDokumentow, zapytanie: string): Wynik[] {
    const z = przygotujZapytanie(zapytanie)
    if (!z) return []
    const wyniki: (Wynik & { waga: number })[] = []
    const miejscowosci: { d: DokumentSzukania; waga: number }[] = []
    for (const d of [...zrodlo.kandydaci(z)].sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0))) {
        const o = ocenaDokumentu(d, z)
        if (!o) continue
        wyniki.push(naWynik(d, o.fragment, o.waga))
        if (d.rodzaj === 'miejsce' && o.waga >= 2) miejscowosci.push({ d, waga: o.waga })
    }
    // trafienie w miejscowość: dołącz wpisy, materiały, obiekty, tematy i księgi powiązane z miejscem
    const znalezione = new Set(wyniki.map((w) => `${w.rodzaj}:${w.id}`))
    for (const { d: m } of miejscowosci) {
        const powiazane = zrodlo.powiazane(m.id)
        for (const rodzaj of DOLACZANE) {
            for (const d of powiazane.filter((x) => x.rodzaj === rodzaj).sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0))) {
                const k = `${d.rodzaj}:${d.id}`
                if (znalezione.has(k)) continue
                znalezione.add(k)
                wyniki.push(naWynik(d, d.fragmentPrzez ?? '', 0.5, m.tytul))
            }
        }
    }
    return wyniki.sort((a, b) => b.waga - a.waga || porownajPl(a.tytul, b.tytul))
}

export const ponumeruj = (dokumenty: DokumentSzukania[]): DokumentSzukania[] => dokumenty.map((d, i) => ({ ...d, ord: i }))

/** Wyszukiwanie przez skan pamięci – wzorzec odniesienia dla testu równoważności i zapas, gdy SQLite jest niedostępne. */
export function szukajSkanem(dokumenty: DokumentSzukania[], zapytanie: string): Wynik[] {
    const dok = ponumeruj(dokumenty)
    return szukajWZrodle({ kandydaci: () => dok, powiazane: (id) => dok.filter((d) => d.miejsca?.includes(id)) }, zapytanie)
}

// ---------- SQLite ----------

type Baza = {
    prepare(sql: string): { run(...a: unknown[]): unknown; all(...a: unknown[]): Record<string, unknown>[]; get(...a: unknown[]): Record<string, unknown> | undefined }
    exec(sql: string): void
    close(): void
    transaction<T extends unknown[]>(f: (...a: T) => void): (...a: T) => void
}
type KonstruktorBazy = new (plik: string, opcje?: { readonly?: boolean; fileMustExist?: boolean }) => Baza
let Sqlite: KonstruktorBazy | null | undefined
/** Ładuje natywny moduł (dynamiczny import – jak w lib/panel/kopia.ts; w Next to pakiet zewnętrzny). null – niedostępny, wtedy skan pamięci. */
export async function zaladujSqlite(): Promise<boolean> {
    if (Sqlite === undefined) {
        try { Sqlite = (await import('better-sqlite3')).default as unknown as KonstruktorBazy } catch { Sqlite = null }
    }
    return Sqlite !== null
}
const sqlite = (): KonstruktorBazy | null => Sqlite ?? null

const WERSJA = 1

/** Część wspólna zapisu do FTS: nazwy i tekst znormalizowane tak samo jak w pasuje(). */
const tekstFts = (d: DokumentSzukania) => normalizuj(`${d.nazwy.join(' ')} ${d.tekst}`)

/** Wyrażenie MATCH: dla każdego słowa – którykolwiek rdzeń jako prefiks; słowa łączone AND. null – nie da się zawęzić (skan). */
export function zapytanieFts(z: Zapytanie, slowa = z.fraza.split(' ').filter(Boolean)): string | null {
    const grupy: string[] = []
    for (const w of slowa) {
        const pref = [...new Set(rdzenie(w).map((r) => r.match(/[a-z0-9]+/)?.[0]).filter((x): x is string => !!x))]
        if (!pref.length) return null
        grupy.push(`(${pref.map((p) => `"${p}"*`).join(' OR ')})`)
    }
    return grupy.length ? grupy.join(' AND ') : null
}

/** Buduje plik indeksu (atomowo: plik tymczasowy → rename). Dokumenty = już przefiltrowane dla poziomu. */
export function zbudujIndeks(plik: string, dokumenty: DokumentSzukania[], odcisk: string): void {
    const Baza = sqlite()
    if (!Baza) throw new Error('better-sqlite3 niedostępne')
    fs.mkdirSync(path.dirname(plik), { recursive: true })
    const tmp = `${plik}.${process.pid}.${Date.now()}.tmp`
    const db = new Baza(tmp)
    try {
        db.exec(`PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;
            CREATE TABLE meta(k TEXT PRIMARY KEY, v TEXT);
            CREATE TABLE dok(ord INTEGER PRIMARY KEY, nazwy TEXT NOT NULL, dane TEXT NOT NULL);
            CREATE TABLE pow(miejsce TEXT NOT NULL, ord INTEGER NOT NULL);
            CREATE INDEX pow_m ON pow(miejsce);
            CREATE VIRTUAL TABLE ft USING fts5(tekst, tokenize='unicode61 remove_diacritics 2');`)
        const wDok = db.prepare('INSERT INTO dok(ord, nazwy, dane) VALUES (?,?,?)')
        const wFt = db.prepare('INSERT INTO ft(rowid, tekst) VALUES (?,?)')
        const wPow = db.prepare('INSERT INTO pow(miejsce, ord) VALUES (?,?)')
        db.transaction((lista: DokumentSzukania[]) => {
            lista.forEach((d, ord) => {
                wDok.run(ord, d.nazwy.map(normalizuj).join('\n'), JSON.stringify({ ...d, ord }))
                wFt.run(ord, tekstFts(d))
                for (const m of d.miejsca ?? []) wPow.run(m, ord)
            })
        })(dokumenty)
        db.prepare('INSERT INTO meta(k,v) VALUES (?,?)').run('odcisk', odcisk)
        db.prepare('INSERT INTO meta(k,v) VALUES (?,?)').run('wersja', String(WERSJA))
        db.prepare('INSERT INTO meta(k,v) VALUES (?,?)').run('dokumentow', String(dokumenty.length))
    } catch (e) {
        db.close(); fs.rmSync(tmp, { force: true }); throw e
    }
    db.close()
    fs.renameSync(tmp, plik)
}

export function odcisk(plik: string): string | null {
    const Baza = sqlite()
    if (!Baza || !fs.existsSync(plik)) return null
    try {
        const db = new Baza(plik, { readonly: true, fileMustExist: true })
        try {
            const w = db.prepare('SELECT v FROM meta WHERE k=?').get('odcisk')?.v
            const wersja = db.prepare('SELECT v FROM meta WHERE k=?').get('wersja')?.v
            return wersja === String(WERSJA) && typeof w === 'string' ? w : null
        } finally { db.close() }
    } catch { return null }
}

/** Źródło z pliku indeksu: kandydaci = FTS (prefiksy rdzeni) ∪ podciąg frazy w nazwach (tak jak ocen()). */
export function zrodloZIndeksu(plik: string): ZrodloDokumentow & { zamknij(): void } {
    const Baza = sqlite()
    if (!Baza) throw new Error('better-sqlite3 niedostępne')
    const db = new Baza(plik, { readonly: true, fileMustExist: true })
    const dok = (w: Record<string, unknown>) => JSON.parse(String(w.dane)) as DokumentSzukania
    return {
        kandydaci(z) {
            const m = zapytanieFts(z)
            // brak możliwości zawężenia (rdzeń bez liter/cyfr) – pełny przegląd, jak skan
            if (!m) return db.prepare('SELECT dane FROM dok').all().map(dok)
            const a = db.prepare('SELECT d.dane FROM ft JOIN dok d ON d.ord = ft.rowid WHERE ft MATCH ?').all(m)
            const b = db.prepare("SELECT dane FROM dok WHERE instr(char(10) || nazwy || char(10), ?) > 0").all(z.fraza)
            const widziane = new Set<number>()
            return [...a, ...b].map(dok).filter((d) => !widziane.has(d.ord!) && !!widziane.add(d.ord!))
        },
        powiazane: (id) => db.prepare('SELECT d.dane FROM pow p JOIN dok d ON d.ord = p.ord WHERE p.miejsce = ?').all(id).map(dok),
        zamknij: () => db.close(),
    }
}

// ---------- odcisk treści i odbudowa leniwa ----------

/** Wersja układu dokumentów w indeksie – podbić ręcznie, gdy zmienia się to, co `dokumentySzukania` wkłada do indeksu (poza wydaniem programu, zob. niżej). */
export const WERSJA_INDEKSU = 3 // P3: dopisek „po mężu” z zapisem męża, formy „-owa”, hasła w sieci; P6b: pełne biogramy, zajęcie osoby, cyrylica

/** Identyfikator wydania programu (`.next/BUILD_ID`): nowe wydanie = nowy kod budujący dokumenty = indeks do odbudowy, nawet gdy treść się nie zmieniła. */
function wydanie(korzen: string): string {
    try { return fs.readFileSync(path.join(/*turbopackIgnore: true*/ korzen, '.next', 'BUILD_ID'), 'utf8').trim().slice(0, 40) } catch { return '' }
}

/** Odcisk treści: liczba plików, największy mtime i łączny rozmiar w `content/` (bez zgłoszeń) + data (reguła dat widoczności osób) + wydanie programu. */
export function odciskTresci(korzen: string, teraz: Date = new Date()): string {
    let ile = 0, mtime = 0, rozmiar = 0
    const idz = (d: string) => {
        let wpisy: fs.Dirent[]
        try { wpisy = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
        for (const w of wpisy) {
            const p = path.join(d, w.name)
            if (w.isDirectory()) { if (w.name !== 'zgloszenia') idz(p) }
            else { try { const s = fs.statSync(p); ile++; rozmiar += s.size; if (s.mtimeMs > mtime) mtime = s.mtimeMs } catch { /* plik zniknął */ } }
        }
    }
    idz(path.join(korzen, 'content'))
    return `${ile}:${Math.round(mtime)}:${rozmiar}:${teraz.toISOString().slice(0, 10)}:v${WERSJA_INDEKSU}:${wydanie(korzen)}`
}

const wBudowie = new Map<string, Promise<void>>()
const pamiecOdcisku = new Map<string, { t: number; v: string }>()
const TTL_ODCISKU = 2000

export interface OpcjeIndeksu { korzen?: string; katalog?: string; teraz?: () => Date }

/** Plik indeksu dla poziomu (`data/szukanie-<poziom>.db`). */
export const plikIndeksu = (poziom: string, korzen = process.cwd(), katalog = 'data') => path.join(/*turbopackIgnore: true*/ korzen, katalog, `szukanie-${poziom}.db`)

/** Wyszukiwanie z indeksu poziomu; odbudowa tylko, gdy odcisk treści albo data się zmieniły. Bez SQLite – skan pamięci. */
export async function szukajIndeksowo(zapytanie: string, poziom: string, dokumenty: () => Promise<DokumentSzukania[]>, opcje: OpcjeIndeksu = {}): Promise<Wynik[]> {
    const korzen = opcje.korzen ?? process.cwd()
    if (!przygotujZapytanie(zapytanie)) return []
    if (!(await zaladujSqlite())) return szukajSkanem(await dokumenty(), zapytanie)
    const plik = plikIndeksu(poziom, korzen, opcje.katalog)
    const teraz = opcje.teraz ?? (() => new Date())
    let pam = pamiecOdcisku.get(plik)
    if (!pam || Date.now() - pam.t > TTL_ODCISKU) { pam = { t: Date.now(), v: odciskTresci(korzen, teraz()) }; pamiecOdcisku.set(plik, pam) }
    if (odcisk(plik) !== pam.v) {
        let b = wBudowie.get(plik)
        if (!b) {
            b = (async () => { zbudujIndeks(plik, await dokumenty(), pam!.v) })().finally(() => wBudowie.delete(plik))
            wBudowie.set(plik, b)
        }
        await b
    }
    const zrodlo = zrodloZIndeksu(plik)
    try { return szukajWZrodle(zrodlo, zapytanie) } finally { zrodlo.zamknij() }
}

/** Do testów: wymusza ponowne policzenie odcisku. */
export const zapomnijOdciski = () => pamiecOdcisku.clear()
