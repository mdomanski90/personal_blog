// P5 (PNL-09): listy panelu nad plikami Keystatic – odczyt wierszy, podgląd skutku zmiany zbiorczej, zapis jako operacja
// (lib/panel/operacje.ts: kopia, „cofnij”). Bez nowych pól: zmieniamy tylko widoczność albo listę powiązań w istniejącym polu.
// Zapis tym samym serializatorem co Keystatic (js-yaml `dump` z domyślnymi opcjami; plik .mdoc = „---\n” + nagłówek + „---\n” + treść
// – keystatic-core-ui.js:75, 1831–1847), potem kontrola czytnikiem Keystatic: wpis, którego strona by nie odczytała, cofa całość.
import fs from 'node:fs/promises'
import path from 'node:path'
import * as yaml from 'js-yaml'
import { LISTY, WIDOCZNOSCI, kolumnyWgUstawien, type AkcjaZbiorcza, type Kolumna, type KonfigListy } from './listy-konfig'
import { STRONA_PUBLICZNA } from './menu'
import { wykonajOperacje, type ZmianaPliku } from './operacje'
import { BRAK_UKRYTYCH, ukrytyKlucz, type UkrytePozycje } from '../konta/tylko-ja'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const MAKS_ZAZNACZONYCH = 2000

export interface Wpis { slug: string; plik: string; tekst: string; dane: Record<string, unknown>; cialo: string | null }

/** Nagłówek i treść pliku .mdoc (format Keystatic). `null` – plik bez nagłówka. */
export function rozdziel(tekst: string): { naglowek: string; cialo: string } | null {
    const t = tekst.replace(/^﻿/, '')
    if (!t.startsWith('---\n') && !t.startsWith('---\r\n')) return null
    const start = t.indexOf('\n') + 1
    const m = /\r?\n---(?:\r?\n|$)/.exec(t.slice(start - 1))
    if (!m) return null
    const koniecNaglowka = start - 1 + m.index
    return { naglowek: t.slice(start, koniecNaglowka + 1), cialo: t.slice(koniecNaglowka + m[0].length) }
}

/** Zapis jak Keystatic: js-yaml dump (opcje domyślne), w .mdoc nagłówek między „---”. */
export function serializuj(dane: Record<string, unknown>, cialo: string | null): string {
    const y = yaml.dump(dane)
    return cialo === null ? y : `---\n${y}---\n${cialo}`
}

const maTresc = (k: string) => ['posts', 'miejsca', 'tematy', 'obiekty', 'materialy', 'zbiory', 'biogramy'].includes(k)

export async function wczytajKolekcje(kolekcja: string, korzen = process.cwd()): Promise<{ wpisy: Wpis[]; nieczytelne: { slug: string; blad: string }[] }> {
    if (!LISTY[kolekcja]) throw new Error('Nieznana kolekcja.')
    const kat = path.join(/*turbopackIgnore: true*/ korzen, 'content', kolekcja)
    let n: string[] = []
    try { n = await fs.readdir(/*turbopackIgnore: true*/ kat) } catch { return { wpisy: [], nieczytelne: [] } }
    const mdoc = maTresc(kolekcja)
    const wpisy: Wpis[] = [], nieczytelne: { slug: string; blad: string }[] = []
    for (const plik of n.sort()) {
        const m = mdoc ? /^(.+)\.mdoc$/.exec(plik) : /^(.+)\.ya?ml$/.exec(plik)
        if (!m) continue
        const slug = m[1]
        try {
            const tekst = await fs.readFile(/*turbopackIgnore: true*/ path.join(kat, plik), 'utf8')
            let dane: unknown, cialo: string | null = null
            if (mdoc) {
                const r = rozdziel(tekst)
                if (!r) throw new Error('brak nagłówka (---)')
                dane = yaml.load(r.naglowek) ?? {}; cialo = r.cialo
            } else dane = yaml.load(tekst) ?? {}
            if (!dane || typeof dane !== 'object' || Array.isArray(dane)) throw new Error('nagłówek nie jest obiektem')
            if (!SLUG.test(slug)) nieczytelne.push({ slug, blad: 'identyfikator z polskimi znakami, wielkimi literami lub spacją – strona go nie pokazuje' })
            wpisy.push({ slug, plik: `${kolekcja}/${plik}`, tekst, dane: dane as Record<string, unknown>, cialo })
        } catch (e) { nieczytelne.push({ slug, blad: String(e instanceof Error ? e.message : e).split('\n')[0].slice(0, 200) }) }
    }
    return { wpisy, nieczytelne }
}

