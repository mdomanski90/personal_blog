/** Paczka 6B — zbiorcza, niedestrukcyjna kontrola kompletności danych.
 * Brak pola jest wskazówką redakcyjną, nie dowodem błędu historycznego.
 * Nigdy nie zapisujemy do plików rekordów Keystatic.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import matter from 'gray-matter'
import { wczytajPrzekierowania, celPrzekierowania, RODZAJE_PRZEKIEROWAN, type Przekierowanie } from '../przekierowania'
import { normalizuj } from '../tekst'
import { objasnieniaMaterialu } from '../objasnienia'

export type StanUwagi = 'aktywne' | 'odlozone' | 'ignorowane'
export type UwagaJakosci = {
    id: string; kolekcja: string; rekord: string; tytul: string; regula: string
    opis: string; wskazowka: string; edytuj: string; stan: StanUwagi; notatka: string
}
type Decyzja = { stan: Exclude<StanUwagi, 'aktywne'>; notatka: string; data: string }
type Pamiec = { wersja: 1; decyzje: Record<string, Decyzja> }
const REGULY = [
    'bez-opisu', 'brak-wspolrzednych', 'brak-zrodla-opisu', 'przynaleznosc-bez-dat',
    'brak-miejscowosci', 'brak-siedziby', 'brak-pochodzenia', 'brak-praw',
    'brak-lat', 'brak-archiwum', 'brak-sygnatury', 'brak-autora',
    'brak-roku', 'brak-linku', 'brak-definicji', 'brak-instytucji',
    'relacja-do-nieistniejacego', 'przekierowanie-bledne'
] as const
const KOLEKCJE = ['posts', 'miejsca', 'tematy', 'obiekty', 'materialy', 'zbiory', 'publikacje', 'parafie', 'hasla', 'biogramy', 'zespoly', 'ksiegi'] as const
const DB = () => path.join(process.cwd(), 'content', '_panel', 'jakosc.json')
const base = () => path.join(process.cwd(), 'content')
const PUSTA: Pamiec = { wersja: 1, decyzje: {} }
const ma = (x: unknown): boolean => {
    if (x == null || x === '') return false
    if (typeof x === 'string') return x.trim().length > 0
    if (Array.isArray(x)) return x.length > 0
    return true
}
const nazwa = (x: unknown): string => {
    if (typeof x === 'string') return x.trim()
    if (x && typeof x === 'object' && 'name' in x && typeof x.name === 'string') return x.name
    return ''
}
const pole = (d: Record<string, unknown>, ...k: string[]) => k.some(x => ma(d[x]))
const key = (kolekcja: string, rekord: string, regula: string, pozycja?: number) => `${kolekcja}:${rekord}:${regula}${pozycja !== undefined ? `:${pozycja}` : ''}`
const prawidloweId = (s: string) => /^[a-z0-9][a-z0-9_-]{0,130}$/.test(s)

async function pamiec(): Promise<Pamiec> {
    try {
        const j: unknown = JSON.parse(await fs.readFile(DB(), 'utf8'))
        if (j && typeof j === 'object' && 'wersja' in j && j.wersja === 1 && 'decyzje' in j && j.decyzje && typeof j.decyzje === 'object' && !Array.isArray(j.decyzje)) return j as Pamiec
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e }
    return { wersja: 1, decyzje: {} }
}

async function rekordy(kolekcja: typeof KOLEKCJE[number]): Promise<{ slug: string; d: Record<string, unknown>; tekst: string }[]> {
    const folder = path.join(base(), kolekcja)
    let files: string[]
    try { files = await fs.readdir(folder) } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
        throw e
    }
    const result: { slug: string; d: Record<string, unknown>; tekst: string }[] = []
    for (const file of files.slice(0, 30000)) {
        if (!/\.(mdoc|yaml|yml|json)$/.test(file)) continue
        const slug = file.replace(/\.(mdoc|yaml|yml|json)$/, '')
        if (!prawidloweId(slug)) continue
        const f = path.join(/*turbopackIgnore: true*/ folder, file)
        const st = await fs.stat(f)
        if (!st.isFile() || st.size > 2_000_000) continue
        const content = await fs.readFile(f, 'utf8')
        let d: Record<string, unknown>, tekst = ''
        try {
            if (file.endsWith('.json')) d = JSON.parse(content) as Record<string, unknown>
            else if (file.endsWith('.mdoc')) { const m = matter(content); d = m.data as Record<string, unknown>; tekst = m.content.trim() }
            else d = matter(`---\n${content}\n---\n`).data as Record<string, unknown>
        } catch { continue /* nie zmieniaj ani nie zgaduj błędnych danych */ }
        result.push({ slug, d, tekst })
    }
    return result
}

