/** Paczka 6B — zbiorcza, niedestrukcyjna kontrola kompletności danych.
 * Brak pola jest wskazówką redakcyjną, nie dowodem błędu historycznego.
 * Nigdy nie zapisujemy do plików rekordów Keystatic.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import matter from 'gray-matter'
import { wczytajPrzekierowania, celPrzekierowania, RODZAJE_PRZEKIEROWAN, type Przekierowanie } from '../przekierowania'
import { normalizuj, odmiana } from '../tekst'
import { zakresIso } from '../edtf'
import { duplikaty, numeryPlanu, numerTekst, powtorzoneNazwyKwater } from '../plany/numeracja'
import { napisyDoOdczytania } from '../plany/przegladarka'
import { katalog } from '../plany/typy'
import { wczytajUstawienia } from '../plany/dane'
import type { Plan } from '../plany/model'
import { odczytajLata } from '../ksiegi'
import { objasnieniaMaterialu } from '../objasnienia'
import { stronyMaterialu } from '../strony-materialow'
import { typPliku } from '../pliki'
import { brakiMaterialu, brakiObiektu, OPISY_PANELU, zrodlaWTekscie } from '../wspoltworz-reguly'

export type StanUwagi = 'aktywne' | 'odlozone' | 'ignorowane'
export type WagaUwagi = 'blad' | 'brak' | 'wskazowka'
export type UwagaJakosci = {
    id: string; kolekcja: string; rekord: string; tytul: string; regula: string
    opis: string; wskazowka: string; edytuj: string; stan: StanUwagi; notatka: string
    /** P6a: waga reguły (spis REGULY_JAKOSCI) i termin odłożenia (ISO) */
    waga?: WagaUwagi; do?: string
}
/** P6a (P6-D-02, decyzja 18.11): „odłóż” na 7 albo 30 dni – potem alert wraca; dawna decyzja bez terminu = 30 dni od daty decyzji. */
type Decyzja = { stan: Exclude<StanUwagi, 'aktywne'>; notatka: string; data: string; do?: string }
export const DNI_ODLOZENIA = [7, 30] as const
type Pamiec = { wersja: 1; decyzje: Record<string, Decyzja> }
const REGULY = [
    'bez-opisu', 'brak-wspolrzednych', 'brak-zrodla-opisu', 'przynaleznosc-bez-dat',
    'brak-miejscowosci', 'brak-siedziby', 'brak-pochodzenia', 'brak-praw',
    'brak-lat', 'brak-archiwum', 'brak-sygnatury', 'brak-autora',
    'brak-roku', 'brak-linku', 'brak-definicji', 'brak-instytucji',
    'relacja-do-nieistniejacego', 'przekierowanie-bledne',
    // CAT-07: lata księgi lub tomu zapisane tak, że katalog ich nie odczyta (np. „lata 30.”) – księga wypada z filtra lat
    'nieodczytane-lata',
    // WSP-02 (etap R): braki pokazywane publicznie w „współtwórz” – jedna definicja w lib/wspoltworz-reguly.ts
    'brak-transkrypcji', 'brak-tlumaczenia', 'zdjecie-do-rozpoznania', 'brak-zdjecia-obiektu',
    // SLW-04 (P3): wpis, którego strona nie odczyta (zły identyfikator pliku, błąd składni, wartość spoza listy) – dawniej pomijany po cichu
    'wpis-nieczytelny',
    // P6a (ADM-09, D-P6-08): duplikaty, daty nielogiczne, numery grobów, napisy do odczytania na planach
    'mozliwy-duplikat', 'niepoprawna-data', 'powtorzony-numer-grobu', 'powtorzona-nazwa-kwatery', 'napisy-do-odczytania',
] as const
export type RegulaJakosci = typeof REGULY[number]

/**
 * P6a (D-P6-08/09): spis reguł – waga, zakres i uzasadnienie. „Wskazówka” to brak, który bywa naturalny (np. autor nieustalony) –
 * domyślnie schowana w kolejce. Test pilnuje, żeby każda reguła miała tu wpis.
 */