/** Wpisy, których strona nie odczyta (walidacja czytnikiem Keystatic – np. wartość spoza listy); zmiany zbiorcze je pomijają. */
async function nieczytelneDlaStrony(kolekcja: string, korzen: string): Promise<{ slug: string; blad: string }[]> {
    try {
        const { createReader } = await import('@keystatic/core/reader')
        const { wczytajOdpornie } = await import('../kolekcja-odporna')
        const cfg = (await import('../../keystatic.config')).default
        const r = createReader(korzen, cfg) as unknown as { collections: Record<string, { list: () => Promise<string[]>; read: (s: string) => Promise<unknown> }> }
        return (await wczytajOdpornie(r.collections[kolekcja])).bledy.filter((b) => b.slug !== '*').map((b) => ({ slug: b.slug, blad: b.blad.replace(/^Error:\s*/, '').slice(0, 200) }))
    } catch { return [] }
}

async function wczytajZKontrola(kolekcja: string, korzen: string) {
    const [w, ks] = await Promise.all([wczytajKolekcje(kolekcja, korzen), nieczytelneDlaStrony(kolekcja, korzen)])
    const juz = new Set(w.nieczytelne.map((x) => x.slug))
    return { wpisy: w.wpisy, nieczytelne: [...w.nieczytelne, ...ks.filter((x) => !juz.has(x.slug))] }
}

async function ustawienia(korzen: string): Promise<Record<string, { kolumny?: string[] }>> {
    try { return JSON.parse(await fs.readFile(path.join(/*turbopackIgnore: true*/ korzen, 'content', '_panel', 'listy.json'), 'utf8')) } catch { return {} }
}

/** Etykiety pól wyboru z konfiguracji Keystatic (jedno źródło list wartości). */
async function etykietyWyborow(kolekcja: string): Promise<Record<string, Record<string, string>>> {
    const cfg = (await import('../../keystatic.config')).default as unknown as { collections: Record<string, { schema: Record<string, { options?: { value: string; label: string }[] }> }> }
    const schema = cfg.collections[kolekcja]?.schema ?? {}
    const w: Record<string, Record<string, string>> = {}
    for (const [pole, f] of Object.entries(schema)) if (Array.isArray(f.options)) w[pole] = Object.fromEntries(f.options.map((o) => [o.value, o.label]))
    return w
}

async function nazwyCelow(kolekcje: string[], korzen: string, u: UkrytePozycje = BRAK_UKRYTYCH): Promise<Record<string, { slug: string; nazwa: string }[]>> {
    const w: Record<string, { slug: string; nazwa: string }[]> = {}
    for (const k of [...new Set(kolekcje)]) {
        w[k] = (await wczytajKolekcje(k, korzen)).wpisy.filter((x) => !ukrytyKlucz(k, x.slug, u)).map((x) => ({ slug: x.slug, nazwa: String(x.dane.title ?? x.slug) }))
            .sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'))
    }
    return w
}

const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : v ? [String(v)] : [])

function komorka(k: Kolumna, w: Wpis, etyk: Record<string, Record<string, string>>, cele: Record<string, Map<string, string>>): { tekst: string; wartosc: string[] } {
    if (k.rodzaj === 'slug') return { tekst: w.slug, wartosc: [w.slug] }
    const v = lista(w.dane[k.pole])
    if (k.rodzaj === 'wybor' || k.rodzaj === 'wybory') {
        const e = k.pole === 'visibility' ? WIDOCZNOSCI : etyk[k.pole] ?? {}
        return { tekst: v.map((x) => e[x] ?? x).join(', '), wartosc: v }
    }
    if (k.rodzaj === 'relacja' || k.rodzaj === 'relacje') return { tekst: v.map((x) => cele[k.kolekcja!]?.get(x) ?? x).join(', '), wartosc: v }
    return { tekst: v.join(', ').slice(0, 200), wartosc: v }
}

export interface DaneListy {
    kolekcja: string; nazwa: string; kolumny: Kolumna[]; wszystkieKolumny: Kolumna[]
    wiersze: { slug: string; komorki: Record<string, { tekst: string; wartosc: string[] }>; nieczytelny?: string }[]
    opcje: Record<string, { value: string; label: string }[]>
    widocznosc: boolean; relacje: KonfigListy['relacje']; cele: Record<string, { slug: string; nazwa: string }[]>
    strona: string | null
}

