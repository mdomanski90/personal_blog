// Decyzja 22.11: zmiana identyfikatora materiału w Keystatic – reszta podąża sama (zasada 2.1: przekierowanie + przeniesienie powiązań).
// Keystatic przenosi tylko plik opisu (content/materialy/<id>.mdoc). Tu: strony skanów (content/strony), skany (pliki-archiwum/strony),
// objaśnienia (content/objasnienia), odwołania w innych treściach (pola relacji z POWIAZANIA, [[id|…]], blok {% material id="…" %},
// powiązania w objaśnieniach innych materiałów), numer katalogowy (rejestr) i przekierowanie stary → nowy (content/_panel/przekierowania.json).
// Plan najpierw (nic nie zmienia), wykonanie atomowe na plikach i z cofnięciem całości przy błędzie.
import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'
import type { ZmianyZapisu } from './straz-plikow'

export interface Przeniesienie { z: string; na: string }
export interface Edycja { plik: string; przed: string; po: string; opis: string }
export interface PlanZmianyId { stary: string; nowy: string; przeniesienia: Przeniesienie[]; edycje: Edycja[]; bledy: string[]; pominiete: string[] }

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Zmiana identyfikatora z żądania zapisu Keystatic: dokładnie jedno usunięcie i jedno dodanie pliku materiału. */
export function zmianaIdZZapisu(z: ZmianyZapisu): { stary: string; nowy: string } | null {
    const m = (p: string) => /^content\/materialy\/([^/]+)\.mdoc$/.exec(p)?.[1] ?? null
    const usuniete = z.deletions.map((d) => m(d.path)).filter((x): x is string => !!x)
    const dodane = z.additions.map((a) => m(a.path)).filter((x): x is string => !!x)
    const nowe = dodane.filter((x) => !usuniete.includes(x))
    const stare = usuniete.filter((x) => !dodane.includes(x))
    return stare.length === 1 && nowe.length === 1 ? { stary: stare[0], nowy: nowe[0] } : null
}

/** Odwołania w tekście: [[stary]], [[stary|…]] i atrybut id="stary" w bloku {% material … %}. */
export function zamienWTekscie(tekst: string, stary: string, nowy: string): { tekst: string; ile: number } {
    let ile = 0
    let t = tekst.replace(new RegExp(`\\[\\[${esc(stary)}(\\||\\]\\])`, 'g'), (_c, k: string) => { ile++; return `[[${nowy}${k}` })
    t = t.replace(/\{%\s*material\b[^%]*%\}/g, (blok) => blok.replace(new RegExp(`(\\bid=")${esc(stary)}"`), (_c, p: string) => { ile++; return `${p}${nowy}"` }))
    return { tekst: t, ile }
}

/** Wartości relacji pod ścieżką „a”, „a[]”, „a[].b” (b – pojedyncza albo lista) zamienione w obiekcie (kopia). */
function zamienWObiekcie(d: unknown, sciezka: string, stary: string, nowy: string): unknown {
    if (!d || typeof d !== 'object') return d
    const o = { ...(d as Record<string, unknown>) }
    const zm = (v: unknown) => (v === stary ? nowy : v)
    const [glowa, ogon] = sciezka.split('[].')
    if (ogon !== undefined) {
        if (Array.isArray(o[glowa])) o[glowa] = (o[glowa] as unknown[]).map((x) => {
            if (!x || typeof x !== 'object') return x
            const e = { ...(x as Record<string, unknown>) }
            e[ogon] = Array.isArray(e[ogon]) ? (e[ogon] as unknown[]).map(zm) : zm(e[ogon])
            return e
        })
    } else if (sciezka.endsWith('[]')) {
        const k = sciezka.slice(0, -2)
        if (Array.isArray(o[k])) o[k] = (o[k] as unknown[]).map(zm)
    } else o[sciezka] = zm(o[sciezka])
    return o
}

/** Nagłówek YAML: zamiana linii „klucz: stary” / „- stary”, przyjęta tylko wtedy, gdy parser daje dokładnie oczekiwany wynik
 *  (zamienione same pola relacji do materiałów – inne pola z tą samą wartością zostają). */
