// P5 (OPS-02, D-PA-11; decyzja właściciela 18.11): sprawdzenie i odtworzenie kopii zapasowej.
// Zasada: kopia ZAWSZE najpierw rozpakowana obok (pusty katalog tymczasowy) → raport: opis kopii, czytelność plików
// (ten sam parser co strona: js-yaml / JSON), integralność baz SQLite, różnice z bieżącymi danymi.
// Podmiana tylko świadomie, wskazanych plików lub katalogów treści – jako operacja (lib/panel/operacje.ts),
// więc i odtworzenie da się cofnąć w panelu. data/ i pliki-archiwum/ – tylko raport i instrukcja (podmiana ręczna).
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import * as yaml from 'js-yaml'
import { wykonajOperacje, type WynikOperacji, type ZmianaPliku } from './operacje'

export interface OpisKopii { utworzono?: string; commit?: string | null; czesci?: string[]; bazySQLite?: string[] }
export interface PorownanieCzesci { nazwa: string; wKopii: number; teraz: number; tylkoWKopii: string[]; tylkoTeraz: string[]; rozne: string[] }
export interface RaportKopii {
    katalog: string
    opis: OpisKopii | null
    nieczytelne: { plik: string; blad: string }[]
    bazy: { nazwa: string; ok: boolean; wynik: string }[]
    czesci: PorownanieCzesci[]
    bledy: string[]
}

// znacznik kopii (_panel/kopia.json) zmienia się po każdej kopii – nie jest treścią
const POMIN = (rel: string) => rel === '_panel/kopia.json' || rel.startsWith('_operacje/') || rel.startsWith('.operacja.lock') || rel.endsWith('.tmp') || rel.endsWith('.part')

function uruchom(polecenie: string, argumenty: string[]): Promise<{ kod: number; stderr: string }> {
    return new Promise((ok) => {
        const p = spawn(polecenie, argumenty, { stdio: ['ignore', 'ignore', 'pipe'] })
        let stderr = ''
        p.stderr.on('data', (b: Buffer) => { stderr += b.toString().slice(0, 400) })
        p.on('error', (e) => ok({ kod: -1, stderr: e.message }))
        p.on('close', (kod) => ok({ kod: kod ?? -1, stderr }))
    })
}

/** Rozpakowuje archiwum do NOWEGO pustego katalogu tymczasowego (nigdy na miejsce danych). */
export async function rozpakuj(archiwum: string): Promise<string> {
    await fs.access(/*turbopackIgnore: true*/ archiwum)
    const cel = await fs.mkdtemp(path.join(/*turbopackIgnore: true*/ os.tmpdir(), 'sprawdz-kopii-'))
    // --no-same-owner: pliki należą do uruchamiającego; ścieżki absolutne i „..” tar odrzuca domyślnie (GNU tar)
    const w = await uruchom('tar', ['--no-same-owner', '-xzf', archiwum, '-C', cel])
    if (w.kod !== 0) { await fs.rm(cel, { recursive: true, force: true }); throw new Error(`Nie da się rozpakować kopii: ${w.stderr || `kod ${w.kod}`}`) }
    return cel
}

async function pliki(kat: string, pomin: (rel: string) => boolean = () => false): Promise<Map<string, string>> {
    const m = new Map<string, string>()
    const idz = async (k: string, rel: string) => {
        let w: import('node:fs').Dirent[] = []
        try { w = await fs.readdir(/*turbopackIgnore: true*/ k, { withFileTypes: true }) } catch { return }
        for (const x of w) {
            const r = rel ? `${rel}/${x.name}` : x.name
            if (pomin(r) || pomin(`${r}/`)) continue
            if (x.isDirectory()) await idz(path.join(/*turbopackIgnore: true*/ k, x.name), r)
            else if (x.isFile()) m.set(r, path.join(/*turbopackIgnore: true*/ k, x.name))
        }
    }
    await idz(kat, '')
    return m
}

async function odcisk(p: string, pelny: boolean): Promise<string> {
    if (!pelny) return String((await fs.stat(/*turbopackIgnore: true*/ p)).size)
    return createHash('sha256').update(await fs.readFile(/*turbopackIgnore: true*/ p)).digest('hex')
}

async function porownaj(nazwa: string, wKopii: string, teraz: string, pelny: boolean): Promise<PorownanieCzesci> {
    const [a, b] = await Promise.all([pliki(wKopii, POMIN), pliki(teraz, POMIN)])
    const rozne: string[] = []
    for (const [rel, p] of a) if (b.has(rel) && await odcisk(p, pelny) !== await odcisk(b.get(rel)!, pelny)) rozne.push(rel)
    return {
        nazwa, wKopii: a.size, teraz: b.size,
        tylkoWKopii: [...a.keys()].filter((x) => !b.has(x)).sort(), tylkoTeraz: [...b.keys()].filter((x) => !a.has(x)).sort(), rozne: rozne.sort(),
    }
}

/** Czytelność treści tym samym parserem co strona: YAML, JSON, frontmatter .mdoc/.md. */
export function bladOdczytu(rel: string, tekst: string): string | null {
    try {
        if (/\.ya?ml$/.test(rel)) yaml.load(tekst)
        else if (rel.endsWith('.json')) JSON.parse(tekst)
        else if (/\.(mdoc|md)$/.test(rel)) {
            const m = tekst.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
            if (tekst.startsWith('---') && !m) return 'niezamknięty nagłówek (---)'
            if (m) yaml.load(m[1])
        }
        return null
    } catch (e) { return String(e instanceof Error ? e.message : e).split('\n')[0].slice(0, 200) }
}

