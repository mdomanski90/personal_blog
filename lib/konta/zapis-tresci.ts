// P7a (KON-01): zapis Keystatic pod kontrolą uprawnień – każdy plik z żądania: dział, usuwanie, „tylko ja”, publikowanie, zakres miejscowości.
// Reguły są w lib/konta/model.ts (ocenZapis); tu tylko odczyt tego, co reguły muszą wiedzieć o pliku przed i po zapisie.
import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'
import { kluczMiejsca, wczytajKregi } from '../kregi'
import type { ZadanieKeystatic } from '../panel/historia'
import { mozeTylkoJa, ocenZapis, opisRoliZDzialami, type MetaPliku, type PlikZapisu } from './model'
import type { Zalogowany } from './straz'

const MAKS = 2_000_000

/** Widoczność i miejscowości z nagłówka pliku treści (.mdoc – nagłówek YAML, .yaml, .json). Pliki bez nagłówka (obrazy) – brak danych. */
export function metaPliku(sciezka: string, tresc: string | null): MetaPliku | null {
    if (tresc === null) return null
    const pusta: MetaPliku = { widocznosc: null, miejsca: [] }
    let o: unknown = null
    try {
        if (/\.(mdoc|md)$/.test(sciezka)) { const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(tresc); o = m ? yaml.load(m[1]) : null }
        else if (/\.ya?ml$/.test(sciezka)) o = yaml.load(tresc)
        else if (/\.json$/.test(sciezka)) o = JSON.parse(tresc)
    } catch { return pusta }
    if (!o || typeof o !== 'object' || Array.isArray(o)) return pusta
    const d = o as Record<string, unknown>
    const w = d.visibility ?? d.widocznosc
    const c = sciezka.split('/')
    const lista = (x: unknown) => (Array.isArray(x) ? x : x ? [x] : []).filter((v): v is string => typeof v === 'string' && !!v)
    // miejscowość pliku: sama miejscowość (content/miejsca/<slug>) albo pola z odnośnikami do miejscowości
    const miejsca = c[0] === 'content' && c[1] === 'miejsca' ? [c[2].replace(/\.[^.]+$/, '')] : [...lista(d.spatial), ...lista(d.seat)]
    return { widocznosc: typeof w === 'string' ? w : null, miejsca: [...new Set(miejsca)] }
}

async function czytaj(korzen: string, rel: string): Promise<string | null> {
    try {
        const p = path.join(/*turbopackIgnore: true*/ korzen, ...rel.split('/'))
        if ((await fs.stat(p)).size > MAKS) return ''
        return await fs.readFile(p, 'utf8')
    } catch { return null }
}

/** Miejscowości (slugi) kręgów z ustawienia „Kręgi i stopka” – nazwy z ustawienia dopasowane do tytułów miejscowości. */
export async function slugiKregow(korzen = process.cwd()): Promise<Record<string, string[]>> {
    const { kregi } = await wczytajKregi()
    const kat = path.join(/*turbopackIgnore: true*/ korzen, 'content', 'miejsca')
    const slugNazwy = new Map<string, string>()
    for (const plik of await fs.readdir(kat).catch(() => [] as string[])) {
        if (!plik.endsWith('.mdoc')) continue
        const m = /^title:\s*['"]?(.+?)['"]?\s*$/m.exec((await czytaj(korzen, `content/miejsca/${plik}`)) ?? '')
        if (m) slugNazwy.set(kluczMiejsca(m[1]), plik.replace(/\.mdoc$/, ''))
    }
    return Object.fromEntries(kregi.map((k) => [k.id, k.miejsca.map((n) => slugNazwy.get(kluczMiejsca(n))).filter((s): s is string => !!s)]))
}

/** Pliki żądania zapisu z danymi przed i po. Zmiana nazwy (nowy plik + usunięcie starego w tym samym katalogu) nie jest usunięciem. */
export async function plikiZapisu(z: ZadanieKeystatic, korzen = process.cwd()): Promise<PlikZapisu[]> {
    const wyn: PlikZapisu[] = []
    const nowe: string[] = []
    for (const a of z.additions) {
        const stara = await czytaj(korzen, a.path)
        if (stara === null) nowe.push(a.path)
        wyn.push({ sciezka: a.path, przed: metaPliku(a.path, stara), po: metaPliku(a.path, Buffer.from(a.contents, 'base64url').toString('utf8')) ?? { widocznosc: null, miejsca: [] } })
    }
    for (const d of z.deletions) {
        if (z.additions.some((a) => a.path === d.path)) continue
        const stara = await czytaj(korzen, d.path)
        const nazwaZmieniona = nowe.some((n) => path.dirname(n) === path.dirname(d.path) && path.extname(n) === path.extname(d.path))
        const przed = metaPliku(d.path, stara)
        // zmiana nazwy: stary plik „znika”, ale to nie usuwanie – oceniamy go jak zmianę (dział, „tylko ja”, zakres)
        wyn.push({ sciezka: d.path, przed, po: nazwaZmieniona ? (przed ?? { widocznosc: null, miejsca: [] }) : null })
    }
    return wyn
}

/** Komunikat odmowy zapisu Keystatic dla zalogowanego konta albo null. */
export async function odmowaZapisuTresci(kto: Zalogowany, z: ZadanieKeystatic, korzen = process.cwd()): Promise<string | null> {
    const kregi = kto.konto.zakres.kregi.length && !kto.administrator ? await slugiKregow(korzen) : {}
    return ocenZapis(
        { uprawnienia: kto.uprawnienia, zakres: kto.administrator ? { kregi: [], miejsca: [] } : kto.konto.zakres, tylkoJa: mozeTylkoJa(kto.konto), opisRoli: opisRoliZDzialami(kto.konto, kto.role, kto.administrator) },
        await plikiZapisu(z, korzen), (id) => kregi[id] ?? [])
}
