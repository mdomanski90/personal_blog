/**
 * KAT-01/02: rejestr numerów katalogowych w content/_panel/katalog.json (nie w plikach treści – Keystatic zapisuje je
 * sam i odrzuca nieznane pola). Zapis atomowy (.tmp → rename) z kontrolą wersji: gdy plik zmienił się od odczytu –
 * KonfliktRejestru (jak 409), nic nie nadpisane. Brak pliku = migracja jeszcze nie wykonana: nadawanie automatyczne
 * jest wyłączone, numery nadaje dopiero `npm run kat:nadaj -- --zapisz` za zgodą właściciela (KAT-02).
 */
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { bledyRejestru, indeks, nowyRejestr, zaplanujNadanie, type Kandydat, type Rejestr, type RodzajKat, type WynikNadania } from './model'

const KATALOG = () => path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', '_panel')
export const PLIK_REJESTRU = () => path.join(/*turbopackIgnore: true*/ KATALOG(), 'katalog.json')

export class KonfliktRejestru extends Error {
    constructor() { super('Rejestr numerów katalogowych zmienił się w trakcie zapisu – nic nie nadpisano, ponów.') }
}

/** Rejestr albo null, gdy migracja nie była jeszcze wykonana. Uszkodzony plik – błąd (nie zaczynamy od zera po cichu). */
export function wczytajRejestr(): Rejestr | null {
    let tekst: string
    try { tekst = fs.readFileSync(/*turbopackIgnore: true*/ PLIK_REJESTRU(), 'utf8') } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw e
    }
    const r = JSON.parse(tekst) as Rejestr
    const b = bledyRejestru(r)
    if (b.length) throw new Error(`Rejestr numerów katalogowych jest niespójny: ${b.slice(0, 5).join('; ')}`)
    return r
}

/**
 * Rejestr zapisują dwa konta: usługa strony (nadanie po zapisie w panelu, umask 0077) i konto wdrożenia (skrypt
 * kat:nadaj, krok --auto przy budowie). Plik dostaje grupę katalogu i prawa rw dla grupy – jak pliki ksiąg
 * (lib/panel/operacje.ts – prawa „grupaKatalogu”); bez tego jedno konto nie odczyta pliku drugiego (lekcja 16.11: EACCES na VPS).
 */
function dostepDlaGrupy(plik: string) {
    const kat = fs.statSync(/*turbopackIgnore: true*/ path.dirname(plik))
    const st = fs.statSync(/*turbopackIgnore: true*/ plik)
    if (st.gid !== kat.gid) { try { fs.chownSync(plik, st.uid, kat.gid) } catch { /* brak prawa do grupy – zostaje grupa konta */ } }
    fs.chmodSync(plik, 0o664)
}

/** Zapis z kontrolą wersji: `oczekiwana` – wersja pliku w chwili odczytu (null = pliku nie było). */
export function zapiszRejestr(r: Rejestr, oczekiwana: number | null): Rejestr {
    const b = bledyRejestru(r)
    if (b.length) throw new Error(`Nie zapisuję niespójnego rejestru: ${b.slice(0, 5).join('; ')}`)
    fs.mkdirSync(KATALOG(), { recursive: true })
    const plik = PLIK_REJESTRU()
    const nowy: Rejestr = { ...r, wersja: (oczekiwana ?? 0) + 1 }
    const tmp = `${plik}.${randomBytes(4).toString('hex')}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(nowy, null, 1) + '\n')
    dostepDlaGrupy(tmp)
    const obecna = (() => { try { return (JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ plik, 'utf8')) as Rejestr).wersja } catch { return null } })()
    if (obecna !== oczekiwana) { fs.rmSync(tmp, { force: true }); throw new KonfliktRejestru() }
    fs.renameSync(tmp, plik)
    pamiec = null
    return nowy
}

/** Kopia rejestru do content/_panel/_kosz (przed migracją i cofnięciem). */
export function kopiaRejestru(opis: string): string | null {
    if (!fs.existsSync(/*turbopackIgnore: true*/ PLIK_REJESTRU())) return null
    const kosz = path.join(/*turbopackIgnore: true*/ KATALOG(), '_kosz')
    fs.mkdirSync(kosz, { recursive: true })
    const cel = path.join(/*turbopackIgnore: true*/ kosz, `katalog-${opis}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
    fs.copyFileSync(PLIK_REJESTRU(), cel)
    return cel
}