/**
 * Etap 0C (audyt nr 2, REL-06): pola powiązań → kolekcja docelowa. „[]” = pole listy, „x[].y” = pole w liście obiektów.
 * Zgodne z keystatic.config.ts; nowe pole powiązania trzeba tu dopisać (test sprawdza zgodność).
 */
export const POWIAZANIA: Record<string, [string, string][]> = {
    posts: [['spatial[]', 'miejsca'], ['subject[]', 'tematy'], ['cover', 'materialy']],
    miejsca: [['isPartOf', 'miejsca'], ['parishes[].parish', 'parafie']],
    tematy: [['spatial[]', 'miejsca']],
    obiekty: [['spatial', 'miejsca'], ['spatialAlso[]', 'miejsca'], ['institutions[].parish', 'parafie']],
    materialy: [['spatial[]', 'miejsca'], ['subject[]', 'tematy'], ['relation[]', 'obiekty'], ['collections[]', 'zbiory'], ['institutions[]', 'parafie']],
    publikacje: [['spatial[]', 'miejsca'], ['subject[]', 'tematy']],
    parafie: [['seat', 'miejsca']],
    ksiegi: [['fonds', 'zespoly'], ['parish', 'parafie'], ['relatedParishes[]', 'parafie'], ['spatial[]', 'miejsca']],
}
const NAZWY_POL: Record<string, string> = { spatial: 'miejsca', spatialAlso: 'także w miejscowościach', subject: 'tematy', cover: 'miniatura', isPartOf: 'należy do', parishes: 'parafie', institutions: 'instytucje', relation: 'przedstawia obiekty', collections: 'zbiory', seat: 'siedziba', fonds: 'zespół', parish: 'instytucja główna', relatedParishes: 'pozostałe instytucje' }
const KOLEKCJA_RODZAJU: Record<string, string> = { miejsca: 'miejsca', parafie: 'parafie', obiekty: 'obiekty', tematy: 'tematy', wpisy: 'posts', archiwum: 'materialy' }
const RODZAJ_KOLEKCJI: Record<string, string> = Object.fromEntries(Object.entries(KOLEKCJA_RODZAJU).map(([r, k]) => [k, r]))

/** Wartości pola powiązania z rekordu (obsługa „a[]” i „a[].b”). */
export function wartosciPola(d: Record<string, unknown>, sciezka: string): string[] {
    const [glowa, ogon] = sciezka.split('[].')
    if (ogon !== undefined) return Array.isArray(d[glowa]) ? (d[glowa] as unknown[]).flatMap((x) => x && typeof x === 'object' && typeof (x as Record<string, unknown>)[ogon] === 'string' ? [(x as Record<string, string>)[ogon]] : []) : []
    const k = sciezka.replace('[]', ''), v = d[k]
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    return typeof v === 'string' && v.trim() ? [v] : []
}

