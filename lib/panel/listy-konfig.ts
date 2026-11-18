// P5 (PNL-09): listy panelu – kolumny i zmiany zbiorcze dla kolekcji Keystatic. Bez fs – plik wspólny dla serwera i panelu.
// Domyślna kolejność kolumn: nazwa, miejscowość, rodzaj/wyznanie…, identyfikator na końcu (decyzja 18.11 – Keystatic zawsze
// stawia slug pierwszy, keystatic-core-ui.js:1126–1146). Ustawienie w danych: content/_panel/listy.json
// { "<kolekcja>": { "kolumny": ["title", "seat", "religion", "slug"] } } – kolejność i ukrycie spośród kolumn tej kolekcji.

export type RodzajKolumny = 'tytul' | 'tekst' | 'wybor' | 'wybory' | 'relacja' | 'relacje' | 'slug'
export interface Kolumna { pole: string; etykieta: string; rodzaj: RodzajKolumny; /** cel relacji */ kolekcja?: string }
export interface PoleRelacji { pole: string; etykieta: string; kolekcja: string }
export interface KonfigListy {
    kolekcja: string
    nazwa: string
    /** wszystkie kolumny dostępne w tej liście; domyślnie widoczne – `domyslne` */
    kolumny: Kolumna[]
    domyslne: string[]
    /** zmiany zbiorcze: widoczność (gdy kolekcja ma to pole) i dopisz/usuń powiązanie w polach wielokrotnych */
    widocznosc: boolean
    relacje: PoleRelacji[]
}

const T = (etykieta = 'nazwa'): Kolumna => ({ pole: 'title', etykieta, rodzaj: 'tytul' })
const W = (pole: string, etykieta: string): Kolumna => ({ pole, etykieta, rodzaj: 'wybor' })
const X = (pole: string, etykieta: string): Kolumna => ({ pole, etykieta, rodzaj: 'tekst' })
const R = (pole: string, etykieta: string, kolekcja: string): Kolumna => ({ pole, etykieta, rodzaj: 'relacja', kolekcja })
const RR = (pole: string, etykieta: string, kolekcja: string): Kolumna => ({ pole, etykieta, rodzaj: 'relacje', kolekcja })
const WID = W('visibility', 'widoczność')
const SLUG: Kolumna = { pole: 'slug', etykieta: 'identyfikator', rodzaj: 'slug' }

function lista(kolekcja: string, nazwa: string, kolumny: Kolumna[], domyslne: string[], relacje: PoleRelacji[] = []): KonfigListy {
    const zSlug = [...kolumny, SLUG]
    return { kolekcja, nazwa, kolumny: zSlug, domyslne: [...domyslne, 'slug'], widocznosc: kolumny.some((k) => k.pole === 'visibility'), relacje }
}
const rel = (pole: string, etykieta: string, kolekcja: string): PoleRelacji => ({ pole, etykieta, kolekcja })

