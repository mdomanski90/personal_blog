/**
 * WSP-02 (etap R, decyzja właściciela 17.11): JEDNA definicja braku dla panelu („do opracowania”, lib/panel/jakosc.ts)
 * i strony /wspoltworz (lib/wspoltworz.ts). Czyste funkcje na danych minimalnych – panel podaje je z surowych plików,
 * strona z danych przefiltrowanych dla czytelnika (dlatego wynik publiczny nigdy nie dotyka rekordów niepublicznych).
 * Brak pola to zaproszenie do pomocy, nie dowód błędu historycznego.
 */
import { normalizuj } from './tekst'

/** Identyfikatory braków – te same co reguły panelu (klucz decyzji „zignoruj”: `kolekcja:rekord:regula`). */
export type IdBraku = 'brak-transkrypcji' | 'brak-tlumaczenia' | 'zdjecie-do-rozpoznania' | 'bez-opisu' | 'brak-wspolrzednych' | 'brak-zdjecia-obiektu' | 'napisy-do-odczytania'

/** Rodzaj zadania na stronie „współtwórz” (grupa i filtr) – kolejność grup na stronie. */
export type RodzajZadania = 'do-odczytania' | 'do-przetlumaczenia' | 'zdjecia' | 'napisy' | 'bez-opisu' | 'mapa'
export const RODZAJE_ZADAN: Record<RodzajZadania, { nazwa: string; filtr: string; opis: string; gotowe: string }> = {
    'do-odczytania': { nazwa: 'dokumenty do odczytania', filtr: 'do odczytania', opis: 'Skany bez transkrypcji.', gotowe: 'wszystkie dokumenty ze skanem mają transkrypcję.' },
    'do-przetlumaczenia': { nazwa: 'do przetłumaczenia', filtr: 'do przetłumaczenia', opis: 'Odczytane dokumenty w językach obcych, które czekają na tłumaczenie.', gotowe: 'wszystkie odczytane dokumenty mają tłumaczenie.' },
    zdjecia: { nazwa: 'zdjęcia do rozpoznania', filtr: 'zdjęcia do rozpoznania', opis: 'Może wiesz kto jest na zdjęciu, gdzie lub kiedy je zrobiono?', gotowe: 'wszystkie zdjęcia mają opis, datę i miejsce.' },
    // WSP-06 (etap 3): groby ze zdjęciem nagrobka, bez odczytanego napisu – tylko groby z napisem jawnym (bez progu lat i „ukryj napis”)
    napisy: { nazwa: 'napisy z nagrobków do odczytania', filtr: 'napisy z nagrobków', opis: 'Zdjęcia nagrobków, z których nie odczytano jeszcze napisu. Otwórz plan, wybierz grób i porównaj zdjęcie z napisem.', gotowe: 'wszystkie sfotografowane nagrobki mają odczytany napis.' },
    'bez-opisu': { nazwa: 'miejsca i obiekty bez opisu', filtr: 'bez opisu', opis: 'Strony, na których nie ma jeszcze historii – wystarczy kilka zdań, wspomnienie albo wskazanie źródła.', gotowe: 'wszystkie miejsca i obiekty mają opis.' },
    mapa: { nazwa: 'brakuje na mapie', filtr: 'mapa', opis: 'Obiekty bez położenia albo bez zdjęcia. Możesz też zgłosić miejsce, którego jeszcze nie ma.', gotowe: 'wszystkie obiekty mają położenie i zdjęcie.' },
}
/** Rodzaj zgłoszenia otwieranego przy „uzupełnij” (lib/zgloszenia.ts). */
export const ZGLOSZENIE_BRAKU: Record<IdBraku, 'odczyt' | 'rozpoznanie' | 'poprawka' | 'material'> = {
    'brak-transkrypcji': 'odczyt', 'brak-tlumaczenia': 'odczyt', 'zdjecie-do-rozpoznania': 'rozpoznanie',
    'bez-opisu': 'poprawka', 'brak-wspolrzednych': 'poprawka', 'brak-zdjecia-obiektu': 'material', 'napisy-do-odczytania': 'odczyt',
}
export const RODZAJ_BRAKU: Record<IdBraku, RodzajZadania> = {
    'brak-transkrypcji': 'do-odczytania', 'brak-tlumaczenia': 'do-przetlumaczenia', 'zdjecie-do-rozpoznania': 'zdjecia',
    'bez-opisu': 'bez-opisu', 'brak-wspolrzednych': 'mapa', 'brak-zdjecia-obiektu': 'mapa', 'napisy-do-odczytania': 'napisy',
}

