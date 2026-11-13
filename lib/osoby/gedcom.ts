// GEDCOM 5.5.1 (eksport Ancestry i innych programów) ⇄ drzewo strony.
// Import działa w całości na serwerze strony – plik nie opuszcza go.

import { czyPoprawnaEdtf, parsujEdtf, rokPoczatku, type Punkt } from '../edtf'
import { normalizuj } from '../tekst'
import {
    chrzestniZOpisu, dopasujChrzestnego, idZNazwy, indeksNazwisk, indeksRelacji, noweIdZdarzenia, obrzadekZTekstu, OBRZADKI, poprawOsobe, poprawRodzine,
    szacowaneLata, ZDARZENIA_Z_OBRZADKIEM,
    type Cytat, type Drzewo, type Multimedium, type Osoba, type RodzajZdarzenia, type Rodzina, type Zdarzenie, type Zrodlo,
} from './model'

// ---------- odczyt linii ----------
export interface Wezel {
    tag: string
    xref?: string
    wartosc: string
    dzieci: Wezel[]
}

export function parsujGedcom(tekst: string): Wezel[] {
    const korzen: Wezel[] = []
    const stos: Wezel[] = []
    for (const surowa of tekst.replace(/^﻿/, '').split(/\r\n|\r|\n/)) {
        const m = /^\s*(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?: (.*))?$/.exec(surowa)
        if (!m) continue
        const poziom = Number(m[1])
        const tag = m[3].toUpperCase()
        const wartosc = m[4] ?? ''
        if ((tag === 'CONC' || tag === 'CONT') && stos[poziom - 1]) {
            stos[poziom - 1].wartosc += (tag === 'CONT' ? '\n' : '') + wartosc
            continue
        }
        const w: Wezel = { tag, xref: m[2], wartosc, dzieci: [] }
        if (poziom === 0) korzen.push(w)
        else if (stos[poziom - 1]) stos[poziom - 1].dzieci.push(w)
        stos[poziom] = w
        stos.length = poziom + 1
    }
    return korzen
}

const jeden = (w: Wezel, tag: string) => w.dzieci.find((d) => d.tag === tag)
const wszystkie = (w: Wezel, tag: string) => w.dzieci.filter((d) => d.tag === tag)
const wart = (w: Wezel, tag: string) => jeden(w, tag)?.wartosc.trim() ?? ''

// ---------- daty ----------
const MIESIACE: Record<string, number> = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 }
const MIESIACE_NR = Object.fromEntries(Object.entries(MIESIACE).map(([k, v]) => [v, k]))

function punktGedcom(s: string): string | null {
    const t = s.trim().replace(/\.(?=\s|$)/g, '').replace(/\s+/g, ' ')
    let m = /^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})(?:\/\d{2})?$/.exec(t)
    if (m && MIESIACE[m[2].toUpperCase()]) return `${m[3]}-${String(MIESIACE[m[2].toUpperCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}`
    m = /^([A-Za-z]{3})[a-z]* (\d{4})$/.exec(t)
    if (m && MIESIACE[m[1].toUpperCase()]) return `${m[2]}-${String(MIESIACE[m[1].toUpperCase()]).padStart(2, '0')}`
    m = /^(\d{4})$/.exec(t)
    if (m) return m[1]
    // zapisy dzień.miesiąc.rok (czasem wpisywane ręcznie)
    m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(t)
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    return null
}

