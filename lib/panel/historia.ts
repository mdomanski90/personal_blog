// P6a (PNL-10, ADM-10, D-PA-10): historia wersji i kosz treści zapisywanych w Keystatic.
// Decyzja właściciela 18.11: własne kopie w trasie zapisu (bez gita na VPS).
//  • Keystatic (tryb local) nadpisuje plik bez kopii i usuwa przez fs.rm (keystatic-core-api-generic.node.js:199–209).
//    Trasa app/api/keystatic/[[...params]]/route.ts woła `przedZapisemKeystatic` z treścią żądania PRZED zapisem Keystatic.
//  • Wersja = poprzednia treść pliku tekstowego: content/_historia/<ścieżka w content>/<id> – wszystkie z 30 dni, starsze po jednej na tydzień.
//  • Usunięcie → kopia do content/_kosz/<id>/ (manifest + pliki): teksty bez terminu, pliki binarne (obrazy, skany) 30 dni.
//    Bez kopii w koszu usunięcie jest odrzucane (zasada 2.5); brak kopii wersji nie blokuje zwykłego zapisu (uwaga na pulpicie).
//  • Przywrócenie wersji i pozycji z kosza = operacja P5 (lib/panel/operacje.ts): zapis atomowy, blokada, „cofnij”.
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { zapewnijKatalog, katalogKopii, BrakKataloguKopii } from './katalogi'
import { ktoTeraz } from '../konta/straz'
import { listaOperacji, wczytajManifest, wykonajOperacje, NAZWY_OPERACJI, type WynikOperacji } from './operacje'
import { zmianyPol, type ZmianaPola } from './roznica-pol'
import { ukrytaSciezka, widocznoscPliku, type UkrytePozycje } from '../konta/tylko-ja'

/** Przechowywanie jak na planszy (PDF 18.11, funkcja 4): wszystkie wersje z ostatnich 30 dni, starsze – jedna na tydzień. */
export const DNI_PELNEJ_HISTORII = 30
export const DNI_PLIKOW_W_KOSZU = 30
const TEKST = /\.(mdoc|md|yaml|yml|json)$/
/** Katalogi, z których Keystatic może coś usunąć (treści i pliki z pól obrazów/plików – keystatic.config.ts). */
const KORZENIE_KOSZA = ['content/', 'pliki-archiwum/', 'public/images/']
const KOPIE = ['_historia', '_kosz', '_operacje']
const ID = /^\d{8}-\d{6}-\d{3}\d{2}-[a-f0-9]{4}$/
const MAKS_TEKSTU = 2_000_000

let licznik = 0
function noweId(d = new Date()): string {
    const z = (n: number, w = 2) => String(n).padStart(w, '0')
    licznik = (licznik + 1) % 100
    return `${d.getUTCFullYear()}${z(d.getUTCMonth() + 1)}${z(d.getUTCDate())}-${z(d.getUTCHours())}${z(d.getUTCMinutes())}${z(d.getUTCSeconds())}-${z(d.getUTCMilliseconds(), 3)}${z(licznik)}-${randomBytes(2).toString('hex')}`
}
/** Czas z identyfikatora (UTC). */
export function czasId(id: string): string {
    const m = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})-(\d{3})/.exec(id)
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7])).toISOString() : ''
}

/** Ścieżka względem korzenia projektu (ukośniki) → bezwzględna; tylko wewnątrz dozwolonych katalogów, bez „..” i plików ukrytych. */
function bezpieczna(korzen: string, rel: string, korzenie = KORZENIE_KOSZA): string | null {
    if (!rel || path.isAbsolute(rel) || rel.includes('\\') || rel.split('/').some((c) => c === '..' || c === '' || c.startsWith('.'))) return null
    if (!korzenie.some((k) => rel.startsWith(k))) return null
    if (rel.startsWith('content/') && KOPIE.includes(rel.split('/')[1])) return null
    const p = path.resolve(/*turbopackIgnore: true*/ korzen, rel)
    return p.startsWith(path.resolve(/*turbopackIgnore: true*/ korzen) + path.sep) ? p : null
}
/** Plik treści, który ma historię: content/…, tekstowy, poza katalogami kopii. Zwraca ścieżkę względem content/. */
export function relTresci(rel: string): string | null {
    if (!rel.startsWith('content/') || !TEKST.test(rel)) return null
    return bezpieczna('/x', rel, ['content/']) ? rel.slice('content/'.length) : null
}

