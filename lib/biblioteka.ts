// Biblioteka jako jeden katalog (jak archiwum): pozycje trzech działów (parafie i urzędy – instytucje w „miejscach”) w jednej liście, filtrowane frazą, działem i miejscowością.
// Czyste funkcje – bez Next/React; dane wczytuje strona i przekazuje tutaj (test: lib/biblioteka.test.ts).
import { przygotujZapytanie, pasuje } from './szukanie'
import { ksiegaDotyczyMiejsca, type KsiegaPowiazania, type MiejscePowiazania } from './ksiegi-powiazania'
import { RODZAJE_KSIAG } from './ksiegi'
import { stronicuj } from './stronicowanie'

export const DZIALY_BIBLIOTEKI = [
    { klucz: 'publikacje', nazwa: 'publikacje i opracowania', pozycja: 'publikacja', pelny: '/biblioteka/publikacje' },
    { klucz: 'ksiegi', nazwa: 'księgi metrykalne', pozycja: 'księga metrykalna', pelny: '/biblioteka/ksiegi' },
    { klucz: 'slownik', nazwa: 'słownik', pozycja: 'hasło słownika', pelny: '/biblioteka/slownik' },
] as const
export type DzialBiblioteki = (typeof DZIALY_BIBLIOTEKI)[number]['klucz']
export const dzialBiblioteki = (k: string | undefined) => DZIALY_BIBLIOTEKI.find((d) => d.klucz === k)
/** Działy przeniesione poza bibliotekę (stary adres `/biblioteka?dzial=…` → nowe miejsce). Uwaga właściciela 16.11:
 *  parafie i urzędy to instytucje w dziale „miejsca” (podmenu „instytucje”, /parafie), nie pozycje biblioteki. */
export const PRZENIESIONE_DZIALY: Record<string, string> = { parafie: '/parafie' }

/** Nazwy rodzajów publikacji w liczbie pojedynczej – wspólne dla listy biblioteki i podstrony publikacji. */
export const RODZAJE_PUBLIKACJI: Record<string, string> = { ksiazka: 'książka', artykul: 'artykuł', prasa: 'prasa', opracowanie: 'opracowanie', baza: 'baza / serwis' }
/** Rodzaje haseł słownika (dawniej w lib/archiwum – tam tylko ponowny eksport). */
export const RODZAJE_HASEL: Record<string, string> = { pojecie: 'pojęcie historyczne', gwara: 'gwara, słowo miejscowe', urzad: 'urząd, urzędnik', miara: 'miara, waluta', wyznanie: 'wyznanie, obrzęd' }

export interface PozycjaBiblioteki {
    dzial: DzialBiblioteki
    id: string
    tytul: string
    href: string
    /** rodzaj · autor · lata … – jedna linia pod tytułem */
    linia: string
    /** tekst przeszukiwany frazą */
    tekst: string
    /** id miejscowości, których pozycja dotyczy */
    miejsca: string[]
}

type Pub = { id: string; nazwa: string; rodzaj: string; autor: string; rok: string; wydawca: string; opis: string; miejsca: string[] }
type Ks = KsiegaPowiazania & { id: string; nazwa: string; rodzaje: string[]; lata: string; gdzie: string; sygnatura: string }
type Par = { id: string; nazwa: string; wyznanie: string; czas: string; siedziba: string | null; opis: string }
type Has = { id: string; haslo: string; rodzaj: string; znaczenie: string; formy: string[] }
type Msc = MiejscePowiazania & { nazwa: string }

/** Wszystkie pozycje biblioteki w kolejności działów; wewnątrz działu – kolejność, w jakiej podaje je źródło.
 *  `parafie` służą tylko do opisu ksiąg (nazwa instytucji w linii księgi). */
export function pozycjeBiblioteki(d: { publikacje: Pub[]; ksiegi: Ks[]; parafie: Par[]; hasla: Has[]; miejsca: Msc[] }): PozycjaBiblioteki[] {
    const nazwaPar = new Map(d.parafie.map((p) => [p.id, p.nazwa]))
    const linia = (...cz: (string | null | undefined | false)[]) => cz.filter(Boolean).join(' · ')
    return [
        ...d.publikacje.map((p): PozycjaBiblioteki => ({
            dzial: 'publikacje', id: p.id, tytul: p.nazwa, href: `/biblioteka/publikacje/${p.id}`,
            linia: linia(RODZAJE_PUBLIKACJI[p.rodzaj] ?? p.rodzaj, p.autor, p.rok),
            tekst: [p.nazwa, p.autor, p.rok, p.wydawca, p.opis].join(' '), miejsca: p.miejsca,
        })),
        ...d.ksiegi.map((k): PozycjaBiblioteki => ({
            dzial: 'ksiegi', id: k.id, tytul: k.nazwa, href: `/biblioteka/ksiegi?widok=parafie#${encodeURIComponent(k.parafia)}`,
            linia: linia(k.rodzaje.map((r) => RODZAJE_KSIAG[r] ?? r).join(', '), k.lata, nazwaPar.get(k.parafia)),
            tekst: [k.nazwa, k.lata, nazwaPar.get(k.parafia), k.gdzie, k.sygnatura].join(' '),
            miejsca: d.miejsca.filter((m) => ksiegaDotyczyMiejsca(k, m)).map((m) => m.id),
        })),
        ...d.hasla.map((h): PozycjaBiblioteki => ({
            dzial: 'slownik', id: h.id, tytul: h.haslo, href: `/biblioteka/slownik#${encodeURIComponent(h.id)}`,
            linia: RODZAJE_HASEL[h.rodzaj] ?? h.rodzaj,
            tekst: [h.haslo, ...h.formy, h.znaczenie].join(' '), miejsca: [],
        })),
    ]
}

export interface FiltrBiblioteki { q?: string; dzial?: string; miejsce?: string; strona?: number }
export interface WynikiBiblioteki { wyniki: PozycjaBiblioteki[]; razem: number; stron: number; strona: number }

/** Te same zasady co katalog archiwum: fraza z odmianą (przygotujZapytanie/pasuje), dział, miejscowość, to samo stronicowanie. */
export function filtrujBiblioteke(pozycje: PozycjaBiblioteki[], f: FiltrBiblioteki): WynikiBiblioteki {
    const z = przygotujZapytanie((f.q ?? '').slice(0, 100))
    const dzial = dzialBiblioteki(f.dzial)?.klucz
    const lista = pozycje.filter((p) =>
        (!dzial || p.dzial === dzial) &&
        (!f.miejsce || p.miejsca.includes(f.miejsce)) &&
        (!z || pasuje(z, p.tekst)))
    return stronicuj(lista, f.strona)
}
