// P7b (TER-01): teren po stronie serwera – kto pracuje w terenie, zapis czynności w kolejce planu, dziennik, skrzynka nowych miejsc.
//   content/plany/_teren/<slug>.json    – dziennik czynności z terenu (kto, co, kiedy; napisy „do decyzji”)
//   content/_teren/miejsca/<id>.json    – nowe miejsca z telefonu (skrzynka „z terenu”)
//   pliki-archiwum/teren/<id>/<plik>    – zdjęcia nowych miejsc (bez EXIF i GPS; wydawane tylko w panelu)
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { maTeren, planWTerenie, type Uprawnienie } from '../konta/model'
import { kontaWlaczone, zalogowany, type Zalogowany } from '../konta/straz'
import { listaPlanow, poKolei, wczytajPlan, wczytajUstawienia, zapiszPlan } from '../plany/dane'
import { popraw, SLUG, type Plan, type Widocznosc } from '../plany/model'
import { rozstrzygnij, zastosujCzynnosc, type Czynnosc, type KtoWTerenie, type WpisDziennika } from './czynnosci'
import { ID_MIEJSCA, odczytajMiejsce, type MiejsceTerenu, type PunktMiejscowosci, type ZdjecieTerenu } from './miejsca'

const DZIENNIKI = () => path.resolve(process.cwd(), 'content', 'plany', '_teren')
const MIEJSCA = () => path.resolve(process.cwd(), 'content', '_teren', 'miejsca')
const PLIKI = () => path.resolve(process.cwd(), 'pliki-archiwum', 'teren')
const MAKS_WPISOW = 3000

async function zapiszAtomowo(plik: string, dane: string | Buffer) {
    await fs.promises.mkdir(path.dirname(plik), { recursive: true })
    const tmp = `${plik}.${randomBytes(4).toString('hex')}.tmp`
    await fs.promises.writeFile(tmp, dane)
    await fs.promises.rename(tmp, plik)
}

// ---------- kto ----------
export interface OsobaWTerenie {
    id: string; imie: string
    /** dział „plany” – cały plan i „sprawdzony” */
    pelne: boolean
    /** zdjęcia i napisy na planach (wszystkich albo z listy konta) */
    plany: boolean
    /** nowe miejsca z telefonu */
    miejsca: boolean
    /** redakcja skrzynki „z terenu” (dział „miejsca i obiekty”) */
    redakcja: boolean
    poziom: Widocznosc
    naPlanie: (slug: string) => boolean
}
const BEZ_KONT: OsobaWTerenie = { id: '', imie: 'redakcja', pelne: true, plany: true, miejsca: true, redakcja: true, poziom: 'ja', naPlanie: () => true }

export function osobaZKonta(z: Zalogowany): OsobaWTerenie {
    const u = z.uprawnienia as Set<Uprawnienie>
    return {
        id: z.konto.id, imie: z.konto.imie, pelne: u.has('plany'), plany: u.has('plany-teren'), miejsca: u.has('teren'), redakcja: u.has('miejsca'),
        poziom: u.has('plany') ? 'ja' : u.has('bliscy') ? 'bliscy' : 'publiczne',
        naPlanie: (slug) => planWTerenie(u, z.konto.zakres, slug),
    }
}
/** Osoba pracująca w terenie z żądania (strażnik trasy już sprawdził zalogowanie). Konta wyłączone – jak przed P7a: pełny dostęp. */
export function osobaWTerenie(req: Request): OsobaWTerenie | null {
    if (!kontaWlaczone()) return BEZ_KONT
    const z = zalogowany(req)
    return z && (maTeren(z.uprawnienia) || z.uprawnienia.has('panel')) ? osobaZKonta(z) : null
}
export const ktoWTerenie = (o: OsobaWTerenie): KtoWTerenie => ({ id: o.id, imie: o.imie, pelne: o.pelne })