/** Rodzaje materiałów, których skan czeka na odczyt (zdjęcia, mapy i nagrania – nie). */
const DO_ODCZYTU = new Set(['dokument', 'akt'])

export interface DaneMaterialuDoBrakow {
    rodzaj: string
    /** skan (strony albo plik-obraz) */
    maSkan: boolean
    /** transkrypcja: znacznik zrodlo „transkrypcja” / „oryginal”, pole „transkrypcja do wyszukiwania” albo odczyty na skanie */
    maTranskrypcje: boolean
    maTlumaczenie: boolean
    jezyk: string
    maCzas: boolean
    maMiejsca: boolean
    /** opis poza transkrypcją i tłumaczeniem */
    maOpis: boolean
}
export interface DaneObiektuDoBrakow { maOpis: boolean; maWspolrzedne: boolean; maZdjecie: boolean; istnieje: boolean }
export interface DaneMiejscaDoBrakow { rodzaj: string; maOpis: boolean }

/** Języki z pola „język” (np. „łacina, polski”) – małe litery, bez pustych. */
export function jezyki(jezyk: string): string[] {
    return jezyk.split(/[,;/]|\si\s/).map((x) => x.trim().toLocaleLowerCase('pl')).filter(Boolean)
}
const polski = (j: string) => normalizuj(j).startsWith('pol')

export function brakiMaterialu(d: DaneMaterialuDoBrakow): IdBraku[] {
    const w: IdBraku[] = []
    if (d.maSkan && DO_ODCZYTU.has(d.rodzaj) && !d.maTranskrypcje) w.push('brak-transkrypcji')
    // tłumaczenie tylko dla odczytanych dokumentów z podanym językiem innym niż polski (pusty język – nie zgadujemy)
    if (d.maTranskrypcje && !d.maTlumaczenie && jezyki(d.jezyk).some((j) => !polski(j))) w.push('brak-tlumaczenia')
    if (d.rodzaj === 'zdjecie' && (!d.maOpis || !d.maCzas || !d.maMiejsca)) w.push('zdjecie-do-rozpoznania')
    return w
}

export function brakiObiektu(d: DaneObiektuDoBrakow): IdBraku[] {
    const w: IdBraku[] = []
    if (!d.maOpis) w.push('bez-opisu')
    if (!d.maWspolrzedne) w.push('brak-wspolrzednych')
    // obiekt, którego już nie ma, nie prosi o zdjęcie z dzisiaj (decyzja 17.11)
    if (d.istnieje && !d.maZdjecie) w.push('brak-zdjecia-obiektu')
    return w
}

/** Miejscowości bez historii; krainy i gminy (obszary) – tylko opis. */
export function brakiMiejsca(d: DaneMiejscaDoBrakow): IdBraku[] {
    return d.maOpis ? [] : ['bez-opisu']
}

/** Etykieta braku przy pozycji (neutralna – brak to zaproszenie, nie ostrzeżenie). */
export function etykietaBraku(b: IdBraku, kontekst: { jezyk?: string; zdjecie?: { maOpis: boolean; maCzas: boolean; maMiejsca: boolean }; obszar?: boolean } = {}): string {
    const jez = kontekst.jezyk ? jezyki(kontekst.jezyk) : []
    switch (b) {
        case 'brak-transkrypcji': return ['brak transkrypcji', ...jez].join(' · ')
        case 'brak-tlumaczenia': return ['brak tłumaczenia', ...jez.filter((j) => !polski(j))].join(' · ')
        case 'zdjecie-do-rozpoznania': {
            const z = kontekst.zdjecie
            const pyt = z ? [!z.maOpis && 'kto jest na zdjęciu?', !z.maCzas && 'kiedy?', !z.maMiejsca && 'gdzie?'].filter(Boolean) : []
            return pyt.length ? pyt.join(' · ') : 'do rozpoznania'
        }
        case 'bez-opisu': return kontekst.obszar === false ? 'brak historii' : 'brak opisu'
        case 'brak-wspolrzednych': return 'brak położenia'
        case 'brak-zdjecia-obiektu': return 'brak zdjęcia z dzisiaj'
        case 'napisy-do-odczytania': return 'napisy do odczytania'
    }
}

