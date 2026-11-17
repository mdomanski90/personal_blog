/**
 * WSP-02 (etap R): zadania „czego brakuje” na stronie /wspoltworz – WYŁĄCZNIE z danych publicznych
 * (miejsca/obiekty/materialy('publiczne'), objaśnienia przefiltrowane), nigdy z lib/panel/jakosc.ts (surowe pliki).
 * Definicja braku – lib/wspoltworz-reguly.ts (wspólna z panelem). Zadania pomija:
 *  - rekordy z polem „nie pokazuj w współtwórz” (contributeHide),
 *  - braki z decyzją „zignoruj” w panelu („do opracowania”, klucz `kolekcja:id:brak`).
 * Liczniki i grupy liczone są tylko z tych zadań – bez śladów treści niepublicznej (zasady 1.5, 1.6).
 * Ten plik – czyste funkcje (testy: lib/wspoltworz.test.ts); wczytanie danych – lib/wspoltworz-dane.ts.
 */
import type { Material, Miejsce, Obiekt } from './archiwum'
import { naTekst, rozdzielZrodla } from './markdoc'
import { RODZAJE_MATERIALOW } from './materialy'
import { formatujEdtf } from './edtf'
import { odmiana } from './tekst'
import { NAZWY_OBIEKTOW as RODZAJE_OBIEKTOW } from './tarcze'
import { brakiMaterialu, brakiMiejsca, brakiObiektu, etykietaBraku, jezyki, kluczZadania, RODZAJ_BRAKU, RODZAJE_ZADAN, type IdBraku, type RodzajZadania } from './wspoltworz-reguly'

export interface Zadanie {
    /** `kolekcja:id:brak` – ten sam co klucz decyzji w panelu i parametr ?uzupelnij= */
    klucz: string
    kolekcja: 'materialy' | 'obiekty' | 'miejsca' | 'plany'
    id: string
    brak: IdBraku
    rodzaj: RodzajZadania
    tytul: string
    href: string
    /** rodzaj · data · miejscowość */
    linia: string
    etykieta: string
    /** identyfikatory miejscowości (filtr) */
    miejsca: string[]
    jezyki: string[]
    /** materiały ze skanem – adres miniatury i kadr */
    obraz?: string
    kadr?: string
}

const maTekst = (n: Material['opis']) => naTekst(n).trim().length > 0

/** Zadania jednego materiału (publicznego). Eksport dla testów. */
export function zadaniaMaterialu(m: Material, odczytyNaSkanie: { odczyt: boolean; tlumaczenie: boolean }, nazwaMiejsca: (id: string) => string): Zadanie[] {
    const cz = rozdzielZrodla(m.opis)
    const dane = {
        rodzaj: m.rodzaj, maSkan: m.strony.length > 0,
        maTranskrypcje: !!cz.transkrypcja || !!cz.oryginal || !!m.transkrypcja.trim() || odczytyNaSkanie.odczyt,
        maTlumaczenie: !!cz.tlumaczenie || odczytyNaSkanie.tlumaczenie,
        jezyk: m.jezyk, maCzas: !!m.czas.trim(), maMiejsca: m.miejsca.length > 0, maOpis: maTekst(cz.reszta),
    }
    const s0 = m.strony[0]
    return brakiMaterialu(dane).map((b) => ({
        klucz: kluczZadania('materialy', m.id, b), kolekcja: 'materialy', id: m.id, brak: b, rodzaj: RODZAJ_BRAKU[b],
        tytul: m.nazwa, href: `/archiwum/${m.id}`,
        linia: [RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj, m.czas && formatujEdtf(m.czas), m.miejsca.map(nazwaMiejsca).filter(Boolean)[0]].filter(Boolean).join(' · '),
        etykieta: etykietaBraku(b, { jezyk: m.jezyk, zdjecie: dane }),
        miejsca: m.miejsca, jezyki: jezyki(m.jezyk),
        ...(s0 ? { obraz: s0.adres.startsWith('/pliki/strony/') ? `${s0.adres}?w=480` : s0.adres, kadr: m.kadr } : {}),
    }))
}

export function zadaniaObiektu(o: Obiekt, nazwaMiejsca: (id: string) => string): Zadanie[] {
    return brakiObiektu({ maOpis: maTekst(o.opis), maWspolrzedne: !!o.wspolrzedne, maZdjecie: o.zdjecia.length > 0, istnieje: o.istnieje }).map((b) => ({
        klucz: kluczZadania('obiekty', o.id, b), kolekcja: 'obiekty', id: o.id, brak: b, rodzaj: RODZAJ_BRAKU[b],
        tytul: o.nazwa, href: `/obiekty/${o.id}`,
        linia: [RODZAJE_OBIEKTOW[o.rodzaj] ?? o.rodzaj, o.miejsce && nazwaMiejsca(o.miejsce)].filter(Boolean).join(' · '),
        etykieta: etykietaBraku(b), miejsca: o.miejsca, jezyki: [],
    }))
}

export function zadaniaMiejsca(m: Miejsce, nazwaMiejsca: (id: string) => string, nazwaRodzaju: string, obszar: boolean): Zadanie[] {
    return brakiMiejsca({ rodzaj: m.rodzaj, maOpis: maTekst(m.opis) }).map((b) => ({
        klucz: kluczZadania('miejsca', m.id, b), kolekcja: 'miejsca', id: m.id, brak: b, rodzaj: RODZAJ_BRAKU[b],
        tytul: m.nazwa, href: `/miejsca/${m.id}`,
        linia: [nazwaRodzaju, m.nalezyDo && nazwaMiejsca(m.nalezyDo)].filter(Boolean).join(' · '),
        etykieta: etykietaBraku(b, { obszar }), miejsca: [m.id], jezyki: [],
    }))
}