export function zamienWNaglowku(fm: string, stary: string, nowy: string, relacje: [string, string][]): { tekst: string; ile: number } {
    const rel = relacje.filter(([, cel]) => cel === 'materialy').map(([s]) => s)
    if (!rel.length || !fm.includes(stary)) return { tekst: fm, ile: 0 }
    let przed: unknown
    try { przed = yaml.load(fm) } catch { return { tekst: fm, ile: 0 } }
    const oczekiwane = rel.reduce((d, s) => zamienWObiekcie(d, s, stary, nowy), przed)
    if (JSON.stringify(oczekiwane) === JSON.stringify(przed)) return { tekst: fm, ile: 0 }
    const linie = fm.split('\n')
    const kandydaci = linie.map((l, i) => (new RegExp(`^(\\s*(?:-\\s+|[A-Za-z][\\w]*:\\s+))(["']?)${esc(stary)}\\2\\s*$`).test(l) ? i : -1)).filter((i) => i >= 0)
    // wybór podzbioru linii: zamieniamy po kolei te, które przybliżają wynik do oczekiwanego (pola nie-relacyjne zostają)
    let ile = 0
    for (const i of kandydaci) {
        const proba = [...linie]
        proba[i] = proba[i].replace(new RegExp(`(["']?)${esc(stary)}\\1(\\s*)$`), (_c, q: string, ws: string) => `${q}${nowy}${q}${ws}`)
        let wynik: unknown
        try { wynik = yaml.load(proba.join('\n')) } catch { continue }
        const zmienioneKlucze = JSON.stringify(wynik) !== JSON.stringify(yaml.load(linie.join('\n')))
        if (!zmienioneKlucze) continue
        // linia jest relacją, jeśli zamiana w niej nie zmienia niczego poza tym, co zmienia zamiana oczekiwana
        const tylkoRelacja = rel.reduce((d, s) => zamienWObiekcie(d, s, stary, nowy), wynik)
        if (JSON.stringify(tylkoRelacja) === JSON.stringify(oczekiwane)) { linie[i] = proba[i]; ile++ }
    }
    const tekst = linie.join('\n')
    try { if (JSON.stringify(yaml.load(tekst)) !== JSON.stringify(oczekiwane)) return { tekst: fm, ile: 0 } } catch { return { tekst: fm, ile: 0 } }
    return { tekst, ile }
}

const istnieje = (p: string) => fs.stat(/*turbopackIgnore: true*/ p).then(() => true, () => false)
const POMIJANE = /^content\/(_historia|_kosz|_operacje|strony|objasnienia)\//

async function plikiTresci(R: string): Promise<string[]> {
    const wyn: string[] = []
    const idz = async (rel: string) => {
        let wpisy: import('node:fs').Dirent[] = []
        try { wpisy = await fs.readdir(/*turbopackIgnore: true*/ path.join(R, rel), { withFileTypes: true }) } catch { return }
        for (const w of wpisy) {
            const r = `${rel}/${w.name}`
            if (POMIJANE.test(`${r}/`)) continue
            if (w.isDirectory()) await idz(r)
            else if (/\.(mdoc|md|yaml|yml)$/.test(w.name)) wyn.push(r)
        }
    }
    await idz('content')
    return wyn.sort()
}

