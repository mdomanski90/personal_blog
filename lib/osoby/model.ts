// Drzewo genealogiczne: osoby, rodziny (małżeństwa z dziećmi), źródła.
// Dane leżą wyłącznie na serwerze (content/osoby, gałąź `local`) – nigdy w repozytorium na GitHubie.
//   content/osoby/<id>.json            – osoba
//   content/osoby/_rodziny/<id>.json   – rodzina: mąż, żona, dzieci, ślub/rozwód
//   content/osoby/_zrodla.json         – źródła (zbiory, z których pochodzą cytaty)
//   content/osoby/_import.json         – ślad jednorazowego importu z GEDCOM (blokuje ponowny import)

import { formatujEdtf, parsujEdtf, rokPoczatku } from '../edtf'
import { normalizuj } from '../tekst'

export type Plec = 'M' | 'K' | 'U'
export type WidocznoscOsoby = 'auto' | 'publiczne' | 'bliscy' | 'ja'

export const RODZAJE_ZDARZEN = {
    urodzenie: 'urodzenie',
    chrzest: 'chrzest',
    slub: 'ślub',
    rozwod: 'rozwód',
    zgon: 'zgon',
    pogrzeb: 'pogrzeb',
    zamieszkanie: 'zamieszkanie',
    zawod: 'zawód',
    emigracja: 'wyjazd, emigracja',
    inne: 'inne',
} as const
export type RodzajZdarzenia = keyof typeof RODZAJE_ZDARZEN

/** Obrządek zapisany przy zdarzeniu (chrzest, ślub, pogrzeb) – ludzie zmieniali go w ciągu życia. */
export const OBRZADKI = {
    rzymskokatolicki: { nazwa: 'rzymskokatolicki', kolor: '#94702c' },
    unicki: { nazwa: 'unicki (greckokatolicki)', kolor: '#2b7a7e' },
    prawoslawny: { nazwa: 'prawosławny', kolor: '#6a4fa0' },
    ewangelicki: { nazwa: 'ewangelicki', kolor: '#56677a' },
    mojzeszowy: { nazwa: 'mojżeszowy', kolor: '#6b6253' },
} as const
export type Obrzadek = keyof typeof OBRZADKI

/** Wyznanie parafii (lib/ksiegi) → obrządek zdarzenia. */
export const OBRZADEK_PARAFII: Record<string, Obrzadek> = {
    unicka: 'unicki',
    rzymskokatolicka: 'rzymskokatolicki',
    prawoslawna: 'prawoslawny',
    ewangelicka: 'ewangelicki',
    zydowska: 'mojzeszowy',
}

export const ZDARZENIA_Z_OBRZADKIEM: RodzajZdarzenia[] = ['chrzest', 'slub', 'pogrzeb']

export interface Chrzestny {
    tekst: string
    /** identyfikator osoby z drzewa, gdy dopasowana */
    osoba?: string
}

export interface Cytat {
    zrodlo?: string
    strona?: string
    /** numer rekordu Ancestry „kolekcja::rekord” (bez przedrostka „1,”) */
    apid?: string
    www?: string
}

export interface Zdarzenie {
    id: string
    rodzaj: RodzajZdarzenia
    /** nazwa zdarzenia rodzaju „inne” */
    nazwa?: string
    /** data EDTF */
    data?: string
    /** data w oryginalnym zapisie, gdy nie dała się odczytać */
    dataTekst?: string
    miejsce?: string
    /** identyfikator miejscowości ze strony */
    miejsceId?: string
    obrzadek?: Obrzadek
    chrzestni?: Chrzestny[]
    opis?: string
    cytaty?: Cytat[]
}

export interface Multimedium {
    tytul: string
    opis?: string
    data?: string
    miejsce?: string
    transkrypcja?: string
}

export interface Osoba {
    id: string
    imiona: string
    nazwisko: string
    /** inne nazwiska: panieńskie, po mężu, zapisy z aktów */
    inneNazwiska?: string[]
    /** inne zapisy imienia i nazwiska – z aktów, po łacinie, cyrylicą (np. „Joannes Testowski”, „Иван Тестовый”) */
    inneZapisy?: string[]
    /** przydomek, pseudonim (np. „Kowalka”, „Sowa”) */
    przydomek?: string
    plec: Plec
    zdarzenia: Zdarzenie[]
    /** auto – z dat (osoba żyjąca, gdy nic nie wskazuje na śmierć i mogła urodzić się w ostatnich 100 latach); widoczność auto – patrz widocznoscOsoby */
    zyje: 'auto' | 'tak' | 'nie'
    widocznosc: WidocznoscOsoby
    notatki?: string
    cytaty?: Cytat[]
    multimedia?: Multimedium[]
    znaczniki?: string[]
    /** uwagi z importu do przejrzenia (np. imię z dopiskiem) */
    uwagi?: string[]
    /** zdjęcie osoby na karcie: plik w pliki-archiwum/osoby/<id>/, podpis i źródło (kto, skąd) */
    portret?: { plik: string; podpis?: string; zrodlo?: string }
    gedcomId?: string
    wersja: number
    zmieniono?: string
}

