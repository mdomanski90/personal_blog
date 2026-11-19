// P6b (PPL-02, PPL-03): wynik osoby na liście i filtry katalogu osób – część bez dostępu do danych (testowana osobno).
//
// Wszystko liczone wyłącznie z osób, które czytelnik widzi (strona podaje już przefiltrowaną listę – zasady 1.4–1.5):
//   • zajęcie   – zdarzenie „zawód” (tekst w opisie) i funkcja w instytucji (rola),
//   • miejscowość z rodzajem związku – zdarzenia osoby i jej małżeństw, siedziba instytucji, grób na planie,
//   • wyznanie  – obrządek zapisany przy chrzcie / ślubie / pogrzebie albo wyznanie instytucji, w której osoba pełniła
//                 funkcję (DOCX §2: odnosić do zapisu i instytucji, nie wnioskować o osobistym wyznaniu).

import { normalizuj, porownajPl } from '../tekst'
import { lataZycia, OBRZADEK_PARAFII, OBRZADKI, RODZAJE_ZDARZEN, sortujZdarzenia, type Obrzadek, type Osoba, type RodzajZdarzenia, type Zdarzenie } from './model'

export const ZWIAZKI = {
    urodzenie: 'urodzenie',
    slub: 'ślub',
    zamieszkanie: 'zamieszkanie',
    praca: 'praca',
    zgon: 'zgon',
    pochowek: 'pochówek',
    inne: 'inny zapis',
} as const
export type Zwiazek = keyof typeof ZWIAZKI

const ZWIAZEK_ZDARZENIA: Record<RodzajZdarzenia, Zwiazek> = {
    urodzenie: 'urodzenie', chrzest: 'urodzenie', slub: 'slub', rozwod: 'slub', zamieszkanie: 'zamieszkanie', zawod: 'praca',
    zgon: 'zgon', pogrzeb: 'pochowek', emigracja: 'inne', inne: 'inne',
}

/** Funkcja osoby w instytucji (z lib/parafie-powiazania – funkcjeOsoby). */
export interface FunkcjaOsoby { rola: string; instytucja: { nazwa: string; wyznanie: string; siedziba: string | null } }

export interface ZajecieOsoby { klucz: string; nazwa: string }
export interface MiejsceOsoby { klucz: string; nazwa: string; zwiazki: Zwiazek[] }
export interface WyznanieOsoby { klucz: Obrzadek; powod: string }
export interface FasetyOsoby { zajecia: ZajecieOsoby[]; miejsca: MiejsceOsoby[]; wyznania: WyznanieOsoby[] }

export interface DaneFaset {
    /** zdarzenia małżeństw osoby (ślub, rozwód) */
    zdarzeniaMalzenstw: Zdarzenie[]
    funkcje: FunkcjaOsoby[]
    /** identyfikatory miejscowości planów z grobem tej osoby (plany już przefiltrowane dla czytelnika) */
    groby: string[]
    /** nazwy miejscowości widocznych dla czytelnika (id → nazwa) */
    nazwaMiejsca: (id: string) => string | undefined
}

/** Pierwsza linia opisu zdarzenia „zawód” (Ancestry: wartość OCCU, potem notatki). */
export function tekstZawodu(z: Pick<Zdarzenie, 'opis' | 'nazwa'>): string {
    return (z.opis ?? z.nazwa ?? '').split('\n')[0].trim().replace(/\s+/g, ' ').slice(0, 80)
}

const kluczTekstu = (s: string) => normalizuj(s)

/** Nazwa miejscowości zdarzenia: strona widoczna dla czytelnika albo pierwszy człon zapisu („Próchenki, gm. …” → „Próchenki”). */
function nazwaZdarzenia(z: Pick<Zdarzenie, 'miejsce' | 'miejsceId'>, nazwaMiejsca: DaneFaset['nazwaMiejsca']): string {
    return ((z.miejsceId && nazwaMiejsca(z.miejsceId)) || z.miejsce?.split(',')[0] || '').trim()
}

