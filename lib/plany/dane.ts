// Odczyt i zapis planów na serwerze.
//   content/plany/<slug>.json          – plan (rysunek i dane), nigdy w repozytorium
//   content/plany/_ustawienia.json     – próg lat, ukryte typy, własne typy
//   content/plany/_zgloszenia/*.json   – prośby o usunięcie od czytelników
//   pliki-archiwum/plany/<slug>/       – podkłady i zdjęcia nagrobków (wydawane po sprawdzeniu widoczności)
//   pliki-archiwum/plany/_ikony/       – pliki PNG własnych typów

import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { popraw, SLUG, type Plan } from './model'
import { USTAWIENIA_DOMYSLNE, type UstawieniaPlanow, type WlasnyTyp } from './typy'

const KATALOG = () => path.resolve(process.cwd(), 'content', 'plany')
const PLIKI = () => path.resolve(process.cwd(), 'pliki-archiwum', 'plany')

export const PLIK_OK = /^[\w-]+(\.[\w-]+)*$/

async function zapiszAtomowo(plik: string, dane: string | Buffer) {
    await fs.promises.mkdir(path.dirname(plik), { recursive: true })
    const tmp = `${plik}.${randomBytes(4).toString('hex')}.tmp`
    await fs.promises.writeFile(tmp, dane)
    await fs.promises.rename(tmp, plik)
}

export async function listaPlanow(): Promise<Plan[]> {
    let pliki: string[] = []
    try { pliki = await fs.promises.readdir(KATALOG()) } catch { return [] }
    const wyn: Plan[] = []
    for (const p of pliki) {
        if (!p.endsWith('.json') || p.startsWith('_')) continue
        const plan = await wczytajPlan(p.slice(0, -5))
        if (plan) wyn.push(plan)
    }
    return wyn.sort((a, b) => a.tytul.localeCompare(b.tytul, 'pl'))
}

export async function wczytajPlan(slug: string): Promise<Plan | null> {
    if (!SLUG.test(slug)) return null
    try {
        const surowy = JSON.parse(await fs.promises.readFile(path.join(KATALOG(), `${slug}.json`), 'utf8'))
        return popraw({ ...surowy, slug })
    } catch { return null }
}

export async function zapiszPlan(plan: Plan): Promise<Plan> {
    if (!SLUG.test(plan.slug)) throw new Error('zły identyfikator planu')
    const p = popraw(plan)
    p.zmieniono = new Date().toISOString()
    await zapiszAtomowo(path.join(KATALOG(), `${p.slug}.json`), JSON.stringify(p, null, 1))
    return p
}

export async function usunPlan(slug: string) {
    if (!SLUG.test(slug)) return
    // plan przenosimy do kosza zamiast kasować – na wypadek pomyłki
    const kosz = path.join(KATALOG(), '_kosz')
    await fs.promises.mkdir(kosz, { recursive: true })
    await fs.promises.rename(path.join(KATALOG(), `${slug}.json`), path.join(kosz, `${slug}-${Date.now()}.json`)).catch(() => {})
}

export async function planyDla(rodzaj: 'miejsce' | 'obiekt', id: string): Promise<Plan[]> {
    return (await listaPlanow()).filter((p) => (rodzaj === 'miejsce' ? p.miejsce === id : p.obiekt === id))
}

// ---------- ustawienia ----------
export async function wczytajUstawienia(): Promise<UstawieniaPlanow> {
    try {
        const u = JSON.parse(await fs.promises.readFile(path.join(KATALOG(), '_ustawienia.json'), 'utf8'))
        return {
            progLat: Number.isFinite(u.progLat) && u.progLat >= 0 ? Math.round(u.progLat) : USTAWIENIA_DOMYSLNE.progLat,
            ukryteTypy: Array.isArray(u.ukryteTypy) ? u.ukryteTypy.filter((t: unknown) => typeof t === 'string') : [],
            wlasneTypy: Array.isArray(u.wlasneTypy) ? (u.wlasneTypy as WlasnyTyp[]).filter((w) => w && typeof w.id === 'string') : [],
        }
    } catch { return { ...USTAWIENIA_DOMYSLNE } }
}

export async function zapiszUstawienia(u: UstawieniaPlanow) {
    await zapiszAtomowo(path.join(KATALOG(), '_ustawienia.json'), JSON.stringify(u, null, 1))
}