export const NAZWA_PORTRETU = /^portret-[a-z0-9-]+\.(jpg|png|webp)$/

export interface Rodzina {
    id: string
    maz?: string
    zona?: string
    dzieci: string[]
    zdarzenia: Zdarzenie[]
    gedcomId?: string
    wersja: number
    zmieniono?: string
}

export interface Zrodlo {
    id: string
    tytul: string
    autor?: string
    wydawca?: string
    apid?: string
    notatka?: string
}

export interface Drzewo {
    osoby: Map<string, Osoba>
    rodziny: Map<string, Rodzina>
    zrodla: Map<string, Zrodlo>
}

export const ID_OSOBY = /^[a-z0-9][a-z0-9-]{0,80}$/

export function idZNazwy(imiona: string, nazwisko: string, rok: number | null, zajete: (id: string) => boolean): string {
    const baza = normalizuj(`${imiona.split(/\s+/)[0] ?? ''} ${nazwisko} ${rok ?? ''}`).replace(/ /g, '-').slice(0, 60) || 'osoba'
    let id = baza
    for (let i = 2; zajete(id); i++) id = `${baza}-${i}`
    return id
}

export function noweIdZdarzenia(): string {
    return Math.random().toString(36).slice(2, 9)
}

export const nazwaOsoby = (o: Pick<Osoba, 'imiona' | 'nazwisko'>) => `${o.imiona} ${o.nazwisko}`.trim() || 'bez imienia'

export function zdarzenie(o: { zdarzenia: Zdarzenie[] }, ...rodzaje: RodzajZdarzenia[]): Zdarzenie | undefined {
    for (const r of rodzaje) {
        const z = o.zdarzenia.find((x) => x.rodzaj === r && (x.data || x.miejsce))
        if (z) return z
    }
    return o.zdarzenia.find((x) => rodzaje.includes(x.rodzaj))
}

export const rokUrodzenia = (o: Osoba) => rokPoczatku(zdarzenie(o, 'urodzenie', 'chrzest')?.data)
export const rokZgonu = (o: Osoba) => rokPoczatku(zdarzenie(o, 'zgon', 'pogrzeb')?.data)

export function lataZycia(o: Osoba): string {
    const u = rokUrodzenia(o), z = rokZgonu(o)
    const zu = zdarzenie(o, 'urodzenie', 'chrzest'), zz = zdarzenie(o, 'zgon', 'pogrzeb')
    const fu = zu?.data ? (rokPoczatku(zu.data) === u ? String(u) : formatujEdtf(zu.data)) : zu?.dataTekst ?? ''
    const fz = zz?.data ? String(z ?? formatujEdtf(zz.data)) : zz?.dataTekst ?? (zz ? '?' : '')
    if (!fu && !fz) return ''
    return `${fu || '?'}${fz ? `–${fz}` : ''}`
}

export function sortujZdarzenia(z: Zdarzenie[]): Zdarzenie[] {
    const kolej: RodzajZdarzenia[] = ['urodzenie', 'chrzest', 'zamieszkanie', 'zawod', 'slub', 'rozwod', 'emigracja', 'inne', 'zgon', 'pogrzeb']
    return [...z].sort((a, b) => {
        const da = parsujEdtf(a.data)?.od?.rok, db = parsujEdtf(b.data)?.od?.rok
        if (da != null && db != null && da !== db) return da - db
        return kolej.indexOf(a.rodzaj) - kolej.indexOf(b.rodzaj)
    })
}

// ---------- relacje ----------
export interface Relacje {
    rodzice: Rodzina[]
    malzenstwa: Rodzina[]
}