export const REGULY_JAKOSCI: Record<RegulaJakosci, { nazwa: string; waga: WagaUwagi; zakres: string; uzasadnienie: string }> = {
    'wpis-nieczytelny': { nazwa: 'wpis nieczytelny dla strony', waga: 'blad', zakres: 'wszystkie kolekcje', uzasadnienie: 'Strona pomija taki wpis – czytelnik go nie zobaczy.' },
    'relacja-do-nieistniejacego': { nazwa: 'powiązanie do nieistniejącego wpisu', waga: 'blad', zakres: 'pola powiązań, elementy planów', uzasadnienie: 'Odnośnik prowadzi donikąd albo powiązanie znika z karty.' },
    'przekierowanie-bledne': { nazwa: 'błędne przekierowanie', waga: 'blad', zakres: 'tabela przekierowań', uzasadnienie: 'Stary adres nadal daje „nie znaleziono”.' },
    'nieodczytane-lata': { nazwa: 'lata księgi nieodczytane', waga: 'blad', zakres: 'księgi i tomy', uzasadnienie: 'Księga wypada z filtra i paska lat.' },
    'niepoprawna-data': { nazwa: 'data nielogiczna', waga: 'blad', zakres: 'pola dat (EDTF)', uzasadnienie: 'Rok z przyszłości albo koniec przed początkiem – oś czasu i sortowanie pokażą bzdurę (zapis, którego strona nie odczyta, to „wpis nieczytelny”).' },
    'powtorzony-numer-grobu': { nazwa: 'powtórzony numer grobu', waga: 'blad', zakres: 'plany cmentarzy', uzasadnienie: 'Dwa groby z tym samym numerem – czytelnik nie wie, który to; nowe powtórzenia odrzuca już zapis planu.' },
    'powtorzona-nazwa-kwatery': { nazwa: 'powtórzona nazwa kwatery', waga: 'blad', zakres: 'plany cmentarzy', uzasadnienie: 'Numery grobów w dwóch kwaterach wyglądają tak samo.' },
    'bez-opisu': { nazwa: 'brak opisu', waga: 'brak', zakres: 'miejsca, obiekty, wpisy, tematy, zbiory, biogramy, instytucje', uzasadnienie: 'Karta bez opisu mówi czytelnikowi niewiele.' },
    'brak-wspolrzednych': { nazwa: 'brak współrzędnych', waga: 'brak', zakres: 'miejsca (wsie, miasta, folwarki), obiekty', uzasadnienie: 'Bez współrzędnych pozycja nie pojawi się na mapie.' },
    'brak-miejscowosci': { nazwa: 'obiekt bez miejscowości', waga: 'brak', zakres: 'obiekty', uzasadnienie: 'Obiekt nie pojawi się na karcie miejscowości.' },
    'brak-siedziby': { nazwa: 'brak siedziby instytucji', waga: 'brak', zakres: 'instytucje', uzasadnienie: 'Instytucja nie pojawi się przy miejscowości.' },
    'brak-pochodzenia': { nazwa: 'brak pochodzenia', waga: 'brak', zakres: 'materiały, zbiory', uzasadnienie: 'Źródło musi być wyraźnie podane (zasada 5.4).' },
    'brak-praw': { nazwa: 'brak informacji o prawach', waga: 'brak', zakres: 'materiały', uzasadnienie: 'Bez praw nie wiadomo, czy materiał można pokazać.' },
    'brak-lat': { nazwa: 'brak lat i tomów', waga: 'brak', zakres: 'księgi', uzasadnienie: 'Księga bez lat nie trafi do filtra lat.' },
    'brak-archiwum': { nazwa: 'brak miejsca przechowywania', waga: 'brak', zakres: 'księgi, zespoły', uzasadnienie: 'Czytelnik nie wie, gdzie szukać oryginału.' },
    'brak-sygnatury': { nazwa: 'brak sygnatury', waga: 'brak', zakres: 'księgi', uzasadnienie: 'Bez sygnatury księgi nie da się zamówić w archiwum.' },
    'brak-definicji': { nazwa: 'hasło bez definicji', waga: 'brak', zakres: 'słownik', uzasadnienie: 'Hasło bez znaczenia nic nie wyjaśnia.' },
    'brak-instytucji': { nazwa: 'brak instytucji', waga: 'brak', zakres: 'materiały', uzasadnienie: 'Materiał nie trafi na kartę instytucji.' },
    'brak-transkrypcji': { nazwa: 'brak odczytu', waga: 'brak', zakres: 'materiały ze skanem', uzasadnienie: 'Pismo odręczne bez odczytu jest dla wielu nieczytelne (także „współtwórz”).' },
    'brak-tlumaczenia': { nazwa: 'brak tłumaczenia', waga: 'brak', zakres: 'materiały w obcym języku', uzasadnienie: 'Tekst po rosyjsku, łacinie, niemiecku – bez tłumaczenia mało kto skorzysta.' },
    'zdjecie-do-rozpoznania': { nazwa: 'zdjęcie do rozpoznania', waga: 'brak', zakres: 'zdjęcia w materiałach', uzasadnienie: 'Bez opisu, kto i gdzie – zdjęcie traci wartość źródła.' },
    'brak-zdjecia-obiektu': { nazwa: 'obiekt bez zdjęcia', waga: 'brak', zakres: 'obiekty istniejące', uzasadnienie: 'Zdjęcie potwierdza stan obiektu.' },
    'napisy-do-odczytania': { nazwa: 'napisy do odczytania', waga: 'brak', zakres: 'plany cmentarzy', uzasadnienie: 'Groby ze zdjęciem nagrobka i bez odczytanego napisu (jedna uwaga na plan, jak w „współtwórz”).' },
    'brak-zrodla-opisu': { nazwa: 'opis bez źródła', waga: 'wskazowka', zakres: 'miejsca', uzasadnienie: 'Źródło pomaga ocenić opis – bywa nieznane.' },
    'przynaleznosc-bez-dat': { nazwa: 'okres przynależności nieustalony', waga: 'wskazowka', zakres: 'miejsca → parafie', uzasadnienie: 'Daty często nieznane – nie zgadujemy.' },
    'brak-autora': { nazwa: 'brak autora', waga: 'wskazowka', zakres: 'publikacje', uzasadnienie: 'Autor bywa nieustalony.' },
    'brak-roku': { nazwa: 'brak roku wydania', waga: 'wskazowka', zakres: 'publikacje', uzasadnienie: 'Rok bywa nieznany.' },
    'brak-linku': { nazwa: 'brak adresu publikacji', waga: 'wskazowka', zakres: 'publikacje', uzasadnienie: 'Link jest opcjonalny – wiele publikacji nie ma wersji online.' },
    'mozliwy-duplikat': { nazwa: 'możliwy duplikat', waga: 'wskazowka', zakres: 'kolekcje z tytułem', uzasadnienie: 'Ta sama nazwa w dwóch wpisach – bywa słuszna (np. dwie wsie „Wola”), dlatego tylko wskazówka.' },
}
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
const key = (kolekcja: string, rekord: string, regula: string, pozycja?: number | string) => `${kolekcja}:${rekord}:${regula}${pozycja !== undefined ? `:${pozycja}` : ''}`
const prawidloweId = (s: string) => /^[a-z0-9][a-z0-9_-]{0,130}$/.test(s)

