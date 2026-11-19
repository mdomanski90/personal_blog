// P7b (TER-01): praca „w terenie” – pojedyncze czynności na grobie zamiast zapisu całego planu.
// Czysta logika (bez plików): odczyt czynności z żądania, nałożenie jej na aktualny plan, plan przygotowany dla konta terenowego.
// Zasady (decyzje 19.11): konto tylko terenowe zapisuje zdjęcie, napis i notatkę od razu, a grób dostaje znak „z terenu –
// do sprawdzenia” (pole robocze `zTerenu`); „sprawdzony” stawia wyłącznie konto z działem „plany”. Gdy napis zmienił w tym
// czasie ktoś inny – plan zostaje bez zmian, obie wersje trafiają do dziennika i wybiera redakcja.
import { dlaCzytelnika, type Element, type Plan, type Widocznosc } from '../plany/model'
import { numerTekst, numeryPlanu } from '../plany/numeracja'
import { etapElementu, poZmianieDanych } from '../plany/statusy'
import { katalog, typGrobu, type UstawieniaPlanow } from '../plany/typy'

export type Czynnosc =
    | { id: string; rodzaj: 'zdjecie'; grob: string; plik: string; lat?: number; lon?: number; data?: string }
    | { id: string; rodzaj: 'napis'; grob: string; napis: string; podstawa?: string }
    | { id: string; rodzaj: 'notatka'; grob: string; tekst: string }
    | { id: string; rodzaj: 'sprawdzony'; grob: string }
export type RodzajCzynnosci = Czynnosc['rodzaj']
export const NAZWA_CZYNNOSCI: Record<RodzajCzynnosci, string> = { zdjecie: 'zdjęcie', napis: 'napis z nagrobka', notatka: 'notatka', sprawdzony: '„sprawdzony”' }

/** Kto wykonuje czynność: `pelne` = konto z działem „plany” (redaktor w terenie), inaczej konto tylko terenowe. */
export interface KtoWTerenie { id: string; imie: string; pelne: boolean }

export interface WpisDziennika {
    /** identyfikator czynności nadany w telefonie – ponowna wysyłka tej samej czynności niczego nie dubluje */
    id: string
    czas: string
    kto: string
    imie: string
    rodzaj: RodzajCzynnosci
    grob: string
    /** numer grobu w chwili zapisu (kwatera · rząd · miejsce) – do list bez otwierania planu */
    numer?: string
    wynik: 'zapisano' | 'do-decyzji'
    /** napis: wersja z terenu; przy „do decyzji” także `bylo` – wersja, którą w tym czasie zapisała redakcja */
    napis?: string
    bylo?: string
    plik?: string
    tekst?: string
    /** „do decyzji” rozstrzygnięte przez redakcję: którą wersję zostawiono, kto i kiedy */
    rozstrzygnieto?: { wybor: 'teren' | 'redakcja'; kto: string; czas: string }
}

const ID_OK = /^[A-Za-z0-9_-]{8,64}$/
const czysc = (x: unknown, maks: number) => (typeof x === 'string' ? x.normalize('NFC').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, maks) : '')
const liczba = (x: unknown, min: number, maks: number) => (typeof x === 'number' && Number.isFinite(x) && x >= min && x <= maks ? +x.toFixed(6) : undefined)

/** Czynność z żądania (JSON albo pola formularza); zwraca ją albo zdanie o błędzie. */
export function odczytajCzynnosc(j: unknown): Czynnosc | string {
    if (!j || typeof j !== 'object') return 'Brak danych czynności.'
    const o = j as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id : '', grob = czysc(o.grob, 80)
    if (!ID_OK.test(id)) return 'Czynność bez identyfikatora.'
    if (!grob) return 'Nie wskazano grobu.'
    if (o.rodzaj === 'zdjecie') {
        const plik = czysc(o.plik, 120)
        if (!/^[\w-]+(\.[\w-]+)*$/.test(plik)) return 'Brak pliku zdjęcia.'
        const lat = liczba(o.lat, -90, 90), lon = liczba(o.lon, -180, 180), data = czysc(o.data, 19)
        return { id, rodzaj: 'zdjecie', grob, plik, ...(lat !== undefined && lon !== undefined ? { lat, lon } : {}), ...(/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d)?$/.test(data) ? { data } : {}) }
    }
    if (o.rodzaj === 'napis') {
        if (typeof o.napis !== 'string') return 'Brak napisu.'
        return { id, rodzaj: 'napis', grob, napis: czysc(o.napis, 4000), ...(typeof o.podstawa === 'string' ? { podstawa: czysc(o.podstawa, 4000) } : {}) }
    }
    if (o.rodzaj === 'notatka') {
        const tekst = czysc(o.tekst, 1000)
        return tekst ? { id, rodzaj: 'notatka', grob, tekst } : 'Notatka jest pusta.'
    }
    if (o.rodzaj === 'sprawdzony') return { id, rodzaj: 'sprawdzony', grob }
    return 'Nieznana czynność.'
}