export function indeksRelacji(d: Drzewo): Map<string, Relacje> {
    const m = new Map<string, Relacje>()
    const r = (id: string) => {
        let x = m.get(id)
        if (!x) m.set(id, (x = { rodzice: [], malzenstwa: [] }))
        return x
    }
    for (const f of d.rodziny.values()) {
        if (f.maz) r(f.maz).malzenstwa.push(f)
        if (f.zona) r(f.zona).malzenstwa.push(f)
        for (const c of f.dzieci) r(c).rodzice.push(f)
    }
    return m
}

/**
 * Rok urodzenia – podany albo szacowany z rodziny (rodzic +25, dziecko −25, małżonek), w kilku przejściach.
 * Do oceny, czy osoba może żyć, i do sprawdzania chrzestnych.
 */
export function szacowaneLata(d: Drzewo, rel = indeksRelacji(d)): Map<string, number> {
    const lata = new Map<string, number>()
    for (const o of d.osoby.values()) {
        const r = rokUrodzenia(o)
        if (r != null) lata.set(o.id, r)
    }
    for (let przejscie = 0; przejscie < 4; przejscie++) {
        let zmiana = false
        for (const o of d.osoby.values()) {
            if (lata.has(o.id)) continue
            const x = rel.get(o.id)
            if (!x) continue
            const kand: number[] = []
            for (const f of x.rodzice) for (const p of [f.maz, f.zona]) if (p && lata.has(p)) kand.push(lata.get(p)! + 25)
            for (const f of x.malzenstwa) {
                for (const c of f.dzieci) if (lata.has(c)) kand.push(lata.get(c)! - 25)
                const sp = f.maz === o.id ? f.zona : f.maz
                if (sp && lata.has(sp)) kand.push(lata.get(sp)!)
            }
            if (kand.length) {
                lata.set(o.id, Math.round(kand.reduce((a, b) => a + b, 0) / kand.length))
                zmiana = true
            }
        }
        if (!zmiana) break
    }
    return lata
}

export function czyZyje(o: Osoba, szacowany: number | undefined, rokTeraz = new Date().getFullYear()): boolean {
    if (o.zyje === 'tak') return true
    if (o.zyje === 'nie') return false
    if (o.zdarzenia.some((z) => z.rodzaj === 'zgon' || z.rodzaj === 'pogrzeb')) return false
    if (szacowany == null) return true // brak danych – ostrożnie: jak żyjąca
    return szacowany > rokTeraz - 100
}

/** Progi widoczności „auto”: karta publiczna, gdy osoba urodziła się co najmniej 100 lat temu albo zmarła co najmniej 25 lat temu. */
export const PROG_URODZENIA = 100
export const PROG_ZGONU = 25

/**
 * Widoczność karty. „auto”: publiczna, gdy rok urodzenia (podany) ≤ teraz−100 albo rok zgonu ≤ teraz−25;
 * gdy urodzenie znamy tylko z szacunku (rodzice, dzieci, małżonek) – z zapasem 25 lat (≤ teraz−125).
 * W pozostałych przypadkach (także brak dat) – „dla bliskich”.
 */
export function widocznoscOsoby(o: Osoba, szacowany?: number, rokTeraz = new Date().getFullYear()): 'publiczne' | 'bliscy' | 'ja' {
    if (o.widocznosc !== 'auto') return o.widocznosc
    return publicznaZDat(o, szacowany, rokTeraz) ? 'publiczne' : 'bliscy'
}

export function publicznaZDat(o: Osoba, szacowany?: number, rokTeraz = new Date().getFullYear()): boolean {
    const u = rokUrodzenia(o), z = rokZgonu(o)
    if (u != null && u <= rokTeraz - PROG_URODZENIA) return true
    if (z != null && z <= rokTeraz - PROG_ZGONU) return true
    if (u == null && szacowany != null && szacowany <= rokTeraz - PROG_URODZENIA - 25) return true
    return false
}

// ---------- obrządek z opisu ----------
// granice słów z polskimi literami (\b w JS zna tylko litery łacińskie bez znaków)
const slowo = (wzor: string) => new RegExp(`(?<!\\p{L})(?:${wzor})(?!\\p{L})`, 'iu')
const SLOWA_OBRZADKU: [RegExp, Obrzadek][] = [
    [slowo('gr\\.?\\s*-?\\s*kat\\.?|greckokatolick\\p{L}*|unick\\p{L}*'), 'unicki'],
    [slowo('prawosławn\\p{L}*|prawoslawn\\p{L}*|prawosł\\.|orthodox'), 'prawoslawny'],
    [slowo('ewangelick\\p{L}*|luterańsk\\p{L}*|luteransk\\p{L}*|ew\\.?\\s*-?\\s*aug\\.?|lutheran'), 'ewangelicki'],
    [slowo('mojżeszow\\p{L}*|mojzeszow\\p{L}*|żydowsk\\p{L}*|zydowsk\\p{L}*|jewish'), 'mojzeszowy'],
    [slowo('rz\\.?\\s*-?\\s*kat\\.?|rzymskokatolick\\p{L}*|rzymsko-katolick\\p{L}*|katolick\\p{L}*|roman catholic|catholic'), 'rzymskokatolicki'],
]