/** `u` (P7c, KON-08) – pozycje „tylko ja” do pominięcia (konto bez roli administratora); w powiązaniach zostaje sam identyfikator, jak w Keystatic. */
export async function daneListy(kolekcja: string, korzen = process.cwd(), u: UkrytePozycje = BRAK_UKRYTYCH): Promise<DaneListy> {
    const konfig = LISTY[kolekcja]
    if (!konfig) throw new Error('Nieznana kolekcja.')
    const [z, ust, etyk] = await Promise.all([wczytajZKontrola(kolekcja, korzen), ustawienia(korzen), etykietyWyborow(kolekcja)])
    const wpisy = z.wpisy.filter((w) => !ukrytyKlucz(kolekcja, w.slug, u)), nieczytelne = z.nieczytelne.filter((w) => !ukrytyKlucz(kolekcja, w.slug, u))
    const kolumny = kolumnyWgUstawien(konfig, ust[kolekcja]?.kolumny)
    const potrzebne = [...konfig.kolumny.filter((k) => k.kolekcja).map((k) => k.kolekcja!), ...konfig.relacje.map((r) => r.kolekcja)]
    const cele = await nazwyCelow(potrzebne, korzen, u)
    const mapy = Object.fromEntries(Object.entries(cele).map(([k, L]) => [k, new Map(L.map((x) => [x.slug, x.nazwa]))]))
    const bledy = new Map(nieczytelne.map((x) => [x.slug, x.blad]))
    const wiersze = wpisy.map((w) => ({
        slug: w.slug,
        komorki: Object.fromEntries(konfig.kolumny.map((k) => [k.pole, komorka(k, w, etyk, mapy)])),
        ...(bledy.has(w.slug) ? { nieczytelny: bledy.get(w.slug) } : {}),
    }))
    for (const n of nieczytelne) if (!wpisy.some((w) => w.slug === n.slug)) wiersze.push({ slug: n.slug, komorki: { title: { tekst: n.slug, wartosc: [] }, slug: { tekst: n.slug, wartosc: [n.slug] } }, nieczytelny: n.blad })
    wiersze.sort((a, b) => (a.komorki.title?.tekst ?? a.slug).localeCompare(b.komorki.title?.tekst ?? b.slug, 'pl'))
    const opcje: DaneListy['opcje'] = {}
    for (const k of konfig.kolumny) if (k.rodzaj === 'wybor' || k.rodzaj === 'wybory') opcje[k.pole] = Object.entries(k.pole === 'visibility' ? WIDOCZNOSCI : etyk[k.pole] ?? {}).map(([value, label]) => ({ value, label }))
    return { kolekcja, nazwa: konfig.nazwa, kolumny, wszystkieKolumny: konfig.kolumny, wiersze, opcje, widocznosc: konfig.widocznosc, relacje: konfig.relacje, cele, strona: STRONA_PUBLICZNA[kolekcja] ?? null }
}

// ---------- zmiana zbiorcza ----------
export interface PodgladZmiany {
    opis: string; zaznaczone: number; zmienione: number; bezZmian: number; nieczytelne: string[]
    skutek: string[]; przyklady: { slug: string; nazwa: string; przed: string; po: string }[]
}

function zastosuj(dane: Record<string, unknown>, a: AkcjaZbiorcza): Record<string, unknown> {
    const d = { ...dane }
    if (a.rodzaj === 'widocznosc') d.visibility = a.wartosc
    else {
        const obecne = lista(d[a.pole])
        d[a.pole] = a.rodzaj === 'dodaj-relacje' ? (obecne.includes(a.wartosc) ? obecne : [...obecne, a.wartosc]) : obecne.filter((x) => x !== a.wartosc)
    }
    return d
}

/** Ile innych plików treści wspomina identyfikator (relacje, odnośniki [[…]]) – do opisu skutku ukrycia. */
async function odwolania(slugi: string[], wlasna: string, korzen: string): Promise<number> {
    if (!slugi.length) return 0
    const wzor = new RegExp(`(^|[^a-z0-9-])(${slugi.map((s) => s.replace(/[-]/g, '\\-')).join('|')})(?![a-z0-9-])`)
    let n = 0
    for (const k of Object.keys(LISTY)) {
        for (const w of (await wczytajKolekcje(k, korzen)).wpisy) {
            if (k === wlasna && slugi.includes(w.slug)) continue
            if (wzor.test(w.tekst)) n++
        }
    }
    return n
}