/** Data GEDCOM („2 Dec 1939”, „Abt 1981”, „Aft. 1862”, „Bet 1880 and 1885”) → EDTF albo null. */
export function dataGedcomNaEdtf(s: string): string | null {
    const t = s.trim().replace(/\(.*\)/, '').trim()
    if (!t) return null
    const kw = /^(abt|about|approx|circa|ca|cal|est|bef|before|aft|after|bet|between|from|to|int)\.?\s+(.*)$/i.exec(t)
    let wynik: string | null = null
    if (!kw) wynik = punktGedcom(t)
    else {
        const slowo = kw[1].toLowerCase(), reszta = kw[2]
        if (['abt', 'about', 'approx', 'circa', 'ca', 'cal', 'est', 'int'].includes(slowo)) {
            const p = punktGedcom(reszta)
            wynik = p ? `${p}~` : null
        } else if (slowo === 'bef' || slowo === 'before' || slowo === 'to') {
            const p = punktGedcom(reszta)
            wynik = p ? `../${p}` : null
        } else if (slowo === 'aft' || slowo === 'after') {
            const p = punktGedcom(reszta)
            wynik = p ? `${p}/..` : null
        } else {
            const m = /^(.*?)\s+(?:and|to|-)\s+(.*)$/i.exec(reszta)
            const a = m ? punktGedcom(m[1]) : punktGedcom(reszta)
            const b = m ? punktGedcom(m[2]) : null
            wynik = a && b ? `${a}/${b}` : a ? `${a}/..` : null
        }
    }
    return wynik && czyPoprawnaEdtf(wynik) ? wynik : null
}

function punktNaGedcom(p: Punkt): string {
    if (p.precyzja === 'dzien') return `${p.dzien} ${MIESIACE_NR[p.miesiac!]} ${p.rok}`
    if (p.precyzja === 'miesiac') return `${MIESIACE_NR[p.miesiac!]} ${p.rok}`
    return String(p.rok)
}

/** EDTF → data GEDCOM 5.5.1. */
export function edtfNaGedcom(zapis: string | undefined): string | null {
    const d = parsujEdtf(zapis)
    if (!d) return null
    if (!d.przedzial) {
        const p = d.od!
        return `${p.okolo || p.precyzja === 'dekada' || p.precyzja === 'wiek' ? 'ABT ' : ''}${punktNaGedcom(p)}`
    }
    if (!d.od) return `BEF ${punktNaGedcom(d.do!)}`
    if (!d.do) return `AFT ${punktNaGedcom(d.od)}`
    return `BET ${punktNaGedcom(d.od)} AND ${punktNaGedcom(d.do)}`
}

// ---------- import ----------
const ZDARZENIA_GEDCOM: Record<string, RodzajZdarzenia> = {
    BIRT: 'urodzenie', CHR: 'chrzest', BAPM: 'chrzest', DEAT: 'zgon', BURI: 'pogrzeb', CREM: 'pogrzeb',
    RESI: 'zamieszkanie', OCCU: 'zawod', EMIG: 'emigracja', IMMI: 'emigracja', MARR: 'slub', DIV: 'rozwod', EVEN: 'inne',
    CENS: 'zamieszkanie', NATU: 'inne', GRAD: 'inne', EDUC: 'inne', MILI: 'inne', _MILT: 'inne', RETI: 'inne', PROB: 'inne', WILL: 'inne',
}
const NAZWY_INNYCH: Record<string, string> = { NATU: 'naturalizacja', GRAD: 'ukończenie szkoły', EDUC: 'nauka', MILI: 'służba wojskowa', _MILT: 'służba wojskowa', RETI: 'emerytura', PROB: 'postępowanie spadkowe', WILL: 'testament', CREM: 'kremacja' }

export interface MiejsceDoDopasowania {
    id: string
    nazwa: string
    inneNazwy: string[]
}

export interface PodsumowanieImportu {
    osoby: number
    rodziny: number
    zdarzenia: number
    zrodla: number
    cytaty: number
    multimedia: number
    zyjace: number
    chrzty: number
    chrzestni: number
    chrzestniPowiazani: number
    obrzadki: number
    datyNieodczytane: string[]
    miejscaDopasowane: { tekst: string; miejsce: string; ile: number }[]
    miejscaNiedopasowane: { tekst: string; ile: number }[]
    imionaZDopiskami: number
    slubyScalone: number
    pominieteZnaczniki: string[]
}

export interface WynikImportu {
    drzewo: Drzewo
    podsumowanie: PodsumowanieImportu
}

