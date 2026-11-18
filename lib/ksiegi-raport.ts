// P5 (REL-07): raport ksiąg – porównanie, ile ksiąg pokazuje każdy widok, i uwagi do danych.
// Te same reguły co widoki (nie kopie): katalog wg miejscowości – grupujWedlugMiejsc, karta miejscowości – ksiegaDotyczyMiejsca
// + grupaNaKarcie, katalog wg parafii – grupujWedlugParafii, karta parafii – ksiegiInstytucji. Bez React/Next – testowalne.
import { grupaNaKarcie, ksiegaDotyczyMiejsca } from './ksiegi-powiazania'
import { grupujWedlugMiejsc, grupujWedlugParafii, type KsiegaKatalogu, type MiejsceKatalogu } from './ksiegi-katalog'
import { ksiegiInstytucji } from './parafie-powiazania'

export type KsiegaRaportu = KsiegaKatalogu & { nazwa: string; sygnatura: string; widocznosc: string; instytucje: string[] }
export type ParafiaRaportu = { id: string; nazwa: string; wyznanie: string }

export interface WierszMiejsca { id: string; nazwa: string; katalog: number; karta: number; publiczne: number; brakNaKarcie: { id: string; nazwa: string }[] }
export interface WierszInstytucji { id: string; nazwa: string; katalog: number; karta: number; publiczne: number }
export interface Uwaga { rodzaj: 'blad' | 'do-sprawdzenia'; tekst: string; ksiega?: string; miejsce?: string }
export interface RaportKsiag {
    ksiag: number; publicznych: number
    miejsca: WierszMiejsca[]; instytucje: WierszInstytucji[]
    bezMiejscowosci: { id: string; nazwa: string }[]; bezInstytucji: { id: string; nazwa: string }[]
    uwagi: Uwaga[]
}

export function raportKsiag(ksiegi: KsiegaRaportu[], miejsca: MiejsceKatalogu[], parafie: ParafiaRaportu[]): RaportKsiag {
    const znane = new Set(parafie.map((p) => p.id)), idMiejsc = new Set(miejsca.map((m) => m.id))
    const publ = (L: KsiegaRaportu[]) => L.filter((k) => k.widocznosc === 'publiczne').length
    const krotko = (k: KsiegaRaportu) => ({ id: k.id, nazwa: k.nazwa })
    const wgMiejsc = grupujWedlugMiejsc(ksiegi, miejsca)
    const naKarcie = (m: MiejsceKatalogu) => ksiegi.filter((k) => ksiegaDotyczyMiejsca(k, m) && grupaNaKarcie(k, m, znane) !== null)
    const wiersze: WierszMiejsca[] = wgMiejsc.grupy.map((g) => {
        const karta = new Set(naKarcie(g.element!).map((k) => k.id))
        return { id: g.id, nazwa: g.element!.nazwa, katalog: g.ksiegi.length, karta: karta.size, publiczne: publ(g.ksiegi), brakNaKarcie: g.ksiegi.filter((k) => !karta.has(k.id)).map(krotko) }
    })
    const wgPar = grupujWedlugParafii(ksiegi, parafie)
    const instytucje: WierszInstytucji[] = parafie.map((p) => {
        const kat = wgPar.grupy.find((g) => g.id === p.id)?.ksiegi ?? []
        const karta = ksiegiInstytucji(p.id, ksiegi)
        return { id: p.id, nazwa: p.nazwa, katalog: kat.length, karta: karta.length, publiczne: publ(karta) }
    }).filter((w) => w.katalog || w.karta)

    const uwagi: Uwaga[] = []
    const sygnatury = new Map<string, string[]>()
    for (const k of ksiegi) {
        for (const p of k.instytucje) if (!znane.has(p)) uwagi.push({ rodzaj: 'blad', ksiega: k.id, tekst: `księga „${k.nazwa}”: nieznana parafia/urząd „${p}” – karty miejscowości jej nie pokazują` })
        for (const id of k.miejsca) if (!idMiejsc.has(id)) uwagi.push({ rodzaj: 'blad', ksiega: k.id, tekst: `księga „${k.nazwa}”: nieznana miejscowość „${id}”` })
        if (!k.miejsca.length && !k.zakresy.length) uwagi.push({ rodzaj: 'do-sprawdzenia', ksiega: k.id, tekst: `księga „${k.nazwa}”: brak lat i miejscowości – nie da się ustalić, których wsi dotyczy` })
        if (!k.instytucje.length) uwagi.push({ rodzaj: 'do-sprawdzenia', ksiega: k.id, tekst: `księga „${k.nazwa}”: instytucja nieustalona` })
        const sig = k.sygnatura.trim()
        if (sig) sygnatury.set(sig, [...(sygnatury.get(sig) ?? []), k.id])
    }
    for (const [sig, ids] of sygnatury) if (ids.length > 1) uwagi.push({ rodzaj: 'do-sprawdzenia', tekst: `sygnatura ${sig}: kilka wpisów (${ids.join(', ')}) – możliwy duplikat` })
    for (const m of miejsca) for (const p of m.parafie) {
        if (!znane.has(p.parafia)) uwagi.push({ rodzaj: 'blad', miejsce: m.id, tekst: `miejscowość „${m.nazwa}”: nieznana parafia/urząd „${p.parafia}”` })
        if (p.od === null && p.do === null) uwagi.push({ rodzaj: 'do-sprawdzenia', miejsce: m.id, tekst: `miejscowość „${m.nazwa}”: przynależność do „${p.parafia}” bez dat – księgi bez wskazanych wsi jej nie dotyczą` })
        if (p.od !== null && p.do !== null && p.od > p.do) uwagi.push({ rodzaj: 'blad', miejsce: m.id, tekst: `miejscowość „${m.nazwa}”: odwrócony przedział ${p.od}–${p.do}` })
    }
    return {
        ksiag: ksiegi.length, publicznych: publ(ksiegi), miejsca: wiersze, instytucje,
        bezMiejscowosci: wgMiejsc.bezPrzypisania.map(krotko), bezInstytucji: wgPar.bezPrzypisania.map(krotko), uwagi,
    }
}