async function pamiec(): Promise<Pamiec> {
    try {
        const j: unknown = JSON.parse(await fs.readFile(DB(), 'utf8'))
        if (j && typeof j === 'object' && 'wersja' in j && j.wersja === 1 && 'decyzje' in j && j.decyzje && typeof j.decyzje === 'object' && !Array.isArray(j.decyzje)) return j as Pamiec
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e }
    return { wersja: 1, decyzje: {} }
}

async function rekordy(kolekcja: typeof KOLEKCJE[number], pominiete: { plik: string; powod: string }[] = []): Promise<{ slug: string; d: Record<string, unknown>; tekst: string }[]> {
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
        if (!prawidloweId(slug)) { pominiete.push({ plik: file, powod: 'identyfikator (nazwa pliku) z polskimi znakami, wielkimi literami lub spacją' }); continue }
        const f = path.join(/*turbopackIgnore: true*/ folder, file)
        const st = await fs.stat(f)
        if (!st.isFile() || st.size > 2_000_000) continue
        const content = await fs.readFile(f, 'utf8')
        let d: Record<string, unknown>, tekst = ''
        try {
            if (file.endsWith('.json')) d = JSON.parse(content) as Record<string, unknown>
            else if (file.endsWith('.mdoc')) { const m = matter(content); d = m.data as Record<string, unknown>; tekst = m.content.trim() }
            else d = matter(`---\n${content}\n---\n`).data as Record<string, unknown>
        } catch { pominiete.push({ plik: file, powod: 'błąd zapisu pliku (składnia)' }); continue /* nie zmieniaj ani nie zgaduj błędnych danych */ }
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
    // SLW-02 (P3)
    hasla: [['occurrence[]', 'miejsca'], ['seeAlso[]', 'hasla']],
    ksiegi: [['fonds', 'zespoly'], ['parish', 'parafie'], ['relatedParishes[]', 'parafie'], ['spatial[]', 'miejsca']],
}
const NAZWY_POL: Record<string, string> = { spatial: 'miejsca', spatialAlso: 'także w miejscowościach', subject: 'tematy', cover: 'miniatura', isPartOf: 'należy do', parishes: 'parafie', institutions: 'instytucje', relation: 'przedstawia obiekty', collections: 'zbiory', seat: 'siedziba', occurrence: 'występowanie', seeAlso: 'zobacz też', fonds: 'zespół', parish: 'instytucja główna', relatedParishes: 'pozostałe instytucje' }
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