export function obrzadekZTekstu(t: string | undefined): Obrzadek | undefined {
    if (!t) return undefined
    for (const [re, o] of SLOWA_OBRZADKU) if (re.test(t)) return o
    return undefined
}

// ---------- chrzestni z opisu ----------
const ETYKIETA_CHRZESTNYCH = /(paten\s*\/\s*godparents|godparents|god-parents|paten|rodzice\s+chrzestni|chrzestni|chrzestny|chrzestna|kumowie|patrini|patrinus|matrina)\s*:\s*/i

/** „Paten/Godparents: Krystyna Bogucka Węgrzyniak, Stanisław Kokoszkiewicz” → dwie osoby i tekst bez tej części. */
export function chrzestniZOpisu(opis: string | undefined): { chrzestni: string[]; reszta: string } {
    if (!opis) return { chrzestni: [], reszta: '' }
    const m = ETYKIETA_CHRZESTNYCH.exec(opis)
    if (!m) return { chrzestni: [], reszta: opis }
    const poczatek = m.index + m[0].length
    const dalej = opis.slice(poczatek)
    const koniec = dalej.search(/[\n;]|\.\s|\.$/)
    const lista = dalej.slice(0, koniec < 0 ? undefined : koniec)
    const chrzestni = lista
        .split(/,|\s+i\s+|\s+and\s+|\s*&\s*|\s+oraz\s+/i)
        .map((s) => s.trim().replace(/\s+/g, ' '))
        .filter((s) => s.length > 1)
    const reszta = (opis.slice(0, m.index) + dalej.slice(koniec < 0 ? dalej.length : koniec).replace(/^[;.\s]+/, '')).trim()
    return { chrzestni, reszta }
}

/**
 * Dopasowanie chrzestnego do osoby z drzewa: imię (pierwsze słowo) i któreś z nazwisk, wiek 12–80 lat w dniu chrztu.
 * Zwraca identyfikator tylko przy jednym pewnym kandydacie.
 */
export function dopasujChrzestnego(tekst: string, rokChrztu: number | null, d: Drzewo, lata: Map<string, number>, indeksNazwisk?: Map<string, Osoba[]>): string | undefined {
    const slowa = normalizuj(tekst).split(' ').filter(Boolean)
    if (slowa.length < 2 || rokChrztu == null) return undefined
    const [imie, ...naz] = slowa
    const nazwiska = naz.map(rdzenNazwiska)
    const kandydaci = new Set<Osoba>()
    for (const n of nazwiska) for (const o of indeksNazwisk?.get(n) ?? [...d.osoby.values()].filter((x) => nazwiskaOsoby(x).includes(n))) kandydaci.add(o)
    const pasuja = [...kandydaci].filter((o) => {
        if (normalizuj(o.imiona).split(' ')[0] !== imie) return false
        const r = lata.get(o.id)
        return r != null && rokChrztu - r >= 12 && rokChrztu - r <= 80
    })
    return pasuja.length === 1 ? pasuja[0].id : undefined
}

/**
 * Rdzeń nazwiska do porównań: formy męska i żeńska dają to samo (Kowalski/Kowalska, Testowy/Testowa, Nowacki/Nowacka).
 * Zawsze bez polskich znaków i małymi literami.
 */
export function rdzenNazwiska(n: string): string {
    const t = normalizuj(n)
    return t.length > 4 ? t.replace(/(ski|ska|cki|cka|dzki|dzka)$/, (k) => k.slice(0, -1)).replace(/[aiy]$/, '') : t
}

export function nazwiskaOsoby(o: Osoba): string[] {
    return [o.nazwisko, ...(o.inneNazwiska ?? []), ...(o.inneZapisy ?? []).map((z) => z.split(' ').at(-1) ?? '')].flatMap((n) => normalizuj(n).split(' ')).filter(Boolean).map(rdzenNazwiska)
}