async function przygotuj(kolekcja: string, slugi: string[], a: AkcjaZbiorcza, korzen: string, u: UkrytePozycje | null) {
    const konfig = LISTY[kolekcja]
    if (!konfig) throw new Error('Nieznana kolekcja.')
    if (!Array.isArray(slugi) || !slugi.length) throw new Error('Zaznacz co najmniej jedną pozycję.')
    if (slugi.length > MAKS_ZAZNACZONYCH) throw new Error(`Naraz najwyżej ${MAKS_ZAZNACZONYCH} pozycji.`)
    let opisAkcji: string, cel: string | null = null
    if (a.rodzaj === 'widocznosc') {
        if (!konfig.widocznosc) throw new Error('Ta kolekcja nie ma ustawienia widoczności.')
        if (!(a.wartosc in WIDOCZNOSCI)) throw new Error('Niepoprawna widoczność.')
        if (u && a.wartosc === 'ja') throw new Error('Widoczność „tylko ja” ustawia tylko administrator (przełącz rolę w menu pod swoim imieniem).')
        opisAkcji = `widoczność → ${WIDOCZNOSCI[a.wartosc]}`
    } else if (a.rodzaj === 'dodaj-relacje' || a.rodzaj === 'usun-relacje') {
        const r = konfig.relacje.find((x) => x.pole === a.pole)
        if (!r) throw new Error('Tego powiązania nie można zmieniać zbiorczo.')
        if (!SLUG.test(a.wartosc)) throw new Error('Niepoprawny identyfikator powiązania.')
        const cele = (await wczytajKolekcje(r.kolekcja, korzen)).wpisy
        const c = cele.find((x) => x.slug === a.wartosc && !(u && ukrytyKlucz(r.kolekcja, x.slug, u)))
        if (!c && a.rodzaj === 'dodaj-relacje') throw new Error('Nie ma takiej pozycji do powiązania.')
        cel = String(c?.dane.title ?? a.wartosc)
        opisAkcji = `${a.rodzaj === 'dodaj-relacje' ? 'dopisz do' : 'usuń z'} „${r.etykieta}”: ${cel}`
    } else throw new Error('Nieznana zmiana.')
    const { wpisy, nieczytelne } = await wczytajZKontrola(kolekcja, korzen)
    const wgSlug = new Map(wpisy.map((w) => [w.slug, w]))
    const nieczyt = new Set(nieczytelne.map((x) => x.slug))
    const zmiany: (ZmianaPliku & { slug: string; przed: Record<string, unknown>; po: Record<string, unknown> })[] = []
    let bezZmian = 0
    const pominiete: string[] = []
    for (const s of [...new Set(slugi.map(String))]) {
        const w = wgSlug.get(s)
        if (!w || nieczyt.has(s) || (u && ukrytyKlucz(kolekcja, s, u))) { pominiete.push(s); continue }
        const po = zastosuj(w.dane, a)
        const wynik = serializuj(po, w.cialo)
        if (JSON.stringify(po) === JSON.stringify(w.dane)) { bezZmian++; continue }
        zmiany.push({ plik: w.plik, poprzedni: w.tekst, wynik, slug: s, przed: w.dane, po })
    }
    return { konfig, opisAkcji, cel, zmiany, bezZmian, pominiete }
}