export async function uwagiJakosci(): Promise<UwagaJakosci[]> {
    const stany = await pamiec()
    const wynik: UwagaJakosci[] = []
    const wszystkie = new Map<string, Awaited<ReturnType<typeof rekordy>>>()
    for (const k of KOLEKCJE) wszystkie.set(k, await rekordy(k))
    const istnieje = new Map([...wszystkie].map(([k, l]) => [k, new Set(l.map((r) => r.slug))]))
    const przekierowania = await wczytajPrzekierowania()
    for (const kolekcja of KOLEKCJE) {
        const lista = wszystkie.get(kolekcja)!
        for (const r of lista) {
            const d = r.d
            const tytul = nazwa(d.title) || nazwa(d.name) || r.slug
            const maOpis = Boolean(r.tekst.trim()) || pole(d, 'description', 'content', 'meaning')
            const dodaj = (regula: typeof REGULY[number], opis: string, wskazowka: string, pozycja?: number) => {
                const id = key(kolekcja, r.slug, regula, pozycja)
                const dec = stany.decyzje[id]
                wynik.push({ id, kolekcja, rekord: r.slug, tytul, regula, opis, wskazowka,
                    edytuj: `/keystatic/collection/${kolekcja}/item/${encodeURIComponent(r.slug)}`,
                    stan: dec?.stan ?? 'aktywne', notatka: dec?.notatka ?? '' })
            }
            if (['miejsca', 'obiekty', 'posts', 'tematy', 'zbiory', 'biogramy'].includes(kolekcja) && !maOpis)
                dodaj('bez-opisu', 'Brak opisu', 'Dodaj opis albo świadomie zignoruj, jeżeli informacji nie ustalono.')
            if (kolekcja === 'miejsca') {
                if (!pole(d, 'coordinates') && ['wies', 'miasto', 'folwark'].includes(String(d.type ?? 'wies')))
                    dodaj('brak-wspolrzednych', 'Brak współrzędnych', 'Bez współrzędnych miejscowość nie pojawi się prawidłowo na mapie.')
                if (maOpis && !pole(d, 'descriptionSource', 'sources')) dodaj('brak-zrodla-opisu', 'Opis bez podanego źródła', 'Wskaż źródło informacji, jeżeli jest znane.')
                if (Array.isArray(d.parishes)) d.parishes.forEach((p, i) => {
                    if (p && typeof p === 'object') {
                        const x = p as Record<string, unknown>
                        if (ma(x.parish) && !ma(x.from) && !ma(x.to))
                            dodaj('przynaleznosc-bez-dat', 'Nieustalony okres przynależności', 'Nie zgaduj dat. Możesz oznaczyć je jako nieznane i zignorować tę uwagę.', i)
                    }
                })
            }
            if (kolekcja === 'obiekty') {
                if (!pole(d,'coordinates')) dodaj('brak-wspolrzednych', 'Brak współrzędnych obiektu', 'Uzupełnij, jeśli znane.')
                if (!pole(d,'spatial')) dodaj('brak-miejscowosci', 'Obiekt bez przypisanej miejscowości', 'Powiąż obiekt z miejscowością.')
            }
            if (kolekcja === 'parafie') {
                if (!pole(d,'seat')) dodaj('brak-siedziby', 'Brak siedziby instytucji', 'Wybierz miejscowość, o ile siedziba jest znana.')
                if (!maOpis) dodaj('bez-opisu', 'Brak historii instytucji', 'Uzupełnij historię lub świadomie odrzuć uwagę.')
            }
            if (kolekcja === 'materialy') {
                if (!pole(d,'source','provenance')) dodaj('brak-pochodzenia','Nie opisano pochodzenia materiału','Ustal pochodzenie i miejsce przechowania, o ile możliwe.')
                if (!pole(d,'rights')) dodaj('brak-praw','Nie określono praw do materiału','Zweryfikuj prawa i zakres udostępnienia; nie publikuj bez kontroli.')
            }
            if (kolekcja === 'zbiory' && !pole(d,'provenance')) dodaj('brak-pochodzenia','Brak informacji o pochodzeniu zbioru','Uzupełnij pochodzenie, jeśli znane.')
            if (kolekcja === 'publikacje') {
                if (!pole(d,'creator') && String(d.type)!=='baza') dodaj('brak-autora','Brak autora / redakcji','W niektórych publikacjach autor pozostaje nieustalony.')
                if (!pole(d,'year') && String(d.type)!=='baza') dodaj('brak-roku','Brak roku wydania','Uzupełnij lub zignoruj, jeśli nieznany.')
                if (!pole(d,'url')) dodaj('brak-linku','Brak adresu publikacji lub katalogu','Link jest opcjonalny przy materiałach niedostępnych online.')
            }
            if (kolekcja === 'ksiegi') {
                if (!pole(d,'years') && !pole(d,'volumes')) dodaj('brak-lat','Brak zakresu lat i tomów','Sprawdź czy znane są lata jednostek.')
                if (!pole(d,'repository')) dodaj('brak-archiwum','Brak miejsca przechowywania','Uzupełnij archiwum lub inną instytucję przechowującą.')
                if (!pole(d,'identifier','fonds') && !pole(d,'volumes')) dodaj('brak-sygnatury','Brak identyfikatora księgi','Ustal sygnaturę lub powiąż z zespołem.')
            }
            for (const [sciezka, cel] of POWIAZANIA[kolekcja] ?? []) {
                const zbior = istnieje.get(cel)
                if (!zbior) continue
                wartosciPola(d, sciezka).forEach((id, i) => {
                    if (zbior.has(id)) return
                    const rodzaj = RODZAJ_KOLEKCJI[cel], nowy = rodzaj ? celPrzekierowania(przekierowania, rodzaj, id) : null
                    const pole_ = NAZWY_POL[sciezka.split('[')[0]] ?? sciezka
                    dodaj('relacja-do-nieistniejacego', `Powiązanie „${pole_}” wskazuje „${id}”, którego nie ma`,
                        nowy ? `W przekierowaniach: „${id}” → „${nowy}”. Wybierz nowy wpis w tym polu.` : 'Identyfikator zmieniono albo wpis usunięto. Wybierz właściwy wpis w tym polu albo usuń powiązanie.', i + 100 * (POWIAZANIA[kolekcja].findIndex((x) => x[0] === sciezka)))
                })
            }
            if (kolekcja === 'hasla' && !pole(d,'meaning')) dodaj('brak-definicji','Hasło bez definicji','Uzupełnij znaczenie słowa.')
            if (kolekcja === 'zespoly' && !pole(d,'repository')) dodaj('brak-archiwum','Brak instytucji przechowującej','Uzupełnij archiwum.')
        }
    }
    // PH3 (decyzja 16.11): elementy planów – powiązania [[…]] i podstawa (materiał, objaśnienie) wskazujące nieistniejące pozycje
    const cele = kluczeCelow(wszystkie, await osobyIstniejace())
    for (const plan of await planyDoKontroli()) {
        for (const u of uwagiPlanu(plan, {
            cel: (t) => cele.has(kluczCelu(t)),
            material: (id) => istnieje.get('materialy')!.has(id),
            objasnienie: (mat, id) => objasnieniaMaterialu(mat).some((o) => o.id === id),
        }, przekierowania, (rodzaj, id) => istnieje.get(KOLEKCJA_RODZAJU[rodzaj])?.has(id) ?? false)) {
            const dec = stany.decyzje[u.id]
            wynik.push({ ...u, stan: dec?.stan ?? 'aktywne', notatka: dec?.notatka ?? '' })
        }
    }
    // tabela przekierowań: nowy musi istnieć, stary nie może istnieć (inaczej przekierowanie nigdy nie zadziała)
    przekierowania.forEach((w, i) => {
        const kol = KOLEKCJA_RODZAJU[w.rodzaj]
        const zbior = kol ? istnieje.get(kol) : undefined
        if (!zbior) return
        const id = key('przekierowania', w.stary || String(i), 'przekierowanie-bledne', i)
        const dodaj = (opis: string, wskazowka: string) => {
            const dec = stany.decyzje[id]
            wynik.push({ id, kolekcja: 'przekierowania', rekord: w.stary, tytul: `${RODZAJE_PRZEKIEROWAN[w.rodzaj as keyof typeof RODZAJE_PRZEKIEROWAN]?.etykieta ?? w.rodzaj}: ${w.stary} → ${w.nowy}`, regula: 'przekierowanie-bledne', opis, wskazowka,
                edytuj: '/keystatic/singleton/przekierowania', stan: dec?.stan ?? 'aktywne', notatka: dec?.notatka ?? '' })
        }
        const cel = celPrzekierowania(przekierowania, w.rodzaj, w.stary)
        if (zbior.has(w.stary)) dodaj('Stary identyfikator nadal istnieje', 'Przekierowanie nie zadziała, dopóki wpis o starym identyfikatorze istnieje. Usuń wpis z tabeli albo zmień identyfikator.')
        else if (!cel || !zbior.has(cel)) dodaj('Nowy identyfikator nie istnieje', 'Wpisz identyfikator istniejącego wpisu – inaczej stary adres nadal da „nie znaleziono”.')
    })
    return wynik.sort((a,b) => a.kolekcja.localeCompare(b.kolekcja,'pl') || a.tytul.localeCompare(b.tytul,'pl') || a.regula.localeCompare(b.regula,'pl'))
}