let pamiec: { mtime: number; idx: Map<string, string> } | null = null

/** Nr kat. pozycji (null – brak numeru albo brak rejestru). Odczyt z pamięci, odświeżanej po zmianie pliku. */
export function numerKat(rodzaj: RodzajKat, id: string): string | null {
    let mtime = 0
    try { mtime = fs.statSync(/*turbopackIgnore: true*/ PLIK_REJESTRU()).mtimeMs } catch { return null }
    if (!pamiec || pamiec.mtime !== mtime) {
        try { const r = wczytajRejestr(); pamiec = { mtime, idx: r ? indeks(r) : new Map() } } catch { return null }
    }
    return pamiec.idx.get(`${rodzaj}:${id}`) ?? null
}

// ---------- pozycje publiczne ----------

const RODZAJ_PRZEKIEROWANIA: Partial<Record<RodzajKat, string>> = { material: 'archiwum', wpis: 'wpisy', miejsce: 'miejsca', obiekt: 'obiekty', temat: 'tematy', instytucja: 'parafie' }
export const ADRES_RODZAJU: Record<RodzajKat, string> = {
    material: '/archiwum', wpis: '/wpisy', osoba: '/osoby', miejsce: '/miejsca', obiekt: '/obiekty', temat: '/leksykon',
    plan: '/plany', instytucja: '/parafie', zbior: '/archiwum/zbiory', publikacja: '/biblioteka/publikacje',
}
export const adresPozycji = (rodzaj: RodzajKat, id: string) => `${ADRES_RODZAJU[rodzaj]}/${encodeURIComponent(id)}`

// bez daty dodania – po pozycjach z datą (potem alfabetycznie)
const BEZ_DATY = '~'

/**
 * Wszystkie pozycje widoczne dla czytelnika publicznego – tylko one dostają numer (zasada 1.5: dane przefiltrowane
 * tymi samymi funkcjami co strony). Klucz sortu: data dodania (osoby: rok urodzenia), bez daty – na końcu.
 */
export async function kandydaciPubliczni(): Promise<Kandydat[]> {
    const a = await import('../archiwum')
    const { zbiory, publikacje } = await import('../paczka5')
    const { stanOsob } = await import('../osoby/dane')
    const { nazwaOsoby, rokUrodzenia } = await import('../osoby/model')
    const { listaPlanow } = await import('../plany/dane')
    const P = 'publiczne' as const
    const wyn: Kandydat[] = []
    for (const m of await a.materialy(P)) wyn.push({ rodzaj: 'material', id: m.id, nazwa: m.nazwa, sort: m.dodano || BEZ_DATY })
    for (const o of await a.opowiesci(P)) wyn.push({ rodzaj: 'wpis', id: o.id, nazwa: o.tytul, sort: o.data || BEZ_DATY })
    for (const m of await a.miejsca(P)) wyn.push({ rodzaj: 'miejsce', id: m.id, nazwa: m.nazwa, sort: m.dodano || BEZ_DATY })
    for (const o of await a.obiekty(P)) wyn.push({ rodzaj: 'obiekt', id: o.id, nazwa: o.nazwa, sort: o.dodano || BEZ_DATY })
    for (const t of await a.tematy(P)) wyn.push({ rodzaj: 'temat', id: t.id, nazwa: t.nazwa, sort: t.dodano || BEZ_DATY })
    for (const p of await a.parafie()) wyn.push({ rodzaj: 'instytucja', id: p.id, nazwa: p.nazwa, sort: BEZ_DATY })
    for (const z of await zbiory(P)) wyn.push({ rodzaj: 'zbior', id: z.id, nazwa: z.nazwa, sort: BEZ_DATY })
    for (const p of await publikacje(P)) wyn.push({ rodzaj: 'publikacja', id: p.id, nazwa: p.nazwa, sort: BEZ_DATY })
    for (const p of await listaPlanow()) if (a.widoczne(p.widocznosc, P)) wyn.push({ rodzaj: 'plan', id: p.slug, nazwa: p.tytul, sort: BEZ_DATY })
    const s = await stanOsob()
    for (const o of s.drzewo.osoby.values()) {
        if (s.widocznosc(o.id) !== 'publiczne') continue
        const rok = rokUrodzenia(o)
        wyn.push({ rodzaj: 'osoba', id: o.id, nazwa: nazwaOsoby(o), sort: rok != null ? String(rok).padStart(4, '0') : BEZ_DATY })
    }
    return wyn
}