export function fasetyOsoby(o: Osoba, d: DaneFaset): FasetyOsoby {
    const zajecia = new Map<string, ZajecieOsoby>()
    const dodajZajecie = (nazwa: string) => {
        const n = nazwa.trim()
        const k = kluczTekstu(n)
        if (k && !zajecia.has(k)) zajecia.set(k, { klucz: k, nazwa: n.charAt(0).toLocaleLowerCase('pl') + n.slice(1) })
    }
    const miejsca = new Map<string, MiejsceOsoby>()
    const dodajMiejsce = (nazwa: string, zw: Zwiazek) => {
        const k = kluczTekstu(nazwa)
        if (!k) return
        const m = miejsca.get(k) ?? { klucz: k, nazwa, zwiazki: [] }
        if (!m.zwiazki.includes(zw)) m.zwiazki.push(zw)
        miejsca.set(k, m)
    }
    const wyznania = new Map<Obrzadek, WyznanieOsoby>()
    const dodajWyznanie = (k: Obrzadek, powod: string) => { if (!wyznania.has(k)) wyznania.set(k, { klucz: k, powod }) }

    for (const z of sortujZdarzenia([...o.zdarzenia, ...d.zdarzeniaMalzenstw])) {
        if (z.rodzaj === 'zawod') { const t = tekstZawodu(z); if (t) dodajZajecie(t) }
        const nazwa = nazwaZdarzenia(z, d.nazwaMiejsca)
        if (nazwa) dodajMiejsce(nazwa, ZWIAZEK_ZDARZENIA[z.rodzaj])
        if (z.obrzadek) dodajWyznanie(z.obrzadek, `${RODZAJE_ZDARZEN[z.rodzaj]} ${OBRZADKI[z.obrzadek].nazwa.replace(/ \(.*\)$/, '')}`)
    }
    for (const f of d.funkcje) {
        if (f.rola) dodajZajecie(f.rola)
        const siedziba = f.instytucja.siedziba && d.nazwaMiejsca(f.instytucja.siedziba)
        if (siedziba) dodajMiejsce(siedziba, 'praca')
        const ob = OBRZADEK_PARAFII[f.instytucja.wyznanie]
        // wyjaśnienie = instytucja (rola stoi już w wyniku jako zajęcie: „proboszcz · parafia prawosławna w Woli”)
        if (ob) dodajWyznanie(ob, f.rola ? f.instytucja.nazwa : `funkcja: ${f.instytucja.nazwa}`)
    }
    for (const id of d.groby) { const n = d.nazwaMiejsca(id); if (n) dodajMiejsce(n, 'pochowek') }
    return { zajecia: [...zajecia.values()], miejsca: [...miejsca.values()], wyznania: [...wyznania.values()] }
}

// ---------- filtry ----------

export interface FiltryOsob { zajecie: string; miejsce: string; zwiazek: string; wyznanie: string }
export const KLUCZE_FILTROW: (keyof FiltryOsob)[] = ['zajecie', 'miejsce', 'zwiazek', 'wyznanie']

/** Filtry z adresu: tylko znane wartości; „związek” bez miejscowości nic nie znaczy (kontekstowy – DOCX §2). */
export function filtryZAdresu(sp: Record<string, string | undefined>): FiltryOsob {
    const t = (k: string) => (typeof sp[k] === 'string' ? sp[k]!.trim().slice(0, 120) : '')
    const miejsce = kluczTekstu(t('miejsce'))
    const zwiazek = t('zwiazek')
    const wyznanie = t('wyznanie')
    return {
        zajecie: kluczTekstu(t('zajecie')),
        miejsce,
        zwiazek: miejsce && zwiazek in ZWIAZKI ? zwiazek : '',
        wyznanie: wyznanie in OBRZADKI ? wyznanie : '',
    }
}

export function pasujeDoFiltrow(f: FasetyOsoby, w: FiltryOsob, pomin?: keyof FiltryOsob): boolean {
    if (pomin !== 'zajecie' && w.zajecie && !f.zajecia.some((z) => z.klucz === w.zajecie)) return false
    if (pomin !== 'miejsce' && w.miejsce) {
        const m = f.miejsca.find((x) => x.klucz === w.miejsce)
        if (!m) return false
        if (pomin !== 'zwiazek' && w.zwiazek && !m.zwiazki.includes(w.zwiazek as Zwiazek)) return false
    }
    if (pomin !== 'wyznanie' && w.wyznanie && !f.wyznania.some((x) => x.klucz === w.wyznanie)) return false
    return true
}

export interface OpcjaFiltra { id: string; nazwa: string; ile: number }
export interface OpcjeFiltrow { zajecie: OpcjaFiltra[]; miejsce: OpcjaFiltra[]; zwiazek: OpcjaFiltra[]; wyznanie: OpcjaFiltra[] }