/** Akcja tylko dla istniejącego ostrzeżenia, aby nie dało się zapisać arbitralnego klucza. */
export async function stanUwagi(id: string, stan: StanUwagi, notatka: string): Promise<boolean> {
    if (id.length > 260 || !['aktywne', 'odlozone','ignorowane'].includes(stan)) return false
    const aktualne = await uwagiJakosci()
    if (!aktualne.some(x => x.id === id)) return false
    const db = await pamiec()
    if (stan === 'aktywne') delete db.decyzje[id]
    else db.decyzje[id] = { stan, notatka: notatka.slice(0,800), data: new Date().toISOString() }
    const plik = DB()
    await fs.mkdir(path.dirname(plik), { recursive: true, mode: 0o750 })
    const tmp = `${plik}.${randomBytes(6).toString('hex')}.tmp`
    try {
        await fs.writeFile(tmp, JSON.stringify(db, null, 2)+'\n', { mode: 0o640, flag: 'wx' })
        await fs.rename(tmp, plik)
    } finally { await fs.unlink(tmp).catch(() => {}) }
    return true
}

// ---------- PH3: elementy planów (decyzja właściciela 16.11, ankieta 17.11 – tylko plany) ----------

const PRZYIMEK = /^(w|we|z|ze|do|na|od|po|pod|przy|nad|ku|koło)\s/i
/** Klucz porównania celu [[…]] – jak w słowniku odnośników (lib/odnosniki.ts): bez przyimka, bez znaków diakrytycznych. */
export const kluczCelu = (t: string) => normalizuj(t.replace(PRZYIMEK, '').trim())