/** Decyzja dla alertu: klucz stały, dawny klucz z pozycją (sprzed P6a) albo klucz ze starym identyfikatorem (tabela przekierowań). */
function znajdzDecyzje(stany: Pamiec, klucze: string[], migracje: Map<string, string>): Decyzja | undefined {
    const [nowy, ...dawne] = klucze
    if (stany.decyzje[nowy]) return stany.decyzje[nowy]
    for (const k of dawne) if (k !== nowy && stany.decyzje[k]) { migracje.set(k, nowy); return stany.decyzje[k] }
    return undefined
}
/** Stan alertu z decyzji: odłożenie po terminie wraca do kolejki. */
function zDecyzji(dec: Decyzja | undefined, teraz = Date.now()): { stan: StanUwagi; notatka: string; do?: string } {
    if (!dec) return { stan: 'aktywne', notatka: '' }
    if (dec.stan === 'odlozone') {
        const termin = dec.do ?? new Date(Date.parse(dec.data) + 30 * 864e5).toISOString()
        if (!(Date.parse(termin) > teraz)) return { stan: 'aktywne', notatka: dec.notatka }
        return { stan: 'odlozone', notatka: dec.notatka, do: termin }
    }
    return { stan: dec.stan, notatka: dec.notatka }
}

export async function uwagiJakosci(): Promise<UwagaJakosci[]> {
    const stany = await pamiec()
    const migracje = new Map<string, string>()
    const wynik: UwagaJakosci[] = []
    const wszystkie = new Map<string, Awaited<ReturnType<typeof rekordy>>>()
    const nieczytelne = new Map<string, { plik: string; powod: string }[]>()
    for (const k of KOLEKCJE) { const pom: { plik: string; powod: string }[] = []; wszystkie.set(k, await rekordy(k, pom)); nieczytelne.set(k, pom) }
    // SLW-04 (P3) → P5: każda kolekcja – walidacja pól tak jak przy czytaniu strony (np. rodzaj spoza listy, zły slug);
    // strona taki wpis pomija (lib/kolekcja-odporna.ts), panel go pokazuje
    try {
        const { createReader } = await import('@keystatic/core/reader')
        const { wczytajOdpornie } = await import('../kolekcja-odporna')
        const cfg = (await import('../../keystatic.config')).default
        const r = createReader(process.cwd(), cfg) as unknown as { collections: Record<string, { list: () => Promise<string[]>; read: (s: string) => Promise<unknown> } | undefined> }
        for (const k of KOLEKCJE) {
            const kol = r.collections[k]
            if (!kol) continue
            const juz = new Set(nieczytelne.get(k)!.map((x) => x.plik.replace(/\.(mdoc|yaml|yml|json)$/, '')))
            for (const b of (await wczytajOdpornie(kol)).bledy) if (b.slug !== '*' && !juz.has(b.slug)) nieczytelne.get(k)!.push({ plik: b.slug, powod: b.blad.replace(/^Error:\s*/, '').slice(0, 200) })
        }
    } catch { /* brak konfiguracji – bez dodatkowej kontroli */ }
    for (const [kolekcja, lista] of nieczytelne) lista.forEach((x, i) => {
        // P6a: klucz bez pozycji na liście (dawniej „:i” – decyzja przeskakiwała na inny wpis, gdy przybył nowy błąd)
        const id = key(kolekcja, x.plik, 'wpis-nieczytelny')
        wynik.push({ id, kolekcja, rekord: x.plik, tytul: x.plik, regula: 'wpis-nieczytelny', opis: `Wpis pominięty na stronie: ${x.powod}`,
            wskazowka: 'Popraw wpis w Keystatic (identyfikator tylko małe litery bez polskich znaków, cyfry i łącznik; pola z listy). Do tego czasu strona go nie pokazuje – pozostałe pozycje działają normalnie.',
            edytuj: `/keystatic/collection/${kolekcja}`, ...zDecyzji(znajdzDecyzje(stany, [id, key(kolekcja, x.plik, 'wpis-nieczytelny', i)], migracje)) })
    })
    const istnieje = new Map([...wszystkie].map(([k, l]) => [k, new Set(l.map((r) => r.slug))]))
    const przekierowania = await wczytajPrzekierowania()
    // P6a (P6-15): po zmianie identyfikatora decyzja idzie za wpisem – stare identyfikatory z tabeli przekierowań
    const stareId = new Map<string, string[]>()
    for (const w of przekierowania) {
        const kol = KOLEKCJA_RODZAJU[w.rodzaj], cel = celPrzekierowania(przekierowania, w.rodzaj, w.stary)
        if (kol && cel) stareId.set(`${kol}:${cel}`, [...(stareId.get(`${kol}:${cel}`) ?? []), w.stary])
    }
    // P6a (ADM-09): możliwe duplikaty – ta sama nazwa (bez wielkości liter i znaków) w jednej kolekcji
    const tytulyKolekcji = new Map<string, Map<string, string[]>>()
    for (const [k, l] of wszystkie) {
        const m = new Map<string, string[]>()
        for (const r of l) { const t = normalizuj(nazwa(r.d.title) || nazwa(r.d.name)); if (t) m.set(t, [...(m.get(t) ?? []), r.slug]) }
        tytulyKolekcji.set(k, m)
    }
    for (const kolekcja of KOLEKCJE) {
        const lista = wszystkie.get(kolekcja)!
        for (const r of lista) {
            const d = r.d
            const tytul = nazwa(d.title) || nazwa(d.name) || r.slug
            const maOpis = Boolean(r.tekst.trim()) || pole(d, 'description', 'content', 'meaning')
            // P6a: `pozycja` – stała część klucza z treści (np. wskazany identyfikator), `dawna` – pozycja z klucza sprzed P6a (przeniesienie decyzji)
            const dodaj = (regula: RegulaJakosci, opis: string, wskazowka: string, pozycja?: string, dawna?: number) => {
                const id = key(kolekcja, r.slug, regula, pozycja)
                const klucze = [id, ...(dawna !== undefined ? [key(kolekcja, r.slug, regula, dawna)] : []),
                    ...(stareId.get(`${kolekcja}:${r.slug}`) ?? []).flatMap((st) => [key(kolekcja, st, regula, pozycja), ...(dawna !== undefined ? [key(kolekcja, st, regula, dawna)] : [])])]
                wynik.push({ id, kolekcja, rekord: r.slug, tytul, regula, opis, wskazowka,
                    edytuj: `/keystatic/collection/${kolekcja}/item/${encodeURIComponent(r.slug)}`,
                    ...zDecyzji(znajdzDecyzje(stany, klucze, migracje)) })
            }
            const tt = normalizuj(tytul === r.slug ? '' : tytul)
            const ten = tt ? tytulyKolekcji.get(kolekcja)?.get(tt) ?? [] : []
            for (const inny of ten) if (inny !== r.slug)
                dodaj('mozliwy-duplikat', `Ta sama nazwa co „${inny}”`, 'Jeśli to ta sama rzecz – połącz wpisy (z przekierowaniem starego adresu). Jeśli różne – zignoruj albo doprecyzuj nazwę.', inny)
            if (typeof d.temporal === 'string' && d.temporal.trim()) {
                const z = zakresIso(d.temporal), rok = new Date().getUTCFullYear()
                if (z?.od && z.do && z.od > z.do) dodaj('niepoprawna-data', `Data „${d.temporal}”: koniec przed początkiem`, 'Popraw kolejność lat w polu daty.', 'temporal')
                else if (z?.od && +z.od.slice(0, 4) > rok) dodaj('niepoprawna-data', `Data „${d.temporal}” jest z przyszłości`, 'Sprawdź rok – literówka?', 'temporal')
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
                            dodaj('przynaleznosc-bez-dat', `Nieustalony okres przynależności (${String(x.parish)})`, 'Nie zgaduj dat. Możesz oznaczyć je jako nieznane i zignorować tę uwagę.', String(x.parish), i)
                    }
                })
            }
            if (kolekcja === 'obiekty') {
                if (!pole(d,'coordinates')) dodaj('brak-wspolrzednych', 'Brak współrzędnych obiektu', 'Uzupełnij, jeśli znane.')
                if (!pole(d,'spatial')) dodaj('brak-miejscowosci', 'Obiekt bez przypisanej miejscowości', 'Powiąż obiekt z miejscowością.')
                const zdjecia = Array.isArray(d.photos) && d.photos.some((z) => z && typeof z === 'object' && ma((z as Record<string, unknown>).image))
                if (brakiObiektu({ maOpis, maWspolrzedne: pole(d, 'coordinates'), maZdjecie: zdjecia, istnieje: d.exists !== false }).includes('brak-zdjecia-obiektu'))
                    dodaj('brak-zdjecia-obiektu', ...OPISY_PANELU['brak-zdjecia-obiektu'])
            }
            if (kolekcja === 'parafie') {
                if (!pole(d,'seat')) dodaj('brak-siedziby', 'Brak siedziby instytucji', 'Wybierz miejscowość, o ile siedziba jest znana.')
                if (!maOpis) dodaj('bez-opisu', 'Brak historii instytucji', 'Uzupełnij historię lub świadomie odrzuć uwagę.')
            }
            if (kolekcja === 'materialy') {
                if (!pole(d,'source','provenance')) dodaj('brak-pochodzenia','Nie opisano pochodzenia materiału','Ustal pochodzenie i miejsce przechowania, o ile możliwe.')
                if (!pole(d,'rights')) dodaj('brak-praw','Nie określono praw do materiału','Zweryfikuj prawa i zakres udostępnienia; nie publikuj bez kontroli.')
                const z = zrodlaWTekscie(r.tekst), obj = objasnieniaMaterialu(r.slug)
                const plik = typeof d.file === 'string' ? d.file : ''
                for (const b of brakiMaterialu({
                    rodzaj: String(d.type ?? ''), maSkan: stronyMaterialu(r.slug).length > 0 || (!!plik && typPliku(plik) === 'obraz'),
                    maTranskrypcje: z.transkrypcja || pole(d, 'transcription') || obj.some((o) => o.rodzaj === 'odczyt'),
                    maTlumaczenie: z.tlumaczenie || obj.some((o) => o.rodzaj === 'tlumaczenie'),
                    jezyk: typeof d.language === 'string' ? d.language : '', maCzas: pole(d, 'temporal'), maMiejsca: pole(d, 'spatial'), maOpis: z.opis,
                })) if (b !== 'bez-opisu' && b !== 'brak-wspolrzednych' && b !== 'brak-zdjecia-obiektu' && b !== 'napisy-do-odczytania') dodaj(b, ...OPISY_PANELU[b])
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
                // CAT-07: to, czego odczytajLata nie rozumie, nie wchodzi do filtra lat ani paska lat – redakcja ma o tym wiedzieć
                const wskazowkaLat = 'Zapisz lata jako „1826–1875, 1880” (rok albo zakres, po przecinku) albo zignoruj, jeśli lat nie da się ustalić.'
                const zle = odczytajLata(typeof d.years === 'string' ? d.years : '').nieodczytane
                if (zle.length) dodaj('nieodczytane-lata', `Lata księgi nieodczytane przez katalog: ${zle.map((x) => `„${x}”`).join(', ')}`, wskazowkaLat, `ksiega:${normalizuj(zle.join(' '))}`, 1000)
                if (Array.isArray(d.volumes)) d.volumes.forEach((t, i) => {
                    const zleTomu = t && typeof t === 'object' && typeof (t as Record<string, unknown>).years === 'string' ? odczytajLata((t as Record<string, string>).years).nieodczytane : []
                    if (zleTomu.length) dodaj('nieodczytane-lata', `Lata tomu ${i + 1} nieodczytane przez katalog: ${zleTomu.map((x) => `„${x}”`).join(', ')}`, wskazowkaLat, `tom:${normalizuj(zleTomu.join(' '))}`, 1001 + i)
                })
            }
            for (const [sciezka, cel] of POWIAZANIA[kolekcja] ?? []) {
                const zbior = istnieje.get(cel)
                if (!zbior) continue
                wartosciPola(d, sciezka).forEach((id, i) => {
                    if (zbior.has(id)) return
                    const rodzaj = RODZAJ_KOLEKCJI[cel], nowy = rodzaj ? celPrzekierowania(przekierowania, rodzaj, id) : null
                    const pole_ = NAZWY_POL[sciezka.split('[')[0]] ?? sciezka
                    dodaj('relacja-do-nieistniejacego', `Powiązanie „${pole_}” wskazuje „${id}”, którego nie ma`,
                        nowy ? `W przekierowaniach: „${id}” → „${nowy}”. Wybierz nowy wpis w tym polu.` : 'Identyfikator zmieniono albo wpis usunięto. Wybierz właściwy wpis w tym polu albo usuń powiązanie.', `${sciezka}:${id}`, i + 100 * (POWIAZANIA[kolekcja].findIndex((x) => x[0] === sciezka)))
                })
            }
            if (kolekcja === 'hasla' && !pole(d,'meaning')) dodaj('brak-definicji','Hasło bez definicji','Uzupełnij znaczenie słowa.')
            if (kolekcja === 'zespoly' && !pole(d,'repository')) dodaj('brak-archiwum','Brak instytucji przechowującej','Uzupełnij archiwum.')
        }
    }
    // PH3 (decyzja 16.11): elementy planów – powiązania [[…]] i podstawa (materiał, objaśnienie) wskazujące nieistniejące pozycje
    const cele = kluczeCelow(wszystkie, await osobyIstniejace())
    const typyPlanow = katalog(await wczytajUstawienia().catch(() => undefined))
    for (const plan of await planyDoKontroli()) {
        for (const u of uwagiPlanu(plan, {
            cel: (t) => cele.has(kluczCelu(t)),
            material: (id) => istnieje.get('materialy')!.has(id),
            objasnienie: (mat, id) => objasnieniaMaterialu(mat).some((o) => o.id === id),
        }, przekierowania, (rodzaj, id) => istnieje.get(KOLEKCJA_RODZAJU[rodzaj])?.has(id) ?? false)) {
            wynik.push({ ...u, ...zDecyzji(znajdzDecyzje(stany, [u.id], migracje)) })
        }
        for (const u of uwagiNumeracji(plan, typyPlanow)) wynik.push({ ...u, ...zDecyzji(znajdzDecyzje(stany, [u.id], migracje)) })
    }
    // tabela przekierowań: nowy musi istnieć, stary nie może istnieć (inaczej przekierowanie nigdy nie zadziała)
    przekierowania.forEach((w, i) => {
        const kol = KOLEKCJA_RODZAJU[w.rodzaj]
        const zbior = kol ? istnieje.get(kol) : undefined
        if (!zbior) return
        const id = key('przekierowania', w.stary || String(i), 'przekierowanie-bledne', w.rodzaj)
        const dodaj = (opis: string, wskazowka: string) => {
            wynik.push({ id, kolekcja: 'przekierowania', rekord: w.stary, tytul: `${RODZAJE_PRZEKIEROWAN[w.rodzaj as keyof typeof RODZAJE_PRZEKIEROWAN]?.etykieta ?? w.rodzaj}: ${w.stary} → ${w.nowy}`, regula: 'przekierowanie-bledne', opis, wskazowka,
                edytuj: '/keystatic/singleton/przekierowania', ...zDecyzji(znajdzDecyzje(stany, [id, key('przekierowania', w.stary || String(i), 'przekierowanie-bledne', i)], migracje)) })
        }
        const cel = celPrzekierowania(przekierowania, w.rodzaj, w.stary)
        if (zbior.has(w.stary)) dodaj('Stary identyfikator nadal istnieje', 'Przekierowanie nie zadziała, dopóki wpis o starym identyfikatorze istnieje. Usuń wpis z tabeli albo zmień identyfikator.')
        else if (!cel || !zbior.has(cel)) dodaj('Nowy identyfikator nie istnieje', 'Wpisz identyfikator istniejącego wpisu – inaczej stary adres nadal da „nie znaleziono”.')
    })
    // P6a: decyzje zapisane pod dawnym kluczem (pozycja, stary identyfikator) – przeniesione raz, przy pierwszym odczycie
    if (migracje.size) {
        const db = await pamiec()
        let zmiana = false
        for (const [stary, nowy] of migracje) if (db.decyzje[stary] && !db.decyzje[nowy]) { db.decyzje[nowy] = db.decyzje[stary]; delete db.decyzje[stary]; zmiana = true }
        if (zmiana) await zapiszPamiec(db).catch(() => { /* brak prawa zapisu – decyzje działają dalej przez dawny klucz */ })
    }
    for (const u of wynik) u.waga = REGULY_JAKOSCI[u.regula as RegulaJakosci]?.waga ?? 'brak'
    return wynik.sort((a,b) => a.kolekcja.localeCompare(b.kolekcja,'pl') || a.tytul.localeCompare(b.tytul,'pl') || a.regula.localeCompare(b.regula,'pl'))
}