async function czytaj(p: string): Promise<Buffer | null> {
    try { return await fs.readFile(/*turbopackIgnore: true*/ p) }
    catch (e) { const k = (e as NodeJS.ErrnoException).code; if (k === 'ENOENT' || k === 'EISDIR') return null; throw e }
}

// ---------- wersje ----------
const katWersji = (korzen: string, relC: string) => path.join(/*turbopackIgnore: true*/ katalogKopii(korzen, '_historia'), ...relC.split('/'))

/** Zapisuje poprzednią treść pliku jako wersję i przycina historię (30 dni pełnych, starsze po jednej na tydzień). */
export async function zapiszWersje(korzen: string, relC: string, tresc: Buffer | string): Promise<string> {
    await zapewnijKatalog(korzen, '_historia')
    const kat = katWersji(korzen, relC)
    await fs.mkdir(kat, { recursive: true, mode: 0o750 })
    const id = noweId()
    await fs.writeFile(path.join(/*turbopackIgnore: true*/ kat, id), tresc, { flag: 'wx', mode: 0o640 })
    // P7a (KON-01): kto zastąpił tę wersję nową treścią (podpis zmiany); plik obok wersji, usuwany razem z nią
    const autor = ktoTeraz()
    if (autor) await fs.writeFile(path.join(/*turbopackIgnore: true*/ kat, `${id}.kto`), JSON.stringify({ kto: autor.id, ...(autor.administrator ? { administrator: true } : {}) }), { mode: 0o640 }).catch(() => {})
    for (const stary of doUsuniecia((await fs.readdir(/*turbopackIgnore: true*/ kat)).filter((x) => ID.test(x)))) { await fs.rm(path.join(/*turbopackIgnore: true*/ kat, stary), { force: true }); await fs.rm(path.join(/*turbopackIgnore: true*/ kat, `${stary}.kto`), { force: true }) }
    return id
}

/** Wersje do usunięcia: starsze niż 30 dni, poza najnowszą w każdym tygodniu (tydzień = 7 dni od 1970-01-05, poniedziałek). */
export function doUsuniecia(ids: string[], teraz = Date.now()): string[] {
    const granica = teraz - DNI_PELNEJ_HISTORII * 864e5
    const tydzien = (t: number) => Math.floor((t - Date.UTC(1970, 0, 5)) / (7 * 864e5))
    const zostaja = new Map<number, string>()
    const stare = ids.filter((id) => Date.parse(czasId(id)) < granica)
    for (const id of stare.sort()) zostaja.set(tydzien(Date.parse(czasId(id))), id) // sort rosnąco – zostaje najnowsza w tygodniu
    const keep = new Set(zostaja.values())
    return stare.filter((id) => !keep.has(id))
}