/** `u` (P7c, KON-08) – konto bez roli administratora: bez pozycji „tylko ja” i bez ustawiania „tylko ja”. */
export async function podgladZmiany(kolekcja: string, slugi: string[], a: AkcjaZbiorcza, korzen = process.cwd(), u: UkrytePozycje | null = null): Promise<PodgladZmiany> {
    const p = await przygotuj(kolekcja, slugi, a, korzen, u)
    const skutek: string[] = []
    const strona = STRONA_PUBLICZNA[kolekcja]
    if (a.rodzaj === 'widocznosc') {
        const odkryte = p.zmiany.filter((z) => z.przed.visibility !== 'publiczne' && a.wartosc === 'publiczne')
        const ukryte = p.zmiany.filter((z) => z.przed.visibility === 'publiczne' && a.wartosc !== 'publiczne')
        if (odkryte.length) skutek.push(`${odkryte.length} ${odkryte.length === 1 ? 'pozycja stanie się publiczna' : 'pozycji stanie się publicznych'}: ${strona ? 'dostaną własne strony, ' : ''}pojawią się w katalogu, wyszukiwarce i na kartach powiązanych pozycji; nowe dostaną numer katalogowy.`)
        if (ukryte.length) {
            const n = await odwolania(ukryte.map((z) => z.slug), kolekcja, korzen)
            skutek.push(`${ukryte.length} ${ukryte.length === 1 ? 'pozycja przestanie' : 'pozycji przestanie'} być publiczna: czytelnik dostanie 404 pod ich adresem, znikną z katalogu i wyszukiwarki.${n ? ` Wspomina je ${n} innych pozycji – odnośniki do nich znikną dla czytelników.` : ''}`)
        }
        if (!odkryte.length && !ukryte.length && p.zmiany.length) skutek.push(`Zmiana między „dla bliskich” a „tylko ja” – czytelnik publiczny nie zobaczy różnicy.`)
    } else if (p.zmiany.length) {
        const n = p.zmiany.length, jedna = n === 1
        skutek.push(a.rodzaj === 'dodaj-relacje'
            ? `„${p.cel}” pojawi się przy ${n} ${jedna ? 'pozycji' : 'pozycjach'}, a ${jedna ? 'ta pozycja' : 'te pozycje'} – na karcie „${p.cel}” (o ile ${jedna ? 'jest publiczna' : 'są publiczne'}).`
            : `„${p.cel}” zniknie z ${n} ${jedna ? 'pozycji' : 'pozycji'}, a ${jedna ? 'ona' : 'one'} – z karty „${p.cel}”.`)
    }
    if (p.bezZmian) skutek.push(`${p.bezZmian} już ${p.bezZmian === 1 ? 'ma' : 'mają'} to ustawienie – bez zmian.`)
    if (p.pominiete.length) skutek.push(`${p.pominiete.length} pominięte – wpis nieczytelny albo nie istnieje (popraw go w Keystatic).`)
    const nazwy = a.rodzaj === 'widocznosc' ? new Map<string, string>() : new Map((await wczytajKolekcje(p.konfig.relacje.find((r) => r.pole === a.pole)!.kolekcja, korzen)).wpisy.map((w) => [w.slug, String(w.dane.title ?? w.slug)]))
    const opisPola = (d: Record<string, unknown>) => a.rodzaj === 'widocznosc'
        ? (WIDOCZNOSCI[String(d.visibility ?? '')] ?? String(d.visibility ?? '—'))
        : (lista(d[a.pole]).map((x) => nazwy.get(x) ?? x).join(', ') || '(brak)')
    return {
        opis: `${p.konfig.nazwa}: ${p.opisAkcji}`, zaznaczone: slugi.length, zmienione: p.zmiany.length, bezZmian: p.bezZmian, nieczytelne: p.pominiete, skutek,
        przyklady: p.zmiany.slice(0, 8).map((z) => ({ slug: z.slug, nazwa: String(z.po.title ?? z.slug), przed: opisPola(z.przed), po: opisPola(z.po) })),
    }
}

/** Zapis zmiany zbiorczej jako operacja. Kontrola po zapisie: każdy zmieniony wpis musi się wczytać czytnikiem Keystatic. */
export async function zapiszZmiane(kolekcja: string, slugi: string[], a: AkcjaZbiorcza, korzen = process.cwd(), u: UkrytePozycje | null = null) {
    const p = await przygotuj(kolekcja, slugi, a, korzen, u)
    if (!p.zmiany.length) return { id: null, zapisane: 0, bezZmian: p.bezZmian }
    const w = await wykonajOperacje({
        korzen, rodzaj: 'zbiorcza', opis: `${p.konfig.nazwa}: ${p.opisAkcji} (${p.zmiany.length})`,
        zmiany: p.zmiany.map(({ plik, poprzedni, wynik }) => ({ plik, poprzedni, wynik })),
        szczegoly: { kolekcja, akcja: a, slugi: p.zmiany.map((z) => z.slug).slice(0, 200) },
        sprawdz: async () => {
            const { createReader } = await import('@keystatic/core/reader')
            const cfg = (await import('../../keystatic.config')).default
            const r = createReader(korzen, cfg) as unknown as { collections: Record<string, { read: (s: string) => Promise<unknown> }> }
            for (const z of p.zmiany) {
                try { if (!(await r.collections[kolekcja].read(z.slug))) throw new Error('brak wpisu') }
                catch (e) { throw new Error(`Po zmianie wpis „${z.slug}” byłby nieczytelny dla strony (${String(e instanceof Error ? e.message : e).slice(0, 160)}) – nic nie zapisano.`) }
            }
        },
    })
    return { id: w.id, zapisane: w.zapisane, bezZmian: p.bezZmian }
}