/** WSP-02: klucze uwag z decyzją „zignoruj” (`kolekcja:rekord:regula`) – strona „współtwórz” takich zadań nie pokazuje. Same klucze, bez notatek. */
export async function zignorowaneUwagi(): Promise<Set<string>> {
    const p = await pamiec()
    return new Set(Object.entries(p.decyzje).filter(([, d]) => d.stan === 'ignorowane').map(([k]) => k))
}

/** Akcja tylko dla istniejącego ostrzeżenia, aby nie dało się zapisać arbitralnego klucza. `dni` – termin odłożenia (7 albo 30). */
export async function stanUwagi(id: string, stan: StanUwagi, notatka: string, dni: number = 30): Promise<boolean> {
    if (id.length > 300 || !['aktywne', 'odlozone','ignorowane'].includes(stan)) return false
    if (stan === 'odlozone' && !(DNI_ODLOZENIA as readonly number[]).includes(dni)) return false
    const aktualne = await uwagiJakosci()
    if (!aktualne.some(x => x.id === id)) return false
    const db = await pamiec()
    const teraz = new Date()
    if (stan === 'aktywne') delete db.decyzje[id]
    else db.decyzje[id] = { stan, notatka: notatka.slice(0,800), data: teraz.toISOString(), ...(stan === 'odlozone' ? { do: new Date(teraz.getTime() + dni * 864e5).toISOString() } : {}) }
    await zapiszPamiec(db)
    return true
}