export const LISTY: Record<string, KonfigListy> = {
    posts: lista('posts', 'wpisy', [T('tytuł'), W('kind', 'rodzaj'), X('date', 'data'), RR('spatial', 'miejsca', 'miejsca'), RR('subject', 'tematy', 'tematy'), WID],
        ['title', 'kind', 'date', 'spatial', 'visibility'], [rel('spatial', 'miejsca', 'miejsca'), rel('subject', 'tematy', 'tematy')]),
    miejsca: lista('miejsca', 'miejsca', [T(), R('isPartOf', 'należy do', 'miejsca'), W('type', 'rodzaj'), X('coordinates', 'współrzędne'), WID],
        ['title', 'isPartOf', 'type', 'visibility']),
    tematy: lista('tematy', 'tematy', [T(), W('type', 'rodzaj'), X('temporal', 'czas'), RR('spatial', 'miejsca', 'miejsca'), WID],
        ['title', 'type', 'temporal', 'visibility'], [rel('spatial', 'miejsca', 'miejsca')]),
    obiekty: lista('obiekty', 'obiekty w terenie', [T(), R('spatial', 'miejscowość', 'miejsca'), W('type', 'rodzaj'), X('temporal', 'czas'), RR('spatialAlso', 'także w', 'miejsca'), WID],
        ['title', 'spatial', 'type', 'visibility'], [rel('spatialAlso', 'także w miejscowościach', 'miejsca')]),
    materialy: lista('materialy', 'materiały (archiwum)', [T('tytuł'), W('type', 'rodzaj'), X('temporal', 'czas'), RR('spatial', 'miejsca', 'miejsca'), RR('collections', 'zbiory', 'zbiory'), RR('subject', 'tematy', 'tematy'), WID],
        ['title', 'type', 'temporal', 'spatial', 'collections', 'visibility'], [rel('collections', 'zbiory', 'zbiory'), rel('subject', 'tematy', 'tematy'), rel('spatial', 'miejsca', 'miejsca')]),
    zbiory: lista('zbiory', 'zbiory i kolekcje', [T(), X('provenance', 'pochodzenie'), WID], ['title', 'visibility']),
    publikacje: lista('publikacje', 'publikacje i opracowania', [T('tytuł'), W('type', 'rodzaj'), X('creator', 'autor'), X('year', 'rok'), RR('spatial', 'miejsca', 'miejsca'), WID],
        ['title', 'type', 'creator', 'year', 'visibility'], [rel('spatial', 'miejsca', 'miejsca'), rel('subject', 'tematy', 'tematy')]),
    parafie: lista('parafie', 'parafie i urzędy', [T(), R('seat', 'miejscowość', 'miejsca'), W('religion', 'wyznanie'), X('temporal', 'czas'), X('diocese', 'diecezja')],
        ['title', 'seat', 'religion', 'temporal']),
    hasla: lista('hasla', 'słownik', [T('hasło'), W('kind', 'rodzaj'), X('meaning', 'znaczenie'), RR('occurrence', 'występowanie', 'miejsca'), WID],
        ['title', 'kind', 'meaning', 'visibility'], [rel('occurrence', 'występowanie', 'miejsca')]),
    biogramy: lista('biogramy', 'osoby – biogramy', [T(), X('lead', 'jednym zdaniem')], ['title', 'lead']),
    zespoly: lista('zespoly', 'zespoły archiwalne', [T(), X('identifier', 'sygnatura'), X('repository', 'archiwum')], ['title', 'identifier', 'repository']),
    ksiegi: lista('ksiegi', 'księgi metrykalne', [T(), R('parish', 'instytucja', 'parafie'), { pole: 'types', etykieta: 'akty', rodzaj: 'wybory' }, X('years', 'lata'), X('identifier', 'sygnatura'), RR('spatial', 'miejscowości', 'miejsca'), WID],
        ['title', 'parish', 'types', 'years', 'visibility'], [rel('spatial', 'miejscowości', 'miejsca')]),
}

export const WIDOCZNOSCI: Record<string, string> = { publiczne: 'publiczne', bliscy: 'dla bliskich', ja: 'tylko ja' }

/** Kolumny widoczne wg ustawienia (kolejność i ukrycie); nieznane pola pomijane; pusta lista → domyślne. */
export function kolumnyWgUstawien(k: KonfigListy, ustawienie?: string[] | null): Kolumna[] {
    const znane = new Map(k.kolumny.map((c) => [c.pole, c]))
    const wybrane = (ustawienie ?? []).filter((p, i, t) => znane.has(p) && t.indexOf(p) === i)
    return (wybrane.length ? wybrane : k.domyslne).map((p) => znane.get(p)!).filter(Boolean)
}

export type AkcjaZbiorcza =
    | { rodzaj: 'widocznosc'; wartosc: 'publiczne' | 'bliscy' | 'ja' }
    | { rodzaj: 'dodaj-relacje' | 'usun-relacje'; pole: string; wartosc: string }