export interface Wersja { id: string; czas: string; bajty: number; kto?: string; administrator?: boolean }
export async function listaWersji(relC: string, korzen = process.cwd()): Promise<Wersja[]> {
    if (!relTresci(`content/${relC}`)) return []
    const kat = katWersji(korzen, relC)
    let L: string[] = []
    try { L = (await fs.readdir(/*turbopackIgnore: true*/ kat)).filter((x) => ID.test(x)) } catch { return [] }
    const wyn: Wersja[] = []
    for (const id of L.sort().reverse()) {
        try {
            const w: Wersja = { id, czas: czasId(id), bajty: (await fs.stat(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ kat, id))).size }
            const p = await czytaj(path.join(/*turbopackIgnore: true*/ kat, `${id}.kto`))
            if (p) try { const j = JSON.parse(p.toString('utf8')) as { kto?: unknown; administrator?: unknown }; if (typeof j.kto === 'string') { w.kto = j.kto; if (j.administrator === true) w.administrator = true } } catch { /* bez podpisu */ }
            wyn.push(w)
        } catch { /* zniknęła */ }
    }
    return wyn
}
export async function trescWersji(relC: string, id: string, korzen = process.cwd()): Promise<string | null> {
    if (!ID.test(id) || !relTresci(`content/${relC}`)) return null
    const b = await czytaj(path.join(/*turbopackIgnore: true*/ katWersji(korzen, relC), id))
    return b ? b.toString('utf8') : null
}
export async function trescBiezaca(relC: string, korzen = process.cwd()): Promise<string | null> {
    if (!relTresci(`content/${relC}`)) return null
    const b = await czytaj(path.join(/*turbopackIgnore: true*/ korzen, 'content', ...relC.split('/')))
    return b ? b.toString('utf8') : null
}

/** Przywrócenie wersji jako operacja (do cofnięcia). Bieżąca treść trafia najpierw do historii. */
export async function przywrocWersje(relC: string, id: string, opcje: { korzen?: string; sprawdz?: () => Promise<void> } = {}): Promise<WynikOperacji> {
    const korzen = opcje.korzen ?? process.cwd()
    const [stara, teraz] = await Promise.all([trescWersji(relC, id, korzen), trescBiezaca(relC, korzen)])
    if (stara === null) throw new Error('Nie ma takiej wersji.')
    if (stara === teraz) throw new Error('Ta wersja jest taka sama jak bieżąca.')
    if (teraz !== null) await zapiszWersje(korzen, relC, teraz)
    return wykonajOperacje({ korzen, rodzaj: 'przywrocenie', opis: `przywrócenie wersji z ${czasId(id).slice(0, 16).replace('T', ' ')} UTC: ${relC}`,
        zmiany: [{ plik: relC, poprzedni: teraz, wynik: stara }], sprawdz: opcje.sprawdz, szczegoly: { wersja: id } })
}

// ---------- kosz ----------
export interface PlikWKoszu { sciezka: string; bajty: number; tekst: boolean }
export interface PozycjaKoszaTresci { id: string; czas: string; opis: string; pliki: PlikWKoszu[]; wygasa: string | null }

/** Kopiuje pliki do kosza jako jedną pozycję; `usun` – także usuwa oryginały (zgłoszenia), bez – usunie je Keystatic. */
export async function doKosza(korzen: string, sciezki: string[], opis: string, usun = false): Promise<string | null> {
    const pliki: { rel: string; abs: string; tresc: Buffer }[] = []
    for (const rel of sciezki) {
        const abs = bezpieczna(korzen, rel)
        if (!abs) continue
        const t = await czytaj(abs)
        if (t !== null) pliki.push({ rel, abs, tresc: t })
    }
    if (!pliki.length) return null
    const baza = await zapewnijKatalog(korzen, '_kosz')
    const id = noweId(), kat = path.join(/*turbopackIgnore: true*/ baza, id)
    await fs.mkdir(path.join(/*turbopackIgnore: true*/ kat, 'pliki'), { recursive: true, mode: 0o750 })
    const tylkoBinarne = pliki.every((p) => !TEKST.test(p.rel))
    for (let i = 0; i < pliki.length; i++) await fs.writeFile(path.join(/*turbopackIgnore: true*/ kat, 'pliki', String(i)), pliki[i].tresc, { flag: 'wx', mode: 0o640 })
    const m: PozycjaKoszaTresci = {
        id, czas: new Date().toISOString(), opis: opis.slice(0, 300), wygasa: tylkoBinarne ? new Date(Date.now() + DNI_PLIKOW_W_KOSZU * 864e5).toISOString() : null,
        pliki: pliki.map((p) => ({ sciezka: p.rel, bajty: p.tresc.length, tekst: TEKST.test(p.rel) })),
    }
    await fs.writeFile(path.join(/*turbopackIgnore: true*/ kat, 'manifest.json'), JSON.stringify(m, null, 1), { flag: 'wx', mode: 0o640 })
    if (usun) for (const p of pliki) await fs.unlink(p.abs).catch(() => {})
    return id
}