async function funkcjaPrzekierowan(): Promise<(rodzaj: RodzajKat, id: string) => string | null> {
    const { wczytajPrzekierowania, celPrzekierowania } = await import('../przekierowania')
    const lista = await wczytajPrzekierowania()
    return (rodzaj, id) => { const r = RODZAJ_PRZEKIEROWANIA[rodzaj]; return r ? celPrzekierowania(lista, r, id) : null }
}

export interface WynikNadawania extends Omit<WynikNadania, 'rejestr'> { wylaczone: boolean; zapisano: boolean; rejestr: Rejestr | null }

// jedno nadawanie naraz w tym procesie; między procesami chroni kontrola wersji
let kolejka: Promise<unknown> = Promise.resolve()

/**
 * Nadaje brakujące numery pozycjom publicznym. `utworz` – pierwsza migracja (tworzy rejestr); bez niej, gdy rejestru
 * nie ma, nic nie robi (wylaczone). `zapisz: false` – sam podgląd.
 */
export function nadajBrakujace(op: { zapisz: boolean; utworz?: boolean; zbierz?: () => Promise<Kandydat[]>; przekierowania?: (r: RodzajKat, id: string) => string | null; dzis?: string }): Promise<WynikNadawania> {
    const praca = kolejka.then(async (): Promise<WynikNadawania> => {
        const stary = wczytajRejestr()
        if (!stary && !op.utworz) return { wylaczone: true, zapisano: false, rejestr: null, nadane: [], przeniesione: [] }
        const kand = await (op.zbierz ?? kandydaciPubliczni)()
        const przek = op.przekierowania ?? (await funkcjaPrzekierowan())
        const plan = zaplanujNadanie(stary ?? nowyRejestr(), kand, przek, op.dzis ?? new Date().toISOString().slice(0, 10))
        const zmiana = plan.nadane.length > 0 || plan.przeniesione.length > 0 || !stary
        if (!op.zapisz || !zmiana) return { ...plan, wylaczone: false, zapisano: false }
        const zapisany = zapiszRejestr(plan.rejestr, stary ? stary.wersja : null)
        return { ...plan, rejestr: zapisany, wylaczone: false, zapisano: true }
    })
    kolejka = praca.catch(() => undefined)
    return praca
}

/** Po zapisie w panelu: nadanie automatyczne (decyzja 16.11); błąd nie psuje zapisu – trafia do dziennika serwera. */
export async function poZapisieTresci(): Promise<void> {
    try {
        const w = await nadajBrakujace({ zapisz: true })
        if (w.zapisano) console.log(`[katalog] nadano ${w.nadane.length} nr kat.: ${w.nadane.map((x) => x.nr).join(', ')}${w.przeniesione.length ? `; przeniesiono ${w.przeniesione.length}` : ''}`)
    } catch (e) {
        console.error('[katalog] nadawanie numerów nie powiodło się:', e instanceof Error ? e.message : e)
    }
}

/** Opakowanie trasy zapisu w panelu: po udanym zapisie (odpowiedź 2xx) – nadanie brakujących numerów. */
export function zNadaniemNumerow<A extends unknown[]>(f: (...a: A) => Promise<Response>): (...a: A) => Promise<Response> {
    return async (...a: A) => {
        const r = await f(...a)
        if (r.ok) await poZapisieTresci()
        return r
    }
}