async function zapiszPamiec(db: Pamiec): Promise<void> {
    const plik = DB()
    await fs.mkdir(path.dirname(plik), { recursive: true, mode: 0o750 })
    const tmp = `${plik}.${randomBytes(6).toString('hex')}.tmp`
    try {
        await fs.writeFile(tmp, JSON.stringify(db, null, 2)+'\n', { mode: 0o640, flag: 'wx' })
        await fs.rename(tmp, plik)
    } finally { await fs.unlink(tmp).catch(() => {}) }
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
    for (const kol of ['miejsca', 'tematy', 'obiekty', 'posts', 'materialy', 'hasla' /* SLW-03 (P3) */]) for (const r of wszystkie.get(kol) ?? []) {
        dodaj(r.slug); dodaj(nazwa(r.d.title)); dodaj(nazwa(r.d.name))
        for (const pole of ['alternative', 'inflections', 'variants']) if (Array.isArray(r.d[pole])) (r.d[pole] as unknown[]).forEach(dodaj)
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

type ElementDoKontroli = { id: string; typ?: string; nazwa?: string; powiazania?: unknown; podstawa?: unknown; oznaczenie?: unknown; zdjecia?: unknown; napis?: string; ograniczony?: boolean; nieznanePolozenie?: boolean }
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
 * P6a (ADM-09): numeracja i napisy planu – powtórzone numery grobów i nazwy kwater (nowe powtórzenia odrzuca już zapis planu –
 * lib/plany/numeracja.ts:83, dawne zostają do poprawy) oraz jedna uwaga „napisy do odczytania” na plan (jak WSP-06 w „współtwórz”).
 */
export function uwagiNumeracji(plan: PlanDoKontroli, typy: ReturnType<typeof katalog>): Omit<UwagaJakosci, 'stan' | 'notatka'>[] {
    const p = plan as unknown as Pick<Plan, 'elementy'>
    const wyn: Omit<UwagaJakosci, 'stan' | 'notatka'>[] = []
    const edytuj = (el?: string) => `/keystatic/plany/${encodeURIComponent(plan.slug)}${el ? `?el=${encodeURIComponent(el)}` : ''}`
    const nr = numeryPlanu(p)
    for (const [k, ids] of duplikaty(p)) wyn.push({ id: `plany:${plan.slug}:powtorzony-numer-grobu:${k}`, kolekcja: 'plany', rekord: plan.slug, tytul: plan.tytul, regula: 'powtorzony-numer-grobu',
        opis: `Ten sam numer (${numerTekst(nr.get(ids[0])) || k}) mają ${odmiana(ids.length, ['grób', 'groby', 'grobów'])}`, wskazowka: 'W edytorze planu nadaj jednemu z grobów inny numer („przenumeruj kwaterę” albo ręcznie).', edytuj: edytuj(ids[0]) })
    for (const n of powtorzoneNazwyKwater(p)) wyn.push({ id: `plany:${plan.slug}:powtorzona-nazwa-kwatery:${normalizuj(n)}`, kolekcja: 'plany', rekord: plan.slug, tytul: plan.tytul, regula: 'powtorzona-nazwa-kwatery',
        opis: `Nazwa kwatery „${n}” użyta więcej niż raz`, wskazowka: 'Zmień nazwę jednej z kwater – numery grobów w obu wyglądają teraz tak samo.', edytuj: edytuj() })
    const doOdczytu = napisyDoOdczytania(p, typy).length
    if (doOdczytu > 0) wyn.push({ id: `plany:${plan.slug}:napisy-do-odczytania`, kolekcja: 'plany', rekord: plan.slug, tytul: plan.tytul, regula: 'napisy-do-odczytania',
        opis: `${odmiana(doOdczytu, ['grób ma', 'groby mają', 'grobów ma'])} zdjęcie nagrobka bez odczytanego napisu`, wskazowka: 'Odczytaj napisy w edytorze planu (filtr „bez napisu”) albo poproś o pomoc w „współtwórz”.', edytuj: edytuj() })
    return wyn
}

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