export async function listaKoszaTresci(korzen = process.cwd()): Promise<PozycjaKoszaTresci[]> {
    let L: string[] = []
    try { L = (await fs.readdir(/*turbopackIgnore: true*/ katalogKopii(korzen, '_kosz'))).filter((x) => ID.test(x)) } catch { return [] }
    const wyn: PozycjaKoszaTresci[] = []
    for (const id of L.sort().reverse()) {
        const kat = path.join(/*turbopackIgnore: true*/ katalogKopii(korzen, '_kosz'), id)
        try {
            const m = JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ kat, 'manifest.json'), 'utf8')) as PozycjaKoszaTresci
            if (m.wygasa && Date.parse(m.wygasa) < Date.now()) { await fs.rm(kat, { recursive: true, force: true }); continue }
            wyn.push(m)
        } catch { /* uszkodzona pozycja – zostaje na dysku, nie zgadujemy */ }
    }
    return wyn
}

/**
 * P7c (KON-08): pozycja kosza „tylko ja” – usunięty plik treści miał widoczność „tylko ja” albo pliki należą do pozycji,
 * która dziś jest „tylko ja” (np. zdjęcia). Takiej pozycji konto bez roli administratora nie widzi i nie przywraca.
 */
export async function pozycjaKoszaTylkoJa(m: PozycjaKoszaTresci, u: UkrytePozycje, korzen = process.cwd()): Promise<boolean> {
    if (m.pliki.some((p) => ukrytaSciezka(p.sciezka, u))) return true
    for (const [i, p] of m.pliki.entries()) {
        if (!p.tekst) continue
        try { if (widocznoscPliku(p.sciezka, await fs.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ katalogKopii(korzen, '_kosz'), m.id, 'pliki', String(i)), 'utf8')) === 'ja') return true } catch { /* brak kopii */ }
    }
    return false
}

/** Przywraca pozycję z kosza na dawne miejsce: teksty z content/ operacją (do cofnięcia), pliki binarne kopią; nic nie nadpisuje. */
export async function przywrocZKoszaTresci(id: string, opcje: { korzen?: string; sprawdz?: () => Promise<void> } = {}): Promise<string | null> {
    const korzen = opcje.korzen ?? process.cwd()
    if (!ID.test(id)) return 'zła pozycja kosza'
    const kat = path.join(/*turbopackIgnore: true*/ katalogKopii(korzen, '_kosz'), id)
    let m: PozycjaKoszaTresci
    try { m = JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ kat, 'manifest.json'), 'utf8')) } catch { return 'nie ma już tej pozycji' }
    const cele = m.pliki.map((p, i) => ({ ...p, i, abs: bezpieczna(korzen, p.sciezka) }))
    if (cele.some((c) => !c.abs)) return 'niedozwolona ścieżka w koszu'
    for (const c of cele) if (await czytaj(c.abs!) !== null) return `pod adresem ${c.sciezka} jest już inny plik – najpierw go przenieś albo zmień nazwę`
    const teksty = cele.filter((c) => c.tekst && c.sciezka.startsWith('content/'))
    const binarne = cele.filter((c) => !teksty.includes(c))
    for (const c of binarne) {
        await fs.mkdir(path.dirname(c.abs!), { recursive: true })
        await fs.copyFile(path.join(/*turbopackIgnore: true*/ kat, 'pliki', String(c.i)), c.abs!, fs.constants.COPYFILE_EXCL)
    }
    if (teksty.length) {
        const zmiany = []
        for (const c of teksty) zmiany.push({ plik: c.sciezka.slice('content/'.length), poprzedni: null, wynik: (await fs.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ kat, 'pliki', String(c.i)), 'utf8')) })
        await wykonajOperacje({ korzen, rodzaj: 'przywrocenie', opis: `przywrócenie z kosza: ${m.opis}`, zmiany, sprawdz: opcje.sprawdz, szczegoly: { kosz: id } })
    }
    await fs.rm(kat, { recursive: true, force: true })
    return null
}