/** Plan zmiany identyfikatora (bez zmian na dysku). */
export async function planZmianyIdMaterialu(R: string, stary: string, nowy: string): Promise<PlanZmianyId> {
    const plan: PlanZmianyId = { stary, nowy, przeniesienia: [], edycje: [], bledy: [], pominiete: [] }
    if (!ID.test(stary) || !ID.test(nowy) || stary === nowy) { plan.bledy.push(`niepoprawne identyfikatory: „${stary}” → „${nowy}”`); return plan }
    if (!(await istnieje(path.join(R, 'content/materialy', `${nowy}.mdoc`)))) plan.bledy.push(`brak content/materialy/${nowy}.mdoc – najpierw zapisz materiał pod nowym identyfikatorem`)
    if (await istnieje(path.join(R, 'content/materialy', `${stary}.mdoc`))) plan.bledy.push(`content/materialy/${stary}.mdoc nadal istnieje – to nie zmiana identyfikatora`)
    for (const [z, na] of [[`content/strony/${stary}.json`, `content/strony/${nowy}.json`], [`pliki-archiwum/strony/${stary}`, `pliki-archiwum/strony/${nowy}`], [`content/objasnienia/${stary}.json`, `content/objasnienia/${nowy}.json`]]) {
        if (!(await istnieje(path.join(R, z)))) continue
        if (await istnieje(path.join(R, na))) plan.bledy.push(`${na} już istnieje – nie nadpisuję`)
        else plan.przeniesienia.push({ z, na })
    }
    // odwołania w treściach
    const { POWIAZANIA } = await import('./jakosc')
    for (const rel of await plikiTresci(R)) {
        const t = await fs.readFile(/*turbopackIgnore: true*/ path.join(R, rel), 'utf8')
        if (!t.includes(stary)) continue
        const kolekcja = rel.split('/')[1]
        const relacje = POWIAZANIA[kolekcja] ?? []
        let po = t, ile = 0
        const fm = /^---\n([\s\S]*?)\n---\n?/.exec(t)
        if (rel.endsWith('.yaml') || rel.endsWith('.yml')) { const w = zamienWNaglowku(t, stary, nowy, relacje); po = w.tekst; ile += w.ile }
        else {
            if (fm) { const w = zamienWNaglowku(fm[1], stary, nowy, relacje); if (w.ile) { po = `---\n${w.tekst}\n---\n` + t.slice(fm[0].length); ile += w.ile } }
            const tresc = zamienWTekscie(po, stary, nowy); po = tresc.tekst; ile += tresc.ile
        }
        if (ile) plan.edycje.push({ plik: rel, przed: t, po, opis: `odwołania: ${ile}` })
    }
    // powiązania w objaśnieniach innych materiałów
    const katObj = path.join(R, 'content/objasnienia')
    for (const n of (await fs.readdir(/*turbopackIgnore: true*/ katObj).catch(() => [] as string[])).filter((x) => x.endsWith('.json')).sort()) {
        if (n === `${stary}.json`) continue
        const rel = `content/objasnienia/${n}`
        const t = await fs.readFile(/*turbopackIgnore: true*/ path.join(R, rel), 'utf8')
        if (!t.includes(`"${stary}"`)) continue
        let ile = 0
        const j = JSON.parse(t) as { items?: { body?: { purpose?: string; source?: unknown }[] }[] }
        for (const it of j.items ?? []) for (const b of it.body ?? []) if (b.purpose === 'linking' && b.source === stary) { b.source = nowy; ile++ }
        if (ile) plan.edycje.push({ plik: rel, przed: t, po: JSON.stringify(j, null, /\n/.test(t) ? 1 : undefined), opis: `powiązania w objaśnieniach: ${ile}` })
    }
    // numer katalogowy
    const katRel = 'content/_panel/katalog.json'
    try {
        const t = await fs.readFile(/*turbopackIgnore: true*/ path.join(R, katRel), 'utf8')
        const r = JSON.parse(t) as { wersja?: number; pozycje?: Record<string, { rodzaj: string; id: string }> }
        const nr = Object.entries(r.pozycje ?? {}).filter(([, p]) => p.rodzaj === 'material' && p.id === stary).map(([k]) => k)
        if (nr.length) {
            for (const k of nr) r.pozycje![k] = { ...r.pozycje![k], id: nowy }
            r.wersja = (r.wersja ?? 0) + 1
            plan.edycje.push({ plik: katRel, przed: t, po: JSON.stringify(r, null, /\n/.test(t) ? 1 : undefined), opis: `numer katalogowy ${nr.join(', ')}` })
        }
    } catch { /* bez rejestru */ }
    // przekierowanie
    const przRel = 'content/_panel/przekierowania.json'
    const przT = await fs.readFile(/*turbopackIgnore: true*/ path.join(R, przRel), 'utf8').catch(() => '')
    const prz = (przT ? JSON.parse(przT) : {}) as { wpisy?: { rodzaj: string; stary: string; nowy: string; uwaga?: string }[] }
    const wpisy = Array.isArray(prz.wpisy) ? prz.wpisy : []
    if (!wpisy.some((w) => w.rodzaj === 'archiwum' && w.stary === stary && w.nowy === nowy)) {
        const po = { ...prz, wpisy: [...wpisy.map((w) => (w.rodzaj === 'archiwum' && w.nowy === stary ? { ...w, nowy } : w)), { rodzaj: 'archiwum', stary, nowy, uwaga: `zmiana identyfikatora ${new Date().toISOString().slice(0, 10)}` }] }
        plan.edycje.push({ plik: przRel, przed: przT, po: JSON.stringify(po, null, 2) + '\n', opis: 'przekierowanie stary → nowy' })
    }
    // powtórka: przekierowanie było, nic więcej do zrobienia – plan pusty
    if (!plan.przeniesienia.length && plan.edycje.length === 1 && plan.edycje[0].plik === przRel && wpisy.some((w) => w.rodzaj === 'archiwum' && w.stary === stary)) plan.edycje = []
    return plan
}