export function indeksNazwisk(d: Drzewo): Map<string, Osoba[]> {
    const m = new Map<string, Osoba[]>()
    for (const o of d.osoby.values()) for (const n of new Set(nazwiskaOsoby(o))) m.set(n, [...(m.get(n) ?? []), o])
    return m
}

// ---------- ostrzeżenia (niemożliwe daty, podwójne osoby) ----------
export interface Ostrzezenie {
    osoba: string
    tekst: string
}

export function ostrzezenia(d: Drzewo, rel = indeksRelacji(d)): Ostrzezenie[] {
    const wyn: Ostrzezenie[] = []
    const ur = (id?: string) => (id ? rokUrodzenia(d.osoby.get(id)!) ?? null : null)
    const zg = (id?: string) => (id ? rokZgonu(d.osoby.get(id)!) ?? null : null)
    for (const o of d.osoby.values()) {
        const u = rokUrodzenia(o), z = rokZgonu(o)
        if (u != null && z != null && z < u) wyn.push({ osoba: o.id, tekst: `zgon (${z}) przed urodzeniem (${u})` })
        if (u != null && z != null && z - u > 110) wyn.push({ osoba: o.id, tekst: `żyła ${z - u} lat – sprawdź daty` })
        for (const f of rel.get(o.id)?.rodzice ?? []) {
            if (u == null) continue
            const m = ur(f.zona), t = ur(f.maz), mz = zg(f.zona)
            if (m != null && (u - m < 12 || u - m > 55)) wyn.push({ osoba: o.id, tekst: `matka miała ${u - m} lat przy narodzinach` })
            if (t != null && (u - t < 14 || u - t > 80)) wyn.push({ osoba: o.id, tekst: `ojciec miał ${u - t} lat przy narodzinach` })
            if (mz != null && u > mz) wyn.push({ osoba: o.id, tekst: `urodzona po śmierci matki (${mz})` })
        }
        if (o.uwagi?.length) for (const x of o.uwagi) wyn.push({ osoba: o.id, tekst: x })
    }
    // podwójne: to samo imię, nazwisko i rok urodzenia
    const klucze = new Map<string, string[]>()
    for (const o of d.osoby.values()) {
        const u = rokUrodzenia(o)
        if (u == null) continue
        const k = `${normalizuj(o.imiona)}|${normalizuj(o.nazwisko)}|${u}`
        klucze.set(k, [...(klucze.get(k) ?? []), o.id])
    }
    for (const ids of klucze.values()) if (ids.length > 1) for (const id of ids) wyn.push({ osoba: id, tekst: `możliwa podwójna osoba: ${ids.filter((x) => x !== id).join(', ')}` })
    return wyn
}

/** Adres rekordu Ancestry (wymaga konta) z numeru „kolekcja::rekord”. */
export function adresAncestry(apid: string | undefined): string | null {
    const m = /^(?:\d+,)?(\d+)::(\d+)$/.exec(apid ?? '')
    if (!m || m[2] === '0') return null
    return `https://search.ancestry.com/cgi-bin/sse.dll?indiv=1&dbid=${m[1]}&h=${m[2]}`
}

export function poprawOsobe(o: Partial<Osoba> & { id: string }): Osoba {
    return {
        id: o.id,
        imiona: String(o.imiona ?? '').trim(),
        nazwisko: String(o.nazwisko ?? '').trim(),
        inneNazwiska: (o.inneNazwiska ?? []).map((s) => String(s).trim()).filter(Boolean),
        ...(o.inneZapisy?.some((s) => String(s).trim()) ? { inneZapisy: [...new Set(o.inneZapisy.map((s) => String(s).trim().replace(/\s+/g, ' ')).filter(Boolean))].slice(0, 30) } : {}),
        ...(o.przydomek && String(o.przydomek).trim() ? { przydomek: String(o.przydomek).trim().slice(0, 120) } : {}),
        plec: o.plec === 'M' || o.plec === 'K' ? o.plec : 'U',
        zdarzenia: (o.zdarzenia ?? []).filter((z) => z && z.rodzaj in RODZAJE_ZDARZEN).map((z) => ({ ...z, id: z.id || noweIdZdarzenia() })),
        zyje: o.zyje === 'tak' || o.zyje === 'nie' ? o.zyje : 'auto',
        widocznosc: (['publiczne', 'bliscy', 'ja'] as const).includes(o.widocznosc as never) ? (o.widocznosc as WidocznoscOsoby) : 'auto',
        ...(o.notatki ? { notatki: String(o.notatki) } : {}),
        ...(o.cytaty?.length ? { cytaty: o.cytaty } : {}),
        ...(o.multimedia?.length ? { multimedia: o.multimedia } : {}),
        ...(o.znaczniki?.length ? { znaczniki: o.znaczniki.map(String) } : {}),
        ...(o.uwagi?.length ? { uwagi: o.uwagi.map(String) } : {}),
        ...(o.portret && NAZWA_PORTRETU.test(String(o.portret.plik)) ? { portret: { plik: String(o.portret.plik), ...(o.portret.podpis?.trim() ? { podpis: String(o.portret.podpis).trim().slice(0, 300) } : {}), ...(o.portret.zrodlo?.trim() ? { zrodlo: String(o.portret.zrodlo).trim().slice(0, 300) } : {}) } } : {}),
        ...(o.gedcomId ? { gedcomId: o.gedcomId } : {}),
        wersja: Number.isFinite(o.wersja) ? Number(o.wersja) : 0,
        ...(o.zmieniono ? { zmieniono: o.zmieniono } : {}),
    }
}