function indeksMiejsc(miejsca: MiejsceDoDopasowania[]): Map<string, string> {
    const m = new Map<string, string>()
    for (const x of miejsca) for (const n of [x.nazwa, ...x.inneNazwy]) {
        const k = normalizuj(n)
        if (k && !m.has(k)) m.set(k, x.id)
    }
    return m
}

/**
 * Miejscowość z zapisu PLAC (Ancestry i inne programy zapisują go różnie): „Olszanka, Łosice, Polska”,
 * „Olszanka (Łosice)”, „parafia Olszanka”, „Olszanka Parish, Siedlce”, „Olszanka Siedlce Poland”,
 * z twardymi spacjami albo znakami niewidocznymi. Sprawdza pierwszy człon, bez dopisków
 * w nawiasach i słów „parafia/gmina/wieś/kolonia/parish/village”, a na końcu coraz krótsze początki członu.
 */
export function znajdzMiejsce(pl: string, mIdx: Map<string, string>): string | undefined {
    const czysty = pl.normalize('NFC').replace(/[\u00a0\u2007\u202f]/g, ' ').replace(/[\u200b-\u200d\ufeff]/g, '')
    const PRZED = /^(?:parafia|par\.?|gmina|gm\.?|wie[sś]|kolonia|kol\.?|gromada|parish(?: of)?|village(?: of)?|town(?: of)?)\s+/i
    const PO = /\s+(?:parish|parafia|village|gmina|kolonia)$/i
    // tylko pierwszy człon – dalsze to zwykle gmina, powiat, kraj (np. „Nowa Wieś, Łosice” nie może trafić do Łosic)
    for (const czlon of czysty.split(/[,;/]/).slice(0, 1)) {
        const warianty = new Set<string>()
        const bez = czlon.trim().replace(PRZED, '').replace(PO, '')
        warianty.add(bez)
        warianty.add(bez.replace(/\s*\([^)]*\)\s*/g, ' '))
        for (const w of warianty) {
            const k = normalizuj(w)
            if (!k) continue
            const t = mIdx.get(k)
            if (t) return t
            // „Olszanka Siedlce Poland” – coraz krótsze początki (co najmniej jedno słowo)
            const slowa = k.split(' ')
            for (let n = slowa.length - 1; n >= 1; n--) {
                const t2 = mIdx.get(slowa.slice(0, n).join(' '))
                if (t2) return t2
            }
        }
    }
    return undefined
}

const OBSLUGIWANE_INDI = new Set(['NAME', 'SEX', 'FAMC', 'FAMS', 'NOTE', 'SOUR', 'OBJE', '_MTTAG', 'RIN', '_UID', 'UID', 'CHAN', 'ADDR', ...Object.keys(ZDARZENIA_GEDCOM)])