// ---------- pliki (podkłady, zdjęcia, ikony) ----------
export function sciezkaPliku(slug: string, plik: string): string | null {
    if (!(SLUG.test(slug) || slug === '_ikony') || !PLIK_OK.test(plik)) return null
    const baza = PLIKI(), p = path.resolve(/*turbopackIgnore: true*/ baza, slug, plik)
    return p.startsWith(baza + path.sep) ? p : null
}

/** Zapis wgranego obrazu: duże zmniejszamy (sharp), metadane (EXIF, GPS) zawsze usuwamy; zwracamy nazwę pliku i wymiary. */
export async function zapiszObraz(slug: string, dane: Buffer, nazwaOryg: string, przedrostek: string, maks = 6000): Promise<{ plik: string; szer: number; wys: number }> {
    const roz = (nazwaOryg.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase()
    const id = `${przedrostek}-${Date.now().toString(36)}${randomBytes(3).toString('hex')}`
    let wynik: Buffer = dane, rozW = roz === 'jpeg' ? 'jpg' : roz, szer = 0, wys = 0
    try {
        const sharp = (await import('sharp')).default
        const obraz = sharp(dane, { limitInputPixels: 400_000_000 }).rotate()
        const meta = await obraz.metadata()
        szer = meta.width ?? 0; wys = meta.height ?? 0
        if (!szer || !wys) throw new Error('to nie jest obraz')
        const duzy = Math.max(szer, wys) > maks
        if (duzy || !['jpg', 'png', 'webp'].includes(rozW)) {
            const k = duzy ? maks / Math.max(szer, wys) : 1
            szer = Math.round(szer * k); wys = Math.round(wys * k)
            wynik = await obraz.resize(szer, wys).webp({ quality: 86 }).toBuffer()
            rozW = 'webp'
        } else {
            // zawsze ponowny zapis bez metadanych (audyt nr 2, AUD-P-02): sharp domyślnie nie przenosi EXIF – także GPS z telefonu;
            // .rotate() wyżej utrwala orientację w pikselach, więc obraz wygląda tak samo
            wynik = rozW === 'png' ? await obraz.png().toBuffer() : rozW === 'webp' ? await obraz.webp({ quality: 90 }).toBuffer() : await obraz.jpeg({ quality: 90, mozjpeg: true }).toBuffer()
            const m2 = await sharp(wynik).metadata(); szer = m2.width ?? szer; wys = m2.height ?? wys
        }
    } catch (e) {
        if (!['jpg', 'png', 'webp'].includes(rozW)) throw new Error('Nie udało się odczytać obrazu. Wgraj JPG, PNG, WebP albo TIFF.')
        if (e instanceof Error && e.message === 'to nie jest obraz') throw e
    }
    const plik = `${id}.${rozW}`
    const p = sciezkaPliku(slug, plik)
    if (!p) throw new Error('zła nazwa pliku')
    await zapiszAtomowo(p, wynik)
    return { plik, szer, wys }
}

// ---------- kosz plików planów (etap 1, CEM-23): podkłady i zdjęcia – 30 dni zamiast natychmiastowego usunięcia ----------
//   pliki-archiwum/plany/_kosz/<czas ms>~<slug>~<plik>   (katalog _kosz nie pasuje do SLUG – nie da się go pobrać z zewnątrz)
const KOSZ_PLIKOW = () => path.join(/*turbopackIgnore: true*/ PLIKI(), '_kosz')
export const DNI_KOSZA_PLIKOW = 30
const NAZWA_W_KOSZU = /^(\d{12,})~([a-z0-9]+(?:-[a-z0-9]+)*)~([\w-]+(?:\.[\w-]+)*)$/
export interface PlikWKoszu { nazwa: string; slug: string; plik: string; czas: string }

function zKosza(nazwa: string): PlikWKoszu | null {
    const m = nazwa.match(NAZWA_W_KOSZU)
    return m ? { nazwa, slug: m[2], plik: m[3], czas: new Date(+m[1]).toISOString() } : null
}

/** Usunięcie podkładu albo zdjęcia: plik idzie do kosza na 30 dni. */
export async function usunPlik(slug: string, plik: string, teraz = Date.now()) {
    const p = sciezkaPliku(slug, plik)
    if (!p || slug === '_ikony') { if (p) await fs.promises.unlink(p).catch(() => {}); return }
    await fs.promises.mkdir(KOSZ_PLIKOW(), { recursive: true })
    await fs.promises.rename(p, path.join(/*turbopackIgnore: true*/ KOSZ_PLIKOW(), `${teraz}~${slug}~${plik}`)).catch(() => {})
    await wyczyscKoszPlikow(teraz)
}

export async function listaKoszaPlikow(): Promise<PlikWKoszu[]> {
    let L: string[] = []
    try { L = await fs.promises.readdir(KOSZ_PLIKOW()) } catch { return [] }
    return L.map(zKosza).filter((x): x is PlikWKoszu => !!x).sort((a, b) => b.czas.localeCompare(a.czas))
}

/** Usuwa na stałe pliki starsze niż 30 dni. */
export async function wyczyscKoszPlikow(teraz = Date.now()): Promise<number> {
    let n = 0
    for (const k of await listaKoszaPlikow()) {
        if (teraz - Date.parse(k.czas) <= DNI_KOSZA_PLIKOW * 864e5) continue
        await fs.promises.unlink(path.join(/*turbopackIgnore: true*/ KOSZ_PLIKOW(), k.nazwa)).catch(() => {}); n++
    }
    return n
}

/** Przywraca plik z kosza na dawne miejsce; błąd, gdy tam już coś jest. */
export async function przywrocPlikZKosza(nazwa: string): Promise<string | null> {
    const k = zKosza(nazwa)
    if (!k) return 'zła nazwa pliku'
    const cel = sciezkaPliku(k.slug, k.plik)
    if (!cel) return 'zła nazwa pliku'
    try { await fs.promises.access(cel); return 'pod tą nazwą jest już inny plik' } catch { /* wolne */ }
    await fs.promises.mkdir(path.dirname(cel), { recursive: true })
    try { await fs.promises.rename(path.join(/*turbopackIgnore: true*/ KOSZ_PLIKOW(), nazwa), cel) } catch { return 'nie ma już tego pliku' }
    return null
}

export async function usunPlikZKosza(nazwa: string): Promise<string | null> {
    if (!zKosza(nazwa)) return 'zła nazwa pliku'
    await fs.promises.unlink(path.join(/*turbopackIgnore: true*/ KOSZ_PLIKOW(), nazwa)).catch(() => {})
    return null
}

/** Pliki, do których plan się odwołuje (podkłady, zdjęcia). */
export function plikiPlanu(plan: Pick<Plan, 'podklady' | 'elementy'>): Set<string> {
    const L = new Set<string>()
    for (const p of plan.podklady) L.add(p.plik)
    for (const e of plan.elementy) for (const z of e.zdjecia ?? []) L.add(z.plik)
    return L
}

/** Po zapisie planu: plik, do którego plan znów się odwołuje (np. po „cofnij”), wraca z kosza sam. */
export async function przywrocBrakujacePliki(plan: Pick<Plan, 'slug' | 'podklady' | 'elementy'>): Promise<string[]> {
    const brak: string[] = []
    for (const plik of plikiPlanu(plan)) {
        const p = sciezkaPliku(plan.slug, plik)
        if (!p) continue
        try { await fs.promises.access(p) } catch { brak.push(plik) }
    }
    if (!brak.length) return []
    const kosz = await listaKoszaPlikow(), wyn: string[] = []
    for (const plik of brak) {
        const k = kosz.find((x) => x.slug === plan.slug && x.plik === plik) // najnowszy pierwszy
        if (k && !(await przywrocPlikZKosza(k.nazwa))) wyn.push(plik)
    }
    return wyn
}

// ---------- zapis z kontrolą wersji (jeden zapis planu naraz) ----------
const kolejki = new Map<string, Promise<unknown>>()
/** Wykonuje f po zakończeniu poprzednich operacji na tym planie (sprawdzenie wersji i zapis bez wyścigu). */
export function poKolei<T>(slug: string, f: () => Promise<T>): Promise<T> {
    const poprz = kolejki.get(slug) ?? Promise.resolve()
    const nast = poprz.catch(() => {}).then(f)
    kolejki.set(slug, nast)
    nast.finally(() => { if (kolejki.get(slug) === nast) kolejki.delete(slug) }).catch(() => {})
    return nast
}

/** Zapis z edytora: wersja z przeglądarki musi zgadzać się z zapisaną, inaczej konflikt (409) z wersją z serwera. */
export async function zapiszZWersja(d: Plan): Promise<{ konflikt: Plan } | { plan: Plan; przywrocone: string[] }> {
    return poKolei(d.slug, async () => {
        const obecny = await wczytajPlan(d.slug)
        if (obecny && obecny.wersja !== d.wersja) return { konflikt: obecny }
        const plan = await zapiszPlan(popraw({ ...d, wersja: (obecny?.wersja ?? 0) + 1 }))
        return { plan, przywrocone: await przywrocBrakujacePliki(plan) }
    })
}

// ---------- szkic awaryjny na serwerze (zamiast całego planu w localStorage) ----------
//   pliki-archiwum/plany/_szkice/<slug>.json – zapisywany, gdy zapis planu się nie udał (konflikt, błąd serwera)
const SZKICE = () => path.join(/*turbopackIgnore: true*/ PLIKI(), '_szkice')
export interface Szkic { czas: string; wersjaBazowa: number; plan: Plan }

export async function zapiszSzkic(slug: string, plan: Plan): Promise<Szkic> {
    if (!SLUG.test(slug)) throw new Error('zły identyfikator planu')
    const s: Szkic = { czas: new Date().toISOString(), wersjaBazowa: plan.wersja, plan: popraw({ ...plan, slug }) }
    await zapiszAtomowo(path.join(/*turbopackIgnore: true*/ SZKICE(), `${slug}.json`), JSON.stringify(s))
    return s
}

export async function wczytajSzkic(slug: string): Promise<Szkic | null> {
    if (!SLUG.test(slug)) return null
    try { return JSON.parse(await fs.promises.readFile(path.join(/*turbopackIgnore: true*/ SZKICE(), `${slug}.json`), 'utf8')) as Szkic } catch { return null }
}

export async function usunSzkic(slug: string) {
    if (!SLUG.test(slug)) return
    await fs.promises.unlink(path.join(/*turbopackIgnore: true*/ SZKICE(), `${slug}.json`)).catch(() => {})
}

// ---------- zgłoszenia czytelników ----------
export interface Zgloszenie {
    id: string
    /** prosba – usunięcie albo poprawka; informacja – czytelnik zna osobę, ma zdjęcie itp. */
    rodzaj?: 'prosba' | 'informacja'
    plan: string
    element: string
    opisElementu: string
    tresc: string
    kontakt: string
    data: string
}

export async function zapiszZgloszenie(z: Omit<Zgloszenie, 'id' | 'data'>) {
    const id = `${Date.now()}-${randomBytes(3).toString('hex')}`
    await zapiszAtomowo(path.join(KATALOG(), '_zgloszenia', `${id}.json`), JSON.stringify({ ...z, id, data: new Date().toISOString() }, null, 1))
}

export async function listaZgloszen(): Promise<Zgloszenie[]> {
    const k = path.join(KATALOG(), '_zgloszenia')
    let pliki: string[] = []
    try { pliki = await fs.promises.readdir(k) } catch { return [] }
    const wyn: Zgloszenie[] = []
    for (const p of pliki) if (p.endsWith('.json')) { try { wyn.push(JSON.parse(await fs.promises.readFile(path.join(k, p), 'utf8'))) } catch { /* pomiń */ } }
    return wyn.sort((a, b) => b.data.localeCompare(a.data))
}

export async function usunZgloszenie(id: string) {
    if (!/^\d+-[0-9a-f]+$/.test(id)) return
    await fs.promises.unlink(path.join(KATALOG(), '_zgloszenia', `${id}.json`)).catch(() => {})
}

// ---------- ochrona edycji ----------
/**
 * Edytor i jego API leżą pod /keystatic i /api/keystatic – tam, gdzie panel Keystatic, chroniony hasłem w nginx.
 * Dodatkowo: zapis tylko z tej samej strony (nagłówek Origin / Sec-Fetch-Site) i tylko gdy przeglądarka
 * przysłała dane logowania nginx (Authorization). Wyłączenie drugiego warunku: PLANY_BEZ_HASLA_NGINX=1 w .env.local.
 */
export function brakDostepu(req: Request): Response | null {
    const site = req.headers.get('sec-fetch-site')
    if (site && site !== 'same-origin' && site !== 'none') return new Response('Zabronione', { status: 403 })
    const origin = req.headers.get('origin'), host = req.headers.get('x-forwarded-host') || req.headers.get('host')
    if (origin && host && new URL(origin).host !== host) return new Response('Zabronione', { status: 403 })
    if (process.env.NODE_ENV === 'production' && process.env.PLANY_BEZ_HASLA_NGINX !== '1' && !req.headers.get('authorization')) {
        return new Response('Edytor planów wymaga hasła panelu (nginx auth_basic dla /keystatic i /api/keystatic).', { status: 401 })
    }
    return null
}
