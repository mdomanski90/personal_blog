// Łatka 21.11 (decyzja właściciela): nowa pozycja z opracowaną kartą – materiał archiwum, pozycja leksykonu, obiekt w terenie,
// miejscowość – sama pojawia się na stronie głównej wśród ostatnio dodanych, jako zapowiedź jak wpis; „czytaj dalej” prowadzi do karty.
// Bez osobnego wpisu, który dublowałby kartę. Wpis piszemy tylko wtedy, gdy dochodzi coś nowego.
import type { Node } from '@markdoc/markdoc'
import type { Material, Miejsce, Obiekt, Opowiesc, Temat, Widocznosc } from './archiwum'

/** Tyle znaków tekstu (bez przypisów źródeł) musi mieć opis, żeby karta liczyła się jako opracowana. */
export const MIN_OPISU = 120

export interface Nowosc {
    typ: 'nowosc'
    klucz: string
    /** „nowe w archiwum”, „nowe w leksykonie”… – pierwsza część metryczki */
    etykieta: string
    /** dalsze części metryczki: rodzaj, czas, pochodzenie */
    linia: string[]
    tytul: string
    href: string
    /** data „Dodano” (RRRR-MM-DD) – kolejność razem z wpisami */
    data: string
    /** opis bez wstawek źródeł (transkrypcja, tłumaczenie) – z niego zajawka */
    opis: Node | null
    miejsca: string[]
    tematy: string[]
    /** materiał albo obiekt z obrazem do miniatury */
    obraz?: { strony: { adres: string }[]; plik?: string | null; kadr?: string }
}

type Zrodla = { materialy: Material[]; tematy: Temat[]; obiekty: Obiekt[]; miejsca: Miejsce[] }
type Pomocnicze = {
    tekst: (n: Node | null) => string
    reszta: (n: Node | null) => Node | null
    rodzajMaterialu: (r: string) => string
    rodzajTematu: (r: string) => string
    rodzajObiektu: (r: string) => string
    rodzajMiejsca: (r: string) => string
    czas: (c: string) => string
}

/** Pozycje do zapowiedzi: z datą „Dodano”, nieodznaczone („Zapowiedź na stronie głównej”), z opisem co najmniej MIN_OPISU znaków. */
export function wybierzNowosci(z: Zrodla, p: Pomocnicze): Nowosc[] {
    const wyn: Nowosc[] = []
    const dobra = (x: { dodano: string | null; naGlownej?: boolean }, opis: Node | null) => !!x.dodano && /^\d{4}-\d{2}-\d{2}/.test(x.dodano) && x.naGlownej !== false && p.tekst(opis).length >= MIN_OPISU
    for (const m of z.materialy) {
        const opis = p.reszta(m.opis)
        if (!dobra(m, opis)) continue
        wyn.push({ typ: 'nowosc', klucz: `material:${m.id}`, etykieta: 'nowe w archiwum', linia: [p.rodzajMaterialu(m.rodzaj), m.czas ? p.czas(m.czas) : '', m.przekazal].filter(Boolean),
            tytul: m.nazwa, href: `/archiwum/${m.id}`, data: m.dodano!.slice(0, 10), opis, miejsca: m.miejsca, tematy: m.tematy, obraz: { strony: m.strony, plik: m.plik, kadr: m.kadr } })
    }
    for (const t of z.tematy) {
        if (!dobra(t, t.opis)) continue
        wyn.push({ typ: 'nowosc', klucz: `temat:${t.id}`, etykieta: 'nowe w leksykonie', linia: [p.rodzajTematu(t.rodzaj), t.czas ? p.czas(t.czas) : ''].filter(Boolean),
            tytul: t.nazwa, href: `/leksykon/${t.id}`, data: t.dodano!.slice(0, 10), opis: t.opis, miejsca: t.miejsca, tematy: [] })
    }
    for (const o of z.obiekty) {
        if (!dobra(o, o.opis)) continue
        const f = o.zdjecia[0]
        wyn.push({ typ: 'nowosc', klucz: `obiekt:${o.id}`, etykieta: 'nowe w terenie', linia: [p.rodzajObiektu(o.rodzaj), o.czas ? p.czas(o.czas) : ''].filter(Boolean),
            tytul: o.nazwa, href: `/obiekty/${o.id}`, data: o.dodano!.slice(0, 10), opis: o.opis, miejsca: o.miejsca, tematy: [], ...(f ? { obraz: { strony: [], plik: f.plik, kadr: f.kadr } } : {}) })
    }
    for (const m of z.miejsca) {
        if (!dobra(m, m.opis)) continue
        wyn.push({ typ: 'nowosc', klucz: `miejsce:${m.id}`, etykieta: 'nowe miejsce', linia: [p.rodzajMiejsca(m.rodzaj)].filter(Boolean),
            tytul: m.nazwa, href: `/miejsca/${m.id}`, data: m.dodano!.slice(0, 10), opis: m.opis, miejsca: [], tematy: [] })
    }
    return wyn.sort((a, b) => b.data.localeCompare(a.data) || a.tytul.localeCompare(b.tytul, 'pl'))
}

/** Wpisy i nowości razem, od najnowszych (data wpisu / data „Dodano”); przy tej samej dacie wpis pierwszy. */
export function scalZWpisami(wpisy: Opowiesc[], nowosci: Nowosc[], ile: number): (Opowiesc | Nowosc)[] {
    const data = (x: Opowiesc | Nowosc) => ('typ' in x ? x.data : (x.data ?? '')).slice(0, 10)
    return [...wpisy, ...nowosci].map((x, i) => ({ x, i }))
        .sort((a, b) => data(b.x).localeCompare(data(a.x)) || Number('typ' in a.x) - Number('typ' in b.x) || a.i - b.i)
        .slice(0, ile).map((e) => e.x)
}

export async function nowosci(poziom: Widocznosc): Promise<Nowosc[]> {
    const a = await import('./archiwum')
    const { naTekst, rozdzielZrodla } = await import('./markdoc')
    const { formatujEdtf } = await import('./edtf')
    const { NAZWY_OBIEKTOW } = await import('./tarcze')
    const { RODZAJE_MATERIALOW } = await import('./materialy')
    const [materialy, tematy, obiekty, miejsca] = await Promise.all([a.materialy(poziom), a.tematy(poziom), a.obiekty(poziom), a.miejsca(poziom)])
    return wybierzNowosci({ materialy, tematy, obiekty, miejsca }, {
        tekst: (n) => naTekst(n).trim(),
        reszta: (n) => rozdzielZrodla(n).reszta,
        rodzajMaterialu: (r) => RODZAJE_MATERIALOW[r] ?? r,
        rodzajTematu: (r) => a.RODZAJE_TEMATOW[r] ?? r,
        rodzajObiektu: (r) => NAZWY_OBIEKTOW[r] ?? r,
        rodzajMiejsca: (r) => a.RODZAJE_MIEJSC[r] ?? r,
        czas: (c) => formatujEdtf(c),
    })
}