/** Opisy reguł w panelu „do opracowania” (lib/panel/jakosc.ts). */
export const OPISY_PANELU: Record<'brak-transkrypcji' | 'brak-tlumaczenia' | 'zdjecie-do-rozpoznania' | 'brak-zdjecia-obiektu', [string, string]> = {
    'brak-transkrypcji': ['Skan bez transkrypcji (współtwórz)', 'Pokazywane publicznie w „współtwórz” jako dokument do odczytania. „Zignoruj” ukrywa zadanie na stronie.'],
    'brak-tlumaczenia': ['Transkrypcja w języku obcym bez tłumaczenia (współtwórz)', 'Pokazywane publicznie w „współtwórz”. „Zignoruj” ukrywa zadanie na stronie.'],
    'zdjecie-do-rozpoznania': ['Zdjęcie bez opisu, daty albo miejsca (współtwórz)', 'Pokazywane publicznie w „współtwórz” jako zdjęcie do rozpoznania. „Zignoruj” ukrywa zadanie na stronie.'],
    'brak-zdjecia-obiektu': ['Obiekt bez zdjęcia (współtwórz)', 'Pokazywane publicznie w „współtwórz” (brakuje na mapie). Obiekty, których już nie ma, są pomijane.'],
}

/** Klucz zadania w adresie (?uzupelnij=…): `kolekcja:id:brak` – ten sam co klucz decyzji w panelu. */
export const kluczZadania = (kolekcja: 'materialy' | 'obiekty' | 'miejsca' | 'plany', id: string, brak: IdBraku) => `${kolekcja}:${id}:${brak}`

// ---- odczyt z surowego tekstu Markdoc (panel czyta pliki bez parsera Markdoc) ----
const ZRODLO = /\{%\s*zrodlo\b[^%]*%\}[\s\S]*?\{%\s*\/zrodlo\s*%\}/g
export function zrodlaWTekscie(tekst: string): { transkrypcja: boolean; tlumaczenie: boolean; opis: boolean } {
    const rodzaje = [...tekst.matchAll(/\{%\s*zrodlo\b([^%]*)%\}/g)].map((m) => /rodzaj\s*=\s*"([^"]*)"/.exec(m[1])?.[1] ?? 'transkrypcja')
    return {
        transkrypcja: rodzaje.some((r) => r === 'transkrypcja' || r === 'oryginal'),
        tlumaczenie: rodzaje.includes('tlumaczenie'),
        opis: tekst.replace(ZRODLO, '').replace(/\{%[^%]*%\}/g, '').trim().length > 0,
    }
}

/** Rodzaje formularza zgłoszenia (te same co RodzajZgloszenia w lib/zgloszenia.ts – tu bez zależności serwerowych). */
export type RodzajFormularza = 'poprawka' | 'miejsce' | 'material' | 'odczyt' | 'wspomnienie' | 'rozpoznanie' | 'haslo'

/** „w czym chcesz pomóc” na stronie „współtwórz” – kolejność z planszy właściciela (16.11). */
export const POMOC: { rodzaj: RodzajFormularza; etykieta: string }[] = [
    { rodzaj: 'material', etykieta: 'udostępnię zdjęcie, dokument, nagranie' },
    { rodzaj: 'wspomnienie', etykieta: 'opowiem wspomnienie' },
    { rodzaj: 'rozpoznanie', etykieta: 'rozpoznaję osobę, miejsce albo rok' },
    { rodzaj: 'odczyt', etykieta: 'odczytam albo przetłumaczę dokument' },
    { rodzaj: 'miejsce', etykieta: 'dodam miejsce do mapy' },
    { rodzaj: 'poprawka', etykieta: 'poprawka albo uzupełnienie' },
    // SLW-01 (P2): zgłoszenie hasła do słownika (fiszka-zaproszenie w słowniku)
    { rodzaj: 'haslo', etykieta: 'zgłoszę hasło do słownika' },
]