/** Odfiltrowanie decyzji redakcji (pole na rekordzie + „zignoruj” w panelu). Eksport dla testów. */
export function bezWylaczonych(z: Zadanie[], wylaczoneRekordy: Set<string>, zignorowane: Set<string>): Zadanie[] {
    return z.filter((x) => !wylaczoneRekordy.has(`${x.kolekcja}:${x.id}`) && !zignorowane.has(x.klucz))
}

/**
 * Zebranie zadań z gotowych list – ZAWSZE tylko rekordy publiczne (druga zapora obok filtra wczytywania),
 * bez rekordów z polem „nie pokazuj w współtwórz” i bez braków „zignorowanych” w panelu. Eksport dla testów.
 */
export function zbierzZadania(d: {
    materialy: Material[]; obiekty: Obiekt[]; miejsca: Miejsce[]; zignorowane: Set<string>
    odczyty: (id: string) => { odczyt: boolean; tlumaczenie: boolean }
    rodzajMiejsca: (m: Miejsce) => { nazwa: string; obszar: boolean }
    /** WSP-06: plany publiczne (w wersji dla czytelnika publicznego) z liczbą grobów, których napis czeka na odczyt */
    plany?: { slug: string; tytul: string; widocznosc: string; miejsce?: string; doOdczytania: number }[]
}): Zadanie[] {
    const pub = <T extends { widocznosc: string }>(l: T[]) => l.filter((x) => x.widocznosc === 'publiczne')
    const msc = pub(d.miejsca), mats = pub(d.materialy), obs = pub(d.obiekty)
    // nazwy tylko miejscowości publicznych – niepubliczna nie wycieka przez linię pozycji
    const nazwy = new Map(msc.map((m) => [m.id, m.nazwa]))
    const nazwa = (id: string) => nazwy.get(id) ?? ''
    const wyl = new Set([...mats.filter((m) => m.bezWspoltworz).map((m) => `materialy:${m.id}`), ...obs.filter((o) => o.bezWspoltworz).map((o) => `obiekty:${o.id}`), ...msc.filter((m) => m.bezWspoltworz).map((m) => `miejsca:${m.id}`)])
    const wyn: Zadanie[] = []
    for (const m of mats) wyn.push(...zadaniaMaterialu(m, d.odczyty(m.id), nazwa))
    for (const o of obs) wyn.push(...zadaniaObiektu(o, nazwa))
    for (const m of msc) { const r = d.rodzajMiejsca(m); wyn.push(...zadaniaMiejsca(m, nazwa, r.nazwa, r.obszar)) }
    // WSP-06: jedno zadanie na plan (nie na grób) – „N napisów do odczytania”, prowadzi do przeglądarki z listą tych grobów
    for (const p of d.plany ?? []) {
        if (p.widocznosc !== 'publiczne' || p.doOdczytania < 1) continue
        const b = 'napisy-do-odczytania' as const
        wyn.push({ klucz: kluczZadania('plany', p.slug, b), kolekcja: 'plany', id: p.slug, brak: b, rodzaj: RODZAJ_BRAKU[b], tytul: p.tytul, href: `/plany/${p.slug}?napisy=1`,
            linia: [nazwa(p.miejsce ?? ''), 'plan cmentarza'].filter(Boolean).join(' · '), etykieta: odmiana(p.doOdczytania, ['napis do odczytania', 'napisy do odczytania', 'napisów do odczytania']), miejsca: p.miejsce ? [p.miejsce] : [], jezyki: [] })
    }
    // filtr miejscowości (zadania.miejsca) – tylko publiczne
    return bezWylaczonych(wyn, wyl, d.zignorowane).map((z) => ({ ...z, miejsca: z.miejsca.filter((id) => nazwy.has(id)) }))
}

/** Kolejność grup na stronie. */
export const KOLEJNOSC_GRUP = Object.keys(RODZAJE_ZADAN) as RodzajZadania[]

/** Ile pozycji w próbce grupy w widoku „wszystkie”: miniatury – jeden rząd (5 przy 1160 px), listy – 6 wierszy. */
export const PROBKA = { siatka: 5, lista: 6 } as const
export const jestSiatka = (r: RodzajZadania) => r === 'do-odczytania' || r === 'do-przetlumaczenia' || r === 'zdjecia'

/** Próbka grupy zmieniana raz dziennie (stała w ciągu doby, ta sama dla każdego czytelnika). */
export function probkaDnia<T extends { klucz: string }>(lista: T[], ile: number, dzien = new Date()): T[] {
    if (lista.length <= ile) return lista
    let ziarno = dzien.getUTCFullYear() * 1000 + Math.floor((Date.UTC(dzien.getUTCFullYear(), dzien.getUTCMonth(), dzien.getUTCDate()) - Date.UTC(dzien.getUTCFullYear(), 0, 1)) / 86400000)
    const los = () => { ziarno = (ziarno * 1103515245 + 12345) % 2147483648; return ziarno / 2147483648 }
    const l = [...lista].sort((a, b) => a.klucz.localeCompare(b.klucz))
    for (let a = l.length - 1; a > 0; a--) { const b = Math.floor(los() * (a + 1)); [l[a], l[b]] = [l[b], l[a]] }
    return l.slice(0, ile)
}

/** Kontekst formularza z ?uzupelnij=… – tylko dla istniejącego zadania publicznego (inaczej null: formularz bez kontekstu). */
export function kontekstUzupelnienia(lista: Zadanie[], klucz: string | undefined): { zadanie: Zadanie; czegoDotyczy: string } | null {
    if (!klucz) return null
    const z = lista.find((x) => x.klucz === klucz)
    return z ? { zadanie: z, czegoDotyczy: `${z.tytul} · ${z.etykieta}` } : null
}