export function importujGedcom(tekst: string, miejsca: MiejsceDoDopasowania[]): WynikImportu {
    const rekordy = parsujGedcom(tekst)
    const poXref = new Map(rekordy.filter((r) => r.xref).map((r) => [r.xref!, r]))
    const mIdx = indeksMiejsc(miejsca)
    const nazwaMiejsca = new Map(miejsca.map((x) => [x.id, x.nazwa]))
    const pods: PodsumowanieImportu = {
        osoby: 0, rodziny: 0, zdarzenia: 0, zrodla: 0, cytaty: 0, multimedia: 0, zyjace: 0, chrzty: 0, chrzestni: 0, chrzestniPowiazani: 0, obrzadki: 0,
        datyNieodczytane: [], miejscaDopasowane: [], miejscaNiedopasowane: [], imionaZDopiskami: 0, slubyScalone: 0, pominieteZnaczniki: [],
    }
    const licznikMiejsc = new Map<string, { miejsce?: string; ile: number }>()
    const pominiete = new Set<string>()

    // źródła
    const zrodla = new Map<string, Zrodlo>()
    const idZrodla = new Map<string, string>()
    for (const r of rekordy.filter((x) => x.tag === 'SOUR' && x.xref)) {
        const id = `z${zrodla.size + 1}`
        idZrodla.set(r.xref!, id)
        const apid = wart(r, '_APID').replace(/^\d+,/, '')
        zrodla.set(id, { id, tytul: wart(r, 'TITL') || wart(r, 'ABBR') || 'źródło bez tytułu', ...(wart(r, 'AUTH') ? { autor: wart(r, 'AUTH') } : {}), ...(wart(r, 'PUBL') ? { wydawca: wart(r, 'PUBL') } : {}), ...(apid ? { apid } : {}), ...(wart(r, 'NOTE') ? { notatka: wart(r, 'NOTE') } : {}) })
    }
    pods.zrodla = zrodla.size
    const znaczniki = new Map(rekordy.filter((r) => r.tag === '_MTTAG' && r.xref).map((r) => [r.xref!, wart(r, 'NAME')]))

    const cytaty = (w: Wezel): Cytat[] =>
        wszystkie(w, 'SOUR').map((s) => {
            pods.cytaty++
            const www = jeden(s, 'DATA') ? wart(jeden(s, 'DATA')!, 'WWW') : ''
            const apid = wart(s, '_APID').replace(/^\d+,/, '')
            return { ...(idZrodla.get(s.wartosc.trim()) ? { zrodlo: idZrodla.get(s.wartosc.trim()) } : !s.wartosc.startsWith('@') && s.wartosc ? { strona: s.wartosc } : {}), ...(wart(s, 'PAGE') ? { strona: wart(s, 'PAGE') } : {}), ...(apid ? { apid } : {}), ...(www ? { www } : {}) }
        })

    const zdarzenieZ = (w: Wezel): Zdarzenie => {
        const rodzaj = ZDARZENIA_GEDCOM[w.tag] ?? 'inne'
        const z: Zdarzenie = { id: noweIdZdarzenia(), rodzaj }
        if (rodzaj === 'inne') z.nazwa = wart(w, 'TYPE') || NAZWY_INNYCH[w.tag] || w.tag
        else if (w.tag === 'EVEN' || wart(w, 'TYPE')) {
            const t = wart(w, 'TYPE')
            if (t) z.nazwa = t
        }
        const dt = wart(w, 'DATE')
        if (dt) {
            const e = dataGedcomNaEdtf(dt)
            if (e) z.data = e
            else {
                z.dataTekst = dt
                if (pods.datyNieodczytane.length < 50) pods.datyNieodczytane.push(dt)
            }
        }
        const pl = wart(w, 'PLAC')
        if (pl) {
            z.miejsce = pl
            const mid = znajdzMiejsce(pl, mIdx)
            if (mid) z.miejsceId = mid
            const l = licznikMiejsc.get(pl) ?? { miejsce: mid, ile: 0 }
            l.ile++
            licznikMiejsc.set(pl, l)
        }
        // opis: wartość w linii zdarzenia (Ancestry: „Description”) i notatki pod nim
        const teksty = [w.tag !== 'EVEN' && w.wartosc && w.wartosc !== 'Y' ? w.wartosc : '', ...wszystkie(w, 'NOTE').map((n) => n.wartosc)].map((t) => t.trim()).filter(Boolean)
        let opis = teksty.join('\n')
        if (rodzaj === 'chrzest') {
            const { chrzestni, reszta } = chrzestniZOpisu(opis)
            if (chrzestni.length) {
                z.chrzestni = chrzestni.map((tekst) => ({ tekst }))
                opis = reszta
            }
        }
        const rel = wart(w, 'RELI')
        const ob = obrzadekZTekstu(rel) ?? (ZDARZENIA_Z_OBRZADKIEM.includes(rodzaj) ? obrzadekZTekstu(opis) : undefined)
        if (ob) z.obrzadek = ob
        // opis, który był tylko słowem o obrządku (np. „prawosławny”), nie powtarza się pod zdarzeniem
        if (ob && opis && opis.trim().split(/\s+/).length <= 3 && obrzadekZTekstu(opis) === ob) opis = ''
        if (opis) z.opis = opis
        const c = cytaty(w)
        if (c.length) z.cytaty = c
        pods.zdarzenia++
        return z
    }

    // osoby
    const osoby = new Map<string, Osoba>()
    const idOsoby = new Map<string, string>()
    const indi = rekordy.filter((r) => r.tag === 'INDI' && r.xref)
    for (const r of indi) {
        const imiona: string[] = []
        let nazwisko = ''
        const inne: string[] = []
        const uwagi: string[] = []
        wszystkie(r, 'NAME').forEach((n, i) => {
            const m = /^([^/]*)(?:\/([^/]*)\/)?(.*)$/.exec(n.wartosc) ?? []
            const g = (wart(n, 'GIVN') || `${m[1] ?? ''} ${m[3] ?? ''}`).trim().replace(/\s+/g, ' ')
            const s = (wart(n, 'SURN') || m[2] || '').trim()
            if (i === 0) {
                if (g) imiona.push(g)
                nazwisko = s
            } else if (s && s !== nazwisko) inne.push(s)
            const marr = wart(n, '_MARNM') || wart(n, '_MARN')
            if (marr && marr !== nazwisko) inne.push(marr)
        })
        let im = imiona.join(' ')
        if (/\d|cm\b|\(|\[|\?/i.test(`${im} ${nazwisko}`)) {
            uwagi.push(`imię lub nazwisko z dopiskiem z Ancestry: „${`${im} /${nazwisko}/`.trim()}” – popraw`)
            pods.imionaZDopiskami++
        }
        // nazwisko z kilkoma członami (np. panieńskie i po mężu) zostaje jak było; człony trafiają do wyszukiwania przez nazwiskaOsoby
        const ur = jeden(r, 'BIRT') ?? jeden(r, 'CHR') ?? jeden(r, 'BAPM')
        const rok = ur ? rokPoczatku(dataGedcomNaEdtf(wart(ur, 'DATE')) ?? undefined) : null
        const id = idZNazwy(im || 'osoba', nazwisko, rok, (x) => osoby.has(x))
        idOsoby.set(r.xref!, id)
        const sex = wart(r, 'SEX').toUpperCase()
        const zdarzenia: Zdarzenie[] = []
        for (const d of r.dzieci) if (ZDARZENIA_GEDCOM[d.tag] && d.tag !== 'MARR' && d.tag !== 'DIV') zdarzenia.push(zdarzenieZ(d))
        for (const d of r.dzieci) if (!OBSLUGIWANE_INDI.has(d.tag)) pominiete.add(d.tag)
        const notatki = wszystkie(r, 'NOTE').map((n) => (n.wartosc.startsWith('@') ? poXref.get(n.wartosc.trim())?.wartosc ?? '' : n.wartosc)).map((t) => t.trim()).filter(Boolean).join('\n\n')
        const multimedia: Multimedium[] = []
        for (const ob of wszystkie(r, 'OBJE')) {
            const rec = ob.wartosc.startsWith('@') ? poXref.get(ob.wartosc.trim()) : ob
            if (!rec) continue
            const plik = jeden(rec, 'FILE')
            const tytul = wart(rec, 'TITL') || (plik ? wart(plik, 'TITL') : '') || 'bez tytułu'
            const tr = wart(rec, '_META').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
            multimedia.push({ tytul, ...(wart(rec, '_DSCR') ? { opis: wart(rec, '_DSCR') } : {}), ...(wart(rec, 'DATE') ? { data: wart(rec, 'DATE') } : {}), ...(wart(rec, 'PLAC') ? { miejsce: wart(rec, 'PLAC') } : {}), ...(tr ? { transkrypcja: tr } : {}) })
        }
        pods.multimedia += multimedia.length
        const zn = wszystkie(r, '_MTTAG').map((t) => znaczniki.get(t.wartosc.trim())).filter((x): x is string => !!x)
        osoby.set(id, poprawOsobe({
            id, imiona: im, nazwisko, inneNazwiska: [...new Set(inne)], plec: sex === 'M' ? 'M' : sex === 'F' ? 'K' : 'U', zdarzenia, zyje: 'auto', widocznosc: 'auto',
            notatki, cytaty: cytaty(r), multimedia, znaczniki: zn, uwagi, gedcomId: r.xref!.replace(/@/g, ''), wersja: 1,
        }))
    }
    pods.osoby = osoby.size

    // rodziny
    const rodziny = new Map<string, Rodzina>()
    for (const r of rekordy.filter((x) => x.tag === 'FAM' && x.xref)) {
        const id = `r${rodziny.size + 1}`
        const maz = idOsoby.get(wart(r, 'HUSB')), zona = idOsoby.get(wart(r, 'WIFE'))
        const dzieci = wszystkie(r, 'CHIL').map((c) => idOsoby.get(c.wartosc.trim())).filter((x): x is string => !!x)
        const zdarzenia = r.dzieci.filter((d) => ZDARZENIA_GEDCOM[d.tag] && d.tag !== 'EVEN' ? true : d.tag === 'EVEN').map(zdarzenieZ)
        rodziny.set(id, poprawRodzine({ id, maz, zona, dzieci, zdarzenia, gedcomId: r.xref!.replace(/@/g, ''), wersja: 1 }))
    }
    pods.rodziny = rodziny.size

    // śluby zapisane przy osobie (Ancestry dubluje je obok rodziny) – do rodziny, bez powtórzeń
    for (const r of indi) {
        const id = idOsoby.get(r.xref!)!
        for (const d of r.dzieci.filter((x) => x.tag === 'MARR' || x.tag === 'DIV')) {
            const z = zdarzenieZ(d)
            pods.zdarzenia--
            const fams = [...rodziny.values()].filter((f) => f.maz === id || f.zona === id)
            const f = fams.length === 1 ? fams[0] : fams.find((x) => x.zdarzenia.some((y) => y.rodzaj === z.rodzaj && y.data === z.data))
            if (f) {
                const ist = f.zdarzenia.find((y) => y.rodzaj === z.rodzaj && (!y.data || !z.data || y.data === z.data))
                if (ist) {
                    ist.data ??= z.data
                    ist.miejsce ??= z.miejsce
                    ist.miejsceId ??= z.miejsceId
                    ist.obrzadek ??= z.obrzadek
                    if (z.cytaty) ist.cytaty = [...(ist.cytaty ?? []), ...z.cytaty]
                    pods.slubyScalone++
                } else {
                    f.zdarzenia.push(z)
                    pods.zdarzenia++
                }
            } else {
                osoby.get(id)!.zdarzenia.push(z)
                pods.zdarzenia++
            }
        }
    }

    const drzewo: Drzewo = { osoby, rodziny, zrodla }

    // chrzestni → osoby z drzewa (tylko pewne dopasowania), obrządki, żyjący
    const rel = indeksRelacji(drzewo)
    const lata = szacowaneLata(drzewo, rel)
    const nazw = indeksNazwisk(drzewo)
    for (const o of osoby.values()) {
        for (const z of o.zdarzenia) {
            if (z.rodzaj === 'chrzest') pods.chrzty++
            if (z.obrzadek) pods.obrzadki++
            for (const c of z.chrzestni ?? []) {
                pods.chrzestni++
                const dop = dopasujChrzestnego(c.tekst, rokPoczatku(z.data) ?? lata.get(o.id) ?? null, drzewo, lata, nazw)
                if (dop && dop !== o.id) {
                    c.osoba = dop
                    pods.chrzestniPowiazani++
                }
            }
        }
        const zyje = !o.zdarzenia.some((z) => z.rodzaj === 'zgon' || z.rodzaj === 'pogrzeb') && (lata.get(o.id) == null || lata.get(o.id)! > new Date().getFullYear() - 100)
        if (zyje) pods.zyjace++
    }
    for (const f of rodziny.values()) for (const z of f.zdarzenia) if (z.obrzadek) pods.obrzadki++

    for (const [tekst, l] of licznikMiejsc) {
        if (l.miejsce) pods.miejscaDopasowane.push({ tekst, miejsce: nazwaMiejsca.get(l.miejsce) ?? l.miejsce, ile: l.ile })
        else pods.miejscaNiedopasowane.push({ tekst, ile: l.ile })
    }
    pods.miejscaDopasowane.sort((a, b) => b.ile - a.ile)
    pods.miejscaNiedopasowane.sort((a, b) => b.ile - a.ile)
    pods.pominieteZnaczniki = [...pominiete].sort()
    return { drzewo, podsumowanie: pods }
}

// ---------- eksport ----------
const TAG_ZDARZENIA: Record<RodzajZdarzenia, string> = {
    urodzenie: 'BIRT', chrzest: 'CHR', slub: 'MARR', rozwod: 'DIV', zgon: 'DEAT', pogrzeb: 'BURI', zamieszkanie: 'RESI', zawod: 'OCCU', emigracja: 'EMIG', inne: 'EVEN',
}

function linieTekstu(poziom: number, tag: string, tekst: string): string[] {
    const wyn: string[] = []
    tekst.split('\n').forEach((wiersz, i) => {
        const czesci = Array.from(wiersz.matchAll(new RegExp('.{1,200}', 'gsu')), (x) => x[0])
        const kaw = czesci.length ? czesci : ['']
        kaw.forEach((k, j) => wyn.push(i === 0 && j === 0 ? `${poziom} ${tag} ${k}`.trimEnd() : `${poziom + 1} ${j === 0 ? 'CONT' : 'CONC'} ${k}`.trimEnd()))
    })
    return wyn
}

export interface OpcjeEksportu {
    /** osoby żyjące: pełne dane albo zastąpione „Żyjąca osoba” bez zdarzeń */
    zyjace: 'pelne' | 'ukryte'
    zyje: (id: string) => boolean
    nazwaMiejsca?: (id: string) => string | undefined
}

export function eksportujGedcom(d: Drzewo, opcje: OpcjeEksportu): string {
    const L: string[] = []
    const xI = new Map([...d.osoby.keys()].map((id, i) => [id, `@I${i + 1}@`]))
    const xF = new Map([...d.rodziny.keys()].map((id, i) => [id, `@F${i + 1}@`]))
    const xS = new Map([...d.zrodla.keys()].map((id, i) => [id, `@S${i + 1}@`]))
    const teraz = new Date()
    L.push('0 HEAD', '1 SOUR ODNIEPAMIECI', '2 NAME odniepamieci.pl', '1 DATE ' + `${teraz.getDate()} ${MIESIACE_NR[teraz.getMonth() + 1]} ${teraz.getFullYear()}`, '1 GEDC', '2 VERS 5.5.1', '2 FORM LINEAGE-LINKED', '1 CHAR UTF-8', '1 SUBM @U1@', '0 @U1@ SUBM', '1 NAME odniepamieci.pl')
    const cyt = (p: number, c: Cytat[] | undefined) => {
        for (const x of c ?? []) {
            const s = x.zrodlo ? xS.get(x.zrodlo) : undefined
            if (!s && !x.strona) continue
            if (s) L.push(`${p} SOUR ${s}`)
            else L.push(...linieTekstu(p, 'SOUR', x.strona!))
            if (s && x.strona) L.push(...linieTekstu(p + 1, 'PAGE', x.strona))
            if (x.apid) L.push(`${p + 1} _APID 1,${x.apid}`)
            if (x.www) L.push(`${p + 1} DATA`, `${p + 2} WWW ${x.www}`)
        }
    }
    const zd = (z: Zdarzenie) => {
        const tag = TAG_ZDARZENIA[z.rodzaj]
        L.push(`1 ${tag}`)
        if (tag === 'EVEN' || (z.nazwa && z.rodzaj !== 'inne')) L.push(`2 TYPE ${z.nazwa || 'zdarzenie'}`)
        const dg = edtfNaGedcom(z.data) ?? z.dataTekst
        if (dg) L.push(`2 DATE ${dg}`)
        const pl = z.miejsce || (z.miejsceId ? opcje.nazwaMiejsca?.(z.miejsceId) : undefined)
        if (pl) L.push(`2 PLAC ${pl}`)
        if (z.obrzadek) L.push(`2 RELI ${OBRZADKI[z.obrzadek].nazwa}`)
        // chrzestni tak, jak zapisuje je Ancestry (opis zdarzenia), opis dalej w notatce
        const opis = [z.chrzestni?.length ? `Paten/Godparents: ${z.chrzestni.map((c) => (c.osoba && d.osoby.get(c.osoba) && !opcje.zyje(c.osoba) ? `${d.osoby.get(c.osoba)!.imiona} ${d.osoby.get(c.osoba)!.nazwisko}` : c.tekst)).join(', ')}` : '', z.opis ?? ''].filter(Boolean).join('\n')
        if (opis) L.push(...linieTekstu(2, 'NOTE', opis))
        cyt(2, z.cytaty)
    }
    const rel = indeksRelacji(d)
    for (const o of d.osoby.values()) {
        const ukryj = opcje.zyjace === 'ukryte' && opcje.zyje(o.id)
        L.push(`0 ${xI.get(o.id)} INDI`)
        L.push(ukryj ? `1 NAME Żyjąca /osoba/` : `1 NAME ${o.imiona} /${o.nazwisko}/`)
        if (!ukryj) {
            if (o.imiona) L.push(`2 GIVN ${o.imiona}`)
            if (o.nazwisko) L.push(`2 SURN ${o.nazwisko}`)
            for (const n of o.inneNazwiska ?? []) L.push(`1 NAME ${o.imiona} /${n}/`)
        }
        L.push(`1 SEX ${o.plec === 'M' ? 'M' : o.plec === 'K' ? 'F' : 'U'}`)
        if (!ukryj) {
            for (const z of o.zdarzenia) zd(z)
            if (o.notatki) L.push(...linieTekstu(1, 'NOTE', o.notatki))
            cyt(1, o.cytaty)
        }
        for (const f of rel.get(o.id)?.rodzice ?? []) L.push(`1 FAMC ${xF.get(f.id)}`)
        for (const f of rel.get(o.id)?.malzenstwa ?? []) L.push(`1 FAMS ${xF.get(f.id)}`)
    }
    for (const f of d.rodziny.values()) {
        L.push(`0 ${xF.get(f.id)} FAM`)
        if (f.maz) L.push(`1 HUSB ${xI.get(f.maz)}`)
        if (f.zona) L.push(`1 WIFE ${xI.get(f.zona)}`)
        for (const c of f.dzieci) L.push(`1 CHIL ${xI.get(c)}`)
        const ukryj = opcje.zyjace === 'ukryte' && [f.maz, f.zona].some((x) => x && opcje.zyje(x))
        if (!ukryj) for (const z of f.zdarzenia) zd(z)
    }
    for (const s of d.zrodla.values()) {
        L.push(`0 ${xS.get(s.id)} SOUR`, ...linieTekstu(1, 'TITL', s.tytul))
        if (s.autor) L.push(...linieTekstu(1, 'AUTH', s.autor))
        if (s.wydawca) L.push(...linieTekstu(1, 'PUBL', s.wydawca))
        if (s.apid) L.push(`1 _APID 1,${s.apid}`)
        if (s.notatka) L.push(...linieTekstu(1, 'NOTE', s.notatka))
    }
    L.push('0 TRLR')
    return L.join('\n') + '\n'
}