export type WynikCzynnosci =
    | { plan: Plan; wpis: WpisDziennika; zmieniono: boolean }
    | { blad: string; status: 403 | 404 | 422 }

/**
 * Nakłada czynność na aktualny plan. Nie zapisuje – zwraca nowy plan (bez podbicia wersji) i wpis do dziennika.
 * `zmieniono: false` – plan zostaje, jak był (napis „do decyzji” albo czynność, która niczego nie zmienia).
 */
export function zastosujCzynnosc(plan: Plan, cz: Czynnosc, kto: KtoWTerenie, u: UstawieniaPlanow, teraz = new Date()): WynikCzynnosci {
    const typy = katalog(u)
    const e = plan.elementy.find((x) => x.id === cz.grob)
    // konto tylko terenowe nie dotyka elementów „tylko ja” – nie widzi ich też na planie (planDlaTerenu)
    if (!e || !typGrobu(typy.get(e.typ)) || (!kto.pelne && e.widocznosc === 'ja')) return { blad: 'Nie ma takiego grobu na tym planie.', status: 404 }
    const czas = teraz.toISOString(), nr = numeryPlanu(plan).get(e.id)
    const wpis: WpisDziennika = { id: cz.id, czas, kto: kto.id, imie: kto.imie, rodzaj: cz.rodzaj, grob: e.id, ...(nr ? { numer: numerTekst(nr) } : {}), wynik: 'zapisano' }
    let zmiana: Partial<Element> | null = null
    if (cz.rodzaj === 'sprawdzony') {
        if (!kto.pelne) return { blad: '„Sprawdzony” stawia redakcja – twoje zdjęcia i napisy już do niej trafiły.', status: 403 }
        zmiana = { etap: 'sprawdzony', zTerenu: undefined, ...(e.stan === 'do-sprawdzenia' ? { stan: undefined } : {}) }
    } else if (cz.rodzaj === 'zdjecie') {
        wpis.plik = cz.plik
        if (!e.zdjecia?.some((z) => z.plik === cz.plik))
            zmiana = { zdjecia: [...(e.zdjecia ?? []), { plik: cz.plik, ...(cz.lat !== undefined && cz.lon !== undefined ? { lat: cz.lat, lon: cz.lon } : {}), data: cz.data ?? czas.slice(0, 19) }] }
    } else if (cz.rodzaj === 'napis') {
        const obecny = e.napis ?? ''
        wpis.napis = cz.napis
        if (cz.podstawa !== undefined && obecny !== cz.podstawa && obecny !== cz.napis) {
            // ktoś zmienił napis po tym, jak telefon go pobrał – obie wersje zostają, wybierze redakcja
            return { plan, wpis: { ...wpis, wynik: 'do-decyzji', bylo: obecny }, zmieniono: false }
        }
        if (obecny !== cz.napis) zmiana = { napis: cz.napis || undefined }
    } else {
        wpis.tekst = cz.tekst
        const linia = `[z terenu, ${kto.imie}, ${czas.slice(0, 10)}] ${cz.tekst}`
        zmiana = { notatka: e.notatka ? `${e.notatka}\n${linia}` : linia }
    }
    if (!zmiana) return { plan, wpis, zmieniono: false }
    let pelna: Partial<Element> = poZmianieDanych(e, zmiana, typy.get(e.typ))
    if (!kto.pelne) {
        // zmiana z konta terenowego: grób „sprawdzony” wraca do „opracowany” i dostaje znak do przejrzenia przez redakcję
        const etapPo = (pelna.etap ?? etapElementu(e)) === 'sprawdzony' ? 'opracowany' : pelna.etap
        pelna = { ...pelna, ...(etapPo ? { etap: etapPo } : {}), zTerenu: { kto: kto.id, czas } }
    }
    const elementy = plan.elementy.map((x) => (x.id === e.id ? usunPuste({ ...x, ...pelna }) : x))
    return { plan: { ...plan, elementy }, wpis, zmieniono: true }
}