// ---------- dziennik planu ----------
export async function wczytajDziennik(slug: string): Promise<WpisDziennika[]> {
    if (!SLUG.test(slug)) return []
    try {
        const j = JSON.parse(await fs.promises.readFile(path.join(DZIENNIKI(), `${slug}.json`), 'utf8'))
        return Array.isArray(j?.wpisy) ? (j.wpisy as WpisDziennika[]).filter((w) => w && typeof w.id === 'string' && typeof w.grob === 'string') : []
    } catch { return [] }
}
async function zapiszDziennik(slug: string, wpisy: WpisDziennika[]) {
    // najstarsze rozstrzygnięte wpisy odpadają; „do decyzji” bez rozstrzygnięcia zostają zawsze
    const nadmiar = wpisy.length - MAKS_WPISOW
    const L = nadmiar > 0 ? wpisy.filter((w, i) => i >= nadmiar || (w.wynik === 'do-decyzji' && !w.rozstrzygnieto)) : wpisy
    await zapiszAtomowo(path.join(DZIENNIKI(), `${slug}.json`), JSON.stringify({ wpisy: L }, null, 1))
}

export type WynikZapisu = { wpis: WpisDziennika; wersja: number; powtorzona?: boolean } | { blad: string; status: number }

/**
 * Wykonuje czynność na aktualnym planie – w kolejce planu, razem z edytorem (jeden zapis naraz). Ta sama czynność wysłana
 * drugi raz (zerwane połączenie) zwraca pierwszy wynik i niczego nie zmienia.
 */
export async function wykonajCzynnosc(slug: string, cz: Czynnosc, kto: KtoWTerenie): Promise<WynikZapisu> {
    return poKolei(slug, async () => {
        const plan = await wczytajPlan(slug)
        if (!plan) return { blad: 'Nie ma takiego planu.', status: 404 }
        const dziennik = await wczytajDziennik(slug)
        const byl = dziennik.find((w) => w.id === cz.id)
        if (byl) return { wpis: byl, wersja: plan.wersja, powtorzona: true }
        const w = zastosujCzynnosc(plan, cz, kto, await wczytajUstawienia())
        if ('blad' in w) return w
        let wersja = plan.wersja
        if (w.zmieniono) wersja = (await zapiszPlan(popraw({ ...w.plan, wersja: plan.wersja + 1 }))).wersja
        await zapiszDziennik(slug, [...dziennik, w.wpis])
        return { wpis: w.wpis, wersja }
    })
}

/** Redakcja wybiera wersję napisu „do decyzji”. */
export async function rozstrzygnijZmiane(slug: string, id: string, wybor: 'teren' | 'redakcja', kto: { id: string }): Promise<{ wpis: WpisDziennika } | { blad: string; status: number }> {
    return poKolei(slug, async () => {
        const plan = await wczytajPlan(slug)
        if (!plan) return { blad: 'Nie ma takiego planu.', status: 404 }
        const dziennik = await wczytajDziennik(slug)
        const wpis = dziennik.find((w) => w.id === id)
        if (!wpis) return { blad: 'Nie ma takiej zmiany.', status: 404 }
        const r = rozstrzygnij(plan, wpis, wybor, kto, await wczytajUstawienia())
        if ('blad' in r) return { blad: r.blad, status: 409 }
        if (r.zmieniono) await zapiszPlan(popraw({ ...r.plan, wersja: plan.wersja + 1 }))
        await zapiszDziennik(slug, dziennik.map((w) => (w.id === id ? r.wpis : w)))
        return { wpis: r.wpis }
    })
}

/** Plany, na których ta osoba pracuje w terenie. */
export async function planyOsoby(o: OsobaWTerenie): Promise<Plan[]> {
    if (!o.plany) return []
    return (await listaPlanow()).filter((p) => o.naPlanie(p.slug))
}