async function integralnoscBazy(p: string): Promise<{ ok: boolean; wynik: string }> {
    try {
        const { default: Database } = await import('better-sqlite3')
        const db = new Database(p, { readonly: true, fileMustExist: true })
        try {
            const w = db.pragma('integrity_check', { simple: true })
            return { ok: w === 'ok', wynik: String(w) }
        } finally { db.close() }
    } catch (e) { return { ok: false, wynik: String(e instanceof Error ? e.message : e).slice(0, 200) } }
}

/** Raport rozpakowanej kopii względem bieżących danych w `korzen`. Niczego nie zmienia. */
export async function raportKopii(katalog: string, korzen = process.cwd()): Promise<RaportKopii> {
    const r: RaportKopii = { katalog, opis: null, nieczytelne: [], bazy: [], czesci: [], bledy: [] }
    try { r.opis = JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ katalog, 'kopia.json'), 'utf8')) as OpisKopii }
    catch { r.bledy.push('Brak albo uszkodzony kopia.json – to nie wygląda na kopię z panelu ani z wdroz.sh.') }
    for (const c of ['content', 'pliki-archiwum', 'data']) {
        try { await fs.access(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ katalog, c)) } catch { if (c !== 'pliki-archiwum') r.bledy.push(`W kopii nie ma części „${c}”.`); continue }
        r.czesci.push(await porownaj(c, path.join(/*turbopackIgnore: true*/ katalog, c), path.join(/*turbopackIgnore: true*/ korzen, c), c !== 'pliki-archiwum'))
    }
    for (const [rel, p] of await pliki(path.join(/*turbopackIgnore: true*/ katalog, 'content'), POMIN)) {
        if (!/\.(ya?ml|json|mdoc|md)$/.test(rel)) continue
        const b = bladOdczytu(rel, await fs.readFile(/*turbopackIgnore: true*/ p, 'utf8'))
        if (b) r.nieczytelne.push({ plik: rel, blad: b })
    }
    for (const [rel, p] of await pliki(path.join(/*turbopackIgnore: true*/ katalog, 'data'))) if (/\.(db|sqlite3?)$/i.test(rel)) r.bazy.push({ nazwa: rel, ...(await integralnoscBazy(p)) })
    if (r.bazy.some((b) => !b.ok)) r.bledy.push('Co najmniej jedna baza SQLite w kopii nie przechodzi kontroli integralności.')
    return r
}

const tekstowy = (b: Buffer) => !b.includes(0) && Buffer.from(b.toString('utf8'), 'utf8').equals(b)

/**
 * Zmiany potrzebne, by wskazane pliki lub katalogi treści (ścieżki względem content/; katalog kończy „/”) były takie jak w kopii.
 * Katalog: także usunięcie plików, których w kopii nie ma. Pliki binarne – odmowa (odtworzenie ręczne).
 */
export async function zmianyOdtworzenia(katalogKopii: string, sciezki: string[], korzen = process.cwd()): Promise<ZmianaPliku[]> {
    const [a, b] = await Promise.all([pliki(path.join(/*turbopackIgnore: true*/ katalogKopii, 'content'), POMIN), pliki(path.join(/*turbopackIgnore: true*/ korzen, 'content'), POMIN)])
    const wybrane = new Set<string>()
    for (const s of sciezki.map((x) => x.replace(/^content\//, '').replace(/^\/+/, ''))) {
        if (!s || s.split('/').includes('..')) throw new Error(`Niedozwolona ścieżka: ${s}`)
        if (s.endsWith('/')) { for (const k of [...a.keys(), ...b.keys()]) if (k.startsWith(s)) wybrane.add(k) }
        else if (a.has(s) || b.has(s)) wybrane.add(s)
        else throw new Error(`Nie ma takiego pliku ani w kopii, ani teraz: ${s}`)
    }
    const zmiany: ZmianaPliku[] = []
    for (const rel of [...wybrane].sort()) {
        const zKopii = a.has(rel) ? await fs.readFile(/*turbopackIgnore: true*/ a.get(rel)!) : null
        const teraz = b.has(rel) ? await fs.readFile(/*turbopackIgnore: true*/ b.get(rel)!) : null
        if (zKopii && teraz && zKopii.equals(teraz)) continue
        if ((zKopii && !tekstowy(zKopii)) || (teraz && !tekstowy(teraz))) throw new Error(`Plik binarny ${rel} – odtwórz go ręcznie z rozpakowanej kopii.`)
        zmiany.push({ plik: rel, poprzedni: teraz?.toString('utf8') ?? null, wynik: zKopii?.toString('utf8') ?? null })
    }
    return zmiany
}

/** Świadoma podmiana wskazanych plików/katalogów treści wersją z kopii – jako operacja do cofnięcia w panelu. */
export async function odtworzZKopii(katalogKopii: string, sciezki: string[], opis: string, korzen = process.cwd()): Promise<WynikOperacji> {
    const zmiany = await zmianyOdtworzenia(katalogKopii, sciezki, korzen)
    for (const z of zmiany) if (z.wynik !== null) { const b = bladOdczytu(z.plik, z.wynik); if (b) throw new Error(`Plik ${z.plik} w kopii jest nieczytelny (${b}) – nie odtwarzam.`) }
    return wykonajOperacje({ korzen, rodzaj: 'odtworzenie', opis: `odtworzenie z kopii ${opis}: ${sciezki.join(', ')}`.slice(0, 300), zmiany, szczegoly: { kopia: opis, sciezki } })
}