/**
 * Wszystkie cele [[…]] istniejące w danych BEZ WZGLĘDU NA WIDOCZNOŚĆ (karta ukryta istnieje – to nie błąd powiązania):
 * identyfikatory, nazwy, inne nazwy i formy odmiany miejsc, tematów, obiektów, wpisów, materiałów oraz osoby (id, imiona i nazwisko).
 */
function kluczeCelow(wszystkie: Map<string, { slug: string; d: Record<string, unknown> }[]>, osoby: { id: string; nazwa: string }[]): Set<string> {
    const k = new Set<string>()
    const dodaj = (t: unknown) => { if (typeof t === 'string' && t.trim()) k.add(kluczCelu(t)) }
    for (const kol of ['miejsca', 'tematy', 'obiekty', 'posts', 'materialy']) for (const r of wszystkie.get(kol) ?? []) {
        dodaj(r.slug); dodaj(nazwa(r.d.title)); dodaj(nazwa(r.d.name))
        for (const pole of ['alternative', 'inflections']) if (Array.isArray(r.d[pole])) (r.d[pole] as unknown[]).forEach(dodaj)
    }
    for (const o of osoby) { dodaj(o.id); dodaj(o.nazwa) }
    return k
}

async function osobyIstniejace(): Promise<{ id: string; nazwa: string }[]> {
    const kat = path.join(base(), 'osoby')
    let pliki: string[]
    try { pliki = await fs.readdir(kat) } catch { return [] }
    const wyn: { id: string; nazwa: string }[] = []
    for (const f of pliki.slice(0, 50000)) {
        if (!f.endsWith('.json') || f.startsWith('_')) continue
        const id = f.slice(0, -5)
        try {
            const o = JSON.parse(await fs.readFile(path.join(/*turbopackIgnore: true*/ kat, f), 'utf8')) as { imiona?: string; nazwisko?: string }
            wyn.push({ id, nazwa: `${o.imiona ?? ''} ${o.nazwisko ?? ''}`.trim() })
        } catch { wyn.push({ id, nazwa: '' }) }
    }
    return wyn
}

type ElementDoKontroli = { id: string; typ?: string; nazwa?: string; powiazania?: unknown; podstawa?: unknown }
export type PlanDoKontroli = { slug: string; tytul: string; elementy: ElementDoKontroli[] }

async function planyDoKontroli(): Promise<PlanDoKontroli[]> {
    const kat = path.join(base(), 'plany')
    let pliki: string[]
    try { pliki = await fs.readdir(kat) } catch { return [] }
    const wyn: PlanDoKontroli[] = []
    for (const f of pliki) {
        if (!f.endsWith('.json') || f.startsWith('_')) continue
        const slug = f.slice(0, -5)
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) continue
        try {
            const p = JSON.parse(await fs.readFile(path.join(/*turbopackIgnore: true*/ kat, f), 'utf8')) as { tytul?: string; elementy?: unknown }
            wyn.push({ slug, tytul: typeof p.tytul === 'string' && p.tytul.trim() ? p.tytul : slug, elementy: Array.isArray(p.elementy) ? (p.elementy as ElementDoKontroli[]).filter((e) => e && typeof e.id === 'string') : [] })
        } catch { continue /* uszkodzony plik – nie zgadujemy */ }
    }
    return wyn
}