async function zapiszAtomowo(abs: string, tresc: string) {
    await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(abs), { recursive: true })
    const tmp = `${abs}.${process.pid}.tmp`
    await fs.writeFile(/*turbopackIgnore: true*/ tmp, tresc)
    await fs.rename(/*turbopackIgnore: true*/ tmp, abs)
}

/** Wykonanie planu; przy błędzie cofa wszystko, co zdążyło się zmienić. `awariaPo` – tylko testy (awaria po n krokach). */
export async function wykonajZmianeId(R: string, plan: PlanZmianyId, test?: { awariaPo?: number }): Promise<{ ok: boolean; komunikat: string; cofnij?: () => Promise<void> }> {
    if (plan.bledy.length) return { ok: false, komunikat: `Nic nie zmieniono: ${plan.bledy.join('; ')}` }
    const zrobione: (() => Promise<void>)[] = []
    let krok = 0
    const awaria = () => { if (test?.awariaPo !== undefined && ++krok > test.awariaPo) throw new Error('awaria testowa') }
    try {
        for (const p of plan.przeniesienia) {
            awaria()
            await fs.rename(/*turbopackIgnore: true*/ path.join(R, p.z), path.join(R, p.na))
            zrobione.push(() => fs.rename(/*turbopackIgnore: true*/ path.join(R, p.na), path.join(R, p.z)))
        }
        for (const e of plan.edycje) {
            awaria()
            const abs = path.join(R, e.plik)
            if (!abs.startsWith(path.resolve(R) + path.sep)) throw new Error(`ścieżka poza katalogiem: ${e.plik}`)
            const teraz = await fs.readFile(/*turbopackIgnore: true*/ abs, 'utf8').catch(() => '')
            if (teraz !== e.przed) throw new Error(`${e.plik} zmienił się w międzyczasie – nic nie nadpisuję`)
            await zapiszAtomowo(abs, e.po)
            zrobione.push(() => (e.przed ? zapiszAtomowo(abs, e.przed) : fs.rm(/*turbopackIgnore: true*/ abs, { force: true })))
        }
    } catch (err) {
        for (const c of zrobione.reverse()) await c().catch(() => {})
        return { ok: false, komunikat: `Cofnięto zmiany: ${(err as Error).message}` }
    }
    const cofnij = async () => { for (const c of [...zrobione].reverse()) await c().catch(() => {}) }
    return { ok: true, cofnij, komunikat: `Przeniesiono ${plan.przeniesienia.length}, poprawiono ${plan.edycje.length} plików (${plan.edycje.map((e) => `${e.plik}: ${e.opis}`).join('; ')})` }
}