export async function usunZKoszaTresci(id: string, korzen = process.cwd()): Promise<string | null> {
    if (!ID.test(id)) return 'zła pozycja kosza'
    await fs.rm(path.join(/*turbopackIgnore: true*/ katalogKopii(korzen, '_kosz'), id), { recursive: true, force: true })
    return null
}

// ---------- trasa zapisu Keystatic ----------
export interface ZadanieKeystatic { additions: { path: string; contents: string }[]; deletions: { path: string }[] }

/** Odczyt treści żądania POST …/update (JSON: additions[{path, contents – base64url}], deletions[{path}]); inne – null. */
export function odczytajZadanie(j: unknown): ZadanieKeystatic | null {
    if (!j || typeof j !== 'object') return null
    const o = j as Record<string, unknown>
    if (!Array.isArray(o.additions) || !Array.isArray(o.deletions)) return null
    const additions = o.additions.filter((a): a is { path: string; contents: string } => !!a && typeof (a as { path?: unknown }).path === 'string' && typeof (a as { contents?: unknown }).contents === 'string')
    const deletions = o.deletions.filter((d): d is { path: string } => !!d && typeof (d as { path?: unknown }).path === 'string')
    return { additions, deletions }
}

/**
 * Przed zapisem Keystatic: wersje zmienianych plików tekstowych i kopia usuwanych w koszu.
 * Zwraca komunikat, gdy zapis trzeba odrzucić (usunięcie bez kopii w koszu), inaczej null.
 */
export async function przedZapisemKeystatic(z: ZadanieKeystatic, opcje: { korzen?: string; opis?: (rel: string) => string | Promise<string>; etykiety?: (relC: string) => Record<string, string> } = {}): Promise<{ odrzuc: string | null; wersje: number; kosz: string | null; ostrzezenia: string[]; pola: Record<string, string[]> }> {
    const korzen = opcje.korzen ?? process.cwd()
    const ostrzezenia: string[] = []
    const pola: Record<string, string[]> = {}
    let wersje = 0
    const usuwane = new Set(z.deletions.map((d) => d.path))
    for (const a of z.additions) {
        const relC = relTresci(a.path)
        if (!relC || usuwane.has(a.path)) continue
        try {
            const teraz = await czytaj(path.join(/*turbopackIgnore: true*/ korzen, ...a.path.split('/')))
            if (teraz === null || teraz.length > MAKS_TEKSTU) continue
            const nowa = Buffer.from(a.contents, 'base64url')
            if (teraz.equals(nowa)) continue
            // „wróć do pracy”: nazwy zmienionych pól (plansza: „miejsce · opis, źródła”)
            const zm = zmianyPol(a.path, teraz.toString('utf8'), nowa.toString('utf8'), opcje.etykiety?.(relC) ?? {})
            if (zm?.length) pola[a.path] = zm.map((x) => x.etykieta)
            await zapiszWersje(korzen, relC, teraz); wersje++
        } catch (e) { ostrzezenia.push(`${a.path}: ${e instanceof BrakKataloguKopii ? 'brak katalogu historii' : (e as Error).message}`) }
    }
    // zmiana nazwy w Keystatic = dodanie nowego pliku + usunięcie starego – do kosza trafia tylko to, czego nie ma w dodaniach
    const doKoszaSciezki = z.deletions.map((d) => d.path).filter((p) => !z.additions.some((a) => a.path === p))
    let kosz: string | null = null
    if (doKoszaSciezki.length) {
        try {
            const glowny = doKoszaSciezki.find((p) => TEKST.test(p)) ?? doKoszaSciezki[0]
            kosz = await doKosza(korzen, doKoszaSciezki, opcje.opis ? await opcje.opis(glowny) : glowny)
        } catch (e) {
            return { odrzuc: e instanceof BrakKataloguKopii ? `Usunięcie wstrzymane: ${e.message}` : `Usunięcie wstrzymane – nie udało się zapisać kopii w koszu (${(e as Error).message}).`, wersje, kosz: null, ostrzezenia, pola }
        }
    }
    return { odrzuc: null, wersje, kosz, ostrzezenia, pola }
}

