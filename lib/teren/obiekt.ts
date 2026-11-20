// P7c (TER-04): obiekt ze skrzynki „z terenu” – czysta logika (bez fs): szkic pól z wpisu z telefonu, kontrola pól z podglądu,
// identyfikator, nagłówek pliku obiektu w formacie Keystatic (kolekcja `obiekty`, keystatic.config.ts).
// Decyzja właściciela 20.11.2026: przycisk „utwórz obiekt…” z podglądem; obiekt z widocznością „tylko ja” (najniższa – zasada 1.9),
// zdjęcia kopiowane (wpis w skrzynce zostaje), zapis jako operacja z „cofnij”.
import { identyfikatorZNazwy } from '../tekst'
import { nazwaRodzajuTerenu, opisBlisko, type MiejsceTerenu } from './miejsca'

/** Rodzaj z telefonu → rodzaj obiektu (klucze NAZWY_OBIEKTOW, lib/tarcze.ts). `null` – redakcja musi wybrać (cmentarz: 4 rodzaje). */
export const RODZAJ_OBIEKTU: Record<string, string | null> = {
    krzyz: 'krzyz', kapliczka: 'kapliczka', grob: 'mogila', cmentarz: null,
    budynek: 'budynek', slad: 'budynek', pomnik: 'pomnik', inne: 'inne',
}
/** Położenie z telefonu gorsze niż tyle metrów – obiekt „położenie przybliżone”. */
export const PROG_DOKLADNOSCI_M = 25
export const ADRES_ZDJEC_OBIEKTOW = '/pliki/obiekty/'

export interface PolaObiektu {
    nazwa: string
    rodzaj: string
    /** id miejscowości (pusty – bez miejscowości) */
    miejsce: string
    /** „52.21045, 22.71013” albo pusty */
    wspolrzedne: string
    przyblizone: boolean
    istnieje: boolean
    /** pliki zdjęć wpisu, które przechodzą do obiektu (kolejność jak we wpisie) */
    zdjecia: string[]
    /** autor zdjęć (podpis przy zdjęciu; można wyczyścić) */
    autor: string
}

const WSPOLRZEDNE = /^-?\d{1,2}(\.\d+)?,\s*-?\d{1,3}(\.\d+)?$/
const czysc = (x: unknown, maks: number) => (typeof x === 'string' ? x.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maks) : '')

/** Wstępne pola podglądu z wpisu z telefonu. */
export function szkicObiektu(m: MiejsceTerenu): PolaObiektu {
    const rodzaj = nazwaRodzajuTerenu(m.rodzaj)
    return {
        nazwa: m.nazwa || (m.blisko ? `${rodzaj} – ${m.blisko.nazwa}` : rodzaj),
        rodzaj: RODZAJ_OBIEKTU[m.rodzaj] ?? '',
        miejsce: m.blisko?.id ?? '',
        wspolrzedne: m.lat !== undefined && m.lon !== undefined ? `${m.lat.toFixed(5)}, ${m.lon.toFixed(5)}` : '',
        przyblizone: m.dokl === undefined || m.dokl > PROG_DOKLADNOSCI_M,
        istnieje: m.rodzaj !== 'slad',
        zdjecia: m.zdjecia.map((z) => z.plik),
        autor: m.imie,
    }
}

