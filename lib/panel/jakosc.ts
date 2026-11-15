/** Paczka 6B — zbiorcza, niedestrukcyjna kontrola kompletności danych.
 * Brak pola jest wskazówką redakcyjną, nie dowodem błędu historycznego.
 * Nigdy nie zapisujemy do plików rekordów Keystatic.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import matter from 'gray-matter'
import { wczytajPrzekierowania, celPrzekierowania, RODZAJE_PRZEKIEROWAN } from '../przekierowania'

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
        const f = path.join(folder, file)
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
    obiekty: [['spatial', 'miejsca'], ['institutions[].parish', 'parafie']],
    materialy: [['spatial[]', 'miejsca'], ['subject[]', 'tematy'], ['relation[]', 'obiekty'], ['collections[]', 'zbiory'], ['institutions[]', 'parafie']],
    publikacje: [['spatial[]', 'miejsca'], ['subject[]', 'tematy']],
    parafie: [['seat', 'miejsca']],
    ksiegi: [['fonds', 'zespoly'], ['parish', 'parafie'], ['relatedParishes[]', 'parafie'], ['spatial[]', 'miejsca']],
}
const NAZWY_POL: Record<string, string> = { spatial: 'miejsca', subject: 'tematy', cover: 'miniatura', isPartOf: 'należy do', parishes: 'parafie', institutions: 'instytucje', relation: 'przedstawia obiekty', collections: 'zbiory', seat: 'siedziba', fonds: 'zespół', parish: 'instytucja główna', relatedParishes: 'pozostałe instytucje' }
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