// ---------- różnica wierszy ----------
export type WierszRoznicy = { t: '=' | '-' | '+'; s: string } | { t: '…'; n: number }

/** Różnica wierszy z → na (LCS na środku po obcięciu wspólnego początku i końca); długie wspólne odcinki zwinięte do `kontekst` wierszy. */
export function roznica(z: string, na: string, kontekst = 3): WierszRoznicy[] {
    const A = z.split('\n'), B = na.split('\n')
    let p = 0
    while (p < A.length && p < B.length && A[p] === B[p]) p++
    let k = 0
    while (k < A.length - p && k < B.length - p && A[A.length - 1 - k] === B[B.length - 1 - k]) k++
    const a = A.slice(p, A.length - k), b = B.slice(p, B.length - k)
    const srodek: WierszRoznicy[] = []
    if (a.length * b.length > 4_000_000) { // bardzo duża zmiana – bez wyrównania
        for (const s of a) srodek.push({ t: '-', s }); for (const s of b) srodek.push({ t: '+', s })
    } else {
        const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
        for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
        let i = 0, j = 0
        while (i < n || j < m) {
            if (i < n && j < m && a[i] === b[j]) { srodek.push({ t: '=', s: a[i] }); i++; j++ }
            else if (i < n && (j === m || L[i + 1][j] >= L[i][j + 1])) { srodek.push({ t: '-', s: a[i] }); i++ } // najpierw usunięte, potem dodane
            else { srodek.push({ t: '+', s: b[j] }); j++ }
        }
    }
    const caly: WierszRoznicy[] = [...A.slice(0, p).map((s) => ({ t: '=' as const, s })), ...srodek, ...A.slice(A.length - k).map((s) => ({ t: '=' as const, s }))]
    // zwijanie wspólnych odcinków
    const wyn: WierszRoznicy[] = []
    const zmiana = caly.map((w) => w.t !== '=')
    const blisko = (i: number) => { for (let d = -kontekst; d <= kontekst; d++) if (zmiana[i + d]) return true; return false }
    let pominiete = 0
    caly.forEach((w, i) => {
        if (w.t !== '=' || blisko(i)) { if (pominiete) { wyn.push({ t: '…', n: pominiete }); pominiete = 0 } wyn.push(w) }
        else pominiete++
    })
    if (pominiete) wyn.push({ t: '…', n: pominiete })
    return wyn
}

// ---------- oś historii jednego pliku (szuflada „historia”, plansza funkcji 4) ----------
export interface WpisHistorii {
    klucz: string; zrodlo: 'keystatic' | 'operacja'; czas: string; opis: string
    zmiany: ZmianaPola[] | null; mozna: boolean; wersja?: string; operacja?: string
    /** plik powstał tą zmianą (plansza: „nowa pozycja (utworzona)”) */
    utworzona?: boolean
    /** P7a: identyfikator konta autora zmiany; `administrator` – zmiana zrobiona w roli administratora */
    kto?: string; administrator?: boolean
}

async function trescKopiiOperacji(korzen: string, id: string, nazwa: string | null): Promise<string | null> {
    if (nazwa === null) return null
    const b = await czytaj(path.join(/*turbopackIgnore: true*/ katalogKopii(korzen, '_operacje'), id, nazwa))
    return b ? b.toString('utf8') : null
}

/**
 * Wpisy historii pliku (najnowsze pierwsze): zapisy Keystatic (wersja = treść przed zapisem; zmiana = ta wersja → następna
 * znana treść) i operacje dotykające pliku (zmiana zbiorcza, import, przywrócenie – kopie przed/po z content/_operacje).
 * „Przywróć poprzednią” = treść sprzed danej zmiany.
 */