function usunPuste(e: Element): Element {
    const w = { ...e } as Record<string, unknown>
    for (const k of Object.keys(w)) if (w[k] === undefined) delete w[k]
    return w as unknown as Element
}

/** Redakcja rozstrzyga napis „do decyzji”: zostaje wersja z terenu (wpisywana do planu) albo ta, która jest w planie. */
export function rozstrzygnij(plan: Plan, wpis: WpisDziennika, wybor: 'teren' | 'redakcja', kto: { id: string }, u: UstawieniaPlanow, teraz = new Date()): { plan: Plan; wpis: WpisDziennika; zmieniono: boolean } | { blad: string } {
    if (wpis.wynik !== 'do-decyzji' || wpis.rozstrzygnieto) return { blad: 'Ta zmiana jest już rozstrzygnięta.' }
    const e = plan.elementy.find((x) => x.id === wpis.grob)
    if (!e) return { blad: 'Tego grobu nie ma już na planie.' }
    const nowy: WpisDziennika = { ...wpis, rozstrzygnieto: { wybor, kto: kto.id, czas: teraz.toISOString() } }
    if (wybor === 'redakcja' || (e.napis ?? '') === (wpis.napis ?? '')) return { plan, wpis: nowy, zmieniono: false }
    const zmiana = poZmianieDanych(e, { napis: wpis.napis || undefined }, katalog(u).get(e.typ))
    return { plan: { ...plan, elementy: plan.elementy.map((x) => (x.id === e.id ? usunPuste({ ...x, ...zmiana }) : x)) }, wpis: nowy, zmieniono: true }
}

/** Postęp planu do listy „moje plany”: groby, sprawdzone, bez zdjęcia. */
export function postepPlanu(plan: Pick<Plan, 'elementy'>, u: UstawieniaPlanow): { groby: number; sprawdzone: number; bezZdjecia: number } {
    const typy = katalog(u)
    const groby = plan.elementy.filter((e) => typGrobu(typy.get(e.typ)))
    return { groby: groby.length, sprawdzone: groby.filter((e) => etapElementu(e) === 'sprawdzony').length, bezZdjecia: groby.filter((e) => !e.zdjecia?.length).length }
}

/**
 * Plan dla pracy w terenie. Konto z działem „plany” dostaje cały plan. Konto tylko terenowe – to, co widzi czytelnik na swoim
 * poziomie (bez elementów „tylko ja”, bez osób z drzewa, źródeł i notatek redakcji; groby zmarłych niedawno na poziomie
 * publicznym – sam kształt), ale z punktami geo (położenie z telefonu) oraz etapem pracy i znakiem „z terenu”.
 * Widoczność samego planu nie decyduje: plan przydzielił administrator na karcie konta.
 */
export function planDlaTerenu(plan: Plan, pelne: boolean, poziom: Widocznosc, u: UstawieniaPlanow): Plan {
    if (pelne) return plan
    const pelny = new Map(plan.elementy.map((e) => [e.id, e]))
    const czyt = dlaCzytelnika(plan, poziom === 'ja' ? 'bliscy' : poziom, u)
    const elementy = czyt.elementy.map((e) => {
        const p = pelny.get(e.id)!
        const { osoby: _o, zrodla: _z, ...reszta } = e
        return { ...reszta, etap: etapElementu(p), ...(p.zTerenu ? { zTerenu: p.zTerenu } : {}) } as Element
    })
    return { ...czyt, geo: plan.geo, elementy }
}

/** Pliki, które konto tylko terenowe może pobrać z planu: widoczne podkłady i zdjęcia widocznych grobów. */
export function plikiDlaTerenu(planTerenowy: Pick<Plan, 'podklady' | 'elementy'>): Set<string> {
    const s = new Set<string>()
    for (const p of planTerenowy.podklady) if (p.plik) s.add(p.plik)
    for (const e of planTerenowy.elementy) for (const z of e.zdjecia ?? []) s.add(z.plik)
    return s
}