export function poprawRodzine(f: Partial<Rodzina> & { id: string }): Rodzina {
    return {
        id: f.id,
        ...(f.maz ? { maz: f.maz } : {}),
        ...(f.zona ? { zona: f.zona } : {}),
        dzieci: [...new Set((f.dzieci ?? []).filter(Boolean))],
        zdarzenia: (f.zdarzenia ?? []).filter((z) => z && z.rodzaj in RODZAJE_ZDARZEN).map((z) => ({ ...z, id: z.id || noweIdZdarzenia() })),
        ...(f.gedcomId ? { gedcomId: f.gedcomId } : {}),
        wersja: Number.isFinite(f.wersja) ? Number(f.wersja) : 0,
        ...(f.zmieniono ? { zmieniono: f.zmieniono } : {}),
    }
}

/**
 * Wycinek drzewa „tylko moja rodzina”: krewni wybranej osoby (przodkowie i wszyscy ich potomkowie –
 * pokrewieństwo w linii prostej i bocznej) oraz ich małżonkowie; bez dalszych rodzin małżonków.
 * Źródła – tylko te, na które powołują się zostawione osoby i rodziny.
 */
export function wycinekRodziny(d: Drzewo, id: string): Drzewo {
    const rel = indeksRelacji(d)
    const przodkowie = new Set<string>()
    const doGory = [id]
    while (doGory.length) {
        const x = doGory.pop()!
        if (przodkowie.has(x) || !d.osoby.has(x)) continue
        przodkowie.add(x)
        for (const f of rel.get(x)?.rodzice ?? []) for (const r of [f.maz, f.zona]) if (r) doGory.push(r)
    }
    const krewni = new Set<string>()
    const wDol = [...przodkowie]
    while (wDol.length) {
        const x = wDol.pop()!
        if (krewni.has(x) || !d.osoby.has(x)) continue
        krewni.add(x)
        for (const f of rel.get(x)?.malzenstwa ?? []) wDol.push(...f.dzieci)
    }
    const osoby = new Set(krewni)
    for (const x of krewni) for (const f of rel.get(x)?.malzenstwa ?? []) for (const m of [f.maz, f.zona]) if (m) osoby.add(m)
    const rodziny = new Map<string, Rodzina>()
    for (const f of d.rodziny.values()) {
        if (![f.maz, f.zona, ...f.dzieci].some((x) => x && krewni.has(x))) continue
        rodziny.set(f.id, { ...f, maz: f.maz && osoby.has(f.maz) ? f.maz : undefined, zona: f.zona && osoby.has(f.zona) ? f.zona : undefined, dzieci: f.dzieci.filter((c) => osoby.has(c)) })
    }
    const wybraneOsoby = new Map([...d.osoby].filter(([k]) => osoby.has(k)))
    const uzyte = new Set<string>()
    const zbierz = (c?: { zrodlo?: string }[]) => c?.forEach((x) => x.zrodlo && uzyte.add(x.zrodlo))
    for (const o of wybraneOsoby.values()) { zbierz(o.cytaty); o.zdarzenia.forEach((z) => zbierz(z.cytaty)) }
    for (const f of rodziny.values()) f.zdarzenia.forEach((z) => zbierz(z.cytaty))
    return { osoby: wybraneOsoby, rodziny, zrodla: new Map([...d.zrodla].filter(([k]) => uzyte.has(k))) }
}