export async function osHistorii(relC: string, etykiety: Record<string, string>, korzen = process.cwd(), maks = 40): Promise<WpisHistorii[]> {
    const wersje = (await listaWersji(relC, korzen)).slice(0, maks)
    const teraz = await trescBiezaca(relC, korzen)
    const plik = `content/${relC}`
    const wyn: WpisHistorii[] = []
    let nastepna = teraz
    for (const w of wersje) {
        const t = await trescWersji(relC, w.id, korzen)
        wyn.push({ klucz: `k-${w.id}`, zrodlo: 'keystatic', czas: w.czas, opis: 'zapis w Keystatic', zmiany: zmianyPol(plik, t, nastepna, etykiety), mozna: t !== null && t !== teraz, wersja: w.id, ...(w.kto ? { kto: w.kto } : {}), ...(w.administrator ? { administrator: true } : {}) })
        nastepna = t
    }
    for (const m of (await listaOperacji(korzen)).slice(0, 200)) {
        const z = m.zmiany.find((x) => x.plik === relC)
        if (!z || (m.stan !== 'zapisane' && m.stan !== 'dokonczone' && m.stan !== 'cofniete')) continue
        const [przed, po] = await Promise.all([trescKopiiOperacji(korzen, m.id, z.przed), trescKopiiOperacji(korzen, m.id, z.po)])
        const nazwa = NAZWY_OPERACJI[m.rodzaj] ?? m.rodzaj
        wyn.push({ klucz: `o-${m.id}`, zrodlo: 'operacja', czas: m.zakonczono ?? m.utworzono, opis: m.cofa ? `${nazwa} (cofnięcie)` : nazwa,
            zmiany: zmianyPol(plik, przed, po, etykiety), mozna: przed !== null && przed !== teraz, operacja: m.id, ...(z.przed === null && po !== null ? { utworzona: true } : {}), ...(m.kto ? { kto: m.kto } : {}), ...(m.administrator ? { administrator: true } : {}) })
    }
    return wyn.sort((a, b) => b.czas.localeCompare(a.czas)).slice(0, maks)
}

/** „Przywróć poprzednią” przy operacji: treść pliku sprzed operacji (kopia „przed”), jako nowa operacja do cofnięcia. */
export async function przywrocSprzedOperacji(relC: string, opId: string, opcje: { korzen?: string; sprawdz?: () => Promise<void> } = {}): Promise<WynikOperacji> {
    const korzen = opcje.korzen ?? process.cwd()
    const m = await wczytajManifest(opId, korzen)
    const z = m?.zmiany.find((x) => x.plik === relC)
    if (!m || !z) throw new Error('Nie ma takiej operacji dla tego wpisu.')
    const stara = await trescKopiiOperacji(korzen, m.id, z.przed)
    if (stara === null) throw new Error('Przed tą operacją wpisu nie było – usuń go w Keystatic, jeśli trzeba.')
    const teraz = await trescBiezaca(relC, korzen)
    if (stara === teraz) throw new Error('Treść jest już taka jak przed tą operacją.')
    if (teraz !== null) await zapiszWersje(korzen, relC, teraz)
    return wykonajOperacje({ korzen, rodzaj: 'przywrocenie', opis: `przywrócenie sprzed „${m.opis.slice(0, 120)}”: ${relC}`,
        zmiany: [{ plik: relC, poprzedni: teraz, wynik: stara }], sprawdz: opcje.sprawdz, szczegoly: { sprzedOperacji: opId } })
}

/** Kosz dla rodzaju treści pliku (ten sam katalog kolekcji) – sekcja „kosz treści” w szufladzie. */
export async function koszRodzaju(relC: string, korzen = process.cwd()): Promise<PozycjaKoszaTresci[]> {
    const kat = `content/${relC.split('/').slice(0, -1).join('/')}/`
    return (await listaKoszaTresci(korzen)).filter((k) => k.pliki.some((p) => p.sciezka.startsWith(kat)))
}