/**
 * Opcje każdego filtra z licznikami „ile osób zostanie po wybraniu” – przy pozostałych filtrach bez zmian.
 * Wartość obecna tylko u osoby niewidocznej nie trafia do opcji, bo strona podaje wyłącznie osoby widoczne.
 */
export function opcjeFiltrow(osoby: FasetyOsoby[], w: FiltryOsob): OpcjeFiltrow {
    const zlicz = (pomin: keyof FiltryOsob, wartosci: (f: FasetyOsoby) => { id: string; nazwa: string }[]) => {
        const m = new Map<string, OpcjaFiltra>()
        for (const f of osoby) {
            if (!pasujeDoFiltrow(f, w, pomin)) continue
            for (const v of wartosci(f)) {
                const o = m.get(v.id) ?? { id: v.id, nazwa: v.nazwa, ile: 0 }
                o.ile++
                m.set(v.id, o)
            }
        }
        return [...m.values()]
    }
    const alfabet = (a: OpcjaFiltra, b: OpcjaFiltra) => porownajPl(a.nazwa, b.nazwa)
    const kolejZw = Object.keys(ZWIAZKI)
    const kolejWyz = Object.keys(OBRZADKI)
    return {
        zajecie: zlicz('zajecie', (f) => f.zajecia.map((z) => ({ id: z.klucz, nazwa: z.nazwa }))).sort(alfabet),
        miejsce: zlicz('miejsce', (f) => f.miejsca.map((m) => ({ id: m.klucz, nazwa: m.nazwa }))).sort(alfabet),
        zwiazek: w.miejsce
            ? zlicz('zwiazek', (f) => (f.miejsca.find((m) => m.klucz === w.miejsce)?.zwiazki ?? []).map((z) => ({ id: z, nazwa: ZWIAZKI[z] }))).sort((a, b) => kolejZw.indexOf(a.id) - kolejZw.indexOf(b.id))
            : [],
        wyznanie: zlicz('wyznanie', (f) => f.wyznania.map((x) => ({ id: x.klucz, nazwa: OBRZADKI[x.klucz].nazwa }))).sort((a, b) => kolejWyz.indexOf(a.id) - kolejWyz.indexOf(b.id)),
    }
}

// ---------- wynik ----------

/**
 * PPL-02: druga część wiersza osoby – przydomek · lata · miejscowość · zajęcie (puste pomijane, bez pustych etykiet).
 * Przy włączonym filtrze pokazuje wartość, która wyjaśnia trafienie: „Próchenki (ślub)”, wybrane zajęcie, „chrzest prawosławny”.
 */
export function opisOsoby(o: Osoba, f: FasetyOsoby, w: FiltryOsob = { zajecie: '', miejsce: '', zwiazek: '', wyznanie: '' }): string {
    let miejsce = ''
    if (w.miejsce) {
        const m = f.miejsca.find((x) => x.klucz === w.miejsce)
        if (m) miejsce = `${m.nazwa} (${(w.zwiazek ? [w.zwiazek as Zwiazek] : m.zwiazki).map((z) => ZWIAZKI[z]).join(', ')})`
    } else {
        const m = f.miejsca.find((x) => x.zwiazki.includes('urodzenie')) ?? f.miejsca.find((x) => x.zwiazki.includes('zamieszkanie'))
        miejsce = m?.nazwa ?? ''
    }
    const zajecie = (w.zajecie && f.zajecia.find((z) => z.klucz === w.zajecie)) || f.zajecia[0]
    const wyznanie = w.wyznanie ? f.wyznania.find((x) => x.klucz === w.wyznanie)?.powod : undefined
    return [o.przydomek && `„${o.przydomek}”`, lataZycia(o), miejsce, zajecie?.nazwa, wyznanie].filter(Boolean).join(' · ')
}

/** Adres listy osób z filtrami (puste pomijane; „związek” tylko przy miejscowości). */
export function adresOsob(krag: string, w: FiltryOsob, q = ''): string {
    const p = new URLSearchParams()
    if (krag && krag !== 'wszystkie') p.set('krag', krag)
    for (const k of KLUCZE_FILTROW) if (w[k] && !(k === 'zwiazek' && !w.miejsce)) p.set(k, w[k])
    if (q.trim()) p.set('q', q.trim())
    const s = p.toString()
    return s ? `/osoby?${s}` : '/osoby'
}