/** Wpisy dzienników: własne (telefon) albo wszystkie (redakcja), od najnowszych. */
export async function wpisyZTerenu(plany: Pick<Plan, 'slug' | 'tytul'>[], tylkoKto?: string, limit = 60): Promise<(WpisDziennika & { plan: string; tytul: string })[]> {
    const wyn: (WpisDziennika & { plan: string; tytul: string })[] = []
    for (const p of plany) for (const w of await wczytajDziennik(p.slug)) if (!tylkoKto || w.kto === tylkoKto) wyn.push({ ...w, plan: p.slug, tytul: p.tytul })
    return wyn.sort((a, b) => b.czas.localeCompare(a.czas)).slice(0, limit)
}

// ---------- skrzynka nowych miejsc ----------
export async function listaMiejscTerenu(): Promise<MiejsceTerenu[]> {
    let pliki: string[] = []
    try { pliki = await fs.promises.readdir(MIEJSCA()) } catch { return [] }
    const wyn: MiejsceTerenu[] = []
    for (const p of pliki) {
        if (!p.endsWith('.json')) continue
        try { const m = odczytajMiejsce(JSON.parse(await fs.promises.readFile(path.join(MIEJSCA(), p), 'utf8'))); if (m) wyn.push(m) } catch { /* uszkodzony plik – pomijamy */ }
    }
    return wyn.sort((a, b) => b.czas.localeCompare(a.czas))
}
export async function wczytajMiejsceTerenu(id: string): Promise<MiejsceTerenu | null> {
    if (!ID_MIEJSCA.test(id)) return null
    try { return odczytajMiejsce(JSON.parse(await fs.promises.readFile(path.join(MIEJSCA(), `${id}.json`), 'utf8'))) } catch { return null }
}
export async function zapiszMiejsceTerenu(m: MiejsceTerenu) {
    await zapiszAtomowo(path.join(MIEJSCA(), `${m.id}.json`), JSON.stringify(m, null, 1))
}
export async function usunMiejsceTerenu(id: string) {
    if (!ID_MIEJSCA.test(id)) return
    await fs.promises.rm(path.join(MIEJSCA(), `${id}.json`), { force: true })
    await fs.promises.rm(path.join(PLIKI(), id), { recursive: true, force: true })
}

/** Zdjęcie nowego miejsca: obrót wg EXIF utrwalony w pikselach, najwyżej 2400 px, zapis jako JPEG bez metadanych (także GPS). */
export async function zapiszZdjecieTerenu(id: string, dane: Buffer, nr: number): Promise<ZdjecieTerenu> {
    if (!ID_MIEJSCA.test(id)) throw new Error('zły identyfikator')
    const sharp = (await import('sharp')).default
    const { data, info } = await sharp(dane, { limitInputPixels: 400_000_000 }).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer({ resolveWithObject: true })
    const plik = `zdjecie-${nr}-${randomBytes(3).toString('hex')}.jpg`
    await zapiszAtomowo(path.join(PLIKI(), id, plik), data)
    return { plik, szer: info.width, wys: info.height }
}
export function sciezkaZdjeciaTerenu(id: string, plik: string): string | null {
    if (!ID_MIEJSCA.test(id) || !/^[\w-]+(\.[\w-]+)*$/.test(plik)) return null
    const baza = PLIKI(), p = path.resolve(/*turbopackIgnore: true*/ baza, id, plik)
    return p.startsWith(baza + path.sep) ? p : null
}

/** Miejscowości z współrzędnymi – do „najbliżej: …”. Tylko publiczne (nazwy wsi widzi każdy czytelnik strony). */
export async function miejscowosciZPolozeniem(): Promise<PunktMiejscowosci[]> {
    const { miejsca } = await import('../archiwum')
    return (await miejsca('publiczne')).flatMap((m) => (m.wspolrzedne ? [{ id: m.id, nazwa: m.nazwa, lat: m.wspolrzedne[0], lon: m.wspolrzedne[1] }] : []))
}