/** Kontrola pól z podglądu (dowolny JSON). Zwraca poprawione pola albo zdanie o błędzie prostym językiem. */
export function sprawdzPola(o: unknown, m: MiejsceTerenu, dozwolone: { rodzaje: string[]; miejsca: string[] }): PolaObiektu | string {
    const x = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>
    const nazwa = czysc(x.nazwa, 120)
    if (!nazwa) return 'Wpisz nazwę obiektu.'
    const rodzaj = czysc(x.rodzaj, 60)
    if (!dozwolone.rodzaje.includes(rodzaj)) return 'Wybierz rodzaj obiektu.'
    const miejsce = czysc(x.miejsce, 120)
    if (miejsce && !dozwolone.miejsca.includes(miejsce)) return 'Nie ma takiej miejscowości – wybierz z listy albo zostaw puste.'
    const wspolrzedne = czysc(x.wspolrzedne, 60)
    if (wspolrzedne && !WSPOLRZEDNE.test(wspolrzedne)) return 'Współrzędne w zapisie 52.2116, 22.7185 albo puste.'
    const wpis = new Set(m.zdjecia.map((z) => z.plik))
    const zdjecia = Array.isArray(x.zdjecia) ? [...new Set(x.zdjecia.filter((z): z is string => typeof z === 'string' && wpis.has(z)))] : []
    return {
        nazwa, rodzaj, miejsce, wspolrzedne, przyblizone: x.przyblizone === true, istnieje: x.istnieje !== false,
        zdjecia: m.zdjecia.map((z) => z.plik).filter((p) => zdjecia.includes(p)),
        autor: czysc(x.autor, 120).replace(/@/g, ''),
    }
}

/** Identyfikator jak w Keystatic (`obj-` + nazwa); zajęty – z miejscowością, potem z numerem. */
export function slugObiektu(nazwa: string, nazwaMiejsca: string, zajete: Set<string>): string {
    const baza = `obj-${identyfikatorZNazwy(nazwa) || 'obiekt'}`.slice(0, 80).replace(/-+$/, '')
    const kandydaci = [baza, ...(nazwaMiejsca && identyfikatorZNazwy(nazwaMiejsca) && !baza.endsWith(identyfikatorZNazwy(nazwaMiejsca)) ? [`${baza}-${identyfikatorZNazwy(nazwaMiejsca)}`] : [])]
    for (const k of kandydaci) if (!zajete.has(k)) return k
    const ostatni = kandydaci[kandydaci.length - 1]
    for (let n = 2; ; n++) if (!zajete.has(`${ostatni}-${n}`)) return `${ostatni}-${n}`
}

/** Nazwa pliku zdjęcia w katalogu obiektu: teren-1.jpg, teren-2.webp … (rozszerzenie z pliku wpisu). */
export function plikZdjeciaObiektu(i: number, plik: string): string {
    const ext = /\.([a-z0-9]{2,5})$/i.exec(plik)?.[1]?.toLowerCase() ?? 'jpg'
    return `teren-${i + 1}.${ext}`
}

/** Nagłówek pliku obiektu (pola Keystatic). Puste pola pominięte – czytnik Keystatic daje im wartości domyślne. */
export function naglowekObiektu(m: MiejsceTerenu, p: PolaObiektu, slug: string): Record<string, unknown> {
    const dzien = /^\d{4}-\d{2}-\d{2}/.test(m.czas) ? m.czas.slice(0, 10) : undefined
    const notatka = [
        `Z terenu (skrzynka „z terenu”, wpis ${m.id}): ${m.imie}${dzien ? `, ${dzien}` : ''}${m.dokl !== undefined ? `, położenie z telefonu ±${m.dokl} m` : ''}${m.blisko ? `, ${opisBlisko(m.blisko)}` : ''}.`,
        `Zgłoszone jako: ${nazwaRodzajuTerenu(m.rodzaj)}.`,
        ...(m.notatka ? [`Notatka z telefonu: ${m.notatka}`] : []),
    ].join('\n')
    return {
        title: p.nazwa,
        type: p.rodzaj,
        ...(p.miejsce ? { spatial: p.miejsce } : {}),
        ...(p.wspolrzedne ? { coordinates: p.wspolrzedne } : {}),
        approximate: p.przyblizone,
        exists: p.istnieje,
        ...(p.zdjecia.length ? {
            photos: p.zdjecia.map((f, i) => ({
                image: `${ADRES_ZDJEC_OBIEKTOW}${slug}/${plikZdjeciaObiektu(i, f)}`,
                ...(dzien ? { date: dzien.slice(0, 4) } : {}),
                ...(p.autor ? { creator: p.autor } : {}),
                focus: 'srodek',
            })),
        } : {}),
        visibility: 'ja',
        note: notatka,
        ...(dzien ? { dateSubmitted: dzien } : {}),
    }
}