const RODZAJE_CELU = ['miejsca', 'tematy', 'obiekty', 'wpisy', 'archiwum'] as const

/**
 * Uwagi dla jednego planu (czysta funkcja – testy). Osobno: powiązanie [[…]] z kartą, materiał podstawy, objaśnienie podstawy
 * (materiał istnieje, objaśnienia na nim brak). Odnośnik do edytora z zaznaczonym elementem (?el=). Podpowiedź z tabeli
 * przekierowań tylko wtedy, gdy cel jest jednoznaczny (dla [[…]] rodzaj nie jest zapisany – sprawdzamy wszystkie rodzaje).
 */
export function uwagiPlanu(
    plan: PlanDoKontroli,
    jest: { cel: (t: string) => boolean; material: (id: string) => boolean; objasnienie: (material: string, id: string) => boolean },
    przekierowania: Przekierowanie[],
    istniejeWRodzaju: (rodzaj: string, id: string) => boolean,
): Omit<UwagaJakosci, 'stan' | 'notatka'>[] {
    const wyn: Omit<UwagaJakosci, 'stan' | 'notatka'>[] = []
    const edytuj = (e: ElementDoKontroli) => `/keystatic/plany/${encodeURIComponent(plan.slug)}?el=${encodeURIComponent(e.id)}`
    const podpis = (e: ElementDoKontroli) => `Element ${e.nazwa?.trim() ? `„${e.nazwa.split('\n').join(' ').trim()}”` : `${e.typ ?? ''} ${e.id}`.trim()}`
    const nowyDla = (rodzaje: readonly string[], id: string) => [...new Set(rodzaje.map((r) => celPrzekierowania(przekierowania, r, id)).filter((x): x is string => !!x && x !== id))]
        .filter((n) => rodzaje.some((r) => istniejeWRodzaju(r, n)))
    const dodaj = (e: ElementDoKontroli, czesc: string, cel: string, opis: string, wskazowka: string) => wyn.push({
        id: `plany:${plan.slug}:relacja-do-nieistniejacego:${e.id}:${czesc}:${kluczCelu(cel).slice(0, 80)}`,
        kolekcja: 'plany', rekord: plan.slug, tytul: plan.tytul, regula: 'relacja-do-nieistniejacego', opis, wskazowka, edytuj: edytuj(e),
    })
    for (const e of plan.elementy) {
        for (const c of Array.isArray(e.powiazania) ? e.powiazania : []) {
            if (typeof c !== 'string' || !c.trim() || jest.cel(c)) continue
            const nowy = nowyDla(RODZAJE_CELU, c.trim())
            dodaj(e, 'powiazanie', c, `${podpis(e)}: powiązanie [[${c.trim()}]] wskazuje kartę, której nie ma`,
                nowy.length === 1 ? `W przekierowaniach: „${c.trim()}” → „${nowy[0]}”. Otwórz edytor planu i wybierz „${nowy[0]}” w powiązaniach elementu.` : 'Identyfikator zmieniono albo kartę usunięto. W edytorze planu (źródło i powiązania) wybierz właściwą kartę albo usuń powiązanie.')
        }
        for (const q of Array.isArray(e.podstawa) ? e.podstawa : []) {
            const m = q && typeof q === 'object' ? (q as { material?: unknown; objasnienie?: unknown }) : null
            if (!m || typeof m.material !== 'string' || !m.material) continue
            if (!jest.material(m.material)) {
                const nowy = nowyDla(['archiwum'], m.material)
                dodaj(e, 'material', m.material, `${podpis(e)}: podstawa wskazuje materiał „${m.material}”, którego nie ma w archiwum`,
                    nowy.length === 1 ? `W przekierowaniach: „${m.material}” → „${nowy[0]}”. W edytorze planu wybierz ten materiał w podstawie elementu.` : 'W edytorze planu (źródło i powiązania) wybierz właściwy materiał albo usuń podstawę.')
            } else if (typeof m.objasnienie === 'string' && m.objasnienie && !jest.objasnienie(m.material, m.objasnienie)) {
                dodaj(e, 'objasnienie', `${m.material}-${m.objasnienie}`, `${podpis(e)}: podstawa wskazuje objaśnienie ${m.objasnienie}, którego nie ma na skanie „${m.material}”`,
                    'Objaśnienie usunięto w panelu objaśnień materiału. W edytorze planu wybierz inne objaśnienie albo zostaw sam materiał.')
            }
        }
    }
    return wyn
}
